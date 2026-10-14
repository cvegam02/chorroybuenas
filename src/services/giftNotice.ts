import { supabase } from '../utils/supabaseClient';
import { logger } from '../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Pide al servidor el correo de «te regalamos tokens» de un regalo ya hecho (fase 3, US B1).
 * Nunca lanza: si el correo no sale, el regalo ya quedó hecho y solo se anota el error.
 */
export async function requestGiftNotice(userId: string, amount: number): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/notify-token-gift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ user_id: userId, amount }),
    });
    if (!res.ok) logger.warn(`No se envió el correo del regalo (${res.status})`);
  } catch (error) {
    logger.warn('No se pudo pedir el correo del regalo:', error);
  }
}
