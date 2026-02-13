import { supabase } from '../utils/supabaseClient';

export interface AdminPurchase {
  id: string;
  user_id: string;
  pack_id: string | null;
  base_tokens: number;
  bonus_tokens: number;
  total_tokens: number;
  amount_cents: number;
  payment_provider: string;
  payment_status: string | null;
  created_at: string;
  email?: string | null;
  full_name?: string | null;
}

export interface AdminMPTransaction extends AdminPurchase {
  payment_id: string | null;
  payment_metadata: Record<string, unknown> | null;
}

export interface AdminTokenUsage {
  id: string;
  user_id: string;
  amount: number;
  reason: string | null;
  set_id: string | null;
  created_at: string;
}

export interface AdminTokenUsageWithInfo extends AdminTokenUsage {
  email: string | null;
  set_name: string | null;
}

export interface AdminUserBalance {
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface AdminUserBalanceWithInfo extends AdminUserBalance {
  email: string | null;
  full_name: string | null;
}

export interface AdminPromotion {
  id: string;
  code: string | null;
  type: string;
  config: Record<string, unknown>;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminTokenPack {
  id: string;
  base_tokens: number;
  bonus_tokens: number;
  price_cents: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminTokenPricing {
  id: string;
  price_per_token_cents: number;
  currency: string;
  updated_at: string;
}

export class AdminRepository {
  /** Parámetros de filtro para compras */
  static async getAllPurchases(
    limit = 50,
    offset = 0,
    filters?: {
      email?: string;
      status?: string;
      provider?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<AdminPurchase[]> {
    const params: Record<string, unknown> = {
      p_limit: limit,
      p_offset: offset,
      p_email: filters?.email?.trim() || null,
      p_status: filters?.status || null,
      p_provider: filters?.provider || null,
      p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
      p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
    };
    const { data, error } = await supabase.rpc('admin_get_purchases_with_users', params);

    if (error) {
      const fallback = await supabase
        .from('token_purchases')
        .select('id, user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_status, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (fallback.error) return [];
      return (fallback.data ?? []) as AdminPurchase[];
    }
    return (data ?? []) as AdminPurchase[];
  }

  /**
   * Resumen de compras: ingresos totales y cantidad.
   */
  static async getPurchasesSummary(): Promise<{ totalRevenueCents: number; count: number }> {
    const { data } = await supabase
      .from('token_purchases')
      .select('amount_cents')
      .limit(10000);

    const rows = data ?? [];
    const totalRevenueCents = rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    return { totalRevenueCents, count: rows.length };
  }

  /**
   * Resumen de uso de tokens: total gastado.
   */
  static async getTokenUsageSummary(): Promise<number> {
    const { data } = await supabase
      .from('token_usage')
      .select('amount')
      .limit(10000);

    const rows = data ?? [];
    return rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  }

  /**
   * Total de compras (admin). Para paginación. Acepta mismos filtros que getAllPurchases.
   */
  static async getPurchasesCount(filters?: {
    email?: string;
    status?: string;
    provider?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<number> {
    const hasFilters = filters && (filters.email?.trim() || filters.status || filters.provider || filters.dateFrom || filters.dateTo);
    if (hasFilters) {
      const { data, error } = await supabase.rpc('admin_get_purchases_count', {
        p_email: filters?.email?.trim() || null,
        p_status: filters?.status || null,
        p_provider: filters?.provider || null,
        p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
        p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
      });
      if (error) return 0;
      return (data as number) ?? 0;
    }
    const { count, error } = await supabase
      .from('token_purchases')
      .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  }

  /**
   * Uso de tokens (IA) con email y nombre de lotería (admin). Con filtros.
   */
  static async getTokenUsageWithInfo(
    limit = 50,
    offset = 0,
    filters?: { email?: string; dateFrom?: string; dateTo?: string; setName?: string }
  ): Promise<AdminTokenUsageWithInfo[]> {
    const params: Record<string, unknown> = {
      p_limit: limit,
      p_offset: offset,
      p_email: filters?.email?.trim() || null,
      p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
      p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
      p_set_name: filters?.setName?.trim() || null,
    };
    const { data, error } = await supabase.rpc('admin_get_token_usage_with_users', params);

    if (error) {
      const fallback = await supabase
        .from('token_usage')
        .select('id, user_id, amount, reason, set_id, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (fallback.error) return [];
      return (fallback.data ?? []).map((r) => ({
        ...r,
        email: null as string | null,
        set_name: null as string | null,
      })) as AdminTokenUsageWithInfo[];
    }
    return (data ?? []) as AdminTokenUsageWithInfo[];
  }

  /**
   * Total de registros de uso de tokens (admin). Con filtros para paginación.
   */
  static async getTokenUsageCount(filters?: {
    email?: string;
    dateFrom?: string;
    dateTo?: string;
    setName?: string;
  }): Promise<number> {
    const hasFilters = filters && (filters.email?.trim() || filters.dateFrom || filters.dateTo || filters.setName?.trim());
    if (hasFilters) {
      const { data, error } = await supabase.rpc('admin_get_token_usage_count', {
        p_email: filters?.email?.trim() || null,
        p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
        p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
        p_set_name: filters?.setName?.trim() || null,
      });
      if (error) return 0;
      return (data as number) ?? 0;
    }
    const { count, error } = await supabase.from('token_usage').select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  }

  /** Transacciones de Mercado Pago con payment_id y metadata */
  static async getMPTransactions(
    limit = 50,
    offset = 0,
    filters?: { email?: string; status?: string; dateFrom?: string; dateTo?: string }
  ): Promise<AdminMPTransaction[]> {
    const { data, error } = await supabase.rpc('admin_get_mp_transactions', {
      p_limit: limit,
      p_offset: offset,
      p_email: filters?.email?.trim() || null,
      p_status: filters?.status || null,
      p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
      p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
    });
    if (error) return [];
    return (data ?? []) as AdminMPTransaction[];
  }

  static async getMPTransactionsCount(filters?: {
    email?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<number> {
    const hasFilters = filters && (filters.email?.trim() || filters.status || filters.dateFrom || filters.dateTo);
    if (hasFilters) {
      const { data, error } = await supabase.rpc('admin_get_mp_transactions_count', {
        p_email: filters?.email?.trim() || null,
        p_status: filters?.status || null,
        p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
        p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
      });
      if (error) return 0;
      return (data as number) ?? 0;
    }
    const { count, error } = await supabase
      .from('token_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('payment_provider', 'mercadopago');
    if (error) return 0;
    return count ?? 0;
  }

  /** Resumen de uso: total tokens, usuarios únicos, sets únicos */
  static async getUsageSummary(filters?: { dateFrom?: string; dateTo?: string }): Promise<{
    totalTokens: number;
    uniqueUsers: number;
    uniqueSets: number;
  }> {
    const { data, error } = await supabase.rpc('admin_get_usage_summary', {
      p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
      p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
    });
    if (error) return { totalTokens: 0, uniqueUsers: 0, uniqueSets: 0 };
    const row = Array.isArray(data) ? data[0] : data;
    return {
      totalTokens: Number(row?.total_tokens ?? 0),
      uniqueUsers: Number(row?.unique_users ?? 0),
      uniqueSets: Number(row?.unique_sets ?? 0),
    };
  }

  /** Tokens por día (para gráfica) */
  static async getUsageByDay(
    days = 30,
    filters?: { dateFrom?: string; dateTo?: string }
  ): Promise<{ day: string; tokens: number }[]> {
    const { data, error } = await supabase.rpc('admin_get_usage_by_day', {
      p_days: days,
      p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
      p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
    });
    if (error) return [];
    return (data ?? []).map((r: { day: string; tokens: number }) => ({
      day: r.day,
      tokens: Number(r.tokens ?? 0),
    }));
  }

  /** Top usuarios por tokens */
  static async getUsageByUser(
    limit = 10,
    filters?: { dateFrom?: string; dateTo?: string }
  ): Promise<{ user_id: string; email: string | null; total_tokens: number }[]> {
    const { data, error } = await supabase.rpc('admin_get_usage_by_user', {
      p_limit: limit,
      p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
      p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
    });
    if (error) return [];
    return (data ?? []).map((r: { user_id: string; email: string | null; total_tokens: number }) => ({
      user_id: r.user_id,
      email: r.email,
      total_tokens: Number(r.total_tokens ?? 0),
    }));
  }

  /** Top loterías por tokens */
  static async getUsageBySet(
    limit = 10,
    filters?: { dateFrom?: string; dateTo?: string }
  ): Promise<{ set_id: string; set_name: string | null; total_tokens: number }[]> {
    const { data, error } = await supabase.rpc('admin_get_usage_by_set', {
      p_limit: limit,
      p_date_from: filters?.dateFrom ? filters.dateFrom + 'T00:00:00Z' : null,
      p_date_to: filters?.dateTo ? filters.dateTo + 'T23:59:59Z' : null,
    });
    if (error) return [];
    return (data ?? []).map((r: { set_id: string; set_name: string | null; total_tokens: number }) => ({
      set_id: r.set_id,
      set_name: r.set_name,
      total_tokens: Number(r.total_tokens ?? 0),
    }));
  }

  /**
   * Balances de todos los usuarios (admin).
   */
  static async getAllUserBalances(limit = 100, offset = 0): Promise<AdminUserBalance[]> {
    const { data, error } = await supabase
      .from('user_tokens')
      .select('user_id, balance, updated_at')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return [];
    return (data ?? []) as AdminUserBalance[];
  }

  /**
   * Balances con email y nombre (admin). Usa RPC que lee auth.users.
   * Si la RPC falla (p. ej. auth.users restringido en Supabase), hace fallback
   * a lectura directa de user_tokens (sin email/nombre).
   */
  static async getBalancesWithUserInfo(limit = 200): Promise<AdminUserBalanceWithInfo[]> {
    const { data, error } = await supabase.rpc('admin_get_balances_with_users', {
      p_limit: limit,
    });

    if (!error) return (data ?? []) as AdminUserBalanceWithInfo[];

    // Fallback: Supabase puede restringir acceso a auth.users en RPCs.
    // Usamos lectura directa de user_tokens (admins tienen RLS permitido).
    const fallback = await this.getAllUserBalances(limit, 0);
    return fallback.map((b) => ({
      ...b,
      email: null as string | null,
      full_name: null as string | null,
    }));
  }

  /**
   * Regalar tokens a un usuario (admin).
   * Retorna el nuevo balance o null si falla.
   */
  static async giftTokens(userId: string, amount: number): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_gift_tokens', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (error) return null;
    return data as number;
  }

  /**
   * Todas las promociones (admin). Incluye inactivas.
   */
  static async getPromotions(): Promise<AdminPromotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('id, code, type, config, valid_from, valid_until, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []) as AdminPromotion[];
  }

  /**
   * Crear promoción (admin).
   */
  static async createPromotion(params: {
    code?: string | null;
    type: string;
    config: Record<string, unknown>;
    valid_from?: string | null;
    valid_until?: string | null;
    is_active?: boolean;
  }): Promise<AdminPromotion | null> {
    const { data, error } = await supabase
      .from('promotions')
      .insert({
        code: params.code ?? null,
        type: params.type,
        config: params.config ?? {},
        valid_from: params.valid_from ?? null,
        valid_until: params.valid_until ?? null,
        is_active: params.is_active ?? true,
      })
      .select('id, code, type, config, valid_from, valid_until, is_active, created_at')
      .single();

    if (error) return null;
    return data as AdminPromotion;
  }

  /**
   * Actualizar promoción (admin).
   */
  static async updatePromotion(
    id: string,
    params: Partial<{
      code: string | null;
      type: string;
      config: Record<string, unknown>;
      valid_from: string | null;
      valid_until: string | null;
      is_active: boolean;
    }>
  ): Promise<AdminPromotion | null> {
    const { data, error } = await supabase
      .from('promotions')
      .update(params)
      .eq('id', id)
      .select('id, code, type, config, valid_from, valid_until, is_active, created_at')
      .single();

    if (error) return null;
    return data as AdminPromotion;
  }

  /**
   * Eliminar promoción (admin).
   */
  static async deletePromotion(id: string): Promise<boolean> {
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    return !error;
  }

  /**
   * Todos los packs (admin). Incluye inactivos.
   */
  static async getTokenPacks(): Promise<AdminTokenPack[]> {
    const { data, error } = await supabase
      .from('token_packs')
      .select('id, base_tokens, bonus_tokens, price_cents, sort_order, is_active, created_at')
      .order('sort_order', { ascending: true });

    if (error) return [];
    return (data ?? []) as AdminTokenPack[];
  }

  /**
   * Actualizar pack (admin). Precio, orden, activo.
   */
  static async updateTokenPack(
    id: string,
    params: Partial<{
      base_tokens: number;
      bonus_tokens: number;
      price_cents: number;
      sort_order: number;
      is_active: boolean;
    }>
  ): Promise<AdminTokenPack | null> {
    const { data, error } = await supabase
      .from('token_packs')
      .update(params)
      .eq('id', id)
      .select('id, base_tokens, bonus_tokens, price_cents, sort_order, is_active, created_at')
      .single();

    if (error) return null;
    return data as AdminTokenPack;
  }

  /**
   * Crear pack (admin).
   */
  static async createTokenPack(params: {
    base_tokens: number;
    bonus_tokens: number;
    price_cents: number;
    sort_order?: number;
  }): Promise<AdminTokenPack | null> {
    const { data, error } = await supabase
      .from('token_packs')
      .insert({
        base_tokens: params.base_tokens,
        bonus_tokens: params.bonus_tokens,
        price_cents: params.price_cents,
        sort_order: params.sort_order ?? 0,
        is_active: true,
      })
      .select('id, base_tokens, bonus_tokens, price_cents, sort_order, is_active, created_at')
      .single();

    if (error) return null;
    return data as AdminTokenPack;
  }

  /**
   * Precios por token por moneda (admin).
   */
  static async getTokenPricing(): Promise<AdminTokenPricing[]> {
    const { data, error } = await supabase
      .from('token_pricing')
      .select('id, price_per_token_cents, currency, updated_at')
      .order('currency', { ascending: true });

    if (error) return [];
    return (data ?? []) as AdminTokenPricing[];
  }
}
