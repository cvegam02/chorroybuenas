import { fail, isUuid, type ParseResult } from './validation.ts';

/** Precio mínimo de una lotería de temporada: $10.00 MXN (el mismo tope que impone la base). */
const MIN_PRICE_CENTS = 1000;
const MAX_APP_URL_LENGTH = 500;

/** Lo que create-seasonal-preference lee de seasonal_loterias (con service role). */
export interface SeasonalLoteriaRow {
  id: string;
  name_es: string;
  price_cents: number | null;
  is_published: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

/** Lo que se cobra: la lotería y su precio al iniciar el pago. */
export interface SeasonalItem {
  loteriaId: string;
  name: string;
  amountCents: number;
}

/** Metadata que create-seasonal-preference guarda en la preferencia de Mercado Pago. */
export interface SeasonalMetadata {
  kind: 'seasonal';
  user_id: string;
  loteria_id: string;
  amount_cents: number;
}

/** Parámetros de la RPC deliver_seasonal_purchase. */
export interface SeasonalDeliveryParams {
  p_user_id: string;
  p_loteria_id: string;
  p_amount_cents: number;
  p_payment_provider: 'mercadopago';
  p_payment_id: string;
  p_payment_metadata: Record<string, unknown>;
}

export type SeasonalPurchaseError = 'NOT_AVAILABLE' | 'ALREADY_OWNED' | 'PAYMENT_PENDING';

/** Valida el cuerpo de create-seasonal-preference. El precio nunca se lee del navegador. */
export function parseSeasonalPreferenceRequest(
  body: unknown,
): ParseResult<{ loteriaId: string; appUrl: string | null }> {
  if (typeof body !== 'object' || body === null) return fail('Body inválido.');
  const { loteria_id, app_url } = body as Record<string, unknown>;
  if (!isUuid(loteria_id)) return fail('loteria_id inválido.');
  const appUrl = typeof app_url === 'string' && app_url.length <= MAX_APP_URL_LENGTH ? app_url : null;
  return { ok: true, value: { loteriaId: loteria_id, appUrl } };
}

/** Visible: publicada, ya empezó (o no tiene inicio) y no ha terminado (o no tiene fin). */
function isVisible(loteria: SeasonalLoteriaRow, now: Date): boolean {
  if (!loteria.is_published) return false;
  if (loteria.valid_from && new Date(loteria.valid_from).getTime() > now.getTime()) return false;
  if (loteria.valid_until && new Date(loteria.valid_until).getTime() <= now.getTime()) return false;
  return true;
}

/**
 * Decide si se puede iniciar el cobro: la lotería debe ser visible, y la cuenta no debe tenerla ya
 * ni tener un pago en proceso por ella.
 */
export function checkSeasonalPurchase(input: {
  loteria: SeasonalLoteriaRow | null;
  alreadyOwned: boolean;
  hasPending: boolean;
  now: Date;
}): { ok: true; value: SeasonalItem } | { ok: false; error: SeasonalPurchaseError } {
  if (input.alreadyOwned) return { ok: false, error: 'ALREADY_OWNED' };
  if (input.hasPending) return { ok: false, error: 'PAYMENT_PENDING' };
  const { loteria } = input;
  if (!loteria || !isVisible(loteria, input.now)) return { ok: false, error: 'NOT_AVAILABLE' };
  const price = loteria.price_cents;
  if (typeof price !== 'number' || !Number.isInteger(price) || price < MIN_PRICE_CENTS) {
    return { ok: false, error: 'NOT_AVAILABLE' };
  }
  return { ok: true, value: { loteriaId: loteria.id, name: loteria.name_es, amountCents: price } };
}

/** Cuerpo de POST /checkout/preferences para una lotería de temporada. */
export function buildSeasonalPreference(input: {
  item: SeasonalItem;
  userId: string;
  appUrl: string;
  notificationUrl: string;
}) {
  const { item, userId, appUrl } = input;
  const metadata: SeasonalMetadata = {
    kind: 'seasonal',
    user_id: userId,
    loteria_id: item.loteriaId,
    amount_cents: item.amountCents,
  };
  const returnUrl = `${appUrl}/temporada/${item.loteriaId}`;

  return {
    items: [
      {
        title: `Lotería de temporada - ${item.name}`,
        description: 'Descarga digital en PDF',
        quantity: 1,
        unit_price: item.amountCents / 100, // MP espera pesos, no centavos
        currency_id: 'MXN',
      },
    ],
    back_urls: {
      success: `${returnUrl}?success=1&payment_id={payment_id}`,
      failure: `${returnUrl}?cancel=1`,
      pending: `${returnUrl}?pending=1&payment_id={payment_id}`,
    },
    auto_return: 'approved',
    external_reference: userId,
    notification_url: input.notificationUrl,
    metadata,
  };
}

interface SeasonalPaymentInput {
  userId: string;
  paymentId: string;
  payment: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/** Parámetros comunes de las RPC de compra, o null si la metadata es inválida o el pago es de otra cuenta. */
function readSeasonalPayment(input: SeasonalPaymentInput): SeasonalDeliveryParams | null {
  const { metadata, userId } = input;
  const loteriaId = metadata.loteria_id;
  const amountCents = metadata.amount_cents;

  if (metadata.kind !== 'seasonal') return null;
  if (!isUuid(userId) || metadata.user_id !== userId) return null;
  if (!isUuid(loteriaId)) return null;
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents < MIN_PRICE_CENTS) {
    return null;
  }

  return {
    p_user_id: userId,
    p_loteria_id: loteriaId,
    p_amount_cents: amountCents,
    p_payment_provider: 'mercadopago',
    p_payment_id: input.paymentId,
    p_payment_metadata: input.payment,
  };
}

/**
 * Traduce un pago aprobado + la metadata de su preferencia a los parámetros de deliver_seasonal_purchase.
 * Devuelve null si la metadata es inválida, si el pago es de otra cuenta, o si el monto pagado
 * no se conoce o es menor al precio con que inició el pago.
 */
export function buildSeasonalDelivery(input: SeasonalPaymentInput): SeasonalDeliveryParams | null {
  const params = readSeasonalPayment(input);
  if (!params) return null;

  const paid = input.payment.transaction_amount;
  if (typeof paid !== 'number' || Math.round(paid * 100) < params.p_amount_cents) return null;
  return params;
}

/**
 * Parámetros de record_pending_seasonal_purchase para un pago en proceso (efectivo o transferencia).
 * No se compara el monto: todavía no se ha pagado; se comprueba al aprobarse.
 */
export function buildSeasonalPending(input: SeasonalPaymentInput): SeasonalDeliveryParams | null {
  return readSeasonalPayment(input);
}

const PENDING_STATUSES: readonly unknown[] = ['pending', 'in_process', 'authorized'];
const RELEASED_STATUSES: readonly unknown[] = ['rejected', 'cancelled'];

/**
 * Qué hacer con un pago que no está aprobado: `pending` si sigue en proceso, `released` si ya no va
 * a completarse (rechazado, cancelado o caducado). Los devueltos no se tocan aquí: null.
 */
export function classifyUnapprovedStatus(status: unknown): 'pending' | 'released' | null {
  if (PENDING_STATUSES.includes(status)) return 'pending';
  if (RELEASED_STATUSES.includes(status)) return 'released';
  return null;
}
