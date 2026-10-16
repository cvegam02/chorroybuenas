import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OfferRepository } from '../../repositories/OfferRepository';
import { bannerPlacesLabel } from '../../utils/offerBanner';
import {
  NEW_OFFER_PARAM,
  OFFER_STATUS_LABELS,
  offerCardSummary,
  offerPath,
  offerStatus,
  type AdminOffer,
} from '../../utils/adminOffers';
import './AdminOffers.css';

interface AdminOffersProps {
  priceCents: number | null;
  titleId: string;
}

/** Sección «Ofertas con banner» de Precios y promos (FEAT-49, US A2). */
export const AdminOffers = ({ priceCents, titleId }: AdminOffersProps) => {
  const [offers, setOffers] = useState<AdminOffer[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    OfferRepository.getAdminOffers().then((rows) => {
      if (!current) return;
      if (rows) setOffers(rows);
      else setFailed(true);
    });
    return () => {
      current = false;
    };
  }, []);

  const now = new Date();

  return (
    <>
      <div className="admin-pricing__section-head">
        <h3 id={titleId} className="admin-pricing__section-title">Ofertas con banner</h3>
        <Link to={offerPath(NEW_OFFER_PARAM)} className="admin-pricing__btn admin-offers__new">
          + Nueva oferta
        </Link>
      </div>

      {failed && (
        <p className="admin-pricing__error" role="alert">No se pudieron cargar las ofertas. Recarga la página.</p>
      )}
      {!failed && offers === null && <p className="admin-pricing__muted">Cargando ofertas…</p>}
      {offers?.length === 0 && (
        <p className="admin-pricing__muted">Todavía no hay ofertas. Crea una para bajar el precio de los tokens unos días.</p>
      )}

      {offers && offers.length > 0 && (
        <ul className="admin-offers__list">
          {offers.map((offer) => {
            const status = offerStatus(offer, now);
            return (
              <li key={offer.id}>
                <Link to={offerPath(offer.id)} className="admin-pricing__card admin-offers__card">
                  {offer.banner_image_path ? (
                    <img
                      className="admin-offers__thumb admin-offers__thumb--image"
                      src={OfferRepository.bannerFileUrl(offer.banner_image_path)}
                      alt=""
                    />
                  ) : (
                    <span className="admin-offers__thumb" aria-hidden="true" />
                  )}
                  <span className="admin-offers__text">
                    <span className="admin-offers__name">
                      {offer.name} · −{offer.discount_percent}%
                    </span>
                    <span className="admin-pricing__muted">
                      {offerCardSummary(offer, priceCents, now)} · {bannerPlacesLabel(offer)}
                    </span>
                  </span>
                  <span className={`admin-offers__status admin-offers__status--${status}`}>
                    {OFFER_STATUS_LABELS[status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="admin-pricing__muted">
        Durante una oferta, el descuento se aplica a la cantidad libre y a todos los packs. Los códigos y la promo de
        primera compra siguen dando sus tokens extra encima.
      </p>
    </>
  );
};
