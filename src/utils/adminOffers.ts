/**
 * Cálculos de las ofertas con banner (FEAT-49, US A2): estado, tabla de precios, fechas y validación.
 * Las fechas se muestran y se eligen en hora de Hermosillo, como el resto del Admin.
 */

import { durationLabel, type OfferBannerFields } from './offerBanner';
import { offerDiscountCents } from './offerPrice';

export { durationLabel, offerDiscountCents };

const TIME_ZONE = 'America/Hermosillo';
/** Sonora no cambia de horario: siempre UTC−7. */
const HERMOSILLO_OFFSET = '-07:00';
const MAX_NAME_LENGTH = 80;

/** La ruta de una oferta que todavía no existe. */
export const NEW_OFFER_PARAM = 'nueva';

/** Ruta de la pantalla de una oferta (A1.2a). */
export const offerPath = (id: string) => `/admin/ofertas/${id}`;

const dayFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', timeZone: TIME_ZONE });
const monthFormat = new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: TIME_ZONE });
const yearFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', timeZone: TIME_ZONE });
const inputFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE,
});

/** Lo que el Admin sabe de una oferta (tabla `offers`). */
export interface OfferDates {
  starts_at: string;
  ends_at: string;
  cancelled_at: string | null;
}

/** Una oferta con su banner (migraciones 053 y 055). */
export interface AdminOffer extends OfferDates, OfferBannerFields {
  id: string;
  name: string;
  discount_percent: number;
}

export interface OfferPack {
  id: string;
  base_tokens: number;
  bonus_tokens: number;
  price_cents: number;
}

export type OfferStatus = 'scheduled' | 'current' | 'ended' | 'cancelled';

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  scheduled: 'Programada',
  current: 'Vigente',
  ended: 'Terminada',
  cancelled: 'Cancelada',
};

export function offerStatus(offer: OfferDates, now: Date = new Date()): OfferStatus {
  if (offer.cancelled_at) return 'cancelled';
  const t = now.getTime();
  if (new Date(offer.starts_at).getTime() > t) return 'scheduled';
  if (new Date(offer.ends_at).getTime() <= t) return 'ended';
  return 'current';
}

/** Etiqueta del encabezado de la oferta: «Programada · empieza en 29 días», «Vigente · termina en 2 días 5 h». */
export function offerHeaderStatus(offer: OfferDates, now: Date = new Date()): string {
  const status = offerStatus(offer, now);
  if (status === 'scheduled') {
    return `Programada · empieza en ${durationLabel(new Date(offer.starts_at).getTime() - now.getTime(), false)}`;
  }
  if (status === 'current') {
    return `Vigente · termina en ${durationLabel(new Date(offer.ends_at).getTime() - now.getTime(), true)}`;
  }
  return OFFER_STATUS_LABELS[status];
}

const pesos = (cents: number) => `$${Number.isInteger(cents / 100) ? cents / 100 : (cents / 100).toFixed(2)}`;
const pesosWithCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export interface OfferPriceRow {
  key: string;
  label: string;
  bonus: string;
  normal: string;
  offer: string;
  perToken: string;
}

/**
 * Tabla «Precio normal / Con oferta / Por token» (maqueta): la cantidad libre y cada pack.
 * Por token = precio que paga ÷ tokens que recibe (con el regalo). Sin descuento válido, «—».
 */
export function offerPriceRows(
  pricePerTokenCents: number | null,
  packs: readonly OfferPack[],
  percent: number | null,
): OfferPriceRow[] {
  const discount = (cents: number) => (percent ? offerDiscountCents(cents, percent) : null);
  const rows: OfferPriceRow[] = [];
  if (pricePerTokenCents) {
    const offer = discount(pricePerTokenCents);
    rows.push({
      key: 'custom',
      label: 'Cantidad libre',
      bonus: '',
      normal: `${pesosWithCents(pricePerTokenCents)} c/u`,
      offer: offer === null ? '—' : `${pesosWithCents(offer)} c/u`,
      perToken: pesosWithCents(offer ?? pricePerTokenCents),
    });
  }
  for (const pack of packs) {
    const offer = discount(pack.price_cents);
    const total = pack.base_tokens + pack.bonus_tokens;
    rows.push({
      key: pack.id,
      label: `Pack ${pack.base_tokens}`,
      bonus: pack.bonus_tokens > 0 ? `(+${pack.bonus_tokens})` : '',
      normal: pesos(pack.price_cents),
      offer: offer === null ? '—' : pesos(offer),
      perToken: pesosWithCents(Math.round((offer ?? pack.price_cents) / total)),
    });
  }
  return rows;
}

