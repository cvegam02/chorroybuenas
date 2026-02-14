import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaMagic, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { AIService } from '../../services/AIService';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../types';
import './AIBatchModal.css';

type AIBatchStatus = 'idle' | 'processing' | 'complete' | 'error';

interface AIBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Llamado cuando el usuario hace clic en "Cerrar y continuar" (para saber que el proceso sigue en segundo plano) */
    onCloseAndContinue?: () => void;
    cards: Card[];
    /** Total cards (incl. already AI-generated). Used to show "X omitted" message when some are already transformed. */
    totalCards?: number;
    /** Total a procesar en este batch (fijado al iniciar; evita que progress se distorsione cuando cardsToTransform se reduce) */
    totalToProcess?: number;
    /** Título de la carta actualmente en proceso */
    currentCardTitle?: string;
    /** Called when user clicks "Iniciar". Parent starts the transformation. */
    onStart: () => void;
    /** Status from parent (transformation runs in parent so it persists when modal closes). */
    status: AIBatchStatus;
    currentIndex: number;
    skippedCount: number;
    error: string | null;
    tokenBalance: number | null;
    hasEnoughTokens: boolean;
}

export const AIBatchModal: React.FC<AIBatchModalProps> = ({
    isOpen,
    onClose,
    onCloseAndContinue,
    cards,
    totalCards,
    totalToProcess,
    currentCardTitle,
    onStart,
    status,
    currentIndex,
    skippedCount,
    error,
    tokenBalance,
    hasEnoughTokens
}) => {
    const { t } = useTranslation();
    const { user } = useAuth();

    const estimation = AIService.getEstimation(cards.length);
    const tokensNeeded = cards.length;

    if (!isOpen) return null;

    return (
        <div className="ai-batch-modal-overlay">
            <div className="ai-batch-modal">
                <div className="ai-batch-modal__header">
                    {status !== 'processing' && (
                        <button className="ai-batch-modal__header-close" onClick={onClose}>
                            <FaTimes />
                        </button>
                    )}
                    <FaMagic className="ai-batch-modal__header-icon" />
                    <h2>{t('aiBatchModal.title')}</h2>
                </div>

                <div className="ai-batch-modal__content">
                    {status === 'idle' && (
                        <div className="ai-batch-modal__idle">
                            <p>{t('aiBatchModal.description', { count: cards.length })}</p>
                            {totalCards != null && totalCards > cards.length && (
                                <p className="ai-batch-modal__some-skipped">
                                    {t('aiBatchModal.someAlreadyTransformed', { skipped: totalCards - cards.length, count: cards.length })}
                                </p>
                            )}
                            <div className="ai-batch-modal__estimation">
                                <div className="ai-batch-modal__est-item">
                                    <span className="label text-muted">{t('aiBatchModal.tokensToConsume', { count: tokensNeeded })}</span>
                                </div>
                                <div className="ai-batch-modal__est-item">
                                    <span className="label text-muted">{t('aiBatchModal.timeEstimate', { time: Math.ceil(estimation.estimatedSeconds / 60) })}</span>
                                </div>
                            </div>
                            {user && tokenBalance !== null && !hasEnoughTokens && (
                                <p className="ai-batch-modal__tokens-warning">
                                    {t('aiBatchModal.insufficientTokens', {
                                        needed: tokensNeeded,
                                        have: tokenBalance,
                                        missing: tokensNeeded - tokenBalance
                                    })}
                                </p>
                            )}
                            <p className="ai-batch-modal__disclaimer">
                                <FaExclamationTriangle /> {t('aiBatchModal.disclaimer')}
                            </p>
                            <button
                                className="ai-batch-modal__start-btn"
                                onClick={onStart}
                                disabled={user ? !hasEnoughTokens : false}
                            >
                                {t('aiBatchModal.start')}
                            </button>
                            <button className="ai-batch-modal__cancel-btn" onClick={onClose}>
                                {t('common.cancel')}
                            </button>
                        </div>
                    )}

                    {status === 'processing' && (() => {
                        const total = totalToProcess ?? cards.length;
                        const progress = total > 0 ? Math.min(100, ((currentIndex + 1) / total) * 100) : 0;
                        return (
                        <div className="ai-batch-modal__processing">
                            <div className="ai-batch-modal__progress-container">
                                <div
                                    className="ai-batch-modal__progress-bar"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="ai-batch-modal__status-text">
                                {t('aiBatchModal.processing', { current: currentIndex + 1, total })}
                            </p>
                            <div className="ai-batch-modal__painter">
                                <div className="ai-batch-modal__painter-anim">🎨</div>
                                <span>{t('aiBatchModal.painting')}</span>
                            </div>
                            <div className="ai-batch-modal__current-card">
                                <strong>{currentCardTitle}</strong>
                            </div>
                            <p className="ai-batch-modal__processing-info">
                                {t('aiBatchModal.processingInfo')}
                            </p>
                            <button
                                type="button"
                                className="ai-batch-modal__close-and-continue"
                                onClick={() => {
                                    onCloseAndContinue?.();
                                    onClose();
                                }}
                            >
                                {t('aiBatchModal.closeAndContinue')}
                            </button>
                        </div>
                        );
                    })()}

                    {status === 'complete' && (
                        <div className="ai-batch-modal__complete">
                            <FaCheckCircle className="ai-batch-modal__success-icon" />
                            <h3>{t('aiBatchModal.complete')}</h3>
                            <p>{t('aiBatchModal.successMessage')}</p>
                            {skippedCount > 0 && (
                                <p className="ai-batch-modal__skipped-note">
                                    ⚠️ {t('aiBatchModal.skippedMessage', { count: skippedCount })}
                                </p>
                            )}
                            <button className="ai-batch-modal__close-btn" onClick={onClose}>
                                <FaTimes />
                                {t('aiBatchModal.close')}
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="ai-batch-modal__error">
                            <FaExclamationTriangle className="ai-batch-modal__error-icon" />
                            <p>{error || t('cardEditor.errors.genericContactAdmin')}</p>
                            <button className="ai-batch-modal__cancel-btn" onClick={onClose}>
                                {t('common.close')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
