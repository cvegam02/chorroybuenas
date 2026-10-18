import { supabase } from '../utils/supabaseClient';
import { logger } from '../utils/logger';
import type { AiCardText, AiInputSource, AiQuality } from '../utils/aiCardList';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const ATTEMPT_LINK_SECONDS = 4 * 60 * 60;

export interface AiAttempt {
  id: string;
  path: string;
  quality: AiQuality;
  createdAt: string;
}

export interface AiCard extends AiCardText {
  id: string;
  position: number;
  inputSource: AiInputSource;
  chosenAttemptId: string | null;
  /** Del más viejo al más nuevo. */
  attempts: AiAttempt[];
}

export interface AiBuild {
  generalPrompt: string;
  quality: AiQuality;
  referenceCardId: string | null;
  cards: AiCard[];
}

export const EMPTY_AI_BUILD: AiBuild = { generalPrompt: '', quality: 'low', referenceCardId: null, cards: [] };

/** `prunedIds`: los intentos viejos que el servidor borró para dejar 5 (US A3). */
export type GenerateResult =
  | { ok: true; attempt: AiAttempt; prunedIds: string[] }
  | { ok: false; message: string; code?: string };

interface CardRow {
  id: string;
  position: number;
  number: number;
  name: string;
  scene: string;
  input_source: AiInputSource;
  chosen_attempt_id: string | null;
}

interface AttemptRow {
  id: string;
  card_id: string;
  path: string;
  quality: AiQuality;
  created_at: string;
}

const toAttempt = (row: AttemptRow): AiAttempt => ({ id: row.id, path: row.path, quality: row.quality, createdAt: row.created_at });

const toCard = (row: CardRow, attempts: AttemptRow[]): AiCard => ({
  id: row.id,
  position: row.position,
  number: row.number,
  name: row.name,
  scene: row.scene,
  inputSource: row.input_source,
  chosenAttemptId: row.chosen_attempt_id,
  attempts: attempts.filter((attempt) => attempt.card_id === row.id).map(toAttempt),
});

const CARD_COLUMNS = 'id, position, number, name, scene, input_source, chosen_attempt_id';

/** Generación de cartas con IA de una lotería temática (FEAT-50; migración 057). Solo administradores. */
export class AiCardsRepository {
  static readonly ATTEMPTS_BUCKET = 'seasonal-ai';

  /** Ajustes, cartas e intentos de una lotería. Sin nada guardado, vacío; null si la consulta falla. */
  static async getBuild(loteriaId: string): Promise<AiBuild | null> {
    const [build, cards] = await Promise.all([
      supabase.from('seasonal_ai_builds').select('general_prompt, quality, reference_card_id').eq('loteria_id', loteriaId).maybeSingle(),
      supabase.from('seasonal_ai_cards').select(CARD_COLUMNS).eq('loteria_id', loteriaId).order('position'),
    ]);
    if (build.error || cards.error) {
      logger.error('AiCardsRepository.getBuild:', build.error?.message ?? cards.error?.message);
      return null;
    }
    if (!build.data) return EMPTY_AI_BUILD;
    const rows = (cards.data ?? []) as CardRow[];
    const attempts = await this.getAttempts(rows.map((row) => row.id));
    if (!attempts) return null;
    return {
      generalPrompt: build.data.general_prompt,
      quality: build.data.quality as AiQuality,
      referenceCardId: build.data.reference_card_id,
      cards: rows.map((row) => toCard(row, attempts)),
    };
  }

  private static async getAttempts(cardIds: string[]): Promise<AttemptRow[] | null> {
    if (cardIds.length === 0) return [];
    const { data, error } = await supabase
      .from('seasonal_ai_attempts')
      .select('id, card_id, path, quality, created_at')
      .in('card_id', cardIds)
      .order('created_at');
    if (error) {
      logger.error('AiCardsRepository.getAttempts:', error.message);
      return null;
    }
    return data as AttemptRow[];
  }

  /** Direcciones temporales para ver los intentos, por ruta. Devuelve null si falla. */
  static async getAttemptUrls(paths: readonly string[]): Promise<Map<string, string> | null> {
    if (paths.length === 0) return new Map();
    const { data, error } = await supabase.storage.from(this.ATTEMPTS_BUCKET).createSignedUrls([...paths], ATTEMPT_LINK_SECONDS);
    if (error || !data) {
      logger.error('AiCardsRepository.getAttemptUrls:', error?.message);
      return null;
    }
    const urls = new Map<string, string>();
    for (const item of data) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    return urls;
  }

