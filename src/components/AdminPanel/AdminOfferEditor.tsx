import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdminRepository } from '../../repositories/AdminRepository';
import { OfferRepository } from '../../repositories/OfferRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { aiCostPesosLabel } from '../../utils/adminPricing';
import { NEW_OFFER_PARAM } from '../../utils/adminOffers';
import { AdminOfferForm, type OfferEditorData } from './AdminOfferForm';
import './AdminOffers.css';

/** Lo que necesita la pantalla: todas las ofertas (para no cruzarlas), los packs activos y los precios. */
async function loadEditorData(): Promise<OfferEditorData | null> {
  const [offers, packs, pricing, aiCost, usdPerMxn] = await Promise.all([
    OfferRepository.getAdminOffers(),
    AdminRepository.getTokenPacks(),
    AdminRepository.getTokenPricing(),
    AdminRepository.getAiCostPerImage(),
    TokenPricingRepository.getExchangeRateMxnUsd(),
  ]);
  if (!offers) return null;
  return {
    offers,
    packs: packs.filter((p) => p.is_active),
    priceCents: pricing.find((p) => p.currency === 'MXN')?.price_per_token_cents ?? null,
    aiCostNote: aiCost != null && usdPerMxn > 0
      ? `Cada imagen de IA te sigue costando ${aiCostPesosLabel(aiCost, usdPerMxn)}.`
      : null,
  };
}

/** A1.2a — Oferta con banner (FEAT-49, US A2 y A4): carga lo necesario y muestra el formulario. */
export const AdminOfferEditor = ({ offerId }: { offerId: string }) => {
  const location = useLocation();
  const [data, setData] = useState<OfferEditorData | null>(null);
  const [failed, setFailed] = useState(false);
  // Aviso que deja el guardado de una oferta nueva al pasar a su dirección.
  const notice = (location.state as { notice?: { ok: boolean; text: string } } | null)?.notice ?? null;

  useEffect(() => {
    let current = true;
    setData(null);
    loadEditorData().then((loaded) => {
      if (!current) return;
      if (loaded) setData(loaded);
      else setFailed(true);
    });
    return () => {
      current = false;
    };
  }, [offerId]);

  const isNew = offerId === NEW_OFFER_PARAM;
  const offer = data?.offers.find((o) => o.id === offerId) ?? null;

  if (!data || (!isNew && !offer)) {
    return (
      <div className="admin-offer">
        <Link to="/admin" state={{ tab: 'precios' }} className="admin-offer__back">← Precios y promos</Link>
        {failed && <p className="admin-pricing__error" role="alert">No se pudo cargar la oferta. Recarga la página.</p>}
        {!failed && !data && <p className="admin-pricing__muted">Cargando la oferta…</p>}
        {data && <p className="admin-pricing__error" role="alert">Esta oferta no existe.</p>}
      </div>
    );
  }

  return <AdminOfferForm key={offerId} data={data} offer={offer} initialNotice={notice} />;
};
