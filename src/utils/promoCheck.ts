/** Resultado de «Aplicar» un código promocional en Comprar tokens (FEAT-58, decisión 3). */
export type PromoCheck =
  | { kind: 'valid'; percent: number }
  | { kind: 'invalid' }
  | { kind: 'limited' }
  | { kind: 'error' };

/** Lee la respuesta de `check_promo_code`: 0 = sin bono (cuenta como intento), RATE_LIMITED = tope de 5 por hora. */
export function promoCheckFromRpc(data: unknown, error: { message: string } | null): PromoCheck {
  if (error) return error.message.includes('RATE_LIMITED') ? { kind: 'limited' } : { kind: 'error' };
  if (typeof data !== 'number') return { kind: 'error' };
  return data > 0 ? { kind: 'valid', percent: data } : { kind: 'invalid' };
}
