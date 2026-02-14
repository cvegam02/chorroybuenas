import { supabase } from '../utils/supabaseClient';

const INITIAL_TOKENS_KEY = 'initial_tokens';
const CONFIG_CACHE_TTL_MS = 60 * 1000; // 1 minuto
let configCache: { value: number; expiresAt: number } | null = null;

export class AppConfigRepository {
  /**
   * Obtiene los tokens iniciales que reciben los usuarios nuevos.
   * Caché corto para no saturar la DB.
   */
  static async getInitialTokens(): Promise<number> {
    const now = Date.now();
    if (configCache && configCache.expiresAt > now) {
      return configCache.value;
    }
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', INITIAL_TOKENS_KEY)
      .single();

    if (error || !data?.value) {
      return 0;
    }
    const value = typeof data.value === 'number' ? data.value : Number(data.value) ?? 0;
    const safe = Number.isInteger(value) && value >= 0 ? value : 0;
    configCache = { value: safe, expiresAt: now + CONFIG_CACHE_TTL_MS };
    return safe;
  }

  /**
   * Actualiza los tokens iniciales (solo admins por RLS).
   */
  static async updateInitialTokens(amount: number): Promise<boolean> {
    const safe = Math.max(0, Math.floor(amount));
    const { error } = await supabase
      .from('app_config')
      .upsert(
        { key: INITIAL_TOKENS_KEY, value: safe, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) return false;
    configCache = null; // invalidar caché
    return true;
  }
}
