import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CurrentOfferRepository, type CurrentOffer } from '../../repositories/CurrentOfferRepository';
import {
  BANNER_TARGET_PATHS,
  bannerTexts,
  dismissBanner,
  isBannerDismissed,
  shouldShowBanner,
  timeLeft,
  type BannerPlacement,
} from '../../utils/offerBanner';
import { OfferBanner } from './OfferBanner';

/** Cada cuánto se actualiza la cuenta regresiva (y se quita el banner si la oferta terminó). */
const TICK_MS = 60_000;

const browserStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * El banner de la oferta vigente arriba de Inicio o de Mi cuenta (FEAT-49, US A5, decisiones 11 a 13).
 * Se pide ya en el navegador: la página pre-generada de Inicio no lo lleva.
 */
export const OfferBannerSlot = ({ placement }: { placement: BannerPlacement }) => {
  const { i18n } = useTranslation();
  const [offer, setOffer] = useState<CurrentOffer | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let current = true;
    CurrentOfferRepository.getCurrentOffer().then((found) => {
      if (!current || !found) return;
      setDismissed(isBannerDismissed(browserStorage(), found.id));
      setOffer(found);
    });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!offer) return;
    const timer = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [offer]);

  if (!offer || !shouldShowBanner(offer, placement, dismissed) || !offer.banner_video_path || !offer.banner_image_path) {
    return null;
  }
  const left = timeLeft(offer.ends_at, offer.starts_at, now);
  // La oferta terminó mientras la página estaba abierta: el banner se quita solo.
  if (!left) return null;

  const texts = bannerTexts(offer, i18n.language);
  const close = () => {
    dismissBanner(browserStorage(), offer.id);
    setDismissed(true);
  };

  return (
    <div className={`offer-banner-slot offer-banner-slot--${placement}`}>
      <OfferBanner
        title={texts.title}
        text={texts.text}
        button={texts.button}
        videoUrl={CurrentOfferRepository.bannerFileUrl(offer.banner_video_path)}
        imageUrl={CurrentOfferRepository.bannerFileUrl(offer.banner_image_path)}
        countdown={offer.banner_countdown ? left : null}
        targetPath={BANNER_TARGET_PATHS[offer.banner_target]}
        onClose={close}
      />
    </div>
  );
};
