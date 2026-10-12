/** Aviso al volver de Mercado Pago. `confirming` mientras el servidor registra el pago aprobado. */
export type SeasonalReturnNotice = 'confirming' | 'success' | 'pending' | 'cancel';

/** Lo que muestra la caja de compra del detalle de una lotería temática (P6). */
export type SeasonalBuyState = 'idle' | 'starting' | 'failed' | 'confirming' | 'cancelled' | 'owned' | 'pending';

export interface SeasonalBuyFlags {
  isOwned: boolean;
  /** Pago en efectivo o transferencia que Mercado Pago aún no confirma. */
  isPending: boolean;
  isStartingPayment: boolean;
  buyFailed: boolean;
  notice: SeasonalReturnNotice | null;
}

/**
 * Decide el estado de la caja. Lo que dice la base (ya es tuya, pago en proceso) gana a lo que
 * pasa en la página; y lo más reciente (un intento nuevo, su fallo) gana al aviso del regreso.
 */
export function seasonalBuyStateOf(flags: SeasonalBuyFlags): SeasonalBuyState {
  if (flags.isOwned) return 'owned';
  if (flags.isPending) return 'pending';
  if (flags.isStartingPayment) return 'starting';
  if (flags.notice === 'confirming') return 'confirming';
  if (flags.buyFailed) return 'failed';
  if (flags.notice === 'cancel') return 'cancelled';
  return 'idle';
}
