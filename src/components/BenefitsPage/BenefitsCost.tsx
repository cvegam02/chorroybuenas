import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaCoins } from 'react-icons/fa';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { formatFromPrice } from '../../utils/landingPrices';
import { logger } from '../../utils/logger';
import { lowestPricePerPhotoCents } from '../../utils/tokenPacks';

const POINTS = ['oneToken', 'noExpiry', 'giftPacks', 'securePayment'] as const;

interface BenefitsCostProps {
  /** Tokens de regalo de una cuenta nueva; sin ellos no sale la línea de las fotos gratis. */
  welcomeTokens: number | null;
}

/**
 * «¿Cuánto cuesta?» (FEAT-33, US A7): el precio «desde» por foto y el enlace a los paquetes, que
 * solo se muestran en Comprar tokens. Si los precios no se pueden leer, solo falta esa línea.
 */
export const BenefitsCost = ({ welcomeTokens }: BenefitsCostProps) => {
  const { t } = useTranslation();
  const [fromPrice, setFromPrice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([TokenPricingRepository.getPacksOrNull(), TokenPricingRepository.getPricingOrNull('MXN')])
      .then(([packs, pricePerTokenCents]) => {
        if (!cancelled) setFromPrice(formatFromPrice(lowestPricePerPhotoCents(packs, pricePerTokenCents)));
      })
      .catch((error: unknown) => logger.warn('BenefitsCost:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="landing-section" aria-labelledby="benefits-cost-title">
      <div className="landing-section__inner">
        <div className="benefits-cost">
          <div className="benefits-cost__summary">
            <span className="benefits-cost__icon">
              <FaCoins aria-hidden="true" />
            </span>
            <div className="benefits-cost__text">
              <h2 id="benefits-cost-title" className="benefits-cost__label">
                {t('landing.benefitsPage.cost.label')}
              </h2>
              {fromPrice && (
                <p className="benefits-cost__price">
                  {t('landing.benefitsPage.cost.priceBefore')}{' '}
                  <span className="benefits-cost__amount">
                    {t('landing.benefitsPage.cost.amount', { price: fromPrice })}
                  </span>{' '}
                  {t('landing.benefitsPage.cost.priceAfter')}
                </p>
              )}
              {welcomeTokens !== null && (
                <p className="benefits-cost__gift">{t('landing.benefitsPage.cost.gift', { count: welcomeTokens })}</p>
              )}
            </div>
          </div>
          <ul className="benefits-cost__points">
            {POINTS.map((point) => (
              <li key={point}>
                <FaCheck aria-hidden="true" />
                {t(`landing.benefitsPage.cost.points.${point}`)}
              </li>
            ))}
          </ul>
          <Link to="/comprar-tokens" className="benefits-cost__button">
            {t('landing.benefitsPage.cost.button')} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
