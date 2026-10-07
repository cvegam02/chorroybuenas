/** Redondea a valor amigable para USD (ej. 0.43 → 0.50). */
export function roundUsdFriendly(value: number): number {
  if (value >= 1) return Math.round(value * 100) / 100;
  if (value >= 0.1) return Math.ceil(value * 20) / 20;
  return Math.ceil(value * 100) / 100;
}

/** Centavos de peso → «$2.85 USD», solo como referencia: el cobro siempre es en pesos. */
export function formatUsdReference(cents: number, mxnToUsdRate: number): string {
  return `$${roundUsdFriendly((cents / 100) * mxnToUsdRate).toFixed(2)} USD`;
}
