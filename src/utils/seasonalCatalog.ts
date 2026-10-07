/**
 * Catálogo público de loterías de temporada (FEAT-17, pantalla P5): qué se muestra y en qué orden.
 */
import { seasonalStatus, type SeasonalVisibility } from './seasonalPublishing';

export interface CatalogSeason {
  id: string;
  name_es: string;
  name_en: string | null;
  sort_order: number;
}

/** Ficha pública de una lotería de temporada. Nunca incluye la ubicación del PDF. */
export interface CatalogLoteria extends SeasonalVisibility {
  id: string;
  season_id: string;
  name_es: string;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  /** 9 = Kids 3×3, 16 = Clásico 4×4. */
  grid_size: 9 | 16;
  card_count: number | null;
  board_count: number | null;
  price_cents: number | null;
  cover_path: string | null;
  sample_paths: string[];
}

export interface CatalogGroup {
  season: CatalogSeason;
  loterias: CatalogLoteria[];
}

/**
 * Temporadas en su orden (a igual orden, por nombre), cada una con sus loterías visibles por nombre.
 * La base ya esconde las no visibles al público; se vuelve a filtrar aquí porque un administrador
 * las recibe todas y el catálogo tiene que verse igual para cualquiera.
 */
export function groupCatalog(
  seasons: readonly CatalogSeason[],
  loterias: readonly CatalogLoteria[],
  now: Date,
): CatalogGroup[] {
  const visible = loterias.filter((loteria) => seasonalStatus(loteria, now) === 'published');
  return [...seasons]
    .sort((a, b) => a.sort_order - b.sort_order || a.name_es.localeCompare(b.name_es, 'es'))
    .map((season) => ({
      season,
      loterias: visible
        .filter((loteria) => loteria.season_id === season.id)
        .sort((a, b) => a.name_es.localeCompare(b.name_es, 'es')),
    }))
    .filter((group) => group.loterias.length > 0);
}

/** El texto en inglés si el sitio está en inglés y existe; si no, el español. */
export function localizedText(es: string | null, en: string | null, language: string | undefined): string {
  const english = en?.trim() ?? '';
  if (language?.startsWith('en') && english !== '') return english;
  return es ?? '';
}
