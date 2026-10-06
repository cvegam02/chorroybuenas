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
    /** Fuerza que el próximo getBalance consulte al servidor (p. ej. tras usar IA, que cobra en el servidor). */
    static invalidateBalance(userId: string): void {
        invalidateBalanceCache(userId);
    }

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
