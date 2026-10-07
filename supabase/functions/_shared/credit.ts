/** Metadata que create-payment-preference guarda en la preferencia de Mercado Pago. */
export interface PreferenceMetadata {
  /** Tipo de compra. Ausente en las preferencias de tokens: sin marca, se trata como tokens. */
  kind?: string;
  user_id?: string;
  pack_id?: string | null;
  base_tokens?: number;
  bonus_tokens?: number;
  promotion_bonus?: number;
  total_tokens?: number;
  amount_cents?: number;
  promotion_id?: string | null;
  /** Ausente en preferencias creadas antes de este cambio: se trata como 'first_purchase'. */
  promotion_type?: 'code' | 'first_purchase' | null;
}

/** Parámetros de la RPC add_tokens_after_purchase. */
export interface CreditParams {
  p_user_id: string;
  p_tokens_to_add: number;
  p_pack_id: string | null;
  p_base_tokens: number;
  p_bonus_tokens: number;
  p_total_tokens: number;
  p_amount_cents: number;
  p_payment_provider: 'mercadopago';
  p_payment_id: string;
  p_payment_status: string;
  p_payment_metadata: Record<string, unknown>;
  p_promotion_ids: string[] | null;
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/**
 * Traduce un pago aprobado + la metadata de su preferencia a los parámetros de add_tokens_after_purchase.
 * Devuelve null si la metadata es inválida o el monto pagado es menor al esperado.
 */
export function buildCreditParams(input: {
  userId: string;
  paymentId: string;
  status: string;
  payment: Record<string, unknown>;
  metadata: PreferenceMetadata;
  isFirstPurchase: boolean;
}): CreditParams | null {
  const { metadata, payment } = input;
  const baseTokens = metadata.base_tokens ?? 0;
  const packBonus = metadata.bonus_tokens ?? 0;
  const promotionBonus = metadata.promotion_bonus ?? 0;
  const amountCents = metadata.amount_cents ?? 0;

  if (![baseTokens, packBonus, promotionBonus, amountCents].every(isCount)) return null;

  const paid = payment.transaction_amount;
  if (typeof paid === 'number' && Math.round(paid * 100) < amountCents) return null;

  // El bono por código se respeta siempre; el de primera compra se revalida al acreditar
  // (el usuario pudo crear dos preferencias "de primera compra" y pagar ambas).
  const promoApplies = metadata.promotion_type === 'code' || input.isFirstPurchase;
  const effectivePromoBonus = promoApplies ? promotionBonus : 0;
  const totalTokens = baseTokens + packBonus + effectivePromoBonus;
  if (totalTokens <= 0) return null;

  const promotionIds =
    effectivePromoBonus > 0 && typeof metadata.promotion_id === 'string' ? [metadata.promotion_id] : null;

  return {
    p_user_id: input.userId,
    p_tokens_to_add: totalTokens,
    p_pack_id: metadata.pack_id ?? null,
    p_base_tokens: baseTokens,
    p_bonus_tokens: packBonus + effectivePromoBonus,
    p_total_tokens: totalTokens,
    p_amount_cents: amountCents,
    p_payment_provider: 'mercadopago',
    p_payment_id: input.paymentId,
    p_payment_status: input.status,
    p_payment_metadata: payment,
    p_promotion_ids: promotionIds,
  };
}
