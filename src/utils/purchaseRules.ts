/**
 * Límites de la compra de tokens por cantidad libre. Regla de negocio: docs/contexto-negocio.md §8.
 * El servidor es quien manda (supabase/functions/_shared/validation.ts); una prueba comprueba
 * que estos valores coincidan con los suyos.
 */
export const MIN_CUSTOM_TOKENS = 5;
export const MAX_CUSTOM_TOKENS = 500;

/** Lo menos que se cobra, ya con la oferta (FEAT-58, decisión 2). Igual al del servidor (`_shared/preference.ts`). */
export const MIN_PURCHASE_CENTS = 1000;

const pesosWithCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const discounted = (cents: number, percent: number) => Math.round((cents * (100 - percent)) / 100);

/** El mínimo de la cantidad libre con ese precio por token (ya con la oferta): 5, o los que lleguen a $10. */
export function minCustomTokens(perTokenCents: number): number {
  if (!(perTokenCents > 0)) return MIN_CUSTOM_TOKENS;
  return Math.min(MAX_CUSTOM_TOKENS, Math.max(MIN_CUSTOM_TOKENS, Math.ceil(MIN_PURCHASE_CENTS / perTokenCents)));
}

/** Panel: el primer pack activo que una oferta dejaría por debajo del mínimo, como mensaje; null si ninguno. */
export function offerMinimumError(
  packs: ReadonlyArray<{ base_tokens: number; price_cents: number; is_active: boolean }>,
  percent: number,
): string | null {
  const below = packs.find((p) => p.is_active && discounted(p.price_cents, percent) < MIN_PURCHASE_CENTS);
  if (!below) return null;
  return `Con −${percent}%, el pack de ${below.base_tokens} tokens quedaría en ${pesosWithCents(discounted(below.price_cents, percent))}, por debajo del mínimo de compra de ${pesosWithCents(MIN_PURCHASE_CENTS)}.`;
}

/** Panel: un pack no baja de $10, ni con la oferta vigente o programada (`offerPercent`). */
export function packMinimumError(priceCents: number, offerPercent: number | null): string | null {
  if (priceCents < MIN_PURCHASE_CENTS) return `El precio mínimo de un pack es ${pesosWithCents(MIN_PURCHASE_CENTS)}.`;
  if (offerPercent && discounted(priceCents, offerPercent) < MIN_PURCHASE_CENTS) {
    return `Con la oferta de −${offerPercent}%, este pack quedaría en ${pesosWithCents(discounted(priceCents, offerPercent))}, por debajo del mínimo de compra de ${pesosWithCents(MIN_PURCHASE_CENTS)}.`;
  }
  return null;
}
