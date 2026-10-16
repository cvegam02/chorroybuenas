import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMiniCountdown } from '../../utils/offerBanner';
import { useOfferPromo, type ActivePromo } from './OfferPromoContext';
import './OfferPromoIndicator.css';

/** Cuánto dura el globo «La promo sigue aquí» después de minimizar. */
const HINT_MS = 3500;

/** El globo sale solo al minimizar en esta visita, no al recargar, y se va solo. */
function useStillHereHint(justMinimized: boolean): boolean {
  const [visible, setVisible] = useState(justMinimized);
  useEffect(() => {
    if (!justMinimized) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [justMinimized]);
  return visible && justMinimized;
}

/** La promo minimizada, si toca mostrarla; null si no hay o si el aviso completo está a la vista. */
function useMinimizedPromo() {
  const promoState = useOfferPromo();
  const hint = useStillHereHint(promoState?.justMinimized ?? false);
  if (!promoState?.promo || !promoState.minimized) return null;
  return { promo: promoState.promo, animate: promoState.justMinimized, hint, restore: promoState.restore };
}

const Flame = () => <span className="offer-promo__flame" aria-hidden="true">🔥</span>;

const MiniCount = ({ promo }: { promo: ActivePromo }) =>
  promo.countdown ? <span className="offer-promo__count">{formatMiniCountdown(promo.countdown)}</span> : null;

/**
 * Pantallas de 700 px o más: pestaña que cuelga del encabezado, a la derecha (FEAT-49, US A7).
 * Va dentro del `<header>`, así que se queda con él al bajar por la página.
 */
export const OfferPromoTab = () => {
  const { t } = useTranslation();
  const minimized = useMinimizedPromo();
  if (!minimized) return null;
  const { promo, animate, hint, restore } = minimized;

  return (
    <div className={`offer-promo-tab${animate ? ' offer-promo-tab--drop' : ''}`}>
      <button type="button" className="offer-promo-tab__button" onClick={restore} aria-label={t('offerBanner.reopen', { title: promo.title })}>
        <Flame />
        <span className="offer-promo-tab__title">{promo.title}</span>
        <MiniCount promo={promo} />
        <span className="offer-promo-tab__see" aria-hidden="true">{t('offerBanner.see')} ▾</span>
      </button>
      {hint && <span className="offer-promo__hint" role="status">{t('offerBanner.stillHere')}</span>}
    </div>
  );
};

/** Pantallas de menos de 700 px: pastilla dentro del encabezado, antes del botón principal (FEAT-49, US A7). */
export const OfferPromoPill = () => {
  const { t } = useTranslation();
  const minimized = useMinimizedPromo();
  if (!minimized) return null;
  const { promo, animate, hint, restore } = minimized;

  return (
    <span className={`offer-promo-pill${animate ? ' offer-promo-pill--pop' : ''}`}>
      <button type="button" className="offer-promo-pill__button" onClick={restore} aria-label={t('offerBanner.reopen', { title: promo.title })}>
        <Flame />
        <MiniCount promo={promo} />
        <span className="offer-promo-pill__dot" aria-hidden="true" />
      </button>
      {hint && <span className="offer-promo__hint offer-promo__hint--pill" role="status">{t('offerBanner.stillHere')}</span>}
    </span>
  );
};

/** El renglón «🔥 <título>» del menú de celular, mientras la promo está minimizada (US A7). */
export function useMenuPromo(): { label: string; open: () => void } | null {
  const promoState = useOfferPromo();
  if (!promoState?.promo || !promoState.minimized) return null;
  return { label: promoState.promo.title, open: promoState.restore };
}
