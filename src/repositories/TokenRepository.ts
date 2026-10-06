import { supabase } from '../utils/supabaseClient';

const BALANCE_CACHE_TTL_MS = 15 * 1000; // 15 segundos
const balanceCache = new Map<string, { balance: number; expiresAt: number }>();
const balanceInFlight = new Map<string, Promise<number>>();

/**
 * Lectura del saldo de tokens. El saldo solo lo modifica el servidor:
 * - alta de usuario: trigger handle_new_user (app_config.initial_tokens)
 * - compra: RPC add_tokens_after_purchase (edge functions de Mercado Pago)
 * - uso de IA: RPC spend_tokens_for_user (edge function transform-loteria)
 */
export class TokenRepository {
    /** Fuerza que el próximo getBalance consulte al servidor (p. ej. tras usar IA, que cobra en el servidor). */
    static invalidateBalance(userId: string): void {
        balanceCache.delete(userId);
    }

    /**
     * Saldo de tokens del usuario; 0 si aún no tiene fila.
     * Usa cache y deduplicación de peticiones en vuelo para evitar 3+ llamadas al cargar la página.
     */
    static async getBalance(userId: string): Promise<number> {
        const now = Date.now();
        const cached = balanceCache.get(userId);
        if (cached && cached.expiresAt > now) {
            return cached.balance;
        }
        const inFlight = balanceInFlight.get(userId);
        if (inFlight) {
            return inFlight;
        }
        const promise = this.fetchBalance(userId);
        balanceInFlight.set(userId, promise);
        try {
            const balance = await promise;
            balanceCache.set(userId, { balance, expiresAt: now + BALANCE_CACHE_TTL_MS });
            return balance;
        } finally {
            balanceInFlight.delete(userId);
        }
    }

    private static async fetchBalance(userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('user_tokens')
            .select('balance')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data?.balance ?? 0;
    }
}
