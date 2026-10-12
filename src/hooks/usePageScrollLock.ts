import { useEffect } from 'react';

/**
 * Mientras `enabled` sea verdadero, la página de atrás no se desplaza: para ventanas abiertas.
 * Se bloquea `html` y no `body`: en este sitio `html` lleva `overflow-x: hidden` (`src/index.css`), así que
 * quien desplaza la página es `html` y ocultar el desborde de `body` no la detiene.
 */
export const usePageScrollLock = (enabled: boolean = true): void => {
  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPaddingRight = root.style.paddingRight;
    // En computadora, al quitar la barra de desplazamiento la página se ensancha; se le deja ese hueco.
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPaddingRight;
    };
  }, [enabled]);
};
