import { buildCreditParams, type CreditParams, type PreferenceMetadata } from './credit.ts';

/** Acceso a Mercado Pago y a la base, inyectado para poder probar el flujo sin red. */
export interface PaymentDeps {
  /** GET a la API de MP. Devuelve null en 404 y lanza ante cualquier otro error. */
  mpGet: <T>(path: string) => Promise<T | null>;
  /** Compras previas del usuario. Lanza si la consulta falla. */
  countPurchases: (userId: string) => Promise<number>;
  /** RPC add_tokens_after_purchase (idempotente). Devuelve el saldo. Lanza si falla. */
  credit: (params: CreditParams) => Promise<number>;
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
    preferenceId =
      asString((found.metadata as { preference_id?: unknown } | undefined)?.preference_id) ??
      asString(found.preference_id);
  }

  if (!externalReference || !preferenceId) return { ok: false, reason: 'missing_reference' };
  return { ok: true, value: { paymentId, payment, externalReference, preferenceId } };
}

/**
 * Acredita un pago aprobado usando la metadata de la preferencia que creó nuestro servidor.
 * La acreditación es idempotente: repetirla devuelve el saldo sin volver a sumar.
 */
export async function creditPayment(deps: PaymentDeps, approved: ApprovedPayment): Promise<Outcome<number>> {
  if (!PREFERENCE_ID_RE.test(approved.preferenceId)) return { ok: false, reason: 'invalid_metadata' };

  const preference = await deps.mpGet<{ metadata?: PreferenceMetadata }>(
    `/checkout/preferences/${approved.preferenceId}`,
  );
  const metadata = preference?.metadata;
  if (typeof metadata !== 'object' || metadata === null) return { ok: false, reason: 'invalid_metadata' };

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

  return { ok: true, value: await deps.credit(params) };
}
