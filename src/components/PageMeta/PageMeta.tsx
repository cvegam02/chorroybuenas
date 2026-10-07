import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applyPageMeta, resolvePageMeta } from '../../utils/pageMeta';

/**
 * Pone título, descripción y dirección oficial según la página abierta.
 * Va antes de las rutas: una página que ponga su propio título lo hace después y gana.
 */
export const PageMeta = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    applyPageMeta(document, resolvePageMeta(pathname, t));
  }, [pathname, t]);

  return null;
};
