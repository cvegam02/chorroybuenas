/** Resultado de pedir al servidor que acredite un pago al volver de Mercado Pago. */
export type CreditOutcome = 'credited' | 'processing';

const PAYMENT_ID_RE = /^\d{1,20}$/;

/** Los identificadores de pago de Mercado Pago son solo dígitos. */
export function isPaymentId(value: string | null | undefined): value is string {
  return typeof value === 'string' && PAYMENT_ID_RE.test(value);
}

/**
 * Lee la respuesta de la función credit-payment-on-return.
 * Solo es "acreditado" si el servidor lo confirma con 200 y credited: true. Cualquier otra
 * respuesta se trata como "en proceso": el aviso de Mercado Pago acreditará de todos modos,
 * y la página nunca debe afirmar que hay tokens que el servidor no confirmó.
 */
export function interpretCreditResponse(httpStatus: number, body: unknown): CreditOutcome {
  if (httpStatus !== 200) return 'processing';
  if (typeof body !== 'object' || body === null) return 'processing';
  return (body as { credited?: unknown }).credited === true ? 'credited' : 'processing';
}
