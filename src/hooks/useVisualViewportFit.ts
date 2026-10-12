import { useEffect, type RefObject } from 'react';

/** Con más zoom que este, lo visible se encoge por el pellizco y no por el teclado. */
const MAX_UNZOOMED_SCALE = 1.01;

/**
 * Deja en el elemento `--viewport-top` y `--viewport-height` con lo que de verdad se ve en pantalla.
 * En teléfono el teclado no encoge la página, solo lo visible, y lo que va pegado abajo queda tapado;
 * con estos dos valores el CSS de una ventana puede ajustarse a lo visible (FEAT-39).
 */
export const useVisualViewportFit = (ref: RefObject<HTMLElement | null>, enabled: boolean = true): void => {
  useEffect(() => {
    const element = ref.current;
    const viewport = window.visualViewport;
    if (!enabled || !element || !viewport) return;

    const clear = () => {
      element.style.removeProperty('--viewport-top');
      element.style.removeProperty('--viewport-height');
    };
    const update = () => {
      if (viewport.scale > MAX_UNZOOMED_SCALE) {
        clear();
        return;
      }
      element.style.setProperty('--viewport-top', `${viewport.offsetTop}px`);
      element.style.setProperty('--viewport-height', `${viewport.height}px`);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      clear();
    };
  }, [ref, enabled]);
};
