/**
 * Pestaña Ventas del panel de administración (FEAT-44): etiquetas de la tabla.
 * Fechas y horas en hora de Hermosillo, como el Resumen (FEAT-43).
 */

import { hermosilloToday, summaryPeriod, type SummaryPeriod } from './adminSummary';

/** Tipo de venta: tokens para la IA, o una lotería temática. */
export type SaleKind = 'tokens' | 'seasonal';

/** Estados que se pueden filtrar; rechazadas y devueltas hoy no se guardan (decisión 10). */
export type SaleStatusFilter = '' | 'approved' | 'pending';

export type SaleTone = 'approved' | 'pending' | 'rejected' | 'refunded' | 'other';

export const SALES_PAGE_SIZE = 20;

/** Totales de lo filtrado (US A2). Cobrado y tokens vendidos solo cuentan lo aprobado. */
export interface SalesTotals {
  sales: number;
  collectedCents: number;
  pendingCount: number;
  pendingCents: number;
  tokensSold: number;
}

const TIME_ZONE = 'America/Hermosillo';

/**
 * Periodo con el que Ventas muestra los pagos pendientes del Resumen (US A5): del día del más viejo a hoy,
 * porque el Resumen los cuenta todos, sin importar el periodo. Sin esa fecha, el mes en curso.
 */
export function pendingSalesPeriod(oldestPendingAt: string | null, now: Date = new Date()): SummaryPeriod {
  if (!oldestPendingAt) return summaryPeriod('month', now);
  return { from: hermosilloToday(new Date(oldestPendingAt)), to: hermosilloToday(now) };
}

/** Qué compró: el pack por sus tokens base (los packs no tienen nombre), los tokens sueltos o la lotería. */
export function saleItemLabel(sale: {
  kind: SaleKind;
  pack_id: string | null;
  base_tokens: number | null;
  loteria_name: string | null;
}): string {
  if (sale.kind === 'seasonal') return sale.loteria_name || 'Lotería temática';
  if (sale.pack_id) return `Pack de ${sale.base_tokens ?? 0} tokens`;
  return `${sale.base_tokens ?? 0} tokens`;
}

/** La oferta con la que se compró: «Buen Fin 2026 −25%» (FEAT-49, decisión 16); null sin oferta. */
export function saleOfferLabel(sale: { offer_name: string | null; offer_percent: number | null }): string | null {
  if (sale.offer_percent == null) return null;
  return `${sale.offer_name || 'Oferta'} −${sale.offer_percent}%`;
}

/** Qué recibió el cliente: «25 tokens (20 + 5 de regalo)», el acceso a la lotería, o nada todavía. */
export function saleReceived(sale: {
  kind: SaleKind;
  base_tokens: number | null;
  bonus_tokens: number | null;
  total_tokens: number | null;
  payment_status: string | null;
}): string {
  if (sale.payment_status === 'pending') return 'Nada todavía: se entrega al confirmarse el pago';
  if (sale.payment_status !== 'approved') return '—';
  if (sale.kind === 'seasonal') return 'Acceso a la lotería y su PDF';
  const total = sale.total_tokens ?? 0;
  const bonus = sale.bonus_tokens ?? 0;
  if (bonus > 0) return `${total} tokens (${sale.base_tokens ?? 0} + ${bonus} de regalo)`;
  return `${total} tokens`;
}

const STATUSES: Record<string, { label: string; tone: SaleTone }> = {
  approved: { label: 'Aprobada', tone: 'approved' },
  pending: { label: 'Pendiente', tone: 'pending' },
  rejected: { label: 'Rechazada', tone: 'rejected' },
  refunded: { label: 'Devuelta', tone: 'refunded' },
};

/** Estado en español; uno desconocido se muestra tal cual, sin inventar. */
export function saleStatus(status: string | null): { label: string; tone: SaleTone } {
  if (!status) return { label: '—', tone: 'other' };
  return STATUSES[status] ?? { label: status, tone: 'other' };
}

const dateParts = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Fecha («5 oct 2026») y hora («11:00») de una venta en Hermosillo. */
export function saleDateTime(iso: string): { date: string; time: string } {
  const instant = new Date(iso);
  const parts = dateParts.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${part('day')} ${part('month').replace('.', '')} ${part('year')}`,
    time: timeFormat.format(instant),
  };
}

/** «Mostrando 21–40 de 65», o «Sin ventas». */
export function pageRange(page: number, pageSize: number, total: number): string {
  if (total <= 0) return 'Sin ventas';
  const first = page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);
  return `Mostrando ${first}–${last} de ${total}`;
}