/** Fechas de la tarjeta: «13 – 17 nov», «28 nov – 2 dic», con año si no es el actual. */
function offerDatesLabel(startsAt: string, endsAt: string, now: Date): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameYear = yearFormat.format(start) === yearFormat.format(end);
  const showYear = !sameYear || yearFormat.format(start) !== yearFormat.format(now);
  const day = (d: Date, withMonth: boolean, withYear: boolean) =>
    [dayFormat.format(d), withMonth ? monthFormat.format(d) : '', withYear ? yearFormat.format(d) : '']
      .filter(Boolean)
      .join(' ');
  const sameMonth = sameYear && monthFormat.format(start) === monthFormat.format(end);
  return `${day(start, !sameMonth, !sameYear)} – ${day(end, true, showYear)}`;
}

/** Renglón de la tarjeta en Precios y promos: «13 – 17 nov · tokens a $1.50». */
export function offerCardSummary(
  offer: Pick<AdminOffer, 'discount_percent' | 'starts_at' | 'ends_at'>,
  pricePerTokenCents: number | null,
  now: Date = new Date(),
): string {
  const dates = offerDatesLabel(offer.starts_at, offer.ends_at, now);
  if (!pricePerTokenCents) return dates;
  return `${dates} · tokens a ${pesosWithCents(offerDiscountCents(pricePerTokenCents, offer.discount_percent))}`;
}

/** «Desde» (AAAA-MM-DDTHH:mm en Hermosillo): empieza en ese minuto. */
export function startsAtIso(value: string): string | null {
  return value ? `${value}:00${HERMOSILLO_OFFSET}` : null;
}

/** «Hasta»: incluye todo ese minuto (23:59 termina a las 23:59:59). */
export function endsAtIso(value: string): string | null {
  return value ? `${value}:59${HERMOSILLO_OFFSET}` : null;
}

/** Fecha guardada → valor del campo de fecha y hora (AAAA-MM-DDTHH:mm en Hermosillo). */
export function datetimeInputFromIso(iso: string | null): string {
  if (!iso) return '';
  const parts = Object.fromEntries(inputFormat.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export interface OfferForm {
  name: string;
  percent: string;
  startsAt: string;
  endsAt: string;
}

export type OfferFormErrors = Partial<Record<keyof OfferForm, string>>;

export interface OfferInput {
  name: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
}

/** Revisa la parte «1 · El descuento» antes de guardar. */
export function validateOfferForm(form: OfferForm): { ok: true; value: OfferInput } | { ok: false; errors: OfferFormErrors } {
  const errors: OfferFormErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Escribe un nombre interno.';
  else if (name.length > MAX_NAME_LENGTH) errors.name = `El nombre puede tener hasta ${MAX_NAME_LENGTH} caracteres.`;

  const percent = /^\d+$/.test(form.percent.trim()) ? Number(form.percent.trim()) : NaN;
  if (!(percent >= 1 && percent <= 99)) errors.percent = 'El descuento va de 1% a 99%, sin decimales.';

  const startsAt = startsAtIso(form.startsAt);
  const endsAt = endsAtIso(form.endsAt);
  if (!startsAt) errors.startsAt = 'Elige cuándo empieza.';
  if (!endsAt) errors.endsAt = 'Elige cuándo termina.';
  else if (startsAt && new Date(endsAt) <= new Date(startsAt)) errors.endsAt = 'Tiene que terminar después de empezar.';

  if (Object.keys(errors).length > 0 || !startsAt || !endsAt) return { ok: false, errors };
  return { ok: true, value: { name, discount_percent: percent, starts_at: startsAt, ends_at: endsAt } };
}

/** La oferta no cancelada con la que se cruzarían estas fechas (la misma regla que la base), o null. */
export function overlappingOffer(
  offers: readonly AdminOffer[],
  startsAt: string,
  endsAt: string,
  excludeId: string | null,
): AdminOffer | null {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return (
    offers.find(
      (o) =>
        o.id !== excludeId &&
        !o.cancelled_at &&
        new Date(o.starts_at).getTime() < end &&
        start < new Date(o.ends_at).getTime(),
    ) ?? null
  );
}
