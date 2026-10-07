import { describe, expect, it } from 'vitest';
import { PUBLIC_PATHS, SITE_URL, resolvePageMeta, seasonalDetailMeta } from '../../src/utils/pageMeta';

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
    const meta = resolvePageMeta('/temporada/abc-123', t);
    expect(meta.canonicalUrl).toBe(`${SITE_URL}/temporada/abc-123`);
    expect(meta.indexable).toBe(true);
  });

  it('la ficha de temporada usa el nombre y la descripción de la lotería', () => {
    const meta = seasonalDetailMeta('abc-123', 'Lotería de Navidad', 'Con villancicos.', t);
    expect(meta.title).toContain('Lotería de Navidad');
    expect(meta.description).toBe('Con villancicos.');
    expect(meta.canonicalUrl).toBe(`${SITE_URL}/temporada/abc-123`);
  });

  it('si la lotería no tiene descripción, la ficha usa la del catálogo', () => {
    const meta = seasonalDetailMeta('abc-123', 'Lotería de Navidad', '', t);
    expect(meta.description).toBe(resolvePageMeta('/temporada', t).description);
  });

  it.each(['/dashboard', '/admin', '/comprar-tokens', '/loteria/xyz', '/cards', '/board-count', '/preview', '/no-existe'])(
    '%s pide no ser indexada',
    (path) => {
      expect(resolvePageMeta(path, t).indexable).toBe(false);
    },
  );
});
