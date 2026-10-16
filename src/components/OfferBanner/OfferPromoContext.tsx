import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CurrentOfferRepository, type CurrentOffer } from '../../repositories/CurrentOfferRepository';
import {
  BANNER_TARGET_PATHS,
  bannerTexts,
  isBannerMinimized,
  minimizeBanner,
  restoreBanner,
  shouldShowBanner,
  timeLeft,
  type BannerPlacement,
  type TimeLeft,
} from '../../utils/offerBanner';

/** Cada cuánto se actualiza la cuenta regresiva (y se quita la promo si la oferta terminó). */
const TICK_MS = 60_000;

/** La promo lista para mostrarse en la pantalla actual. */
export interface ActivePromo {
  title: string;
  text: string;
  button: string;
  videoUrl: string;
  imageUrl: string;
  targetPath: string;
  /** Lo que falta para que termine; null si la oferta no lleva cuenta regresiva. */
  countdown: TimeLeft | null;
}

interface OfferPromoValue {
  /** Null si no hay oferta vigente con banner en esta pantalla. */
  promo: ActivePromo | null;
  minimized: boolean;
  /** Se acaba de minimizar en esta visita: el indicador entra con animación y su globo. */
  justMinimized: boolean;
  /** Se acaba de reabrir desde el indicador: el aviso sale sin esperar. */
  justRestored: boolean;
  minimize: () => void;
  restore: () => void;
  /** La pantalla con aviso (Inicio o Mi cuenta) avisa que está abierta; null al salir. */
  setPlacement: (placement: BannerPlacement | null) => void;
}

const OfferPromoContext = createContext<OfferPromoValue | null>(null);

const browserStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Pide la oferta vigente la primera vez que se abre una pantalla con aviso; no en todo el sitio. */
function useCurrentOffer(wanted: boolean): CurrentOffer | null {
  const [offer, setOffer] = useState<CurrentOffer | null>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!wanted || requested) return;
    setRequested(true);
    CurrentOfferRepository.getCurrentOffer().then(setOffer);
  }, [wanted, requested]);

  return offer;
}

function useMinuteClock(running: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [running]);
  return now;
}

/**
 * La promo de la oferta vigente, compartida por el aviso flotante y el indicador del encabezado
 * (FEAT-49, US A6 y A7). Cerrar el aviso lo minimiza al encabezado; la promo solo se va cuando termina la oferta.
 */
export const OfferPromoProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  const [placement, setPlacement] = useState<BannerPlacement | null>(null);
  const offer = useCurrentOffer(placement !== null);
  const now = useMinuteClock(offer !== null);
  const [minimized, setMinimized] = useState(false);
  const [justMinimized, setJustMinimized] = useState(false);
  const [justRestored, setJustRestored] = useState(false);

  useEffect(() => {
    if (offer) setMinimized(isBannerMinimized(browserStorage(), offer.id));
  }, [offer]);

  const minimize = useCallback(() => {
    if (!offer) return;
    minimizeBanner(browserStorage(), offer.id);
    setMinimized(true);
    setJustMinimized(true);
    setJustRestored(false);
  }, [offer]);

  const restore = useCallback(() => {
    if (!offer) return;
    restoreBanner(browserStorage(), offer.id);
    setMinimized(false);
    setJustMinimized(false);
    setJustRestored(true);
  }, [offer]);

  const promo = useMemo(() => buildPromo(offer, placement, now, i18n.language), [offer, placement, now, i18n.language]);

  const value = useMemo(
    () => ({ promo, minimized, justMinimized, justRestored, minimize, restore, setPlacement }),
    [promo, minimized, justMinimized, justRestored, minimize, restore],
  );

  return <OfferPromoContext.Provider value={value}>{children}</OfferPromoContext.Provider>;
};

/** Arma la promo si la oferta tiene banner en esta pantalla, con sus archivos, y no ha terminado. */
function buildPromo(offer: CurrentOffer | null, placement: BannerPlacement | null, now: Date, language: string): ActivePromo | null {
  if (!offer || !placement || !shouldShowBanner(offer, placement)) return null;
  if (!offer.banner_video_path || !offer.banner_image_path) return null;
  const left = timeLeft(offer.ends_at, offer.starts_at, now);
  // La oferta terminó mientras la página estaba abierta: aviso e indicador se quitan solos.
  if (!left) return null;
  const texts = bannerTexts(offer, language);
  return {
    ...texts,
    videoUrl: CurrentOfferRepository.bannerFileUrl(offer.banner_video_path),
    imageUrl: CurrentOfferRepository.bannerFileUrl(offer.banner_image_path),
    targetPath: BANNER_TARGET_PATHS[offer.banner_target],
    countdown: offer.banner_countdown ? left : null,
  };
}

/** La promo compartida. Fuera del proveedor (pruebas, vista previa) no hay promo. */
export function useOfferPromo(): OfferPromoValue | null {
  return useContext(OfferPromoContext);
}
