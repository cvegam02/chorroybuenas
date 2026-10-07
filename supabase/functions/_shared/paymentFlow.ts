import { buildCreditParams, type CreditParams, type PreferenceMetadata } from './credit.ts';
import {
  buildSeasonalDelivery, buildSeasonalPending, classifyUnapprovedStatus, type SeasonalDeliveryParams,
} from './seasonal.ts';

/** Acceso a Mercado Pago y a la base, inyectado para poder probar el flujo sin red. */
export interface PaymentDeps {
  /** GET a la API de MP. Devuelve null en 404 y lanza ante cualquier otro error. */
  mpGet: <T>(path: string) => Promise<T | null>;
  /** Compras previas del usuario. Lanza si la consulta falla. */
  countPurchases: (userId: string) => Promise<number>;
  /** RPC add_tokens_after_purchase (idempotente). Devuelve el saldo. Lanza si falla. */
  credit: (params: CreditParams) => Promise<number>;
  /** RPC deliver_seasonal_purchase (idempotente). Devuelve el estado de la compra. Lanza si falla. */
  deliverSeasonal: (params: SeasonalDeliveryParams) => Promise<SeasonalDeliveryStatus>;
  /** RPC record_pending_seasonal_purchase (idempotente). Devuelve el estado de la compra. Lanza si falla. */
  recordPendingSeasonal: (params: SeasonalDeliveryParams) => Promise<string>;
  /** RPC release_pending_seasonal_purchase. Devuelve si había un pendiente que quitar. Lanza si falla. */
  releasePendingSeasonal: (paymentId: string) => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
}

export interface Notification {
  topic: string | null;
  id: string | null;
  /** data.id tal como lo firma Mercado Pago (query string, o cuerpo si no viene en la URL). */
  signedDataId: string | null;
}

export interface ApprovedPayment {
  paymentId: string;
  payment: Record<string, unknown>;
  externalReference: string;
  preferenceId: string;
}

/** approved: la lotería quedó entregada. repeated: la cuenta ya la tenía; el pago se guarda para devolverlo. */
export type SeasonalDeliveryStatus = 'approved' | 'repeated';

/** Qué se hizo con un pago aprobado, según la marca de tipo de su preferencia. */
export type Credited =
  | { kind: 'tokens'; balance: number }
  | { kind: 'seasonal'; loteriaId: string; status: SeasonalDeliveryStatus };

export type SkipReason =
  | 'ignored'
  | 'payment_not_found'
  | 'not_approved'
  | 'missing_reference'
  | 'invalid_metadata';

export type Outcome<T> = { ok: true; value: T } | { ok: false; reason: SkipReason; status?: string };

interface MerchantOrder {
  payments?: Array<{ id: number | string; status?: string; status_detail?: string }>;
  external_reference?: string | null;
  preference_id?: string | null;
}

const ORDER_RETRY_DELAY_MS = 3000;
const MP_ID_RE = /^\d{1,20}$/;
const PREFERENCE_ID_RE = /^[\w-]{1,100}$/;
const SEASONAL_KIND = 'seasonal';
const TOKENS_KIND = 'tokens';

const asString = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : typeof v === 'number' ? String(v) : null;

