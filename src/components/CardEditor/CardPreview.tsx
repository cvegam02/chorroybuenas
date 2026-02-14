import { useState, useEffect } from 'react';
import { FaMagic, FaUndo, FaEdit, FaTrash } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../types';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import './CardPreview.css';

type PendingAction = 'regenerate' | 'delete' | 'revert' | null;

interface CardPreviewProps {
  card: Card;
  onRemove: (id: string) => void;
  onRevert?: (id: string) => void;
  onTransform?: (card: Card) => void;
  disableTransformButton?: boolean;
  /** Cuando el botón está deshabilitado por falta de tokens, mensaje para el tooltip */
  transformButtonTitle?: string;
  onClick?: (card: Card) => void;
  /** Durante conversión batch con IA: bloquea eliminar, editar y revertir para evitar errores */
  disabledDuringBatch?: boolean;
  /** Carta en transformación individual; mantiene overlay visible hasta que termine */
  isTransforming?: boolean;
}

export const CardPreview = ({ card, onRemove, onRevert, onTransform, disableTransformButton, transformButtonTitle, onClick, disabledDuringBatch, isTransforming }: CardPreviewProps) => {
  const { t } = useTranslation();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    const mq = window.matchMedia('(hover: none)');
    setIsTouchDevice(mq.matches);
    const handler = () => setIsTouchDevice(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleCardClick = () => {
    if (disabledDuringBatch) return;
    if (isTouchDevice) {
      setShowActionsMenu(true);
    } else {
      onClick?.(card);
    }
  };

  const handleMenuAction = (action: () => void) => {
    if (disabledDuringBatch) return;
    action();
    setShowActionsMenu(false);
  };

  const actionsMenu = showActionsMenu && isTouchDevice && !disabledDuringBatch && createPortal(
    <div
      className="card-preview__actions-overlay"
      onClick={() => setShowActionsMenu(false)}
      role="presentation"
    >
      <div
        className="card-preview__actions-menu"
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        {onClick && !disabledDuringBatch && (
          <button
            type="button"
            className="card-preview__actions-menu-item"
            onClick={() => handleMenuAction(() => onClick(card))}
            role="menuitem"
          >
            <FaEdit />
            <span>{t('cardEditor.cardActions.edit')}</span>
          </button>
        )}
        {card.originalImage && onRevert && !disabledDuringBatch && (
          <button
            type="button"
            className="card-preview__actions-menu-item"
            onClick={() => handleMenuAction(() => setPendingAction('revert'))}
            role="menuitem"
          >
            <FaUndo />
            <span>{t('cardEditor.cardActions.revert')}</span>
          </button>
        )}
        {card.image && onTransform && !card.isProcessing && !isTransforming && !disabledDuringBatch && (
          <button
            type="button"
            className="card-preview__actions-menu-item"
            disabled={disableTransformButton}
            onClick={() => !disableTransformButton && handleMenuAction(() => setPendingAction('regenerate'))}
            role="menuitem"
          >
            <FaMagic />
            <span>{t('cardEditor.cardActions.transform')}</span>
          </button>
        )}
        {!disabledDuringBatch && (
          <button
            type="button"
            className="card-preview__actions-menu-item card-preview__actions-menu-item--danger"
            onClick={() => handleMenuAction(() => setPendingAction('delete'))}
            role="menuitem"
          >
            <FaTrash />
            <span>{t('cardEditor.cardActions.delete')}</span>
          </button>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <div
        className={`card-preview ${onClick ? 'card-preview--clickable' : ''} ${disabledDuringBatch ? 'card-preview--batch-locked' : ''}`}
        onClick={handleCardClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (disabledDuringBatch) return;
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(card);
          }
        }}
      >
        <div className="card-preview__image-container">
          {card.image ? (
            <img src={card.image} alt={card.title} className="card-preview__image" />
          ) : (
            <div className="card-preview__image-placeholder">{t('setView.noImage')}</div>
          )}

          {(card.isProcessing || isTransforming) && (
            <div className="card-preview__processing">
              <div className="card-preview__processing-painter">🎨</div>
              <p className="card-preview__processing-text">{t('cardEditor.cardProcessing')}</p>
            </div>
          )}

          {disabledDuringBatch && !card.isProcessing && !isTransforming && (
            <div className="card-preview__batch-queued" aria-hidden="true" />
          )}

          {card.isAiGenerated && !card.isProcessing && !isTransforming && !onTransform && (
            <div className="card-preview__ai-badge" title="Generado con IA">
              <FaMagic />
            </div>
          )}

          {!isTouchDevice && card.originalImage && onRevert && !disabledDuringBatch && !isTransforming && (
            <button
              className="card-preview__revert"
              onClick={(e) => {
                e.stopPropagation();
                setPendingAction('revert');
              }}
              aria-label="Restaurar imagen original"
              title="Restaurar imagen original"
            >
              <FaUndo />
            </button>
          )}

          {!isTouchDevice && card.image && onTransform && !card.isProcessing && !isTransforming && !disabledDuringBatch && (
            <button
              className="card-preview__transform"
              onClick={(e) => {
                e.stopPropagation();
                if (!disableTransformButton) setPendingAction('regenerate');
              }}
              disabled={disableTransformButton}
              aria-label="Transformar con IA"
              title={transformButtonTitle ?? (disableTransformButton ? "Espera un momento, sincronizando..." : (card.isAiGenerated ? "Regenerar con IA" : "Transformar con IA"))}
            >
              <FaMagic />
            </button>
          )}
        </div>
        <div className="card-preview__title">{card.title}</div>
        {!isTouchDevice && !disabledDuringBatch && (
          <button
            className="card-preview__remove"
            onClick={(e) => {
              e.stopPropagation();
              setPendingAction('delete');
            }}
            aria-label={`Eliminar ${card.title}`}
          >
            ×
          </button>
        )}
      </div>
      {actionsMenu}
      {pendingAction === 'regenerate' && onTransform && (
        <WarningModal
          isOpen
          type="warning"
          title={t('modals.confirmRegenerateCard.title')}
          message={t('modals.confirmRegenerateCard.message')}
          confirmText={t('modals.confirmRegenerateCard.confirm')}
          cancelText={t('modals.confirmRegenerateCard.cancel')}
          onConfirm={() => {
            onTransform(card);
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === 'delete' && (
        <WarningModal
          isOpen
          type="danger"
          title={t('modals.confirmDeleteCard.title')}
          message={t('modals.confirmDeleteCard.message')}
          confirmText={t('modals.confirmDeleteCard.confirm')}
          cancelText={t('modals.confirmDeleteCard.cancel')}
          onConfirm={() => {
            onRemove(card.id);
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === 'revert' && onRevert && (
        <WarningModal
          isOpen
          type="warning"
          title={t('modals.confirmRevertCard.title')}
          message={t('modals.confirmRevertCard.message')}
          confirmText={t('modals.confirmRevertCard.confirm')}
          cancelText={t('modals.confirmRevertCard.cancel')}
          onConfirm={() => {
            onRevert(card.id);
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </>
  );
};
