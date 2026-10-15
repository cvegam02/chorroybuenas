import { logger } from '../utils/logger';
import { supabase } from '../utils/supabaseClient';
import { summarizeRevenue, type RevenueSummary } from '../utils/adminRevenue';
import {
  hermosilloDayRange,
  type DailyTotals,
  type DashboardPending,
  type DashboardSummary,
  type SummaryPeriod,
} from '../utils/adminSummary';
import type { SaleKind, SalesTotals, SaleStatusFilter } from '../utils/adminSales';

/** Renglón de la pestaña Ventas (FEAT-44): una compra de tokens o de una lotería temática. */
export interface AdminSaleRow {
  id: string;
  /** Nulo si la cuenta que compró ya se borró. */
  user_id: string | null;
  kind: SaleKind;
  /** Solo en las temáticas. */
  loteria_name: string | null;
  /** Nulo en las temáticas y en los tokens sin pack. */
  pack_id: string | null;
  /** Los tokens son nulos en las temáticas. */
  base_tokens: number | null;
  bonus_tokens: number | null;
  total_tokens: number | null;
  amount_cents: number;
  payment_id: string;
  payment_status: string | null;
  created_at: string;
  email: string | null;
  full_name: string | null;
}

/** El pago de Mercado Pago de una venta, solo con lo que muestra el detalle (US A3). Vacío si no se guardó. */
export interface AdminSaleDetail {
  payment_id: string;
  payer_id: string | null;
  method_type: string | null;
  method_id: string | null;
  mp_status: string | null;
  mp_status_detail: string | null;
  mp_created_at: string | null;
  mp_approved_at: string | null;
  /** Pesos, como los manda Mercado Pago. */
  mp_amount: number | null;
}

/** Filtros de la pestaña Ventas; el periodo es de días de Hermosillo. */
export interface SalesFilters {
  period: SummaryPeriod;
  search: string;
  kind: '' | SaleKind;
  status: SaleStatusFilter;
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

export interface AdminTokenGift {
  id: string;
  created_at: string;
  amount: number;
  reason: string | null;
  admin_id: string | null;
  admin_email: string | null;
  admin_name: string | null;
  recipient_id: string;
  recipient_email: string | null;
  recipient_name: string | null;
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

/** Fila de admin_get_dashboard_summary (migraciones 035 y 036). */
interface DashboardSummaryRow {
  tokens_revenue_cents: number;
  seasonal_revenue_cents: number;
  ai_images: number;
  new_users: number;
  buyers: number;
  first_time_buyers: number;
  ai_users: number;
  token_purchases: number;
  tokens_sold: number;
  seasonal_sales: number;
  top_pack_tokens: number | null;
  top_pack_sales: number;
  top_loteria_name: string | null;
  top_loteria_sales: number;
}

/** Filtro por días de Uso de IA, en hora de Hermosillo como el Resumen (FEAT-43). */
function usageDateParams(filters?: { dateFrom?: string; dateTo?: string }) {
  const range = hermosilloDayRange(filters?.dateFrom ?? '', filters?.dateTo ?? '');
  return { p_date_from: range.from, p_date_to: range.to };
}

/** Ventas por consulta al exportar: el máximo que acepta admin_get_sales (migración 039). */
const SALES_EXPORT_PAGE = 1000;
/** Tope de páginas al exportar (50 000 ventas), para no quedarse pidiendo sin fin. */
const SALES_EXPORT_MAX_PAGES = 50;

const salesFilterParams = (filters: SalesFilters) => ({
  p_from: filters.period.from,
  p_to: filters.period.to,
  p_search: filters.search.trim() || null,
  p_kind: filters.kind || null,
  p_status: filters.status || null,
});

export class AdminRepository {
  /**
   * Resumen de ingresos: lo vendido en tokens y en loterías de temporada, y el total.
   * Devuelve null si alguna de las dos consultas falla, para no mostrar un total incompleto.
   */
  static async getPurchasesSummary(): Promise<RevenueSummary | null> {
    const [tokens, seasonal] = await Promise.all([
      supabase.from('token_purchases').select('amount_cents').limit(10000),
      supabase.from('seasonal_purchases').select('amount_cents, status').limit(10000),
    ]);

    const error = tokens.error ?? seasonal.error;
    if (error) {
      logger.error('AdminRepository.getPurchasesSummary:', error.message);
      return null;
    }
    return summarizeRevenue(tokens.data ?? [], seasonal.data ?? []);
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

  /** Una página de la pestaña Ventas (FEAT-44); nulo si falla. */
  static async getSales(filters: SalesFilters, limit: number, offset: number): Promise<AdminSaleRow[] | null> {
    const { data, error } = await supabase.rpc('admin_get_sales', {
      ...salesFilterParams(filters),
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      logger.error('AdminRepository.getSales:', error.message);
      return null;
    }
    return (data ?? []) as AdminSaleRow[];
  }

  /**
   * Todas las ventas con esos filtros, para «Exportar CSV» (US A4), de mil en mil (el tope de la base).
   * Nulo si falla cualquier página: un archivo incompleto se confundiría con el completo.
   */
  static async getAllSales(filters: SalesFilters): Promise<AdminSaleRow[] | null> {
    const all: AdminSaleRow[] = [];
    for (let page = 0; page < SALES_EXPORT_MAX_PAGES; page++) {
      const rows = await AdminRepository.getSales(filters, SALES_EXPORT_PAGE, page * SALES_EXPORT_PAGE);
      if (!rows) return null;
      all.push(...rows);
      if (rows.length < SALES_EXPORT_PAGE) return all;
    }
    logger.error('AdminRepository.getAllSales:', 'demasiadas ventas para un solo archivo');
    return null;
  }

  /** El pago de Mercado Pago de una venta; nulo si falla o si la venta ya no existe. */
  static async getSaleDetail(kind: SaleKind, id: string): Promise<AdminSaleDetail | null> {
    const { data, error } = await supabase.rpc('admin_get_sale_detail', { p_kind: kind, p_id: id });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      logger.error('AdminRepository.getSaleDetail:', error?.message ?? 'sin datos');
      return null;
    }
    return { ...row, mp_amount: row.mp_amount === null ? null : Number(row.mp_amount) } as AdminSaleDetail;
  }

  /** Totales de la pestaña Ventas con esos filtros, calculados en la base (US A2); nulo si falla. */
  static async getSalesTotals(filters: SalesFilters): Promise<SalesTotals | null> {
    const { data, error } = await supabase.rpc('admin_get_sales_totals', salesFilterParams(filters));
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      logger.error('AdminRepository.getSalesTotals:', error?.message ?? 'sin datos');
      return null;
    }
    return {
      sales: Number(row.sales),
      collectedCents: Number(row.collected_cents),
      pendingCount: Number(row.pending_count),
      pendingCents: Number(row.pending_cents),
      tokensSold: Number(row.tokens_sold),
    };
  }

