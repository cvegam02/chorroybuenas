/**
 * Resumen del panel de administración (FEAT-43): periodos en hora de Hermosillo y el dinero del periodo.
 * Hermosillo está en UTC-7 todo el año (Sonora no cambia de horario).
 */

const TIME_ZONE = 'America/Hermosillo';
const UTC_OFFSET = '-07:00';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type SummaryPeriodKind = 'today' | 'week' | 'month' | 'year';

/** Días locales, ambos incluidos, en formato AAAA-MM-DD. */
export interface SummaryPeriod {
  from: string;
  to: string;
}

export interface SummaryTotals {
  tokensRevenueCents: number;
  seasonalRevenueCents: number;
  aiImages: number;
}

/** Gente y ventas del periodo (US A2). Lo más vendido es nulo si no hubo ventas. */
export interface SummaryPeopleSales {
  newUsers: number;
  buyers: number;
  firstTimeBuyers: number;
  aiUsers: number;
  tokenPurchases: number;
  tokensSold: number;
  seasonalSales: number;
  /** Los packs no tienen nombre: se identifican por sus tokens base. */
  topPack: { baseTokens: number; sales: number } | null;
  topLoteria: { name: string; sales: number } | null;
}

export type DashboardSummary = SummaryTotals & SummaryPeopleSales;

export interface SummaryMoney {
  revenueCents: number;
  /** Nulo si no hay tipo de cambio para pasar el costo a pesos. */
  aiCostCents: number | null;
  profitCents: number | null;
}

/** La fecha de hoy en Hermosillo, AAAA-MM-DD. */
export function hermosilloToday(now: Date = new Date()): string {
  // en-CA da el formato AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Periodo que termina hoy: hoy, la semana (desde el lunes), el mes o el año. */
export function summaryPeriod(kind: SummaryPeriodKind, now: Date = new Date()): SummaryPeriod {
  const to = hermosilloToday(now);
  const [year, month] = to.split('-');
  switch (kind) {
    case 'today':
      return { from: to, to };
    case 'month':
      return { from: `${year}-${month}-01`, to };
    case 'year':
      return { from: `${year}-01-01`, to };
    case 'week': {
      const day = new Date(`${to}T00:00:00Z`);
      const daysSinceMonday = (day.getUTCDay() + 6) % 7;
      day.setUTCDate(day.getUTCDate() - daysSinceMonday);
      return { from: day.toISOString().slice(0, 10), to };
    }
  }
}

/** Rango elegido a mano; nulo si falta una fecha o termina antes de empezar. */
export function customPeriod(from: string, to: string): SummaryPeriod | null {
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) return null;
  return { from, to };
}

/** Límites de un filtro por días (Uso de IA) en hora de Hermosillo; vacío no filtra. */
export function hermosilloDayRange(dateFrom: string, dateTo: string): { from: string | null; to: string | null } {
  return {
    from: dateFrom ? `${dateFrom}T00:00:00${UTC_OFFSET}` : null,
    to: dateTo ? `${dateTo}T23:59:59.999${UTC_OFFSET}` : null,
  };
}

/**
 * Ingresos, gasto en IA y ganancia. El gasto usa el mismo cálculo que la pestaña Uso de IA:
 * imágenes × costo por imagen en USD, pasado a pesos con el tipo de cambio (USD por peso).
 * La ganancia no descuenta la comisión de Mercado Pago, que no se guarda.
 */
export function summaryMoney(totals: SummaryTotals, costPerImageUsd: number, usdPerMxn: number): SummaryMoney {
  const revenueCents = totals.tokensRevenueCents + totals.seasonalRevenueCents;
  if (!(usdPerMxn > 0)) return { revenueCents, aiCostCents: null, profitCents: null };
  const aiCostCents = Math.round(((totals.aiImages * costPerImageUsd) / usdPerMxn) * 100);
  return { revenueCents, aiCostCents, profitCents: revenueCents - aiCostCents };
}

/** Periodo elegido en el Resumen: uno que termina hoy o un rango a mano. */
export type SummaryPeriodChoice = SummaryPeriodKind | 'range';

const parseDay = (day: string) => new Date(`${day}T00:00:00Z`);
const formatDayKey = (date: Date) => date.toISOString().slice(0, 10);

function addDays(day: string, days: number): string {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDayKey(date);
}

/** Mueve un día N meses; si ese mes es más corto, cae en su último día. */
function addMonths(day: string, months: number): string {
  const date = parseDay(day);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return formatDayKey(target);
}

/** El mismo tramo del periodo anterior: ayer, la semana pasada, el mes pasado, el año pasado o los días justo antes. */
export function previousPeriod(choice: SummaryPeriodChoice, period: SummaryPeriod): SummaryPeriod {
  switch (choice) {
    case 'today':
      return { from: addDays(period.from, -1), to: addDays(period.to, -1) };
    case 'week':
      return { from: addDays(period.from, -7), to: addDays(period.to, -7) };
    case 'month':
      return { from: addMonths(period.from, -1), to: addMonths(period.to, -1) };
    case 'year':
      return { from: addMonths(period.from, -12), to: addMonths(period.to, -12) };
    case 'range': {
      const days = periodDays(period);
      return { from: addDays(period.from, -days), to: addDays(period.from, -1) };
    }
  }
}

/** Cambio en porcentaje entero; nulo si el periodo anterior no tiene una base positiva con qué comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Cuántos días tiene un periodo, contando el primero y el último. */
export function periodDays(period: SummaryPeriod): number {
  return Math.round((parseDay(period.to).getTime() - parseDay(period.from).getTime()) / 86_400_000) + 1;
}

/** La gráfica dibuja hasta 367 días, el límite de la serie por día en la base (migración 037). */
export const MAX_CHART_DAYS = 367;

export interface DailyTotals {
  day: string;
  revenueCents: number;
  aiImages: number;
}

export interface DailyMoney {
  day: string;
  /** Pesos. */
  revenue: number;
  /** Pesos, redondeados al centavo; cero si no hay tipo de cambio válido. */
  aiCost: number;
}

/** Serie de la gráfica en pesos; el gasto en IA usa el mismo cálculo que las tarjetas y Uso de IA. */
export function dailyMoney(rows: readonly DailyTotals[], costPerImageUsd: number, usdPerMxn: number): DailyMoney[] {
  return rows.map((row) => ({
    day: row.day,
    revenue: row.revenueCents / 100,
    aiCost: usdPerMxn > 0 ? Math.round(((row.aiImages * costPerImageUsd) / usdPerMxn) * 100) / 100 : 0,
  }));
}

/** Pagos pendientes y tokens regalados del Resumen (US A5). */
export interface DashboardPending {
  /** Solo los de loterías temáticas: los de tokens no se guardan hasta confirmarse. */
  pendingPayments: number;
  oldestPendingAt: string | null;
  giftedTokens: number;
  giftRecipients: number;
}

/** Cuánto lleva esperando un pago, en días completos: «de hoy», «de hace 1 día», «de hace N días». */
export function waitingSince(createdAt: string, now: Date = new Date()): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000));
  if (days === 0) return 'de hoy';
  return `de hace ${days} ${days === 1 ? 'día' : 'días'}`;
}
