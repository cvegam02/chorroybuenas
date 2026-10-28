import { useEffect } from 'react';
import { logger } from '../utils/logger';

/**
 * Mantiene la pantalla encendida mientras el componente está montado (cantador, FEAT-55).
 * El navegador suelta el bloqueo al cambiar de app o pestaña, así que se pide otra vez al volver.
 * En los navegadores sin esta función no hace nada.
 */
export const useKeepScreenOn = (): void => {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const request = async () => {
      try {
        const next = await navigator.wakeLock.request('screen');
        if (active) sentinel = next;
        else void next.release();
      } catch (err) {
        // Se niega, por ejemplo, con la batería baja: el cantador sigue funcionando
        logger.warn('Wake lock not granted:', err);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release();
    };
  }, []);
};