  /** Resumen del panel (FEAT-43) para un periodo en días de Hermosillo; nulo si falla. */
  static async getDashboardSummary(period: SummaryPeriod): Promise<DashboardSummary | null> {
    const { data, error } = await supabase.rpc('admin_get_dashboard_summary', {
      p_from: period.from,
      p_to: period.to,
    });
    if (error) {
      logger.error('AdminRepository.getDashboardSummary:', error.message);
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : data) as DashboardSummaryRow | undefined;
    const count = (value: number | null | undefined) => Number(value ?? 0);
    return {
      tokensRevenueCents: count(row?.tokens_revenue_cents),
      seasonalRevenueCents: count(row?.seasonal_revenue_cents),
      aiImages: count(row?.ai_images),
      newUsers: count(row?.new_users),
      buyers: count(row?.buyers),
      firstTimeBuyers: count(row?.first_time_buyers),
      aiUsers: count(row?.ai_users),
      tokenPurchases: count(row?.token_purchases),
      tokensSold: count(row?.tokens_sold),
      seasonalSales: count(row?.seasonal_sales),
      topPack: row?.top_pack_tokens != null
        ? { baseTokens: count(row.top_pack_tokens), sales: count(row.top_pack_sales) }
        : null,
      topLoteria: row?.top_loteria_name != null
        ? { name: row.top_loteria_name, sales: count(row.top_loteria_sales) }
        : null,
    };
  }

  /** Ingresos e imágenes de IA por día del periodo, para la gráfica del Resumen (FEAT-43); nulo si falla. */
  static async getDashboardDaily(period: SummaryPeriod): Promise<DailyTotals[] | null> {
    const { data, error } = await supabase.rpc('admin_get_dashboard_daily', {
      p_from: period.from,
      p_to: period.to,
    });
    if (error) {
      logger.error('AdminRepository.getDashboardDaily:', error.message);
      return null;
    }
    return ((data ?? []) as { day: string; revenue_cents: number; ai_images: number }[]).map((row) => ({
      day: row.day,
      revenueCents: Number(row.revenue_cents ?? 0),
      aiImages: Number(row.ai_images ?? 0),
    }));
  }

  /** Pagos pendientes y tokens regalados del Resumen (FEAT-43); nulo si falla. */
  static async getDashboardPending(period: SummaryPeriod): Promise<DashboardPending | null> {
    const { data, error } = await supabase.rpc('admin_get_dashboard_pending', {
      p_from: period.from,
      p_to: period.to,
    });
    if (error) {
      logger.error('AdminRepository.getDashboardPending:', error.message);
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { pending_payments: number; oldest_pending_at: string | null; gifted_tokens: number; gift_recipients: number }
      | undefined;
    return {
      pendingPayments: Number(row?.pending_payments ?? 0),
      oldestPendingAt: row?.oldest_pending_at ?? null,
      giftedTokens: Number(row?.gifted_tokens ?? 0),
      giftRecipients: Number(row?.gift_recipients ?? 0),
    };
  }

  /** Resumen de uso: total tokens, usuarios únicos, sets únicos */
  static async getUsageSummary(filters?: { dateFrom?: string; dateTo?: string }): Promise<{
    totalTokens: number;
    uniqueUsers: number;
    uniqueSets: number;
  }> {
    const { data, error } = await supabase.rpc('admin_get_usage_summary', {
      ...usageDateParams(filters),
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
      ...usageDateParams(filters),
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
      ...usageDateParams(filters),
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
      ...usageDateParams(filters),
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
   * Regalar tokens a un usuario (admin). El regalo queda registrado con el motivo, si se da.
   * Retorna el nuevo balance o null si falla.
   */
  static async giftTokens(userId: string, amount: number, reason?: string): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_gift_tokens', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason?.trim() || null,
    });

    if (error) return null;
    return data as number;
  }

  /**
   * Lista general de regalos de tokens (admin), más recientes primero.
   * Retorna null si falla, para distinguirlo de una lista vacía.
   */
  static async getTokenGifts(limit = 200): Promise<AdminTokenGift[] | null> {
    const { data, error } = await supabase.rpc('admin_get_token_gifts', { p_limit: limit });

    if (error) return null;
    return (data ?? []) as AdminTokenGift[];
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
