import { cardsForBatch } from '../../utils/aiBatchPlan';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { AIService } from '../../services/AIService';
import { aiErrorToI18nKey, isSensitiveContentError } from '../../services/aiFallback';
import { adjustImageToCardAspectRatio } from '../../utils/imageUtils';
import { logger } from '../../utils/logger';
import type { Card } from '../../types';

interface UseCardAIDeps {
  cards: Card[];
  updateCard: (id: string, updates: Partial<Card>) => Promise<unknown>;
  userId: string | undefined;
  currentSetId: string | null;
  refreshBalance: () => Promise<void>;
  t: TFunction;
  /** El modal de transformación por lote está abierto (al abrirse se reinicia el estado del lote). */
  isAIModalOpen: boolean;
}

/**
 * Transformación de cartas con IA para CardEditor: una carta o un lote, con su estado de progreso y errores.
 */
export function useCardAI({ cards, updateCard, userId, currentSetId, refreshBalance, t, isAIModalOpen }: UseCardAIDeps) {
  const batchModalClosedDuringProcessingRef = useRef(false);
  /** Mensaje de error de IA (modal en UI; evita alert() suprimido por el navegador). Fase 3: solo mensaje genérico, sin CTA. */
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [aiBatchStatus, setAiBatchStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [aiBatchCurrentIndex, setAiBatchCurrentIndex] = useState(0);
  const [aiBatchTotalCount, setAiBatchTotalCount] = useState(0);
  /** Cartas del lote en curso, en su orden: la ventana dibuja con ellas el avance y el resultado. */
  const [aiBatchCardIds, setAiBatchCardIds] = useState<string[]>([]);
  const [aiBatchCurrentTitle, setAiBatchCurrentTitle] = useState<string>('');
  const [aiBatchSkippedCount, setAiBatchSkippedCount] = useState(0);
  const [aiBatchError, setAiBatchError] = useState<string | null>(null);
  const [showBatchCompleteMessage, setShowBatchCompleteMessage] = useState(false);
  /** ID de la carta en transformación individual; mantiene el overlay visible hasta que termine */
  const [transformingCardId, setTransformingCardId] = useState<string | null>(null);

  const cardsToTransform = useMemo(() => cards.filter(c => !c.isAiGenerated), [cards]);
  const cardsToTransformIds = useMemo(() => new Set(cardsToTransform.map(c => c.id)), [cardsToTransform]);
  const isAIBatchProcessing = aiBatchStatus === 'processing';
  // El reinicio al abrir el modal solo depende de que se abra; el estado del lote se lee por ref.
  const isAIBatchProcessingRef = useRef(isAIBatchProcessing);
  isAIBatchProcessingRef.current = isAIBatchProcessing;

  /** Transforma una carta y la guarda. Devuelve la imagen nueva, o `null` si no se pudo (FEAT-34, US A8). */
  const handleSingleAI = async (card: Card): Promise<string | null> => {
    const imageToProcess = card.originalImage || card.image || '';
    if (!imageToProcess.trim()) {
      alert(t('cardEditor.errors.generalAddError'));
      return null;
    }
    setTransformingCardId(card.id);
    await updateCard(card.id, { isProcessing: true });

    try {
      const transformedImage = await AIService.transformToLoteria(
        {
          image: imageToProcess,
          prompt_strength: 0.30
        },
        userId,
        { onSensitiveRetry: () => {} },
        currentSetId ?? undefined
      );

      const normalizedImage = await adjustImageToCardAspectRatio(transformedImage, 512, 768, 0.9);

      await updateCard(card.id, {
        image: normalizedImage,
        originalImage: card.originalImage || card.image,
        isAiGenerated: true,
        isProcessing: false
      });
      refreshBalance();
      return normalizedImage;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error ?? '');
      logger.error('[CardEditor] fallo transformación individual:', errMsg);
      setAiErrorMessage(t(aiErrorToI18nKey(errMsg)));
      await updateCard(card.id, { isProcessing: false });
      refreshBalance();
      return null;
    } finally {
      setTransformingCardId(null);
    }
  };

  const runAIBatchTransformation = async (cardsToProcess: Card[]) => {
    setAiBatchStatus('processing');
    setAiBatchTotalCount(cardsToProcess.length);
    setAiBatchCardIds(cardsToProcess.map(card => card.id));
    setAiBatchSkippedCount(0);
    setAiBatchError(null);
    const strength = 0.30;

    for (let i = 0; i < cardsToProcess.length; i++) {
      const card = cardsToProcess[i];
      setAiBatchCurrentIndex(i);
      setAiBatchCurrentTitle(card?.title ?? '');

      await updateCard(card.id, { isProcessing: true });

      try {
        const transformedImage = await AIService.transformToLoteria(
          { image: card.image || '', prompt_strength: strength },
          userId,
          { onSensitiveRetry: () => {} },
          currentSetId ?? undefined
        );

        const normalizedImage = await adjustImageToCardAspectRatio(transformedImage, 512, 768, 0.9);

        await updateCard(card.id, {
          image: normalizedImage,
          originalImage: card.originalImage || card.image,
          isAiGenerated: true,
          isProcessing: false
        });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error ?? '');
        // Una foto rechazada por el filtro de contenido se omite; cualquier otro error detiene el lote.
        if (isSensitiveContentError(errMsg)) {
          setAiBatchSkippedCount(prev => prev + 1);
          await updateCard(card.id, { isProcessing: false });
        } else {
          logger.error('[CardEditor] AI batch error:', errMsg);
          setAiBatchStatus('error');
          setAiBatchError(t(aiErrorToI18nKey(errMsg)));
          setAiErrorMessage(t(aiErrorToI18nKey(errMsg)));
          await updateCard(card.id, { isProcessing: false });
          refreshBalance();
          return;
        }
      }

      if (i < cardsToProcess.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setAiBatchStatus('complete');
    setAiBatchCurrentIndex(0);
    setAiBatchCurrentTitle('');
    refreshBalance();
    if (batchModalClosedDuringProcessingRef.current) {
      setShowBatchCompleteMessage(true);
      batchModalClosedDuringProcessingRef.current = false;
    }
  };

  /** Empieza el lote: todas las cartas sin IA o, con `limit`, solo las primeras (FEAT-34, US A6). */
  const handleAIStart = (limit?: number) => {
    const batch = cardsForBatch(cardsToTransform, limit);
    if (batch.length === 0) return;
    runAIBatchTransformation(batch);
  };

  useEffect(() => {
    if (isAIModalOpen && !isAIBatchProcessingRef.current) {
      setAiBatchStatus('idle');
      setAiBatchCurrentIndex(0);
      setAiBatchTotalCount(0);
      setAiBatchCardIds([]);
      setAiBatchSkippedCount(0);
      setAiBatchError(null);
      batchModalClosedDuringProcessingRef.current = false;
    }
  }, [isAIModalOpen]);

  useEffect(() => {
    if (!isAIBatchProcessing) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAIBatchProcessing]);

  return {
    aiErrorMessage,
    setAiErrorMessage,
    aiBatchStatus,
    aiBatchCurrentIndex,
    aiBatchTotalCount,
    aiBatchCardIds,
    aiBatchCurrentTitle,
    aiBatchSkippedCount,
    aiBatchError,
    showBatchCompleteMessage,
    setShowBatchCompleteMessage,
    transformingCardId,
    batchModalClosedDuringProcessingRef,
    cardsToTransform,
    cardsToTransformIds,
    isAIBatchProcessing,
    handleSingleAI,
    handleAIStart,
  };
}
