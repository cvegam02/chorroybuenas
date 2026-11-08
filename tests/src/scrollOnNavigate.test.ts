import { describe, expect, it } from 'vitest';
import { shouldScrollToTop } from '../../src/utils/scrollOnNavigate';

describe('shouldScrollToTop', () => {
  it('al entrar a otra página por un enlace o botón, va arriba', () => {
    expect(shouldScrollToTop('PUSH', '/dashboard', '/loteria/s1', '')).toBe(true);
    expect(shouldScrollToTop('REPLACE', '/cards', '/boards', '')).toBe(true);
  });

  it('con «atrás» o «adelante» del navegador, se queda donde iba', () => {
    expect(shouldScrollToTop('POP', '/loteria/s1', '/dashboard', '')).toBe(false);
  });

  it('con un ancla, deja que la página baje a ella', () => {
    expect(shouldScrollToTop('PUSH', '/', '/dashboard', '#mis-loterias')).toBe(false);
  });

  it('en la misma página o al abrir el sitio, no mueve nada', () => {
    expect(shouldScrollToTop('PUSH', '/dashboard', '/dashboard', '')).toBe(false);
    expect(shouldScrollToTop('PUSH', null, '/dashboard', '')).toBe(false);
  });
});
