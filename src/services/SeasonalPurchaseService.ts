import { supabase } from '../utils/supabaseClient';
import { logger } from '../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export type SeasonalPreferenceError =
  | 'NOT_LOGGED_IN' | 'ALREADY_OWNED' | 'PAYMENT_PENDING' | 'NOT_AVAILABLE' | 'FAILED';

export type SeasonalPreferenceResult =
  | { success: true; init_point: string }
  | { success: false; error: SeasonalPreferenceError };

const KNOWN_ERRORS: readonly string[] = ['NOT_LOGGED_IN', 'ALREADY_OWNED', 'PAYMENT_PENDING', 'NOT_AVAILABLE'];

/**
 * Pide al servidor el cobro de una lotería de temporada. Solo se manda cuál lotería: el precio lo pone
 * el servidor. Nunca lanza: cualquier fallo inesperado se devuelve como FAILED.
 */
export async function createSeasonalPreference(loteriaId: string): Promise<SeasonalPreferenceResult> {
  try {
    // Se refresca la sesión para no mandar un token a punto de vencer.
    const { data, error } = await supabase.auth.refreshSession();
    const token = data.session?.access_token;
    if (error || !token) return { success: false, error: 'NOT_LOGGED_IN' };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-seasonal-preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        loteria_id: loteriaId,
        app_url: import.meta.env.VITE_APP_URL || window.location.origin,
      }),
    });
    const body = (await res.json().catch(() => null)) as { success?: unknown; init_point?: unknown; error?: unknown } | null;

    if (res.status === 401) return { success: false, error: 'NOT_LOGGED_IN' };
    if (res.ok && body?.success === true && typeof body.init_point === 'string' && body.init_point !== '') {
      return { success: true, init_point: body.init_point };
    }

    logger.error('createSeasonalPreference:', res.status, body?.error);
    const known = typeof body?.error === 'string' && KNOWN_ERRORS.includes(body.error);
    return { success: false, error: known ? (body?.error as SeasonalPreferenceError) : 'FAILED' };
  } catch (error) {
    logger.error('createSeasonalPreference: error de red', error);
    return { success: false, error: 'FAILED' };
  }
}
