import { useEffect, useState } from 'react';
import { SeasonalRepository } from '../../repositories/SeasonalRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { formatFromPrice, lowestThemedPriceCents } from '../../utils/landingPrices';
import { logger } from '../../utils/logger';

export interface LandingPrices {
  /** Precio de transformar una foto con IA (1 token), ya escrito; null si no se pudo leer. */
  aiPrice: string | null;
  /** Precio de la lotería temática más barata del catálogo; null si no hay o no se pudo leer. */
  themedPrice: string | null;
}

const NO_PRICES: LandingPrices = { aiPrice: null, themedPrice: null };

/** Los precios «desde» de inicio. La página no los espera: aparecen cuando llegan y, si fallan, no se muestran. */
export const useLandingPrices = (): LandingPrices => {
  const [prices, setPrices] = useState<LandingPrices>(NO_PRICES);

  useEffect(() => {
    let cancelled = false;

    TokenPricingRepository.getPricingOrNull('MXN')
      .then((cents) => {
        if (!cancelled) setPrices((current) => ({ ...current, aiPrice: formatFromPrice(cents) }));
      })
      .catch((error: unknown) => logger.warn('useLandingPrices: precio del token', error));

    SeasonalRepository.getCatalog()
      .then((catalog) => {
        if (cancelled || !catalog) return;
        const cents = lowestThemedPriceCents(catalog.loterias, new Date());
        setPrices((current) => ({ ...current, themedPrice: formatFromPrice(cents) }));
      })
      .catch((error: unknown) => logger.warn('useLandingPrices: precio de las temáticas', error));

    return () => {
      cancelled = true;
    };
  }, []);

  return prices;
};
