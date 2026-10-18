import { describe, expect, it } from 'vitest';
import {
  assignBaseDeckFiles,
  BASE_DECK_SIZE,
  BASE_DECK_SLOTS,
  baseDeckNumberFromPath,
  baseDeckPath,
} from '../../src/utils/baseDeck';

const image = (name: string, size = 1000, type = 'image/webp') => ({ name, size, type });

describe('baraja base (FEAT-50, US A1)', () => {
  it('tiene las 54 cartas tradicionales con su número', () => {
    expect(BASE_DECK_SIZE).toBe(54);
    expect(BASE_DECK_SLOTS[5]).toEqual({ number: 6, name: 'La Sirena' });
    expect(BASE_DECK_SLOTS[53]).toEqual({ number: 54, name: 'La Rana' });
  });

  it('guarda cada carta con su número como nombre de archivo', () => {
    expect(baseDeckPath(6)).toBe('6');
    expect(baseDeckNumberFromPath('6')).toBe(6);
    expect(baseDeckNumberFromPath('54')).toBe(54);
    expect(baseDeckNumberFromPath('55')).toBeNull();
    expect(baseDeckNumberFromPath('06')).toBeNull();
    expect(baseDeckNumberFromPath('.emptyFolderPlaceholder')).toBeNull();
  });

  it('si todos los archivos traen número, cada uno va a su carta', () => {
    const files = [image('06-la-sirena.webp'), image('1 el gallo.png', 1000, 'image/png'), image('54.jpg', 1000, 'image/jpeg')];
    const { byNumber, rejected } = assignBaseDeckFiles(files);
    expect(rejected).toEqual([]);
    expect(byNumber.get(6)?.name).toBe('06-la-sirena.webp');
    expect(byNumber.get(1)?.name).toBe('1 el gallo.png');
    expect(byNumber.get(54)?.name).toBe('54.jpg');
  });

  it('sin números (o con repetidos) se acomodan en orden natural desde la carta 1', () => {
    const files = [image('carta-10.webp'), image('carta-2.webp'), image('carta-1.webp')];
    const { byNumber } = assignBaseDeckFiles(files);
    expect([...byNumber.entries()].map(([n, f]) => [n, f.name])).toEqual([
      [1, 'carta-1.webp'],
      [2, 'carta-2.webp'],
      [3, 'carta-10.webp'],
    ]);
    const repeated = assignBaseDeckFiles([image('6a.webp'), image('6b.webp')]);
    expect(repeated.byNumber.get(1)?.name).toBe('6a.webp');
    expect(repeated.byNumber.get(2)?.name).toBe('6b.webp');
  });

  it('rechaza lo que no es imagen, lo que pesa más de 10 MB y lo que pasa de 54', () => {
    const files = [
      image('notas.pdf', 1000, 'application/pdf'),
      image('enorme.png', 11 * 1024 * 1024, 'image/png'),
      ...Array.from({ length: 55 }, (_, i) => image(`carta-${i + 1}.webp`)),
    ];
    const { byNumber, rejected } = assignBaseDeckFiles(files);
    expect(byNumber.size).toBe(54);
    expect(rejected.map((r) => r.file.name)).toEqual(['notas.pdf', 'enorme.png', 'carta-55.webp']);
  });
});
