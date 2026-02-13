import { supabase } from '../utils/supabaseClient';
import { AppConfigRepository } from './AppConfigRepository';

const BALANCE_CACHE_TTL_MS = 15 * 1000; // 15 segundos
const balanceCache = new Map<string, { balance: number; expiresAt: number }>();
const balanceInFlight = new Map<string, Promise<number>>();

export interface UserTokens {
    user_id: string;
    balance: number;
    updated_at: string;
}

function invalidateBalanceCache(userId: string): void {
    balanceCache.delete(userId);
}

export class TokenRepository {
    /**
     * Get the token balance for a specific user.
     * If no record exists, it attempts to initialize one with a default balance.
     * Usa cache y deduplicación de peticiones en vuelo para evitar 3+ llamadas al cargar la página.
     */
    static async getBalance(userId: string): Promise<number> {
        const now = Date.now();
        const cached = balanceCache.get(userId);
        if (cached && cached.expiresAt > now) {
            return cached.balance;
        }
        let promise = balanceInFlight.get(userId);
        if (promise) {
            return promise;
        }
        promise = this._fetchBalance(userId);
        balanceInFlight.set(userId, promise);
        try {
            const balance = await promise;
            balanceCache.set(userId, { balance, expiresAt: now + BALANCE_CACHE_TTL_MS });
            return balance;
        } finally {
            balanceInFlight.delete(userId);
        }
    }

    private static async _fetchBalance(userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('user_tokens')
            .select('balance')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return await this.initializeUser(userId);
            }
            throw error;
        }
        return data.balance;
    }

    /**
     * Initialize a new user in the user_tokens table with a starting balance.
     * Uses initial_tokens from app_config (configurable in Admin).
     */
    static async initializeUser(userId: string): Promise<number> {
        invalidateBalanceCache(userId);
        const initialBalance = await AppConfigRepository.getInitialTokens();
        const { data, error } = await supabase
            .from('user_tokens')
            .upsert({ user_id: userId, balance: initialBalance })
            .select('balance')
            .single();

        if (error) throw error;
        balanceCache.set(userId, { balance: data.balance, expiresAt: Date.now() + BALANCE_CACHE_TTL_MS });
        return data.balance;
    }

    /**
     * Spend tokens for a user.
     * Uses RPC spend_tokens (el frontend no tiene política UPDATE en user_tokens; la RPC usa SECURITY DEFINER).
     * @param setId Lotería (set) en la que se gastan. Opcional.
     */
    static async spendTokens(userId: string, amount: number, setId?: string): Promise<number> {
        const currentBalance = await this.getBalance(userId);

        if (currentBalance < amount) {
            throw new Error('Insufficient tokens');
        }

        const { data, error } = await supabase.rpc('spend_tokens', {
            p_amount: amount,
            p_set_id: setId ?? null
        });

        if (error) throw error;
        invalidateBalanceCache(userId);
        return data as number;
    }

    /**
     * Add tokens to a user's balance (e.g., after a purchase).
     */
    static async addTokens(userId: string, amount: number): Promise<number> {
        const currentBalance = await this.getBalance(userId);

        const { data, error } = await supabase
            .from('user_tokens')
            .update({
                balance: currentBalance + amount,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select('balance')
            .single();

        if (error) throw error;
        invalidateBalanceCache(userId);
        return data.balance;
    }
}