  /** Baja los archivos de estos intentos, en este orden («Usar estas cartas», US A4). null si alguno falla. */
  static async downloadAttempts(paths: readonly string[]): Promise<Blob[] | null> {
    const urls = await this.getAttemptUrls(paths);
    if (!urls) return null;
    try {
      return await Promise.all(
        paths.map(async (path) => {
          const url = urls.get(path);
          if (!url) throw new Error(`${path}: sin dirección`);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${path}: ${res.status}`);
          return res.blob();
        }),
      );
    } catch (error) {
      logger.error('AiCardsRepository.downloadAttempts:', error);
      return null;
    }
  }

  static async saveSettings(
    loteriaId: string,
    settings: { generalPrompt: string; quality: AiQuality; referenceCardId?: string | null },
  ): Promise<boolean> {
    const { error } = await supabase.from('seasonal_ai_builds').upsert({
      loteria_id: loteriaId,
      general_prompt: settings.generalPrompt,
      quality: settings.quality,
      ...(settings.referenceCardId !== undefined ? { reference_card_id: settings.referenceCardId } : {}),
      updated_at: new Date().toISOString(),
    });
    if (error) logger.error('AiCardsRepository.saveSettings:', error.message);
    return !error;
  }

  /**
   * Sustituye la lista de cartas: borra las anteriores con sus intentos (y sus archivos) y guarda las
   * nuevas en ese orden. Devuelve las cartas guardadas, o null si falla.
   */
  static async replaceCards(
    loteriaId: string,
    settings: { generalPrompt: string; quality: AiQuality },
    texts: readonly AiCardText[],
    inputSource: AiInputSource,
  ): Promise<AiCard[] | null> {
    if (!(await this.saveSettings(loteriaId, { ...settings, referenceCardId: null }))) return null;
    const oldPaths = await this.getAttemptPaths(loteriaId);
    if (!oldPaths) return null;
    const { error: deleteError } = await supabase.from('seasonal_ai_cards').delete().eq('loteria_id', loteriaId);
    if (deleteError) {
      logger.error('AiCardsRepository.replaceCards (borrar):', deleteError.message);
      return null;
    }
    await this.removeAttemptFiles(oldPaths);
    if (texts.length === 0) return [];
    const rows = texts.map((text, position) => ({
      loteria_id: loteriaId,
      position,
      number: text.number,
      name: text.name,
      scene: text.scene,
      input_source: inputSource,
    }));
    const { data, error } = await supabase.from('seasonal_ai_cards').insert(rows).select(CARD_COLUMNS).order('position');
    if (error || !data) {
      logger.error('AiCardsRepository.replaceCards (guardar):', error?.message);
      return null;
    }
    return (data as CardRow[]).map((row) => toCard(row, []));
  }

  static async updateCard(
    cardId: string,
    patch: { name?: string; scene?: string; inputSource?: AiInputSource; chosenAttemptId?: string },
  ): Promise<boolean> {
    const { error } = await supabase
      .from('seasonal_ai_cards')
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.scene !== undefined ? { scene: patch.scene } : {}),
        ...(patch.inputSource !== undefined ? { input_source: patch.inputSource } : {}),
        ...(patch.chosenAttemptId !== undefined ? { chosen_attempt_id: patch.chosenAttemptId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId);
    if (error) logger.error('AiCardsRepository.updateCard:', error.message);
    return !error;
  }

  /** Cambia la escena (y, si viene, el nombre) de varias cartas de una vez (FEAT-50, decisiones 11 y 12). Devuelve false si alguna falla. */
  static async updateScenes(updates: readonly { cardId: string; scene: string; name?: string }[]): Promise<boolean> {
    const results = await Promise.all(
      updates.map((update) => this.updateCard(update.cardId, { scene: update.scene, name: update.name })),
    );
    return results.every(Boolean);
  }

  /** Las rutas de todos los intentos de una lotería, para borrar sus archivos. null si falla. */
  static async getAttemptPaths(loteriaId: string): Promise<string[] | null> {
    const { data, error } = await supabase
      .from('seasonal_ai_attempts')
      .select('path, seasonal_ai_cards!seasonal_ai_attempts_card_id_fkey!inner(loteria_id)')
      .eq('seasonal_ai_cards.loteria_id', loteriaId);
    if (error) {
      logger.error('AiCardsRepository.getAttemptPaths:', error.message);
      return null;
    }
    return (data ?? []).map((row) => row.path as string);
  }

  /** Un archivo huérfano no rompe nada: se avisa en el registro y se sigue. */
  static async removeAttemptFiles(paths: readonly string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await supabase.storage.from(this.ATTEMPTS_BUCKET).remove([...paths]);
    if (error) logger.warn('AiCardsRepository: no se pudieron borrar intentos', paths.length, error.message);
  }

  /** Pide al servidor una carta nueva; tarda lo que tarde la IA (hasta unos dos minutos). Nunca lanza. */
  static async generate(cardId: string): Promise<GenerateResult> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      const token = data.session?.access_token;
      if (error || !token) return { ok: false, message: 'Tu sesión se cerró. Vuelve a iniciar sesión.' };
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-seasonal-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ card_id: cardId }),
      });
      const body = (await res.json().catch(() => null)) as
        | { attempt?: { id: string; path: string; quality: AiQuality }; prunedIds?: string[]; message?: string; error?: string }
        | null;
      if (res.ok && body?.attempt) {
        return { ok: true, attempt: { ...body.attempt, createdAt: new Date().toISOString() }, prunedIds: body.prunedIds ?? [] };
      }
      logger.error('AiCardsRepository.generate:', res.status, body?.error);
      return { ok: false, code: body?.error, message: body?.message ?? 'No se pudo generar la carta. Intenta de nuevo.' };
    } catch (error) {
      logger.error('AiCardsRepository.generate: error de red', error);
      return { ok: false, message: 'No hubo conexión con el servidor. Intenta de nuevo.' };
    }
  }
}
