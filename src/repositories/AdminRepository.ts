import { logger } from '../utils/logger';
import { supabase } from '../utils/supabaseClient';
import {
  type DailyTotals,
  type DashboardPending,
  type DashboardSummary,
  type SummaryPeriod,
} from '../utils/adminSummary';
import type { SaleKind, SalesTotals, SaleStatusFilter } from '../utils/adminSales';
import type { UserFilter, UserSort } from '../utils/adminUsers';
import type { UserActivityEvent } from '../utils/userActivity';
import { requestGiftNotice } from '../services/giftNotice';

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
  /** La oferta que tuvo una compra de tokens (FEAT-49) y su descuento; nulos sin oferta. */
  offer_name: string | null;
  offer_percent: number | null;
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

/** Renglón de la pestaña Usuarios (FEAT-45): una cuenta con su saldo, lo pagado y su última actividad. */
export interface AdminUserRow {
  user_id: string;
  email: string | null;
  /** Nulo si la cuenta no tiene nombre. */
  full_name: string | null;
  created_at: string;
  balance: number;
  /** Total pagado en compras aprobadas, tokens y temáticas. */
  paid_cents: number;
  last_activity_at: string;
}

/** Ficha de un usuario (FEAT-45, US A2). */
export interface AdminUserDetail {
  user_id: string;
  email: string | null;
  /** Nulo si la cuenta no tiene nombre. */
  full_name: string | null;
  created_at: string;
  /** 'google', 'email' u otro proveedor; nulo si no se sabe. */
  provider: string | null;
  balance: number;
  /** Total pagado en compras aprobadas, tokens y temáticas, y cuántas son. */
  paid_cents: number;
  purchases_count: number;
  /** Tokens gastados en imágenes con IA. */
  ai_tokens: number;
  loterias_count: number;
  seasonal_count: number;
  /** Tokens regalados por administradores. */
  gifted_tokens: number;
}

export interface UsersFilters {
  search: string;
  filter: UserFilter;
  sort: UserSort;
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

/** Totales de «Regalos de tokens» en un periodo (FEAT-45, US A4). */
export interface AdminGiftsTotals {
  gifts: number;
  tokens: number;
  recipients: number;
  /** Tokens × precio por token vigente; nulo si no hay precio guardado. */
  valueCents: number | null;
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

/** Usos y tokens regalados de una promoción (FEAT-46, US A4). */
export interface PromotionUsage {
  uses: number;
  tokens: number;
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

/** Fila de admin_get_dashboard_summary (migraciones 035, 036 y 061). */
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
  ai_voices: number;
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
      aiVoices: count(row?.ai_voices),
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
    type DailyRow = { day: string; revenue_cents: number; ai_images: number; ai_voices: number };
    return ((data ?? []) as DailyRow[]).map((row) => ({
      day: row.day,
      revenueCents: Number(row.revenue_cents ?? 0),
      aiImages: Number(row.ai_images ?? 0),
      aiVoices: Number(row.ai_voices ?? 0),
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

  /** Una página de la pestaña Usuarios (FEAT-45), sobre todas las cuentas; nulo si falla. */
  static async getUsers(filters: UsersFilters, limit: number, offset: number): Promise<AdminUserRow[] | null> {
    const { data, error } = await supabase.rpc('admin_get_users', {
      p_search: filters.search || null,
      p_filter: filters.filter || null,
      p_sort: filters.sort,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      logger.error('AdminRepository.getUsers:', error.message);
      return null;
    }
    return ((data ?? []) as AdminUserRow[]).map((row) => ({ ...row, paid_cents: Number(row.paid_cents) }));
  }

  /** Cuántas cuentas hay con ese buscador y filtro rápido; nulo si falla. */
  static async getUsersCount(search: string, filter: UserFilter): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_get_users_count', {
      p_search: search || null,
      p_filter: filter || null,
    });
    if (error) {
      logger.error('AdminRepository.getUsersCount:', error.message);
      return null;
    }
    return Number(data);
  }

  /** Ficha de un usuario; nulo si falla o si la cuenta ya no existe. */
  static async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    const { data, error } = await supabase.rpc('admin_get_user_detail', { p_user_id: userId });
    if (error) {
      logger.error('AdminRepository.getUserDetail:', error.message);
      return null;
    }
    const row = (data as Record<string, unknown>[] | null)?.[0];
    if (!row) return null;
    // Postgres manda los bigint como texto o número según su tamaño: se pasan a número.
    const num = (key: string) => Number(row[key] ?? 0);
    return {
      ...(row as unknown as AdminUserDetail),
      paid_cents: num('paid_cents'),
      purchases_count: num('purchases_count'),
      ai_tokens: num('ai_tokens'),
      loterias_count: num('loterias_count'),
      seasonal_count: num('seasonal_count'),
      gifted_tokens: num('gifted_tokens'),
    };
  }

  /** Actividad de un usuario, la más reciente primero, con la IA agrupada por lotería y día; nulo si falla. */
  static async getUserActivity(userId: string, limit: number): Promise<UserActivityEvent[] | null> {
    const { data, error } = await supabase.rpc('admin_get_user_activity', { p_user_id: userId, p_limit: limit });
    if (error) {
      logger.error('AdminRepository.getUserActivity:', error.message);
      return null;
    }
    return ((data ?? []) as UserActivityEvent[]).map((event) => ({
      ...event,
      ai_photos: event.ai_photos == null ? null : Number(event.ai_photos),
    }));
  }

