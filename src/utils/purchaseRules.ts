/**
 * Límites de la compra de tokens por cantidad libre. Regla de negocio: docs/contexto-negocio.md §8.
 * El servidor es quien manda (supabase/functions/_shared/validation.ts); una prueba comprueba
 * que estos valores coincidan con los suyos.
 */
export const MIN_CUSTOM_TOKENS = 5;
export const MAX_CUSTOM_TOKENS = 500;
