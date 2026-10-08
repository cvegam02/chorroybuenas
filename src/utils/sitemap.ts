import { PUBLIC_PATHS, SITE_URL } from './pageMeta';

/** Datos públicos para leer el catálogo al construir el sitio (los mismos que usa el navegador). */
export interface SitemapSource {
  supabaseUrl: string;
  anonKey: string;
}

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const REQUEST_TIMEOUT_MS = 10_000;

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Páginas públicas fijas más la ficha de cada lotería de temporada publicada. */
export function sitemapPaths(seasonalIds: readonly string[]): string[] {
  return [...PUBLIC_PATHS, ...seasonalIds.map((id) => `/tematicas/${encodeURIComponent(id)}`)];
}

/** `lastmod` en formato AAAA-MM-DD: la fecha en que se publica el sitio. */
export function buildSitemapXml(paths: readonly string[], lastmod: string): string {
  const entries = paths.map(
    (path) => `  <url>\n    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n  </url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

const isIdRow = (row: unknown): row is { id: string } =>
  typeof row === 'object' && row !== null && typeof (row as { id?: unknown }).id === 'string';

/**
 * Identificadores de las loterías de temporada visibles para el público. La base aplica además
 * las fechas de vigencia (regla de acceso de `seasonal_loterias`). Lanza si no puede leerlas.
 */
export async function loadSeasonalIds(source: SitemapSource, fetchImpl: Fetch = fetch): Promise<string[]> {
  if (source.supabaseUrl === '' || source.anonKey === '') {
    throw new Error('faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  }

  const url = `${source.supabaseUrl}/rest/v1/seasonal_loterias?select=id&is_published=eq.true&order=id`;
  const response = await fetchImpl(url, {
    headers: { apikey: source.anonKey, Authorization: `Bearer ${source.anonKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`la base de datos respondió ${response.status}`);
  }

  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || !rows.every(isIdRow)) {
    throw new Error('la base de datos devolvió una respuesta inesperada');
  }
  return rows.map((row) => row.id);
}
