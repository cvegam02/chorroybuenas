import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { useCards } from '../../hooks/useCards';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import { aiDeckSummary, pickImageFiles } from '../../utils/deckProgress';
import { newUuid } from '../../utils/newUuid';
import type { Card } from '../../types';
import { useCardAI } from './useCardAI';

const normalizeTitle = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Subir, editar, borrar y transformar con IA las cartas de la lotería activa. Lo usan la pantalla de
 * cartas (C1) y la lotería guardada (U2, FEAT-57); `DeckDialogs` dibuja sus ventanas. Recibe las cartas
 * de quien la usa, porque cada `useCards` lleva su propia copia.
 */
export const useDeckEditing = (cardsApi: ReturnType<typeof useCards>) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentSetId } = useSetContext();
  const { balance: tokenBalance, refreshBalance } = useTokenBalance();
  const { cards, addCard, addCards, removeCard, updateCard, isCardRecentlySynced } = cardsApi;
  /** Usuario logueado sin lotería seleccionada: esperar a que SetContext cargue o crear una. */
  const waitingForSet = Boolean(user && !currentSetId);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(-1);
  const [showAllTransformedModal, setShowAllTransformedModal] = useState(false);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const ai = useCardAI({ cards, updateCard, userId: user?.id, currentSetId, refreshBalance, t, isAIModalOpen });
  const aiSummary = aiDeckSummary(cards);
  // La carta como está ahora: la ventana de editar ve al momento una versión con IA recién guardada.
  const liveEditingCard = editingCard ? cards.find(card => card.id === editingCard.id) ?? editingCard : null;
  const noTokensForSingle = Boolean(user && tokenBalance !== null && tokenBalance < 1);

  const existingTitleSet = useMemo(() => new Set(cards.map(card => normalizeTitle(card.title))), [cards]);

  const handleCardAdd = async (image: string, title: string) => {
    if (existingTitleSet.has(normalizeTitle(title))) {
      alert(t('cardEditor.errors.duplicateTitle'));
      return false;
    }
    setShowUploadProgress(true);
    setUploadProgress(-1);
    try {
      await addCard({ id: newUuid(), title, image });
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 300));
      return true;
    } finally {
      setShowUploadProgress(false);
    }
  };

  const handleBatchCardsAdd = async (cardsToAdd: Array<{ image: string; title: string }>) => {
    const seenTitles = new Set(existingTitleSet);
    const duplicateTitles: string[] = [];
    for (const card of cardsToAdd) {
      const normalizedTitle = normalizeTitle(card.title);
      if (seenTitles.has(normalizedTitle)) {
        duplicateTitles.push(card.title);
      } else {
        seenTitles.add(normalizedTitle);
      }
    }
    if (duplicateTitles.length > 0) {
      alert(t('cardEditor.errors.batchDuplicates', { titles: duplicateTitles.join(', ') }));
      return;
    }

    // Cada carta nueva con su UUID (lo pide la tabla de cartas de Supabase)
    const newCards: Card[] = cardsToAdd.map(({ image, title }) => ({ id: newUuid(), title, image }));
    setShowUploadProgress(true);
    setUploadProgress(user ? 0 : -1);
    try {
      await addCards(newCards, user ? {
        onProgress: (current, total) => setUploadProgress((current / total) * 100)
      } : undefined);
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 300));
    } finally {
      setShowUploadProgress(false);
    }
  };

  const openBatchWith = (files: File[]) => {
    if (files.length > 0) {
      setBatchFiles(files);
      setIsBatchModalOpen(true);
    }
  };

  /** «Subir fotos»: abre el selector de archivos, que lleva a «Nombra tus fotos» (M6). */
  const openFilePicker = () => {
    if (!waitingForSet) batchInputRef.current?.click();
  };

  const handleBatchFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    openBatchWith(Array.from(event.target.files || []));
    // Se limpia para poder elegir los mismos archivos otra vez
    if (batchInputRef.current) batchInputRef.current.value = '';
  };

  /** Fotos soltadas sobre la lotería: la misma ventana que «Subir fotos». */
  const handleFilesDropped = (files: File[]) => {
    if (!waitingForSet) openBatchWith(pickImageFiles(files));
  };

  const openSingleUpload = () => {
    if (!waitingForSet) setIsUploadModalOpen(true);
  };

  const handleEditCard = (card: Card) => {
    // Mientras la IA pinta la carta no se abre: al terminar, la carta ya trae su versión nueva.
    if (card.isProcessing || ai.transformingCardId === card.id) return;
    setEditingCard(card);
  };

  const handleRevertCard = async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (card && card.originalImage) {
      await updateCard(id, { image: card.originalImage, originalImage: undefined, isAiGenerated: false });
    }
  };

  const handleAIBulkClick = () => {
    if (ai.cardsToTransform.length === 0) {
      setShowAllTransformedModal(true);
      return;
    }
    // Sin tokens suficientes también se abre la ventana, que dice cuántos faltan (FEAT-34, US A3).
    setIsAIModalOpen(true);
  };

  /** Cierra las ventanas de subir, para cuando se vacía la lotería. */
  const closeUploads = () => {
    setIsUploadModalOpen(false);
    setIsBatchModalOpen(false);
    setBatchFiles([]);
  };

  return {
    cards,
    removeCard,
    updateCard,
    isCardRecentlySynced,
    waitingForSet,
    tokenBalance,
    ai,
    aiSummary,
    noTokensForSingle,
    batchInputRef,
    batchFiles,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isBatchModalOpen,
    isAIModalOpen,
    setIsAIModalOpen,
    liveEditingCard,
    setEditingCard,
    showUploadProgress,
    uploadProgress,
    showAllTransformedModal,
    setShowAllTransformedModal,
    handleCardAdd,
    handleBatchCardsAdd,
    handleBatchFileSelect,
    handleFilesDropped,
    openFilePicker,
    openSingleUpload,
    handleEditCard,
    handleRevertCard,
    handleAIBulkClick,
    closeUploads,
  };
};

export type DeckEditing = ReturnType<typeof useDeckEditing>;
