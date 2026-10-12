import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';

/** Marcas de terceros que estuvieron en los estilos de IA y no deben volver (FEAT-34, US A7). */
const THIRD_PARTY_BRANDS = /simpsons|ghibli/i;

const filesIn = (dir: string, extensions: string[]): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesIn(path, extensions);
    return extensions.some((extension) => path.endsWith(extension)) ? [path] : [];
  });

const leafKeys = (value: unknown, prefix = ''): string[] =>
  value !== null && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => leafKeys(child, `${prefix}${key}.`))
    : [prefix.slice(0, -1)];

describe('limpieza del flujo de crear una lotería (FEAT-34, US A7)', () => {
  it('ningún texto del sitio menciona marcas de terceros, en español ni en inglés', () => {
    expect(JSON.stringify(es)).not.toMatch(THIRD_PARTY_BRANDS);
    expect(JSON.stringify(en)).not.toMatch(THIRD_PARTY_BRANDS);
  });

  it('ningún archivo del sitio menciona marcas de terceros', () => {
    const files = [...filesIn('src', ['.ts', '.tsx', '.css', '.json']), ...filesIn('public', ['.json', '.html', '.txt'])];
    const withBrands = files.filter((file) => THIRD_PARTY_BRANDS.test(readFileSync(file, 'utf8')));
    expect(withBrands).toEqual([]);
  });

  it('no queda la copia vieja de los textos que se publicaba sin usarse', () => {
    expect(existsSync('public/locales')).toBe(false);
  });

  it('los textos del flujo existen en los dos idiomas, con las mismas claves', () => {
    const sections = ['cardEditor', 'cardUpload', 'batchUpload', 'boardGenerator', 'aiBatchModal', 'cardEdit', 'createSteps', 'modals'] as const;
    for (const section of sections) {
      expect(leafKeys(en[section]).sort(), section).toEqual(leafKeys(es[section]).sort());
    }
  });
});
