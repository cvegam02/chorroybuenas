/**
 * «Exportar CSV» de la pestaña Ventas (FEAT-44, US A4): todas las ventas filtradas, para una hoja de cálculo.
 * Fecha en AAAA-MM-DD y hora de Hermosillo, para que la hoja las ordene bien.
 */
import type { AdminSaleRow } from '../repositories/AdminRepository';
import { saleDateTime, saleItemLabel, saleStatus } from './adminSales';
import { hermosilloToday, type SummaryPeriod } from './adminSummary';

const HEADER = [
  'Fecha',
  'Hora',
  'Cliente',
  'Correo',
  'Tipo',
  'Qué compró',
  'Tokens entregados',
  'Monto (MXN)',
  'Estado',
  'Payment ID',
  'ID de la compra',
];

/** Marca UTF-8: sin ella, Excel abre los acentos como símbolos raros. */
const BOM = '\uFEFF';

/** Lo que empieza así la hoja de cálculo lo toma como fórmula; los nombres los escribe cada cliente. */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | number | null): string {
  if (value === null) return '';
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) || text.startsWith("'") ? `"${text.replace(/"/g, '""')}"` : text;
}

function saleLine(sale: AdminSaleRow): string {
  const deleted = !sale.user_id;
  return [
    hermosilloToday(new Date(sale.created_at)),
    saleDateTime(sale.created_at).time,
    deleted ? 'Cuenta borrada' : sale.full_name || sale.email || '',
    deleted ? null : sale.email,
    sale.kind === 'seasonal' ? 'Temática' : 'Tokens',
    saleItemLabel(sale),
    sale.total_tokens,
    (sale.amount_cents / 100).toFixed(2),
    saleStatus(sale.payment_status).label,
    sale.payment_id,
    sale.id,
  ]
    .map(cell)
    .join(',');
}

/** El archivo completo, un renglón por venta. */
export function salesCsv(rows: readonly AdminSaleRow[]): string {
  return BOM + [HEADER.map(cell).join(','), ...rows.map(saleLine)].join('\r\n');
}

/** «ventas-2026-10-01-a-2026-10-15.csv», o «ventas-2026-10-15.csv» para un solo día. */
export function salesCsvFileName(period: SummaryPeriod): string {
  const days = period.from === period.to ? period.from : `${period.from}-a-${period.to}`;
  return `ventas-${days}.csv`;
}
