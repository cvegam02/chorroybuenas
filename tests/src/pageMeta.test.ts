import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { DEFAULT_SHARE_IMAGE, PUBLIC_PATHS, SITE_URL, resolvePageMeta, seasonalDetailMeta } from '../../src/utils/pageMeta';

const t = (key: string) => `[${key}]`;

describe('datos de cada página para buscadores (FEAT-21, US A1)', () => {
  it('cada página pública declara su propia dirección oficial', () => {
    for (const path of PUBLIC_PATHS) {
      const meta = resolvePageMeta(path, t);
      expect(meta.canonicalUrl).toBe(path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);
      expect(meta.indexable).toBe(true);
    }
  });

  it('título y descripción cambian por página', () => {
    const titles = new Set(PUBLIC_PATHS.map((path) => resolvePageMeta(path, t).title));
    const descriptions = new Set(PUBLIC_PATHS.map((path) => resolvePageMeta(path, t).description));
    expect(titles.size).toBe(PUBLIC_PATHS.length);
    expect(descriptions.size).toBe(PUBLIC_PATHS.length);
  });

  it('una diagonal al final no cambia la dirección oficial', () => {
    expect(resolvePageMeta('/como-se-juega/', t).canonicalUrl).toBe(`${SITE_URL}/como-se-juega`);
  });

  it('la ficha de una lotería de temporada se indexa con su propia dirección', () => {
    const meta = resolvePageMeta('/tematicas/abc-123', t);
    expect(meta.canonicalUrl).toBe(`${SITE_URL}/tematicas/abc-123`);
    expect(meta.indexable).toBe(true);
  });

  it('la ficha de temporada usa el nombre y la descripción de la lotería', () => {
    const meta = seasonalDetailMeta('abc-123', 'Lotería de Navidad', 'Con villancicos.', t);
    expect(meta.title).toContain('Lotería de Navidad');
    expect(meta.description).toBe('Con villancicos.');
    expect(meta.canonicalUrl).toBe(`${SITE_URL}/tematicas/abc-123`);
  });

  it('si la lotería no tiene descripción, la ficha usa la del catálogo', () => {
    const meta = seasonalDetailMeta('abc-123', 'Lotería de Navidad', '', t);
    expect(meta.description).toBe(resolvePageMeta('/tematicas', t).description);
  });

  it.each(['/como-se-juega', '/que-es-la-loteria', '/beneficios'])('%s se comparte con su propia imagen (US A5)', (path) => {
    const { image } = resolvePageMeta(path, t);
    expect(image.url).not.toBe(DEFAULT_SHARE_IMAGE.url);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });

  it.each(['/', '/tematicas', '/privacidad', '/tematicas/abc-123'])('%s conserva la imagen general (US A5)', (path) => {
    expect(resolvePageMeta(path, t).image).toEqual(DEFAULT_SHARE_IMAGE);
  });

  it('la imagen al compartir de cada página pública existe en el sitio', () => {
    for (const path of PUBLIC_PATHS) {
      const file = resolvePageMeta(path, t).image.url.replace(`${SITE_URL}/`, '');
      expect(existsSync(new URL(`../../public/${file}`, import.meta.url))).toBe(true);
    }
  });

  it.each(['/dashboard', '/admin', '/comprar-tokens', '/loteria/xyz', '/cards', '/board-count', '/preview', '/no-existe'])(
    '%s pide no ser indexada',
    (path) => {
      expect(resolvePageMeta(path, t).indexable).toBe(false);
    },
  );
});
