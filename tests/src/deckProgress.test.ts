import { describe, expect, it } from 'vitest';
import { deckProgress, pickImageFiles } from '../../src/utils/deckProgress';

describe('avance de la baraja en C1 (FEAT-34, US A2)', () => {
  it('dice cuántas cartas faltan para el mínimo del modo', () => {
    expect(deckProgress(15, 24)).toEqual({ missing: 9, percent: 63, isComplete: false });
    expect(deckProgress(0, 15)).toEqual({ missing: 15, percent: 0, isComplete: false });
  });

  it('con el mínimo ya está completa', () => {
    expect(deckProgress(24, 24)).toEqual({ missing: 0, percent: 100, isComplete: true });
  });

  it('con más cartas que el mínimo la barra no pasa de llena ni faltan cartas en negativo', () => {
    expect(deckProgress(40, 24)).toEqual({ missing: 0, percent: 100, isComplete: true });
  });
});

describe('fotos arrastradas a C1 (FEAT-34, US A2)', () => {
  const file = (name: string, type: string) => ({ name, type }) as File;

  it('se quedan las imágenes JPG, PNG y WEBP, las mismas que acepta «Subir fotos»', () => {
    const picked = pickImageFiles([
      file('a.jpg', 'image/jpeg'),
      file('b.png', 'image/png'),
      file('c.webp', 'image/webp'),
      file('d.pdf', 'application/pdf'),
      file('e.gif', 'image/gif'),
    ]);
    expect(picked.map((f) => f.name)).toEqual(['a.jpg', 'b.png', 'c.webp']);
  });
});
