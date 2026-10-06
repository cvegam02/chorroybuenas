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
 * Qué URL de checkout se usa. Por default init_point, que sirve tanto con credenciales de producción
 * como con las de prueba de Mercado Pago. sandbox_init_point (heredado) solo si el secret
 * MP_USE_SANDBOX_CHECKOUT es exactamente "true".
 */
export function resolveCheckoutMode(flag: string | undefined): CheckoutMode {
  return flag === 'true' ? 'sandbox' : 'production';
}

export function pickInitPoint(
  mode: CheckoutMode,
  mp: { init_point?: string; sandbox_init_point?: string },
): string | null {
  if (mode === 'sandbox') return mp.sandbox_init_point || mp.init_point || null;
  return mp.init_point || null;
}
