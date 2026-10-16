/**
 * Precio con oferta que ve el cliente (FEAT-49, US A3; contexto-negocio.md §9). Solo lo que se lee:
 * el cobro lo calcula el servidor con la misma regla (`applyOfferDiscount`).
 */
import { formatFromPrice } from './landingPrices';

/** Precio con descuento, redondeado al centavo (medio centavo sube). */
export function offerDiscountCents(cents: number, percent: number): number {
  return Math.round((cents * (100 - percent)) / 100);
}

/** Cantidad libre: el descuento va al precio por token y después se multiplica, como el servidor. */
export function customOfferPriceCents(tokens: number, pricePerTokenCents: number, offerPercent: number | null): number {
  const perToken = offerPercent ? offerDiscountCents(pricePerTokenCents, offerPercent) : pricePerTokenCents;
  return tokens * perToken;
}

/** «$40 MXN» o «$1.50 MXN»: con centavos solo si los hay. */
export function formatMxn(cents: number): string {
  return `${formatFromPrice(cents) ?? ''} MXN`;
}

/**
 * Al tocar «Comprar» con la pantalla abierta desde antes (decisión 18): si la oferta que se muestra ya no
 * es la vigente, avisar en vez de ir al pago. `current` indefinido = no se pudo revisar: se sigue al pago.
 */
export function offerChangeNotice(shown: number | null, current: number | null | undefined): 'ended' | 'changed' | null {
  if (current === undefined || shown === current) return null;
  return current === null ? 'ended' : 'changed';
}
