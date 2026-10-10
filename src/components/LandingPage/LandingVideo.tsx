import { useSyncExternalStore } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { playsMp4Only } from '../../utils/landingVideo';

interface LandingVideoProps {
  /** Nombre del archivo en `/media/inicio`, sin extensión. */
  name: 'hero-gratis' | 'hero-cartas';
  alt: string;
  className?: string;
  /** Muestra la imagen fija aunque el visitante acepte movimiento. */
  still?: boolean;
}

const MEDIA_BASE = '/media/inicio';

const subscribeToNothing = () => () => {};

/** Falso mientras se escribe la página pre-generada y al reutilizarla; cierto ya en el navegador. */
const useIsBrowser = (): boolean =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );

/**
 * Video de la página de inicio, sin sonido y en bucle. La página pre-generada lleva solo la imagen
 * fija: el video se decide ya en el navegador, que es donde se sabe cuál puede pintar y si el
 * visitante pidió menos movimiento.
 */
export const LandingVideo = ({ name, alt, className, still = false }: LandingVideoProps) => {
  const isBrowser = useIsBrowser();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const poster = `${MEDIA_BASE}/${name}-poster.jpg`;

  if (!isBrowser || still || prefersReducedMotion) {
    return <img className={className} src={poster} alt={alt} />;
  }

  return (
    <video
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-label={alt}
    >
      {!playsMp4Only(navigator.userAgent) && <source src={`${MEDIA_BASE}/${name}.webm`} type="video/webm" />}
      <source src={`${MEDIA_BASE}/${name}.mp4`} type="video/mp4" />
    </video>
  );
};
