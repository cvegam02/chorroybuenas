/** Ingresos del panel: lo vendido en tokens, en loterías de temporada, y el total. */
export interface RevenueSummary {
  tokensCents: number;
  seasonalCents: number;
  totalCents: number;
  tokensCount: number;
  seasonalCount: number;
  totalCount: number;
}

/**
 * Suma los ingresos de los dos tipos de venta. De las loterías de temporada solo cuentan las compras
 * aprobadas: un pago en proceso aún no entra, y uno repetido o devuelto no es un ingreso.
 */
export function summarizeRevenue(
  tokenPurchases: readonly { amount_cents: number | null }[],
  seasonalPurchases: readonly { amount_cents: number | null; status: string }[],
): RevenueSummary {
  const sum = (rows: readonly { amount_cents: number | null }[]) =>
    rows.reduce((total, row) => total + (row.amount_cents ?? 0), 0);
  const approved = seasonalPurchases.filter((purchase) => purchase.status === 'approved');

  const tokensCents = sum(tokenPurchases);
  const seasonalCents = sum(approved);
  return {
    tokensCents,
    seasonalCents,
    totalCents: tokensCents + seasonalCents,
    tokensCount: tokenPurchases.length,
    seasonalCount: approved.length,
    totalCount: tokenPurchases.length + approved.length,
  };
}
