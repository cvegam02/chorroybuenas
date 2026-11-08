import type { NavigationType } from 'react-router-dom';

/**
 * Al entrar a otra página por un enlace o botón del sitio, se empieza arriba. Con «atrás» o «adelante» del
 * navegador (POP) se respeta dónde iba, y con un ancla (#mis-loterias) la página baja a ella (FEAT-61, US A3).
 */
export const shouldScrollToTop = (
  navigationType: NavigationType,
  previousPath: string | null,
  path: string,
  hash: string,
): boolean => navigationType !== 'POP' && previousPath !== null && previousPath !== path && hash === '';
