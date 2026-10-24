import { logger } from './logger';

/**
 * Pantalla completa para el cantador (FEAT-55). Se pide al tocar «Cantar», porque el navegador solo la
 * da tras un toque. Safari de iPhone no la da a una página: ahí no pasa nada y el cantador se ve sin las
 * barras del sitio.
 */
export const enterFullscreen = (): void => {
  const root = document.documentElement;
  if (!root.requestFullscreen || document.fullscreenElement) return;
  root.requestFullscreen().catch((err: unknown) => logger.warn('Fullscreen not granted:', err));
};

export const exitFullscreen = (): void => {
  if (!document.fullscreenElement || !document.exitFullscreen) return;
  document.exitFullscreen().catch((err: unknown) => logger.warn('Could not exit fullscreen:', err));
};
