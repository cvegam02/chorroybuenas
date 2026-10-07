import { supabase } from '../utils/supabaseClient';
import { logger } from '../utils/logger';
import { SEASONAL_PDF_MIME_TYPE, type SeasonalLoteriaInput } from '../utils/seasonalLoteria';
import { PREVIEW_OUTPUT_EXTENSION, PREVIEW_OUTPUT_MIME_TYPE } from '../utils/seasonalPreview';

/** Temporada del catálogo de loterías de temporada. */
export interface Season {
  id: string;
  name_es: string;
  name_en: string | null;
  sort_order: number;
}

/** Temporada tal como la ve el administrador: con cuántas loterías tiene, publicadas o no. */
export interface AdminSeason extends Season {
  loteria_count: number;
}

export interface SeasonInput {
  name_es: string;
  name_en: string | null;
  sort_order: number;
}

export const SEASON_NAME_MAX_LENGTH = 60;

/** PDF que se entrega al comprar una lotería de temporada. */
export interface SeasonalPdf {
  path: string;
  /** Nombre original del archivo que subió el administrador. */
  name: string;
  sizeBytes: number;
}

/** Lotería de temporada tal como la ve el administrador: la ficha completa y su PDF. */
export interface AdminSeasonalLoteria extends SeasonalLoteriaInput {
  id: string;
  is_published: boolean;
  /** Portada y muestras ya protegidas: rutas dentro del espacio público de vistas previas. */
  cover_path: string | null;
  sample_paths: string[];
  pdf: SeasonalPdf | null;
}

const SEASON_COLUMNS = 'id, name_es, name_en, sort_order';
const LOTERIA_COLUMNS =
  'id, season_id, name_es, name_en, description_es, description_en, grid_size, card_count, board_count, price_cents, is_published, cover_path, sample_paths';

interface SeasonRowWithCount extends Season {
  seasonal_loterias: { count: number }[] | null;
}

/** Primero por orden; a igual orden, por nombre. */
export function sortSeasons<T extends Season>(seasons: readonly T[]): T[] {
  return [...seasons].sort((a, b) => a.sort_order - b.sort_order || a.name_es.localeCompare(b.name_es, 'es'));
}

/** Quita espacios sobrantes y guarda el inglés vacío como «sin traducción». */
function normalizeSeasonInput(input: SeasonInput): SeasonInput {
  const nameEn = input.name_en?.trim() ?? '';
  return { name_es: input.name_es.trim(), name_en: nameEn === '' ? null : nameEn, sort_order: input.sort_order };
}

interface LoteriaFileRow {
  pdf_path: string;
  pdf_name: string;
  pdf_size_bytes: number;
}

interface LoteriaRowWithFile extends Omit<AdminSeasonalLoteria, 'pdf'> {
  // Relación uno a uno: según la versión de la API llega como objeto o como lista de un elemento.
  seasonal_loteria_files: LoteriaFileRow | LoteriaFileRow[] | null;
}

function toSeasonalPdf(files: LoteriaRowWithFile['seasonal_loteria_files']): SeasonalPdf | null {
  const file = Array.isArray(files) ? files[0] : files;
  return file ? { path: file.pdf_path, name: file.pdf_name, sizeBytes: file.pdf_size_bytes } : null;
}

export class SeasonalRepository {
  static readonly PDF_BUCKET = 'seasonal-pdfs';
  static readonly PREVIEW_BUCKET = 'seasonal-previews';

  /** Todas las loterías de temporada, publicadas o no, con su PDF. Devuelve null si la consulta falla. */
  static async getAdminLoterias(): Promise<AdminSeasonalLoteria[] | null> {
    const { data, error } = await supabase
      .from('seasonal_loterias')
      .select(`${LOTERIA_COLUMNS}, seasonal_loteria_files(pdf_path, pdf_name, pdf_size_bytes)`)
      .order('name_es');

    if (error) {
      logger.error('SeasonalRepository.getAdminLoterias:', error.message);
      return null;
    }
    const rows = (data ?? []) as unknown as LoteriaRowWithFile[];
    return rows.map(({ seasonal_loteria_files, ...loteria }) => ({
      ...loteria,
      pdf: toSeasonalPdf(seasonal_loteria_files),
    }));
  }

  /** Crea la ficha (id null) o la actualiza. Devuelve su id, o null si falla. */
  static async saveLoteria(id: string | null, input: SeasonalLoteriaInput): Promise<string | null> {
    const query =
      id === null
        ? supabase.from('seasonal_loterias').insert(input)
        : supabase.from('seasonal_loterias').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id);
    const { data, error } = await query.select('id').single();