function parseBody(contentType: string, bodyText: string): Record<string, unknown> {
  if (!bodyText) return {};
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(bodyText));
  }
  try {
    const parsed = JSON.parse(bodyText);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Unifica los formatos de notificación de MP: webhook JSON (type + data.id) e IPN (?topic=&id=). */
export function parseNotification(input: {
  method: string;
  url: URL;
  contentType: string;
  bodyText: string;
}): Notification {
  const body = input.method === 'POST' ? parseBody(input.contentType, input.bodyText) : {};
  const query = input.url.searchParams;

  const topic = asString(body.topic) ?? asString(body.type) ?? query.get('topic') ?? query.get('type');
  const bodyDataId = asString((body.data as { id?: unknown } | undefined)?.id);
  const resourceId = typeof body.resource === 'string' ? body.resource.match(/\/(\d+)$/)?.[1] ?? null : null;
  const id = bodyDataId ?? asString(body.id) ?? query.get('data.id') ?? query.get('id') ?? resourceId;

  return { topic, id, signedDataId: query.get('data.id') ?? bodyDataId };
}

/** Preferencia de un pago: la que trae el propio pago o, si no, la de su orden. */
async function resolvePreferenceId(deps: PaymentDeps, payment: Record<string, unknown>): Promise<string | null> {
  const own =
    asString((payment.metadata as { preference_id?: unknown } | undefined)?.preference_id) ??
    asString(payment.preference_id);
  if (own) return own;
  // Los pagos de Checkout Pro no traen la preferencia, pero sí su orden: se toma de ahí.
  // Sin esto solo la notificación de merchant_order podría acreditar.
  const orderId = asString((payment.order as { id?: unknown } | undefined)?.id);
  if (!orderId || !MP_ID_RE.test(orderId)) return null;
  const order = await deps.mpGet<MerchantOrder>(`/merchant_orders/${orderId}`);
  return asString(order?.preference_id);
}

/**
 * Consulta en MP el pago (o la orden) de una notificación y lo devuelve solo si está aprobado.
 * Nunca confía en el contenido de la notificación: solo usa su tema y su id.
 */
export async function findApprovedPayment(
  deps: PaymentDeps,
  notification: { topic: string | null; id: string | null },
): Promise<Outcome<ApprovedPayment>> {
  const { topic, id } = notification;
  if (!id || !MP_ID_RE.test(id) || (topic !== 'payment' && topic !== 'merchant_order')) {
    return { ok: false, reason: 'ignored' };
  }

  let paymentId: string;
  let payment: Record<string, unknown>;
  let externalReference: string | null;
  let preferenceId: string | null;

  if (topic === 'merchant_order') {
    let order = await deps.mpGet<MerchantOrder>(`/merchant_orders/${id}`);
    if (order && (order.payments ?? []).length === 0) {
      // La orden puede llegar antes de que MP le asocie el pago.
      await deps.sleep(ORDER_RETRY_DELAY_MS);
      order = await deps.mpGet<MerchantOrder>(`/merchant_orders/${id}`);
    }
    if (!order) return { ok: false, reason: 'payment_not_found' };
    const approved = (order.payments ?? []).find((p) => p.status === 'approved');
    if (!approved) {
      // Estado y motivo de cada intento de pago, para poder diagnosticar un rechazo desde los logs.
      const attempts = (order.payments ?? []).map((p) => `${p.status ?? '?'}/${p.status_detail ?? '-'}`);
      return { ok: false, reason: 'not_approved', status: attempts.join(', ') || 'sin_pagos' };
    }
    paymentId = String(approved.id);
    payment = approved as Record<string, unknown>;
    externalReference = asString(order.external_reference);
    preferenceId = asString(order.preference_id);
  } else {
    const found = await deps.mpGet<Record<string, unknown>>(`/v1/payments/${id}`);
    if (!found) return { ok: false, reason: 'payment_not_found' };
    if (found.status !== 'approved') {
      return { ok: false, reason: 'not_approved', status: asString(found.status) ?? 'unknown' };
    }
    paymentId = id;
    payment = found;
    externalReference = asString(found.external_reference);
    preferenceId = await resolvePreferenceId(deps, found);
  }

  if (!externalReference || !preferenceId) return { ok: false, reason: 'missing_reference' };
  return { ok: true, value: { paymentId, payment, externalReference, preferenceId } };
}

/**
 * Acredita un pago aprobado usando la metadata de la preferencia que creó nuestro servidor:
 * entrega la lotería si la preferencia está marcada como de temporada; si no lleva marca, suma tokens.
 * Es idempotente: repetirla devuelve el saldo (o el estado de la compra) sin volver a acreditar.
 */
export async function creditPayment(deps: PaymentDeps, approved: ApprovedPayment): Promise<Outcome<Credited>> {
  if (!PREFERENCE_ID_RE.test(approved.preferenceId)) return { ok: false, reason: 'invalid_metadata' };

  const preference = await deps.mpGet<{ metadata?: PreferenceMetadata }>(
    `/checkout/preferences/${approved.preferenceId}`,
  );
  const metadata = preference?.metadata;
  if (typeof metadata !== 'object' || metadata === null) return { ok: false, reason: 'invalid_metadata' };

  if (metadata.kind === SEASONAL_KIND) {
    const delivery = buildSeasonalDelivery({
      userId: approved.externalReference,
      paymentId: approved.paymentId,
      payment: approved.payment,
      metadata: metadata as Record<string, unknown>,
    });
    if (!delivery) return { ok: false, reason: 'invalid_metadata' };
    const status = await deps.deliverSeasonal(delivery);
    return { ok: true, value: { kind: 'seasonal', loteriaId: delivery.p_loteria_id, status } };
  }
  // Las preferencias sin marca son compras de tokens (incluye pagos en curso anteriores a la marca).
  if (metadata.kind !== undefined && metadata.kind !== null && metadata.kind !== TOKENS_KIND) {
    return { ok: false, reason: 'invalid_metadata' };
  }

  const previousPurchases = await deps.countPurchases(approved.externalReference);
  const params = buildCreditParams({
    userId: approved.externalReference,
    paymentId: approved.paymentId,
    status: 'approved',
    payment: approved.payment,
    metadata,
    isFirstPurchase: previousPurchases === 0,
  });
  if (!params) return { ok: false, reason: 'invalid_metadata' };

  return { ok: true, value: { kind: 'tokens', balance: await deps.credit(params) } };
}

export type UnapprovedTracking =
  | { tracked: 'pending'; loteriaId: string }
  | { tracked: 'released'; loteriaId: string }
  | { tracked: 'none' };

/**
 * Para un pago que no está aprobado: si es de una lotería de temporada, lo registra como «en proceso»
 * (efectivo o transferencia) o, si se rechazó o caducó, quita ese registro para que no bloquee una
 * nueva compra. Los pagos de tokens no se tocan. Con `ownerId` solo se atiende el pago de esa cuenta.
 */
export async function trackUnapprovedSeasonal(
  deps: PaymentDeps,
  input: { paymentId: string | null; ownerId?: string },
): Promise<UnapprovedTracking> {
  const none: UnapprovedTracking = { tracked: 'none' };
  const { paymentId } = input;
  if (!paymentId || !MP_ID_RE.test(paymentId)) return none;

  const payment = await deps.mpGet<Record<string, unknown>>(`/v1/payments/${paymentId}`);
  if (!payment) return none;
  const action = classifyUnapprovedStatus(payment.status);
  if (!action) return none;

  const userId = asString(payment.external_reference);
  if (!userId || (input.ownerId !== undefined && input.ownerId !== userId)) return none;

  const preferenceId = await resolvePreferenceId(deps, payment);
  if (!preferenceId || !PREFERENCE_ID_RE.test(preferenceId)) return none;
  const preference = await deps.mpGet<{ metadata?: PreferenceMetadata }>(`/checkout/preferences/${preferenceId}`);
  const metadata = preference?.metadata;
  if (typeof metadata !== 'object' || metadata === null) return none;

  const params = buildSeasonalPending({
    userId, paymentId, payment, metadata: metadata as Record<string, unknown>,
  });
  if (!params) return none;

  if (action === 'released') {
    await deps.releasePendingSeasonal(paymentId);
    return { tracked: 'released', loteriaId: params.p_loteria_id };
  }
  await deps.recordPendingSeasonal(params);
  return { tracked: 'pending', loteriaId: params.p_loteria_id };
}