  /**
   * Regalar tokens a un usuario (admin). El regalo queda registrado con el motivo, si se da.
   * Después pide el correo de aviso sin esperarlo: si no sale, el regalo ya está hecho.
   * Retorna el nuevo balance o null si falla.
   */
  static async giftTokens(userId: string, amount: number, reason?: string): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_gift_tokens', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason?.trim() || null,
    });

    if (error) return null;
    void requestGiftNotice(userId, amount);
    return data as number;
  }

  /** Regalos de un periodo en hora de Hermosillo, de página en página (FEAT-45, US A4); nulo si falla. */
  static async getGifts(period: SummaryPeriod, limit: number, offset: number): Promise<AdminTokenGift[] | null> {
    const { data, error } = await supabase.rpc('admin_get_gifts', {
      p_from: period.from,
      p_to: period.to,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      logger.error('AdminRepository.getGifts:', error.message);
      return null;
    }
    return (data ?? []) as AdminTokenGift[];
  }

  /** Totales de los regalos de un periodo; nulo si falla. */
  static async getGiftsTotals(period: SummaryPeriod): Promise<AdminGiftsTotals | null> {
    const { data, error } = await supabase.rpc('admin_get_gifts_totals', { p_from: period.from, p_to: period.to });
    const row = (data as Record<string, unknown>[] | null)?.[0];
    if (error || !row) {
      logger.error('AdminRepository.getGiftsTotals:', error?.message ?? 'sin datos');
      return null;
    }
    return {
      gifts: Number(row.gifts ?? 0),
      tokens: Number(row.tokens ?? 0),
      recipients: Number(row.recipients ?? 0),
      valueCents: row.value_cents == null ? null : Number(row.value_cents),
    };
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
  /** Compras aprobadas que usaron cada promoción y tokens que regaló, por id (FEAT-46, US A4; migración 048). */
  static async getPromotionUsage(): Promise<Record<string, PromotionUsage> | null> {
    const { data, error } = await supabase.rpc('admin_get_promotion_usage');
    if (error || !Array.isArray(data)) {
      logger.error('AdminRepository.getPromotionUsage:', error?.message ?? 'sin datos');
      return null;
    }
    return Object.fromEntries(
      (data as { promotion_id: string; uses: number | string; tokens: number | string }[]).map((row) => [
        row.promotion_id,
        { uses: Number(row.uses), tokens: Number(row.tokens) },
      ]),
    );
  }

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
  /** Ventas aprobadas de cada pack en el periodo, por id (FEAT-46, US A3; migración 047). */
  static async getPackSales(period: SummaryPeriod): Promise<Record<string, number> | null> {
    const { data, error } = await supabase.rpc('admin_get_pack_sales', { p_from: period.from, p_to: period.to });
    if (error || !Array.isArray(data)) {
      logger.error('AdminRepository.getPackSales:', error?.message ?? 'sin datos');
      return null;
    }
    return Object.fromEntries(
      (data as { pack_id: string; sales: number | string }[]).map((row) => [row.pack_id, Number(row.sales)]),
    );
  }

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

  /** Cambia el precio por token en MXN (FEAT-46, US A2; migración 046). Devuelve el precio guardado o null. */
  static async setPricePerToken(priceCents: number): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_set_price_per_token', { p_price_cents: priceCents });
    if (error || typeof data !== 'number') {
      logger.error('AdminRepository.setPricePerToken:', error?.message ?? 'respuesta inesperada');
      return null;
    }
    return data;
  }

  /** Costo de IA por imagen en USD con que el Resumen estima el gasto (FEAT-47). null si falla. */
  static async getAiCostPerImage(): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_get_ai_cost_per_image');
    const cost = Number(data);
    if (error || data == null || !(cost > 0)) {
      logger.error('AdminRepository.getAiCostPerImage:', error?.message ?? 'respuesta inesperada');
      return null;
    }
    return cost;
  }

  static async setAiCostPerImage(costUsd: number): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_set_ai_cost_per_image', { p_cost_usd: costUsd });
    const cost = Number(data);
    if (error || data == null || !(cost > 0)) {
      logger.error('AdminRepository.setAiCostPerImage:', error?.message ?? 'respuesta inesperada');
      return null;
    }
    return cost;
  }

  /** Costo en USD de la voz con IA del cantador por lotería (FEAT-55, decisión 28). null si falla. */
  static async getAiCostPerVoice(): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_get_ai_cost_per_voice');
    const cost = Number(data);
    if (error || data == null || !(cost > 0)) {
      logger.error('AdminRepository.getAiCostPerVoice:', error?.message ?? 'respuesta inesperada');
      return null;
    }
    return cost;
  }

  static async setAiCostPerVoice(costUsd: number): Promise<number | null> {
    const { data, error } = await supabase.rpc('admin_set_ai_cost_per_voice', { p_cost_usd: costUsd });
    const cost = Number(data);
    if (error || data == null || !(cost > 0)) {
      logger.error('AdminRepository.setAiCostPerVoice:', error?.message ?? 'respuesta inesperada');
      return null;
    }
    return cost;
  }
}
