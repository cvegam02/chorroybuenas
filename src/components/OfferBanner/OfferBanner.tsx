import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FaPlay, FaTimes, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { TimeLeft } from '../../utils/offerBanner';
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
  /** En la vista previa el botón no lleva a ningún lado. */
  preview?: boolean;
}

const MOBILE_QUERY = '(max-width: 640px)';

/**
 * Banner de la oferta (FEAT-49, decisiones 10 a 13). En computadora el video corre solo, sin sonido y en
 * bucle, con un botón para el sonido. En celular, o con «reducir movimiento», se ve la imagen fija y el
 * video corre al tocarla.
 */
export const OfferBanner = ({
  title, text, button, videoUrl, imageUrl, countdown, targetPath, onClose, layout, preview = false,
}: OfferBannerProps) => {
  const { t } = useTranslation();
  const isNarrow = useMediaQuery(MOBILE_QUERY);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const mobile = layout ? layout === 'mobile' : isNarrow;
  const [tapped, setTapped] = useState(false);
  const [muted, setMuted] = useState(true);
  const playing = tapped || (!mobile && !reducedMotion);

  const timeText = countdown && formatTimeLeft(countdown, t);

  return (
    <aside className={`offer-banner${mobile ? ' offer-banner--mobile' : ''}`} aria-label={t('offerBanner.label')}>
      <div className="offer-banner__media">
        {playing ? (
          <>
            <video
              key={videoUrl}
              className="offer-banner__video"
              src={videoUrl}
              poster={imageUrl}
              autoPlay
              muted={muted}
              loop
              playsInline
              aria-hidden="true"
            />
            <button
              type="button"
              className="offer-banner__sound"
              aria-pressed={!muted}
              aria-label={muted ? t('offerBanner.soundOn') : t('offerBanner.soundOff')}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
            </button>
          </>
        ) : (
          <button type="button" className="offer-banner__still" onClick={() => setTapped(true)} aria-label={t('offerBanner.playVideo')}>
            <img className="offer-banner__image" src={imageUrl} alt="" />
            <span className="offer-banner__play" aria-hidden="true"><FaPlay /></span>
          </button>
        )}
      </div>

      <div className="offer-banner__body">
        {timeText && <span className="offer-banner__countdown">{t('offerBanner.endsIn', { time: timeText })}</span>}
        <strong className="offer-banner__title">{title}</strong>
        {text && <span className="offer-banner__text">{text}</span>}
        {preview ? (
          <span className="offer-banner__cta">{button}</span>
        ) : (
          <Link to={targetPath} className="offer-banner__cta">{button}</Link>
        )}
      </div>

      <button type="button" className="offer-banner__close" aria-label={t('offerBanner.close')} onClick={onClose}>
        <FaTimes aria-hidden="true" />
      </button>
    </aside>
  );
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** «2 días 5 h», «5 h» o «45 min», en el idioma del sitio. */
function formatTimeLeft({ days, hours, minutes }: TimeLeft, t: Translate): string {
  if (days >= 1) {
    const dayText = t('offerBanner.days', { count: days });
    return hours > 0 ? `${dayText} ${t('offerBanner.hours', { count: hours })}` : dayText;
  }
  if (hours >= 1) return t('offerBanner.hours', { count: hours });
  return t('offerBanner.minutes', { count: Math.max(1, minutes) });
}
