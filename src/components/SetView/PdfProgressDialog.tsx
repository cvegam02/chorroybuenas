import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Card } from '../../types';
import { CardThumbnail } from '../Dashboard/CardFan';
import './PdfProgressDialog.css';

/** Cuántas cartas de la lotería adornan la ventana. */
const SHOWN_CARDS = 3;

interface PdfProgressDialogProps {
  cards: Card[];
  boardCount: number;
}

/**
 * Ventana «Preparando tu PDF…» de una lotería guardada. No se puede cerrar: desaparece sola cuando el PDF
 * baja o falla. La barra solo indica que sigue trabajando; el generador no informa cuánto lleva.
 */
export const PdfProgressDialog = ({ cards, boardCount }: PdfProgressDialogProps) => {
  const { t } = useTranslation();

  return createPortal(
    <div className="pdf-progress__overlay">
      <div className="pdf-progress" role="status" aria-live="polite">
        <div className="pdf-progress__cards" aria-hidden="true">
          {cards.slice(0, SHOWN_CARDS).map((card) => (
            <CardThumbnail key={card.id} card={card} className="pdf-progress__card" />
          ))}
        </div>
        <h2 className="pdf-progress__title">{t('setView.pdfPreparingTitle')}</h2>
        <span className="pdf-progress__contents">
          {t('setView.pdfPreparingContents', {
            boards: t('setView.boards', { count: boardCount }),
            cards: t('dashboard.loterias.cards', { count: cards.length }),
          })}
        </span>
        <div className="pdf-progress__bar" aria-hidden="true">
          <div className="pdf-progress__bar-fill" />
        </div>
        <span className="pdf-progress__note">{t('setView.pdfPreparingNote')}</span>
      </div>
    </div>,
    document.body,
  );
};
