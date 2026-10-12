/**
 * Página de inicio (FEAT-32, pantalla P1): los precios «desde» de las dos tarjetas.
 */
import type { CatalogLoteria } from './seasonalCatalog';
import { seasonalStatus } from './seasonalPublishing';

const WHOLE_PESOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const WITH_CENTS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** El precio más bajo entre las loterías temáticas que el catálogo muestra hoy; null si ninguna tiene precio. */
export function lowestThemedPriceCents(loterias: readonly CatalogLoteria[], now: Date): number | null {
  const prices = loterias
    .filter((loteria) => seasonalStatus(loteria, now) === 'published')
    .map((loteria) => loteria.price_cents)
    .filter((cents): cents is number => cents !== null && cents > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** «$2» o «$2.50». Sin precio no hay texto: la etiqueta no se muestra. */
export function formatFromPrice(cents: number | null): string | null {
  if (cents === null) return null;
  return (cents % 100 === 0 ? WHOLE_PESOS : WITH_CENTS).format(cents / 100);
}

/** Texto de la respuesta «¿Cuánto cuesta la conversión con IA?»: con la cifra si se pudo leer, sin ella si no. */
export function aiCostAnswerKey(price: string | null): 'landing.faq.aiCost.answer' | 'landing.faq.aiCost.answerNoPrice' {
  return price === null ? 'landing.faq.aiCost.answerNoPrice' : 'landing.faq.aiCost.answer';
}
