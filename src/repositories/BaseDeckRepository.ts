import { supabase } from '../utils/supabaseClient';
import { logger } from '../utils/logger';
import { BASE_DECK_SIZE, baseDeckNumberFromPath, baseDeckPath } from '../utils/baseDeck';

/** Las direcciones para ver las cartas base duran lo que una sesión de trabajo. */
const LINK_SECONDS = 4 * 60 * 60;

/** Baraja base privada (FEAT-50, US A1; migración 056). Solo administradores. */
export class BaseDeckRepository {
  static readonly BUCKET = 'base-deck';

  /** Las cartas base subidas: número → dirección temporal para verla. Devuelve null si falla. */
  static async getCardUrls(): Promise<Map<number, string> | null> {
    const { data: objects, error } = await supabase.storage.from(this.BUCKET).list('', { limit: BASE_DECK_SIZE + 10 });
    if (error || !objects) {
      logger.error('BaseDeckRepository.getCardUrls (list):', error?.message);
      return null;
    }
    const paths = objects.map((object) => object.name).filter((name) => baseDeckNumberFromPath(name) !== null);
    if (paths.length === 0) return new Map();

    const { data: links, error: linkError } = await supabase.storage.from(this.BUCKET).createSignedUrls(paths, LINK_SECONDS);
    if (linkError || !links) {
      logger.error('BaseDeckRepository.getCardUrls (links):', linkError?.message);
      return null;
    }
    const urls = new Map<number, string>();
    for (const link of links) {
      const number = link.path ? baseDeckNumberFromPath(link.path) : null;
      if (number !== null && link.signedUrl) urls.set(number, link.signedUrl);
    }
    return urls;
  }

  /** Sube (o reemplaza) la carta base de ese número. Devuelve false si falla. */
  static async uploadCard(number: number, file: File): Promise<boolean> {
    const { error } = await supabase.storage
      .from(this.BUCKET)
      .upload(baseDeckPath(number), file, { upsert: true, contentType: file.type, cacheControl: '0' });
    if (error) {
      logger.error(`BaseDeckRepository.uploadCard (${number}):`, error.message);
      return false;
    }
    return true;
  }
}
