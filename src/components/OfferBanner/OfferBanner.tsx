import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FaPlay, FaTimes } from 'react-icons/fa';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { formatCountdown, shouldRevealToast, TOAST_DELAY_MS, type TimeLeft } from '../../utils/offerBanner';
import { OfferVideoModal } from './OfferVideoModal';
import './OfferBanner.css';

export interface OfferBannerProps {
  title: string;
  text: string;
  button: string;
  videoUrl: string;
  imageUrl: string;
  /** Lo que falta para que termine; null si no lleva cuenta regresiva. */
  countdown: TimeLeft | null;
  targetPath: string;
  onClose: () => void;
  /** Fuerza computadora o celular (vista previa del Admin); sin él, según el ancho de la pantalla. */
  layout?: 'desktop' | 'mobile';
  /** En la vista previa el aviso sale de inmediato, dentro del marco, y el botón no lleva a ningún lado. */
  preview?: boolean;
  /** Reabierto desde el indicador del encabezado (US A7): sale sin esperar. */
  immediate?: boolean;
}

const MOBILE_QUERY = '(max-width: 699px)';

/** Aparece a los 3 s de cargar o al bajar más de 300 px, lo que pase primero. */
function useToastReveal(immediate: boolean): boolean {
  const [revealed, setRevealed] = useState(immediate);

  useEffect(() => {
    if (revealed) return;
    const startedAt = Date.now();
    const check = () => {
      if (shouldRevealToast(Date.now() - startedAt, window.scrollY)) setRevealed(true);
    };
    const timer = window.setTimeout(() => setRevealed(true), TOAST_DELAY_MS);
    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', check);
    };
  }, [revealed]);

  return revealed;
}

/**
 * Aviso flotante de la oferta, abajo a la izquierda (FEAT-49, US A6). Miniatura con ▶, cuenta regresiva,
 * título, botón y «Ver video». El video no está en la página: se abre en una ventana aparte. La ✕ lo minimiza al
 * encabezado (US A7).
 */
export const OfferBanner = ({
  title, text, button, videoUrl, imageUrl, countdown, targetPath, onClose, layout, preview = false, immediate = false,
}: OfferBannerProps) => {
  const { t } = useTranslation();
  const isNarrow = useMediaQuery(MOBILE_QUERY);
  const mobile = layout ? layout === 'mobile' : isNarrow;
  const revealed = useToastReveal(preview || immediate);
  const [videoOpen, setVideoOpen] = useState(false);

  if (!revealed) return null;

  const classes = ['offer-toast', mobile && 'offer-toast--mobile', preview && 'offer-toast--preview'].filter(Boolean).join(' ');
  const openVideo = () => setVideoOpen(true);

  return (
    <aside className={classes} aria-label={t('offerBanner.label')}>
      <button type="button" className="offer-toast__thumb" onClick={openVideo} aria-label={t('offerBanner.playVideo')}>
        <img src={imageUrl} alt="" />
        <span className="offer-toast__play" aria-hidden="true"><FaPlay /></span>
      </button>

      <div className="offer-toast__body">
        {countdown && (
          <span className="offer-toast__countdown">
            <span className="offer-toast__dot" aria-hidden="true" />
            {t('offerBanner.endsIn', { time: formatCountdown(countdown) })}
          </span>
        )}
        <strong className="offer-toast__title">{title}</strong>
        <div className="offer-toast__actions">
          {preview ? (
            <span className="offer-toast__cta">{button}</span>
          ) : (
            <Link to={targetPath} className="offer-toast__cta">{button}</Link>
          )}
          <button type="button" className="offer-toast__watch" onClick={openVideo}>{t('offerBanner.watchVideo')}</button>
        </div>
      </div>

      <button type="button" className="offer-toast__close" aria-label={t('offerBanner.close')} onClick={onClose}>
        <FaTimes aria-hidden="true" />
      </button>

      {videoOpen && (
        <OfferVideoModal
          title={title}
          text={text}
          button={button}
          videoUrl={videoUrl}
          imageUrl={imageUrl}
          targetPath={targetPath}
          preview={preview}
          onClose={() => setVideoOpen(false)}
        />
      )}
    </aside>
  );
};
