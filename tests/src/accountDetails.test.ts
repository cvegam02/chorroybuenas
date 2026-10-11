import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';
import { LANGUAGES, currentLanguageCode } from '../../src/utils/languages';

const keysOf = (value: Record<string, unknown>): string[] => Object.keys(value).sort();

describe('encabezado y «Mis datos» de Mi cuenta (FEAT-35, US A1)', () => {
  it('ofrece español e inglés, en ese orden', () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual(['es', 'en']);
  });

  it('reduce el idioma del navegador a los dos del sitio', () => {
    expect(currentLanguageCode('en')).toBe('en');
    expect(currentLanguageCode('en-US')).toBe('en');
    expect(currentLanguageCode('es-MX')).toBe('es');
    expect(currentLanguageCode('fr')).toBe('es');
    expect(currentLanguageCode(undefined)).toBe('es');
  });

  it('tiene los mismos textos en español y en inglés', () => {
    expect(keysOf(en.dashboard.header)).toEqual(keysOf(es.dashboard.header));
    expect(keysOf(en.dashboard.details)).toEqual(keysOf(es.dashboard.details));
  });

  it('ningún texto nuevo quedó vacío', () => {
    const texts = [es.dashboard.header, es.dashboard.details, en.dashboard.header, en.dashboard.details].flatMap(
      (group) => Object.values(group),
    );
    expect(texts.every((text) => text.trim() !== '')).toBe(true);
  });
});
