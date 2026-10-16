/** Fila de public.offers que lee create-payment-preference. */
export interface OfferRow {
  id: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  cancelled_at: string | null;
}

/** La oferta que se aplica a una compra: cuál y su porcentaje de descuento. */
export interface AppliedOffer {
  id: string;
  percent: number;
}

export const isOfferPercent = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 99;

/** Precio con descuento, redondeado al centavo (medio centavo sube). contexto-negocio.md §9. */
export function applyOfferDiscount(cents: number, percent: number): number {
  return Math.round((cents * (100 - percent)) / 100);
}

/** La oferta vigente en `now`: no cancelada, ya empezó y no ha terminado. */
export function selectCurrentOffer(rows: OfferRow[], now: Date): AppliedOffer | null {
  const t = now.getTime();
  const current = rows.find(
    (o) =>
      o.cancelled_at === null &&
      isOfferPercent(o.discount_percent) &&
      new Date(o.starts_at).getTime() <= t &&
      new Date(o.ends_at).getTime() > t,
  );
  return current ? { id: current.id, percent: current.discount_percent } : null;
}
