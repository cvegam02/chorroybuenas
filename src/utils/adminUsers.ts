import { saleDateTime } from './adminSales';
import { hermosilloToday, type SummaryPeriod } from './adminSummary';

/** Filtros rápidos de la pestaña Usuarios (FEAT-45, decisión 5); vacío es «Todos». */
export type UserFilter = '' | 'new_this_month' | 'buyers' | 'never_bought';

/** «Ordenar por» de la pestaña Usuarios (FEAT-45, decisión 4). */
export type UserSort = 'recent' | 'activity' | 'paid' | 'balance';

export const USERS_PAGE_SIZE = 20;

interface UserNames {
  full_name: string | null;
  email: string | null;
}

/** Nombre de la cuenta, o su correo si no tiene nombre. */
export function userDisplayName(user: UserNames): string {
  return user.full_name || user.email || 'Sin correo';
}

/** Letra del círculo: la primera del nombre o del correo, en mayúscula. */
export function userInitial(user: UserNames): string {
  const name = user.full_name || user.email;
  return name ? name.charAt(0).toLocaleUpperCase('es-MX') : '?';
}

/** Fecha de alta en Hermosillo: «2 sep 2026». */
export function signupDate(iso: string): string {
  return saleDateTime(iso).date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** «Hoy», «Ayer» o, antes, la fecha: según el día en Hermosillo. */
export function activityDay(iso: string, now: Date = new Date()): string {
  const day = hermosilloToday(new Date(iso));
  if (day === hermosilloToday(now)) return 'Hoy';
  // Hermosillo no cambia de horario: un día antes siempre son 24 horas.
  if (day === hermosilloToday(new Date(now.getTime() - DAY_MS))) return 'Ayer';
  return saleDateTime(iso).date;
}

/** «Hoy, 10:42», «Ayer, 23:30» o, antes, la fecha: según el día en Hermosillo. */
export function lastActivityLabel(iso: string, now: Date = new Date()): string {
  const day = activityDay(iso, now);
  return day === 'Hoy' || day === 'Ayer' ? `${day}, ${saleDateTime(iso).time}` : day;
}

const wholePesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const pesosWithCents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

/** Lo pagado en pesos, sin centavos si son cerrados: «$140», «$35.50». */
export function paidLabel(cents: number): string {
  return cents % 100 === 0 ? wholePesos.format(cents / 100) : pesosWithCents.format(cents / 100);
}

const countFormat = new Intl.NumberFormat('es-MX');

/** Renglón bajo el título: «412 cuentas · 86 nuevas este mes». */
export function usersSummary(total: number, newThisMonth: number): string {
  const accounts = `${countFormat.format(total)} ${total === 1 ? 'cuenta' : 'cuentas'}`;
  const fresh = `${countFormat.format(newThisMonth)} ${newThisMonth === 1 ? 'nueva' : 'nuevas'} este mes`;
  return `${accounts} · ${fresh}`;
}

const PROVIDERS: Record<string, string> = { google: 'Google', email: 'correo' };

/** Cómo entró a su cuenta: «con Google», «con correo»; otro proveedor, tal cual. Nulo si no se sabe. */
export function providerLabel(provider: string | null): string | null {
  if (!provider) return null;
  return `con ${PROVIDERS[provider] ?? provider}`;
}

/** «4 compras», «1 compra», «ninguna compra». */
export function purchasesLabel(count: number): string {
  if (count === 0) return 'ninguna compra';
  return `${countFormat.format(count)} ${count === 1 ? 'compra' : 'compras'}`;
}

/** «2 temáticas compradas», «1 temática comprada», «ninguna temática». */
export function seasonalLabel(count: number): string {
  if (count === 0) return 'ninguna temática';
  return `${countFormat.format(count)} ${count === 1 ? 'temática comprada' : 'temáticas compradas'}`;
}

/** Periodo de «Ver sus compras en Ventas»: desde el día de alta hasta hoy, en Hermosillo (decisión 13). */
export function signupSalesPeriod(createdAt: string, now: Date = new Date()): SummaryPeriod {
  const today = hermosilloToday(now);
  const signup = hermosilloToday(new Date(createdAt));
  return { from: signup < today ? signup : today, to: today };
}
