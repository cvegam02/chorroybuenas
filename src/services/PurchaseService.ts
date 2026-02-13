import { supabase } from '../utils/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export type CreatePreferenceResult =
  | { success: true; init_point: string; payment_id: string }
  | { success: false; error: 'NOT_LOGGED_IN'; message: string }
  | { success: false; error: 'NETWORK'; message: string }
  | { success: false; error: 'INVALID_REQUEST'; message: string }
  | { success: false; error: 'MP_ERROR'; message: string };

/**
 * Llama a la Edge Function que valida sesión y crea la preferencia de pago.
 * Si el usuario no está logueado, el backend devuelve 401 con NOT_LOGGED_IN.
 */
export async function createPaymentPreference(params: {
  packId?: string;
  customTokens?: number;
  promoCode?: string;
}): Promise<CreatePreferenceResult> {
  // Obtener la sesión actual
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Error al obtener sesión:', sessionError);
    return {
      success: false,
      error: 'NOT_LOGGED_IN',
      message: 'Error al obtener la sesión. Por favor, inicia sesión nuevamente.',
    };
  }

  if (!session) {
    return {
      success: false,
      error: 'NOT_LOGGED_IN',
      message: 'No hay sesión activa. Por favor, inicia sesión.',
    };
  }

  // Siempre refrescar la sesión para asegurar un token válido
  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError) {
    console.error('Error al refrescar sesión:', refreshError);
    return {
      success: false,
      error: 'NOT_LOGGED_IN',
      message: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
    };
  }

  if (!refreshedSession?.access_token) {
    console.error('No se pudo obtener token después de refrescar');
    return {
      success: false,
      error: 'NOT_LOGGED_IN',
      message: 'No se pudo obtener un token válido. Por favor, inicia sesión nuevamente.',
    };
  }

  const token = refreshedSession.access_token;

  const url = `${SUPABASE_URL}/functions/v1/create-payment-preference`;
  
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        pack_id: params.packId,
        custom_tokens: params.customTokens,
        promo_code: params.promoCode || undefined,
        app_url: import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : undefined),
      }),
    });

    const body = await res.json().catch(() => ({}));

    // Manejar errores 401 (sesión inválida o expirada)
    if (res.status === 401) {
      console.error('Error 401 desde Edge Function:', body);
      // Error genérico de Supabase "Invalid JWT" o nuestro error personalizado
      if (body?.error === 'NOT_LOGGED_IN') {
        return {
          success: false,
          error: 'NOT_LOGGED_IN',
          message: body.message ?? 'Solo usuarios registrados y logueados pueden realizar compras de tokens.',
        };
      }
      // Error genérico de Supabase cuando el JWT es inválido
      return {
        success: false,
        error: 'NOT_LOGGED_IN',
        message: body?.message ?? 'Sesión inválida o expirada. Por favor, inicia sesión nuevamente.',
      };
    }

    if (!res.ok) {
      const errorType = body?.error || 'NETWORK';
      console.error('Error desde Edge Function:', {
        status: res.status,
        statusText: res.statusText,
        error: body?.error,
        message: body?.message,
        details: body?.details,
      });
      // Mostrar detalles del error si están disponibles (útil para debugging)
      const errorMessage = body?.message ?? 'Error al iniciar la compra. Intenta de nuevo.';
      const errorDetails = body?.details ? `\n\nDetalles: ${body.details}` : '';
      return {
        success: false,
        error: errorType,
        message: errorMessage + errorDetails,
      };
    }

    if (body.success && body.init_point) {
      return {
        success: true,
        init_point: body.init_point,
        payment_id: body.payment_id || '',
      };
    }

    return {
      success: false,
      error: 'NETWORK',
      message: 'Respuesta inválida del servidor.',
    };
  } catch (error) {
    console.error('Error de red al llamar a Edge Function:', error);
    return {
      success: false,
      error: 'NETWORK',
      message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
    };
  }
}
