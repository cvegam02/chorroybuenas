import { useEffect, useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { AdminOffers } from './AdminOffers';
import { AdminPricingBasics } from './AdminPricingBasics';
import { AdminPromotions } from './AdminPromotions';
import { AdminTokenPacks } from './AdminTokenPacks';
import './AdminSales.css';
import './AdminPricing.css';

const CURRENCY = 'MXN';

/** Pestaña Precios y promos (FEAT-46): junta Promociones y Packs de tokens; desde FEAT-49, también las ofertas. */
export const AdminPricing = () => {
  // El precio por token lo usan «Lo básico» y el ahorro de cada pack (US A3).
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [priceError, setPriceError] = useState(false);

  useEffect(() => {
    let current = true;
    AdminRepository.getTokenPricing().then((pricing) => {
      if (!current) return;
      const mxn = pricing.find((p) => p.currency === CURRENCY);
      if (mxn) setPriceCents(mxn.price_per_token_cents);
      else setPriceError(true);
    });
    return () => {
      current = false;
    };
  }, []);

  return (
    <div className="admin-sales">
      <header className="admin-sales__header">
        <div>
          <h2 className="admin-sales__title">Precios y promociones</h2>
          <p className="admin-sales__subtitle">Todo lo que define cuánto paga un cliente y cuántos tokens recibe</p>
        </div>
      </header>

      <section className="admin-pricing__section" aria-labelledby="admin-pricing-basics">
        <h3 id="admin-pricing-basics" className="admin-pricing__section-title">Lo básico</h3>
        <AdminPricingBasics priceCents={priceCents} priceError={priceError} onPriceSaved={setPriceCents} />
      </section>

      <section className="admin-pricing__section" aria-labelledby="admin-pricing-packs">
        <AdminTokenPacks priceCents={priceCents} titleId="admin-pricing-packs" />
      </section>

      <section className="admin-pricing__section" aria-labelledby="admin-pricing-offers">
        <AdminOffers priceCents={priceCents} titleId="admin-pricing-offers" />
      </section>

      <section className="admin-pricing__section" aria-labelledby="admin-pricing-promos">
        <AdminPromotions titleId="admin-pricing-promos" />
      </section>
    </div>
  );
};
