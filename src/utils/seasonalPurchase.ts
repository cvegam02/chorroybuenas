import { readReturnedPaymentId } from '../services/creditOnReturn';

/** Con qué resultado volvió el comprador de Mercado Pago a la pantalla de una lotería de temporada. */
export type SeasonalReturn =
  | { kind: 'approved'; paymentId: string }
  | { kind: 'pending'; paymentId: string | null }
  | { kind: 'cancel' };

/** Lee la dirección de regreso de Mercado Pago. Devuelve null si no se viene de un pago. */
export function readSeasonalReturn(params: URLSearchParams): SeasonalReturn | null {
  const success = params.get('success') === '1';
  const paymentId = readReturnedPaymentId(params);

  if (success && paymentId) return { kind: 'approved', paymentId };
  if (params.get('cancel') === '1') return { kind: 'cancel' };
  if (success || params.get('pending') === '1') return { kind: 'pending', paymentId };
  return null;
}
