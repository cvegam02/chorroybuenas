/**
 * Datos de un pago de Mercado Pago en español, para el detalle de una venta (FEAT-44, US A3).
 * Lo que no está en estas tablas se muestra tal cual: no se inventa una traducción.
 * Códigos: https://www.mercadopago.com.mx/developers/es/docs (payment_type_id, payment_method_id, status_detail).
 */

const PAYMENT_TYPES: Record<string, string> = {
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  prepaid_card: 'Tarjeta prepagada',
  ticket: 'Efectivo',
  atm: 'Pago en cajero',
  bank_transfer: 'Transferencia',
  account_money: 'Dinero en Mercado Pago',
  digital_currency: 'Mercado Crédito',
};

const PAYMENT_METHODS: Record<string, string> = {
  visa: 'Visa',
  debvisa: 'Visa',
  master: 'Mastercard',
  debmaster: 'Mastercard',
  amex: 'American Express',
  carnet: 'Carnet',
  debcarnet: 'Carnet',
  oxxo: 'OXXO',
  paycash: 'PayCash',
  '7eleven': '7-Eleven',
  bancomer: 'BBVA',
  banamex: 'Citibanamex',
  serfin: 'Santander',
  mercadopagocard: 'Tarjeta Mercado Pago',
};

/** Tipos que no necesitan marca: el método repite el tipo. */
const NO_BRAND = new Set(['account_money', 'digital_currency']);

/** «Tarjeta de débito · Visa», «Efectivo · OXXO», «Transferencia SPEI»; nulo si no hay datos. */
export function paymentMethodLabel(type: string | null, method: string | null): string | null {
  if (!type && !method) return null;
  if (type === 'bank_transfer' && method === 'clabe') return 'Transferencia SPEI';
  const typeLabel = type ? PAYMENT_TYPES[type] ?? type : null;
  if (type && NO_BRAND.has(type)) return typeLabel;
  const methodLabel = method ? PAYMENT_METHODS[method] ?? method : null;
  return [typeLabel, methodLabel].filter(Boolean).join(' · ');
}

const RESULTS: Record<string, string> = {
  accredited: 'Acreditado',
  pending_contingency: 'En revisión por Mercado Pago',
  pending_review_manual: 'En revisión manual de Mercado Pago',
  pending_waiting_payment: 'Esperando el pago',
  pending_waiting_transfer: 'Esperando la transferencia',
  pending_capture: 'Autorizado, falta cobrarlo',
  cc_rejected_insufficient_amount: 'Rechazado por fondos insuficientes',
  cc_rejected_bad_filled_card_number: 'Rechazado: número de tarjeta incorrecto',
  cc_rejected_bad_filled_date: 'Rechazado: fecha de vencimiento incorrecta',
  cc_rejected_bad_filled_security_code: 'Rechazado: código de seguridad incorrecto',
  cc_rejected_bad_filled_other: 'Rechazado: datos de la tarjeta incorrectos',
  cc_rejected_call_for_authorize: 'Rechazado: el cliente debe autorizarlo con su banco',
  cc_rejected_card_disabled: 'Rechazado: la tarjeta no está activada',
  cc_rejected_duplicated_payment: 'Rechazado: pago duplicado',
  cc_rejected_high_risk: 'Rechazado por riesgo de fraude',
  cc_rejected_max_attempts: 'Rechazado: demasiados intentos',
  cc_rejected_blacklist: 'Rechazado: tarjeta bloqueada',
  cc_rejected_other_reason: 'Rechazado por el banco',
  rejected_by_bank: 'Rechazado por el banco',
  expired: 'Venció sin pagarse',
  by_collector: 'Cancelado por nosotros',
  by_payer: 'Cancelado por el cliente',
  refunded: 'Devuelto al cliente',
  partially_refunded: 'Devuelto en parte',
  in_process: 'En proceso',
};

/** Resultado del pago (status_detail) en español; nulo si no hay datos. */
export function paymentResultLabel(statusDetail: string | null): string | null {
  if (!statusDetail) return null;
  return RESULTS[statusDetail] ?? statusDetail;
}
