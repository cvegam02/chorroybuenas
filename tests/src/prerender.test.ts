import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PageMeta } from '../../src/utils/pageMeta';
import { buildPrerenderedHtml, prerenderedFile, shouldHydrate } from '../../src/utils/prerender';

const TEMPLATE = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

const META: PageMeta = {
  title: '¿Cómo se juega? | chorroybuenas.com.mx',
  description: 'Reglas de la "lotería" & más',
  canonicalUrl: 'https://chorroybuenas.com.mx/como-se-juega',
  indexable: true,
};

describe('páginas pre-generadas (FEAT-21, US A4)', () => {
  it('el inicio se escribe en index.html y las demás en su propia carpeta', () => {
    expect(prerenderedFile('/')).toBe('index.html');
    expect(prerenderedFile('/como-se-juega')).toBe('como-se-juega/index.html');
  });

  it('el texto de la página queda dentro del contenedor, marcado con su dirección', () => {
    const html = buildPrerenderedHtml(TEMPLATE, '/como-se-juega', META, '<h1>Reglas</h1>');
    expect(html).toContain('<div id="root" data-prerendered="/como-se-juega"><h1>Reglas</h1></div>');
  });

  it('un texto con signos de reemplazo se inserta tal cual', () => {
    const html = buildPrerenderedHtml(TEMPLATE, '/', META, '<p>Cuesta $1 y $& más</p>');
    expect(html).toContain('<p>Cuesta $1 y $& más</p>');
  });

  it('título, descripción, dirección oficial y datos para compartir son los de la página', () => {
    const html = buildPrerenderedHtml(TEMPLATE, '/como-se-juega', META, '');
    expect(html).toContain(`<title>${META.title}</title>`);
    expect(html).toContain(`<link rel="canonical" href="${META.canonicalUrl}" />`);
    expect(html).toContain(`<meta property="og:url" content="${META.canonicalUrl}" />`);
    expect(html).toContain(`<meta property="og:title" content="${META.title}" />`);
    expect(html).toContain(`<meta property="twitter:title" content="${META.title}" />`);
    expect(html.match(/content="Reglas de la &quot;lotería&quot; &amp; más"/g)).toHaveLength(3);
    expect(html).not.toContain('https://chorroybuenas.com.mx/" />');
  });

  it('falla si la página base no trae el contenedor vacío', () => {
    expect(() => buildPrerenderedHtml('<html><body></body></html>', '/', META, '')).toThrow();
  });

  it('solo se reutiliza el texto pre-generado en su propia dirección y en español', () => {
    expect(shouldHydrate('/como-se-juega', '/como-se-juega', 'es')).toBe(true);
    expect(shouldHydrate('/como-se-juega', '/como-se-juega/', 'es-MX')).toBe(true);
    expect(shouldHydrate('/', '/dashboard', 'es')).toBe(false);
    expect(shouldHydrate('/como-se-juega', '/como-se-juega', 'en')).toBe(false);
    expect(shouldHydrate(undefined, '/cards', 'es')).toBe(false);
  });
});
