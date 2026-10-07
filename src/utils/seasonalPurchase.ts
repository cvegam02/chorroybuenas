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

/** Ventas de una lotería: las aprobadas, y todos los pagos registrados (cualquiera impide borrarla). */
export interface SeasonalSales {
  approved: number;
  total: number;
}

export function summarizeSales(
  purchases: readonly { loteria_id: string; status: string }[],
): Map<string, SeasonalSales> {
  const sales = new Map<string, SeasonalSales>();
  for (const purchase of purchases) {
    const current = sales.get(purchase.loteria_id) ?? { approved: 0, total: 0 };
    sales.set(purchase.loteria_id, {
      approved: current.approved + (purchase.status === 'approved' ? 1 : 0),
      total: current.total + 1,
    });
  }
  return sales;
}
