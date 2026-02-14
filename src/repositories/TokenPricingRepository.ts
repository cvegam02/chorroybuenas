import { supabase } from '../utils/supabaseClient';

export interface TokenPack {
  id: string;
  base_tokens: number;
  bonus_tokens: number;
  price_cents: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface TokenPricingRow {
  id: string;
  price_per_token_cents: number;
  currency: string;
  updated_at: string;
}

export interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

export interface TokenPurchase {
  id: string;
  pack_id: string | null;
  base_tokens: number;
  bonus_tokens: number;
  total_tokens: number;
  amount_cents: number;
  payment_provider: string;
  payment_status: string | null;
  created_at: string;
}

/** Promoción activa para mostrar en compra de tokens */
export interface ActivePromotion {
  id: string;
  type: 'first_purchase' | 'code';
  code: string | null;
  percent: number;
}

const FALLBACK_PACKS: TokenPack[] = [
  { id: 'fallback-1', base_tokens: 10, bonus_tokens: 2, price_cents: 2400, sort_order: 1, is_active: true, created_at: '' },
  { id: 'fallback-2', base_tokens: 20, bonus_tokens: 5, price_cents: 4800, sort_order: 2, is_active: true, created_at: '' },
  { id: 'fallback-3', base_tokens: 50, bonus_tokens: 20, price_cents: 14000, sort_order: 3, is_active: true, created_at: '' },
];

const FALLBACK_MXN_CENTS = 200;
const FALLBACK_MXN_USD_RATE = 0.058;

export class TokenPricingRepository {
  /**
   * Packs activos ordenados por sort_order. Fallback si falla la red o no hay datos.
   */
  static async getPacks(): Promise<TokenPack[]> {
    const { data, error } = await supabase
      .from('token_packs')
      .select('id, base_tokens, bonus_tokens, price_cents, sort_order, is_active, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data?.length) {
      return FALLBACK_PACKS;
    }
    return data as TokenPack[];
  }

  /**
   * Precio por token en una moneda. Fallback 200 centavos MXN.
   */
  static async getPricing(currency = 'MXN'): Promise<number> {
    const { data, error } = await supabase
      .from('token_pricing')
      .select('price_per_token_cents')
      .eq('currency', currency)
      .maybeSingle();

    if (error || !data) {
      return FALLBACK_MXN_CENTS;
    }
    return data.price_per_token_cents;
  }

  /**
   * Tipo de cambio MXN → USD para mostrar referencia en inglés. Fallback 0.058.
   */
  static async getExchangeRateMxnUsd(): Promise<number> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', 'MXN')
      .eq('to_currency', 'USD')
      .maybeSingle();

    if (error || data == null) {
      return FALLBACK_MXN_USD_RATE;
    }
    return Number(data.rate);
  }

  /**
   * Promociones activas y vigentes (para mostrar en compra de tokens).
   * Filtra por is_active y valid_from/valid_until.
   */
  static async getActivePromotions(): Promise<ActivePromotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('id, type, code, config, valid_from, valid_until, is_active');

    if (error || !data) return [];

    const now = new Date();
    const valid = data.filter((p) => {
      if (!p.is_active) return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_until && new Date(p.valid_until) < now) return false;
      return true;
    });

    return valid
      .filter((p) => p.type === 'first_purchase' || p.type === 'code')
      .map((p) => {
        const config = (p.config ?? {}) as { percent?: number };
        const percent = typeof config.percent === 'number' && config.percent >= 1 && config.percent <= 100
          ? Math.round(config.percent)
          : 0;
        return {
          id: p.id,
          type: p.type as 'first_purchase' | 'code',
          code: p.code?.trim() || null,
          percent,
        };
      })
      .filter((p) => p.percent > 0);
  }

  /**
   * Cantidad de compras del usuario (para badge "primera compra").
   */
  static async getPurchaseCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('token_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) return 0;
    return count ?? 0;
  }

  /**
   * Suma total de tokens recibidos por compras (base + bonus de cada compra).
   */
  static async getTotalTokensReceived(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('token_purchases')
      .select('total_tokens')
      .eq('user_id', userId);

    if (error) return 0;
    const total = (data ?? []).reduce((sum, row) => sum + (row.total_tokens ?? 0), 0);
    return total;
  }

  /**
   * Suma total de tokens gastados (registrados en token_usage al descontar).
   * Fuente de verdad para el contador "tokens gastados".
   */
  static async getTotalTokensSpent(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('token_usage')
      .select('amount')
      .eq('user_id', userId);

    if (error) return 0;
    const total = (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
    return total;
  }

  /**
   * Tokens gastados por lotería (set).
   * Retorna un mapa set_id -> total.
   */
  static async getTokensSpentBySet(userId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('token_usage')
      .select('set_id, amount')
      .eq('user_id', userId);

    if (error) return {};
    const bySet: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = row.set_id ?? '_sin_set';
      bySet[id] = (bySet[id] ?? 0) + (row.amount ?? 0);
    }
    return bySet;
  }

  /**
   * Historial de compras de tokens del usuario (más recientes primero).
   */
  static async getPurchaseHistory(userId: string): Promise<TokenPurchase[]> {
    const { data, error } = await supabase
      .from('token_purchases')
      .select('id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []) as TokenPurchase[];
  }

  /**
   * Tokens gastados para una lotería específica.
   */
  static async getTokensSpentForSet(userId: string, setId: string): Promise<number> {
    const { data, error } = await supabase
      .from('token_usage')
      .select('amount')
      .eq('user_id', userId)
      .eq('set_id', setId);

    if (error) return 0;
    return (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
  }
}
