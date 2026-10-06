import { supabase } from '../utils/supabaseClient';
import { logger } from '../utils/logger';
import { interpretCreditResponse, isPaymentId, type CreditOutcome } from './creditOnReturn';

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
    logger.error('Error al obtener sesión:', sessionError);
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
    logger.error('Error al refrescar sesión:', refreshError);
    return {
      success: false,
      error: 'NOT_LOGGED_IN',
      message: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
    };
  }

  if (!refreshedSession?.access_token) {
    logger.error('No se pudo obtener token después de refrescar');
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
      logger.error('Error 401 desde Edge Function:', body);
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
      logger.error('Error desde Edge Function:', {
        status: res.status,
        statusText: res.statusText,
        error: body?.error,
        message: body?.message,
      });
      // El servidor ya envía un mensaje apto para el usuario; el detalle técnico queda en sus logs.
      return {
        success: false,
        error: errorType,
        message: body?.message ?? 'Error al iniciar la compra. Intenta de nuevo.',
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
    logger.error('Error de red al llamar a Edge Function:', error);
    return {
      success: false,
      error: 'NETWORK',
      message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
    };
  }
}

/**
 * Al volver de Mercado Pago con un pago aprobado, pide al servidor que lo acredite en ese momento,
 * sin esperar al aviso de Mercado Pago. Es seguro llamarla siempre: un pago se acredita una sola vez.
 * Nunca lanza: ante cualquier fallo devuelve 'processing' (el aviso acreditará de todos modos).
 */
export async function creditPaymentOnReturn(paymentId: string | null): Promise<CreditOutcome> {
  if (!isPaymentId(paymentId)) return 'processing';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return 'processing';

    const res = await fetch(`${SUPABASE_URL}/functions/v1/credit-payment-on-return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ payment_id: paymentId }),
    });
    const body = await res.json().catch(() => null);
    return interpretCreditResponse(res.status, body);
  } catch (error) {
    logger.error('No se pudo acreditar el pago al volver:', error);
    return 'processing';
  }
}
