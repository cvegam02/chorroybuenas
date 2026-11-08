import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { shouldScrollToTop } from '../utils/scrollOnNavigate';

/** Lleva la página arriba al cambiar de pantalla (FEAT-61, US A3). */
export const useScrollToTopOnNavigate = (): void => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (shouldScrollToTop(navigationType, previousPath.current, pathname, hash)) window.scrollTo(0, 0);
    previousPath.current = pathname;
  }, [navigationType, pathname, hash]);
};