    if (error) {
      logger.error('SeasonalRepository.saveLoteria:', error.message);
      return null;
    }
    return (data as { id: string }).id;
  }

  /**
   * Sube el PDF de una lotería y lo registra. Cada subida usa una ruta nueva, para que un reemplazo
   * nunca entregue una copia guardada del archivo anterior; el anterior se borra al final.
   */
  static async uploadPdf(loteriaId: string, file: File, previousPath: string | null): Promise<boolean> {
    const bucket = supabase.storage.from(this.PDF_BUCKET);
    const path = `${loteriaId}/${Date.now()}.pdf`;

    const { error: uploadError } = await bucket.upload(path, file, { contentType: SEASONAL_PDF_MIME_TYPE });
    if (uploadError) {
      logger.error('SeasonalRepository.uploadPdf (archivo):', uploadError.message);
      return false;
    }

    const { error: rowError } = await supabase.from('seasonal_loteria_files').upsert({
      loteria_id: loteriaId,
      pdf_path: path,
      pdf_name: file.name,
      pdf_size_bytes: file.size,
      uploaded_at: new Date().toISOString(),
    });
    if (rowError) {
      logger.error('SeasonalRepository.uploadPdf (registro):', rowError.message);
      await this.removePdfObject(path);
      return false;
    }

    if (previousPath && previousPath !== path) await this.removePdfObject(previousPath);
    return true;
  }

  /** Dirección pública de una portada o muestra ya protegida. */
  static previewUrl(path: string): string {
    return supabase.storage.from(this.PREVIEW_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /** Sube una imagen ya reducida y con marca de agua. Devuelve su ruta, o null si falla. */
  static async uploadPreview(loteriaId: string, image: Blob): Promise<string | null> {
    const path = `${loteriaId}/${crypto.randomUUID()}.${PREVIEW_OUTPUT_EXTENSION}`;
    const { error } = await supabase.storage
      .from(this.PREVIEW_BUCKET)
      .upload(path, image, { contentType: PREVIEW_OUTPUT_MIME_TYPE });
    if (error) {
      logger.error('SeasonalRepository.uploadPreview:', error.message);
      return null;
    }
    return path;
  }

  /** Guarda qué portada y qué muestras, en qué orden, tiene la lotería. */
  static async savePreviews(loteriaId: string, coverPath: string | null, samplePaths: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('seasonal_loterias')
      .update({ cover_path: coverPath, sample_paths: samplePaths, updated_at: new Date().toISOString() })
      .eq('id', loteriaId);
    if (error) {
      logger.error('SeasonalRepository.savePreviews:', error.message);
      return false;
    }
    return true;
  }

  /** Borra imágenes que la lotería ya no usa. Un archivo huérfano no rompe nada: se avisa y se sigue. */
  static async removePreviews(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await supabase.storage.from(this.PREVIEW_BUCKET).remove(paths);
    if (error) logger.warn('SeasonalRepository: no se pudieron borrar vistas previas', paths, error.message);
  }

  /** Un archivo huérfano no rompe nada: se avisa en el registro y se sigue. */
  private static async removePdfObject(path: string): Promise<void> {
    const { error } = await supabase.storage.from(this.PDF_BUCKET).remove([path]);
    if (error) logger.warn('SeasonalRepository: no se pudo borrar el PDF', path, error.message);
  }

  /** Todas las temporadas con su número de loterías. Devuelve null si la consulta falla. */
  static async getAdminSeasons(): Promise<AdminSeason[] | null> {
    const { data, error } = await supabase
      .from('seasons')
      .select(`${SEASON_COLUMNS}, seasonal_loterias(count)`);

    if (error) {
      logger.error('SeasonalRepository.getAdminSeasons:', error.message);
      return null;
    }
    const rows = (data ?? []) as SeasonRowWithCount[];
    return sortSeasons(
      rows.map(({ seasonal_loterias, ...season }) => ({
        ...season,
        loteria_count: seasonal_loterias?.[0]?.count ?? 0,
      })),
    );
  }

  static async createSeason(input: SeasonInput): Promise<Season | null> {
    const { data, error } = await supabase
      .from('seasons')
      .insert(normalizeSeasonInput(input))
      .select(SEASON_COLUMNS)
      .single();

    if (error) {
      logger.error('SeasonalRepository.createSeason:', error.message);
      return null;
    }
    return data as Season;
  }

  static async updateSeason(id: string, input: SeasonInput): Promise<Season | null> {
    const { data, error } = await supabase
      .from('seasons')
      .update(normalizeSeasonInput(input))
      .eq('id', id)
      .select(SEASON_COLUMNS)
      .single();

    if (error) {
      logger.error('SeasonalRepository.updateSeason:', error.message);
      return null;
    }
    return data as Season;
  }

  /** Borra una temporada. La base lo rechaza si todavía tiene loterías. */
  static async deleteSeason(id: string): Promise<boolean> {
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) {
      logger.error('SeasonalRepository.deleteSeason:', error.message);
      return false;
    }
    return true;
  }
}
