export type CheckoutMode = 'sandbox' | 'production';

/** URL base para las back_urls: solo orígenes de la lista blanca; si no, el fallback del servidor. */
export function resolveAppUrl(requested: string | null, allowedOrigins: string[], fallback: string): string {
  if (requested) {
    try {
      const origin = new URL(requested).origin;
      if (allowedOrigins.includes(origin)) return origin;
    } catch {
      // URL inválida: se usa el fallback
    }
  }
  return fallback.replace(/\/$/, '');
}

/**
 * Qué URL de checkout se usa, según el tipo de credenciales de Mercado Pago:
 * - Credenciales de prueba (token TEST-...): solo funcionan con sandbox_init_point.
 * - Token APP_USR-... (producción, o de un usuario vendedor de prueba): init_point.
 * El secret MP_USE_SANDBOX_CHECKOUT="true" fuerza sandbox en cualquier caso.
 */
export function resolveCheckoutMode(flag: string | undefined, accessToken: string | undefined): CheckoutMode {
  if (flag === 'true') return 'sandbox';
  return accessToken?.startsWith('TEST-') ? 'sandbox' : 'production';
}

export function pickInitPoint(
  mode: CheckoutMode,
  mp: { init_point?: string; sandbox_init_point?: string },
): string | null {
  if (mode === 'sandbox') return mp.sandbox_init_point || mp.init_point || null;
  return mp.init_point || null;
}
