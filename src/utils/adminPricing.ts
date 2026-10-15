/**
 * Textos calculados de la pestaña Precios y promos del Admin (FEAT-46).
 */
import { paidLabel } from './adminUsers';
import { MIN_CUSTOM_TOKENS } from './purchaseRules';

const pesosWithCents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
const countFormat = new Intl.NumberFormat('es-MX');

const tokensLabel = (n: number) => `${countFormat.format(n)} ${n === 1 ? 'token' : 'tokens'}`;

/** Precio por token, siempre con centavos: «$2.00». */
export function pricePerTokenLabel(cents: number): string {
  return pesosWithCents.format(cents / 100);
}

/**
 * Precio escrito por el administrador («2.50», «2,5», «$3») a centavos. Nulo si está vacío, no es
 * un número de pesos con hasta dos decimales o no es mayor que cero.
 */
export function parsePriceInput(text: string): number | null {
  const clean = text.trim().replace(/^\$/, '').replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(clean);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return cents > 0 ? cents : null;
}

/** Pregunta de la confirmación al cambiar el precio por token (decisión 2). */
export function priceChangeMessage(fromCents: number, toCents: number): string {
  return (
    `¿Cambiar el precio por token de ${pricePerTokenLabel(fromCents)} a ${pricePerTokenLabel(toCents)}? ` +
    'Afecta a todas las compras de cantidad libre desde ahora.'
  );
}

/** Letra chica bajo el precio por token: «Mínimo de compra: 5 tokens ($10.00).» */
export function minimumPurchaseLabel(pricePerTokenCents: number): string {
  return `Mínimo de compra: ${tokensLabel(MIN_CUSTOM_TOKENS)} (${pricePerTokenLabel(MIN_CUSTOM_TOKENS * pricePerTokenCents)}).`;
}

/**
 * Estimado de los tokens de bienvenida del mes (decisión 12): el alta no anota cuántos dio,
 * así que se multiplica cuentas creadas este mes × la cantidad de bienvenida actual.
 */
export function welcomeEstimateLabel(newAccounts: number, tokensPerAccount: number, pricePerTokenCents: number): string {
  if (newAccounts === 0) return 'Este mes no se han creado cuentas.';
  const accounts =
    newAccounts === 1
      ? 'Este mes se creó 1 cuenta'
      : `Este mes se crearon ${countFormat.format(newAccounts)} cuentas`;
  if (tokensPerAccount === 0) return `${accounts}; las cuentas nuevas no reciben tokens de bienvenida.`;
  const total = newAccounts * tokensPerAccount;
  return (
    `${accounts}; a ${tokensLabel(tokensPerAccount)} cada una, ≈ ${tokensLabel(total)} ` +
    `(≈ ${paidLabel(total * pricePerTokenCents)} a precio de lista).`
  );
}

/** Lo que una tarjeta de pack necesita del pack (FEAT-46, US A3). */
export interface PackFigures {
  base_tokens: number;
  bonus_tokens: number;
  price_cents: number;
}

export interface PackCardText {
  total: string;
  breakdown: string;
  price: string;
  perToken: string;
  /** Contra comprar la misma cantidad suelta al precio vigente; nulo si no se conoce el precio. */
  savings: string | null;
}

/** Textos de la tarjeta de un pack: total, desglose, precio, precio por token efectivo y ahorro. */
export function packCard(pack: PackFigures, pricePerTokenCents: number | null): PackCardText {
  const total = pack.base_tokens + pack.bonus_tokens;
  const breakdown =
    pack.bonus_tokens > 0
      ? `${tokensLabel(pack.base_tokens)} + ${countFormat.format(pack.bonus_tokens)} de regalo`
      : `${tokensLabel(pack.base_tokens)}, sin regalo`;
  let savings: string | null = null;
  if (pricePerTokenCents != null && pricePerTokenCents > 0 && total > 0) {
    const percent = Math.round((1 - pack.price_cents / (total * pricePerTokenCents)) * 100);
    if (percent > 0) savings = `${percent}% menos que suelto`;
    else if (percent < 0) savings = `${-percent}% más que suelto`;
    else savings = 'Cuesta igual que suelto';
  }
  return {
    total: tokensLabel(total),
    breakdown,
    price: paidLabel(pack.price_cents),
    perToken: `${pricePerTokenLabel(total > 0 ? Math.round(pack.price_cents / total) : 0)} por token`,
    savings,
  };
}

/** «14 ventas este mes», «1 venta este mes». */
export function packSalesLabel(sales: number): string {
  return `${countFormat.format(sales)} ${sales === 1 ? 'venta' : 'ventas'} este mes`;
}
