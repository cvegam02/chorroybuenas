import { logger } from '../utils/logger';
import { supabase } from '../utils/supabaseClient';
import type { OfferBannerFields } from '../utils/offerBanner';

/** Espacio público de los archivos del banner (migración 055). */
const BANNER_BUCKET = 'offer-banners';

/** La oferta vigente como la ve cualquiera (`current_offer()`): sin su nombre interno, con su banner. */
export interface CurrentOffer extends OfferBannerFields {
  id: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
}

/** La oferta vigente y su banner (FEAT-49, US A3 y A5). La leen visitantes y clientes. */
export class CurrentOfferRepository {
  /** La oferta vigente (null si no hay), distinguiendo cuando no se pudo leer. */
  static async checkCurrentOffer(): Promise<{ ok: true; offer: CurrentOffer | null } | { ok: false }> {
    const { data, error } = await supabase.rpc('current_offer');
    if (error) {
      logger.error('CurrentOfferRepository.checkCurrentOffer:', error.message);
      return { ok: false };
    }
    const row = (Array.isArray(data) ? data[0] : data) as CurrentOffer | undefined;
    return { ok: true, offer: row && typeof row.discount_percent === 'number' ? row : null };
  }

  /** La oferta vigente, o null si no hay o no se pudo leer (entonces se ven los precios normales). */
  static async getCurrentOffer(): Promise<CurrentOffer | null> {
    const result = await CurrentOfferRepository.checkCurrentOffer();
    return result.ok ? result.offer : null;
  }

  /** Dirección pública de un archivo del banner. */
  static bannerFileUrl(path: string): string {
    return supabase.storage.from(BANNER_BUCKET).getPublicUrl(path).data.publicUrl;
  }
}
