import { useState, useEffect } from 'react';
import { FaMagic, FaUndo, FaEdit, FaTimes, FaTrash, FaSearchPlus } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../types';
import { CardActionConfirm, type CardAction } from './CardActionConfirm';
import { CardPreviewModal } from '../SetView/CardPreviewModal';
import { useComposedCard } from '../../hooks/useComposedCard';
import './CardPreview.css';
import './CardPreviewActions.css';

type PendingAction = CardAction | null;

interface CardPreviewProps {
  card: Card;
  onRemove: (id: string) => void;
  onRevert?: (id: string) => void;
  onTransform?: (card: Card) => void;
  disableTransformButton?: boolean;
  onClick?: (card: Card) => void;
  /** Durante conversión batch con IA: bloquea eliminar, editar y revertir para evitar errores */
  disabledDuringBatch?: boolean;
  /** Carta en transformación individual; mantiene overlay visible hasta que termine */
  isTransforming?: boolean;
}

export const CardPreview = ({ card, onRemove, onRevert, onTransform, disableTransformButton, onClick, disabledDuringBatch, isTransforming }: CardPreviewProps) => {
  const { t } = useTranslation();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showLargeView, setShowLargeView] = useState(false);
  // La carta como sale impresa, con el nombre dentro. Mientras se convierte con IA se ve la foto, como siempre.
  const composedUrl = useComposedCard(card, !card.isProcessing && !isTransforming);
  const shownImage = composedUrl ?? card.image;

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

  // La hoja de acciones del celular también se cierra con Escape.
  useEffect(() => {
    if (!showActionsMenu) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowActionsMenu(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showActionsMenu]);

  const handleMenuAction = (action: () => void) => {
    if (disabledDuringBatch) return;
    action();
    setShowActionsMenu(false);
  };

  // En celular no hay mouse: tocar la carta abre esta hoja desde abajo.
  const actionsMenu = showActionsMenu && isTouchDevice && !disabledDuringBatch && createPortal(
    <div
      className="card-sheet__overlay"
      onClick={() => setShowActionsMenu(false)}
      role="presentation"
    >
      <div
        className="card-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
      >
        <div className="card-sheet__head">
          {shownImage && <img src={shownImage} alt="" className="card-sheet__thumb" />}
          <div className="card-sheet__names">
            <strong className="card-sheet__title">{card.title}</strong>
            {card.isAiGenerated && <span className="card-sheet__ai">{t('cardEditor.cardActions.madeWithAi')}</span>}
          </div>
          <button
            type="button"
            className="card-sheet__close"
            onClick={() => setShowActionsMenu(false)}
            aria-label={t('common.close')}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        {card.image && (
          <button
            type="button"
            className="card-sheet__item"
            onClick={() => handleMenuAction(() => setShowLargeView(true))}
          >
            <FaSearchPlus aria-hidden="true" />
            <span>{t('cardEditor.cardActions.view')}</span>
          </button>
        )}
        {onClick && !disabledDuringBatch && (
          <button
            type="button"
            className="card-sheet__item"
            onClick={() => handleMenuAction(() => onClick(card))}
          >
            <FaEdit aria-hidden="true" />
            <span>{t('cardEditor.cardActions.editFull')}</span>
          </button>
        )}
        {card.image && onTransform && !card.isProcessing && !isTransforming && !disabledDuringBatch && (
          <button
            type="button"
            className="card-sheet__item card-sheet__item--ai"
            disabled={disableTransformButton}
            onClick={() => !disableTransformButton && handleMenuAction(() => setPendingAction('regenerate'))}
          >
            <FaMagic aria-hidden="true" />
            <span>{t(card.isAiGenerated ? 'cardEditor.cardActions.sheetAnother' : 'cardEditor.cardActions.sheetTransform')}</span>
          </button>
        )}
        {card.originalImage && onRevert && !disabledDuringBatch && (
          <button
            type="button"
            className="card-sheet__item"
            onClick={() => handleMenuAction(() => setPendingAction('revert'))}
          >
            <FaUndo aria-hidden="true" />
            <span>{t('cardEditor.cardActions.sheetRevert')}</span>
          </button>
        )}
        {!disabledDuringBatch && (
          <button
            type="button"
            className="card-sheet__item card-sheet__item--danger"
            onClick={() => handleMenuAction(() => setPendingAction('delete'))}
          >
            <FaTrash aria-hidden="true" />
            <span>{t('cardEditor.cardActions.sheetDelete')}</span>
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
          // Solo cuando el foco está en la carta, no en uno de sus botones.
          if (e.target !== e.currentTarget) return;
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(card);
          }
        }}
      >
        <div className="card-preview__image-container">
          {shownImage ? (
            <img src={shownImage} alt={card.title} className="card-preview__image" />
          ) : (
            <div className="card-preview__image-placeholder">{t('setView.noImage')}</div>
          )}

          {(card.isProcessing || isTransforming) && (
            <div className="card-preview__painting" role="status">
              <span className="card-preview__spinner" aria-hidden="true" />
              <strong>{t('cardEditor.cardActions.painting')}</strong>
              <span>{t('cardEditor.cardActions.paintingTime')}</span>
            </div>
          )}

          {disabledDuringBatch && !card.isProcessing && !isTransforming && (
            <div className="card-preview__batch-queued" aria-hidden="true" />
          )}

          {card.isAiGenerated && !card.isProcessing && !isTransforming && (
            <span className="card-preview__ai-tag">{t('cardEditor.cardActions.aiTag')}</span>
          )}
        </div>
        {!composedUrl && <div className="card-preview__title">{card.title}</div>}

        {/* Con mouse: botones redondos de editar y borrar. Lo de la IA está en la ventana de editar. */}
        {!isTouchDevice && !disabledDuringBatch && (
          <div className="card-preview__hover">
            <div className="card-preview__hover-top">
              {onClick && (
                <button
                  type="button"
                  className="card-preview__round"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick(card);
                  }}
                  aria-label={t('cardEditor.cardActions.editAria', { name: card.title })}
                  title={t('cardEditor.cardActions.edit')}
                >
                  <FaEdit aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="card-preview__round card-preview__round--danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingAction('delete');
                }}
                aria-label={t('cardEditor.cardActions.deleteAria', { name: card.title })}
                title={t('cardEditor.cardActions.delete')}
              >
                <FaTrash aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
      {actionsMenu}
      <CardPreviewModal
        card={card}
        isOpen={showLargeView}
        onClose={() => setShowLargeView(false)}
      />
      {pendingAction && (pendingAction !== 'regenerate' || onTransform) && (pendingAction !== 'revert' || onRevert) && (
        <CardActionConfirm
          action={pendingAction}
          isAiGenerated={card.isAiGenerated === true}
          onConfirm={() => {
            if (pendingAction === 'regenerate') onTransform?.(card);
            if (pendingAction === 'revert') onRevert?.(card.id);
            if (pendingAction === 'delete') onRemove(card.id);
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </>
  );
};
