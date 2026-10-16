import { useEffect } from 'react';
import type { BannerPlacement } from '../../utils/offerBanner';
import { OfferBanner } from './OfferBanner';
import { useOfferPromo } from './OfferPromoContext';

/**
 * El aviso flotante de la oferta vigente en Inicio o en Mi cuenta (FEAT-49, US A5 a A7, decisiones 11 a 13).
 * Le dice al proveedor en qué pantalla está; minimizado, la promo vive en el encabezado.
 * Se pide ya en el navegador: la página pre-generada de Inicio no lo lleva.
 */
export const OfferBannerSlot = ({ placement }: { placement: BannerPlacement }) => {
  const promoState = useOfferPromo();
  const setPlacement = promoState?.setPlacement;

  useEffect(() => {
    if (!setPlacement) return;
    setPlacement(placement);
    return () => setPlacement(null);
  }, [placement, setPlacement]);

  if (!promoState?.promo || promoState.minimized) return null;
  const { promo, justRestored, minimize } = promoState;

  return (
    <OfferBanner
      title={promo.title}
      text={promo.text}
      button={promo.button}
      videoUrl={promo.videoUrl}
      imageUrl={promo.imageUrl}
      countdown={promo.countdown}
      targetPath={promo.targetPath}
      immediate={justRestored}
      onClose={minimize}
    />
  );
};
