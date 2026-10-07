import { describe, expect, it } from 'vitest';
import { PUBLIC_PATHS, SITE_URL } from '../../src/utils/pageMeta';
import { buildSitemapXml, loadSeasonalIds, sitemapPaths } from '../../src/utils/sitemap';

const CONFIG = { supabaseUrl: 'https://example.supabase.co', anonKey: 'anon' };
const PRIVATE_PATHS = ['/dashboard', '/admin', '/comprar-tokens', '/loteria/', '/cards', '/board-count', '/preview'];

const respondWith = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('sitemap (FEAT-21, US A3)', () => {
  it('están todas las páginas públicas fijas', () => {
    const xml = buildSitemapXml(sitemapPaths([]), '2026-10-07');
    for (const path of PUBLIC_PATHS) {
      expect(xml).toContain(`<loc>${SITE_URL}${path}</loc>`);
    }
  });

  it('cada lotería de temporada publicada tiene su entrada', () => {
    const xml = buildSitemapXml(sitemapPaths(['abc-123', 'def-456']), '2026-10-07');
    expect(xml).toContain(`<loc>${SITE_URL}/temporada/abc-123</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/temporada/def-456</loc>`);
  });

  it('todas las entradas llevan la fecha de la publicación', () => {
    const paths = sitemapPaths(['abc-123']);
    const xml = buildSitemapXml(paths, '2026-10-07');
    expect(xml.match(/<lastmod>2026-10-07<\/lastmod>/g)).toHaveLength(paths.length);
  });

  it('no aparece ninguna página privada', () => {
    const xml = buildSitemapXml(sitemapPaths(['abc-123']), '2026-10-07');
    for (const path of PRIVATE_PATHS) {
      expect(xml).not.toContain(`${SITE_URL}${path}`);
    }
  });

  it('un identificador con caracteres especiales no rompe el archivo', () => {
    const xml = buildSitemapXml(sitemapPaths(['a&b<c']), '2026-10-07');
    expect(xml).toContain(`<loc>${SITE_URL}/temporada/a%26b%3Cc</loc>`);
  });

  it('pide solo las loterías publicadas y devuelve sus identificadores', async () => {
    let requested = '';
    const fetchImpl = async (input: string | URL | Request) => {
      requested = String(input);
      return new Response(JSON.stringify([{ id: 'abc-123' }, { id: 'def-456' }]), { status: 200 });
    };
    const ids = await loadSeasonalIds(CONFIG, fetchImpl);
    expect(ids).toEqual(['abc-123', 'def-456']);
    expect(requested).toContain('/rest/v1/seasonal_loterias');
    expect(requested).toContain('is_published=eq.true');
  });

  it('si la base de datos responde con error, falla con un mensaje claro', async () => {
    await expect(loadSeasonalIds(CONFIG, respondWith(500, { message: 'boom' }))).rejects.toThrow('500');
  });

  it('si la respuesta no tiene la forma esperada, falla', async () => {
    await expect(loadSeasonalIds(CONFIG, respondWith(200, { id: 'abc' }))).rejects.toThrow();
    await expect(loadSeasonalIds(CONFIG, respondWith(200, [{ id: 7 }]))).rejects.toThrow();
  });

  it('sin datos de conexión, falla sin llamar a la base', async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      return new Response('[]');
    };
    await expect(loadSeasonalIds({ supabaseUrl: '', anonKey: '' }, fetchImpl)).rejects.toThrow();
    expect(called).toBe(false);
  });
});
