/**
 * Cómo se presentan los paquetes de tokens en Comprar tokens y su precio «desde» en Beneficios
 * (FEAT-33). Solo lo que se lee: el cobro y los bonos los decide el servidor.
 */
import { formatFromPrice } from './landingPrices';
import { offerDiscountCents } from './offerPrice';
import { MAX_CUSTOM_TOKENS, MIN_CUSTOM_TOKENS } from './purchaseRules';

interface PackAmounts {
  base_tokens: number;
  bonus_tokens: number;
  price_cents: number;
}

export interface PackSummary {
  /** Tokens extra por la promoción que aplique a quien mira; 0 si no hay. */
  promoBonus: number;
  /** Fotos que se pueden transformar: tokens + regalo + promoción. */
  totalTokens: number;
  /** Lo que se paga: con la oferta, si hay. */
  price: string;
  priceCents: number;
  /** El precio normal, para tacharlo durante una oferta (FEAT-49); null sin oferta. */
  listPrice: string | null;
  pricePerPhoto: string;
}

/** Tokens extra de una promoción: el porcentaje de los tokens que se pagan, hacia abajo. */
export function promoBonusTokens(baseTokens: number, promoPercent: number): number {
  return promoPercent > 0 ? Math.floor(baseTokens * (promoPercent / 100)) : 0;
}

/**
 * Lo que se lee en la tarjeta de un paquete. La promoción suma tokens y nunca cambia el precio; la oferta
 * (FEAT-49) baja el precio y no cambia los tokens. Las dos se suman.
 */
export function packSummary(pack: PackAmounts, promoPercent = 0, offerPercent = 0): PackSummary {
  const promoBonus = promoBonusTokens(pack.base_tokens, promoPercent);
  const totalTokens = pack.base_tokens + pack.bonus_tokens + promoBonus;
  const priceCents = offerPercent > 0 ? offerDiscountCents(pack.price_cents, offerPercent) : pack.price_cents;
  return {
    promoBonus,
    totalTokens,
    price: formatFromPrice(priceCents) ?? '',
    priceCents,
    listPrice: offerPercent > 0 ? (formatFromPrice(pack.price_cents) ?? '') : null,
    pricePerPhoto: formatFromPrice(Math.round(priceCents / totalTokens)) ?? '',
  };
}

/**
 * Precio «desde» por foto, en centavos: el menor entre el precio por foto de cada paquete
 * (precio ÷ tokens + regalo, a dos decimales) y el precio por token de la cantidad libre. Null si
 * falta alguno de los dos datos: en ese caso no se muestra precio.
 */
export function lowestPricePerPhotoCents(
  packs: readonly PackAmounts[] | null,
  pricePerTokenCents: number | null,
): number | null {
  if (packs === null || pricePerTokenCents === null) return null;
  const perPhoto = packs.map((pack) => Math.round(pack.price_cents / (pack.base_tokens + pack.bonus_tokens)));
  return Math.min(pricePerTokenCents, ...perPhoto);
}

/** El paquete de en medio lleva «El más elegido». Con menos de tres no hay «en medio». */
export function highlightedPackIndex(packCount: number): number | null {
  return packCount >= 3 ? Math.floor(packCount / 2) : null;
}

/** `min`: el mínimo vigente, que con oferta puede subir para llegar a $10 (`minCustomTokens`, FEAT-58). */
export function clampCustomTokens(tokens: number, min = MIN_CUSTOM_TOKENS): number {
  return Math.max(min, Math.min(MAX_CUSTOM_TOKENS, tokens));
}

/** Botones − y + de «¿Otra cantidad?» en Comprar tokens. */
export function stepCustomTokens(tokens: number, delta: number, min = MIN_CUSTOM_TOKENS): number {
  return clampCustomTokens(tokens + delta, min);
}
