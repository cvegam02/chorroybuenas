import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSIC_CARDS, classicCardsByNumber } from '../../src/utils/classicCards';

describe('cartas clásicas de ¿Qué es la lotería? (FEAT-33, decisión 55)', () => {
  it('son doce, de El Gallo a El Valiente, en el orden de la baraja', () => {
    expect(CLASSIC_CARDS).toHaveLength(12);
    expect(CLASSIC_CARDS[0]).toMatchObject({ number: 1, name: 'El Gallo' });
    expect(CLASSIC_CARDS[11]).toMatchObject({ number: 12, name: 'El Valiente' });
  });

  it('cada una apunta a un archivo que existe, sin renombrarlo', () => {
    expect(CLASSIC_CARDS[3].src).toBe('/media/que-es-la-loteria/carta-04-el-catrin.jpg');
    for (const card of CLASSIC_CARDS) {
      expect(existsSync(`public${card.src}`), card.src).toBe(true);
    }
  });

  it('el abanico del héroe y la hoja de 3×3 salen en el orden pedido', () => {
    expect(classicCardsByNumber([1, 3, 4, 6]).map((card) => card.name)).toEqual([
      'El Gallo',
      'La Dama',
      'El Catrín',
      'La Sirena',
    ]);
    expect(classicCardsByNumber([1, 6, 3, 4, 2, 11, 9, 12, 7]).map((card) => card.number)).toEqual([
      1, 6, 3, 4, 2, 11, 9, 12, 7,
    ]);
  });
});
