import { useEffect, useRef, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface OfferVideoModalProps {
  title: string;
  text: string;
  button: string;
  videoUrl: string;
  imageUrl: string;
  targetPath: string;
  /** En la vista previa del Admin el botón no lleva a ningún lado. */
  preview: boolean;
  onClose: () => void;
}

/**
 * El video de la oferta en una ventana aparte (FEAT-49, US A6): solo corre al abrirla, con sonido y controles.
 * Cierra con la ✕, al tocar fuera o con Escape. Con «reducir movimiento» no arranca solo.
 */
export const OfferVideoModal = ({ title, text, button, videoUrl, imageUrl, targetPath, preview, onClose }: OfferVideoModalProps) => {
  const { t } = useTranslation();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  const handleVeilClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div className="offer-video" onClick={handleVeilClick}>
      <div ref={dialogRef} className="offer-video__dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <button type="button" className="offer-video__close" aria-label={t('offerBanner.closeVideo')} onClick={onClose}>
          <FaTimes aria-hidden="true" />
        </button>
        <video className="offer-video__player" src={videoUrl} poster={imageUrl} autoPlay={!reducedMotion} controls playsInline />
        <div className="offer-video__body">
          <strong className="offer-video__title">{title}</strong>
          {text && <p className="offer-video__text">{text}</p>}
          {preview ? (
            <span className="offer-toast__cta">{button}</span>
          ) : (
            <Link to={targetPath} className="offer-toast__cta" onClick={onClose}>{button}</Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
