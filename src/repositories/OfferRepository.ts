import { logger } from '../utils/logger';
import { supabase } from '../utils/supabaseClient';
import type { AdminOffer, OfferInput } from '../utils/adminOffers';
import type { OfferBannerFields } from '../utils/offerBanner';
import type { SummaryPeriod } from '../utils/adminSummary';
import { CurrentOfferRepository } from './CurrentOfferRepository';

// Un solo texto literal: así el cliente de Supabase deduce las columnas.
const OFFER_COLUMNS =
  'id, name, discount_percent, starts_at, ends_at, cancelled_at, banner_enabled, banner_video_path, banner_image_path, banner_title_es, banner_text_es, banner_button_es, banner_title_en, banner_text_en, banner_button_en, banner_target, banner_on_home, banner_on_dashboard, banner_countdown';
/** Espacio público de los archivos del banner (migración 055). */
const BANNER_BUCKET = 'offer-banners';

/** Lo que se guarda de una oferta: el descuento y, desde US A4, su banner. */
export type OfferSave = OfferInput & Partial<OfferBannerFields>;
/** La base no deja cruzarse dos ofertas (migración 053). */
const OVERLAP_CODE = '23P01';

export type SaveOfferResult = { ok: true; offer: AdminOffer } | { ok: false; overlap: boolean };

/** Ofertas con banner (FEAT-49). La tabla solo la leen y escriben administradores. */
export class OfferRepository {
  /** Todas las ofertas, la más reciente primero; nulo si falla. */
  static async getAdminOffers(): Promise<AdminOffer[] | null> {
    const { data, error } = await supabase
      .from('offers')
      .select(OFFER_COLUMNS)
      .order('starts_at', { ascending: false });
    if (error) {
      logger.error('OfferRepository.getAdminOffers:', error.message);
      return null;
    }
    return (data ?? []) as AdminOffer[];
  }

  static async createOffer(input: OfferSave): Promise<SaveOfferResult> {
    const { data, error } = await supabase.from('offers').insert(input).select(OFFER_COLUMNS).single();
    if (error) {
      logger.error('OfferRepository.createOffer:', error.message);
      return { ok: false, overlap: error.code === OVERLAP_CODE };
    }
    return { ok: true, offer: data as AdminOffer };
  }

  static async updateOffer(id: string, input: OfferSave): Promise<SaveOfferResult> {
    const { data, error } = await supabase
      .from('offers')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(OFFER_COLUMNS)
      .single();
    if (error) {
      logger.error('OfferRepository.updateOffer:', error.message);
      return { ok: false, overlap: error.code === OVERLAP_CODE };
    }
    return { ok: true, offer: data as AdminOffer };
  }

  /** Cancela desde ahora: deja de estar vigente y libera sus fechas. */
  static async cancelOffer(id: string): Promise<AdminOffer | null> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('offers')
      .update({ cancelled_at: now, updated_at: now })
      .eq('id', id)
      .select(OFFER_COLUMNS)
      .single();
    if (error) {
      logger.error('OfferRepository.cancelOffer:', error.message);
      return null;
    }
    return data as AdminOffer;
  }

  /** Sube un archivo del banner; devuelve su ubicación o null si falla. */
  static async uploadBannerFile(path: string, file: Blob, contentType: string): Promise<string | null> {
    const { error } = await supabase.storage.from(BANNER_BUCKET).upload(path, file, { contentType, upsert: false });
    if (error) {
      logger.error('OfferRepository.uploadBannerFile:', error.message);
      return null;
    }
    return path;
  }

  /** Borra archivos del banner que ya no se usan. Si falla, solo se anota: no estorban. */
  static async removeBannerFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await supabase.storage.from(BANNER_BUCKET).remove(paths);
    if (error) logger.error('OfferRepository.removeBannerFiles:', error.message);
  }

  /** Dirección pública de un archivo del banner. */
  static bannerFileUrl(path: string): string {
    return CurrentOfferRepository.bannerFileUrl(path);
  }

  /** Ventas aprobadas con oferta y lo cobrado en el periodo (Resumen, decisión 16); nulo si falla. */
  static async getOfferSalesTotal(period: SummaryPeriod): Promise<{ sales: number; collectedCents: number } | null> {
    const { data, error } = await supabase.rpc('admin_get_offer_sales_total', { p_from: period.from, p_to: period.to });
    if (error) {
      logger.error('OfferRepository.getOfferSalesTotal:', error.message);
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : data) as { sales?: number | string; collected_cents?: number | string } | undefined;
    return { sales: Number(row?.sales ?? 0), collectedCents: Number(row?.collected_cents ?? 0) };
  }
}
