import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PDFDocument } from 'pdf-lib';
import type { Board, Card } from '../../src/types';

const embedImageInPDF = vi.hoisted(() => vi.fn());
const loadCards = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/pdf/images', () => ({ embedImageInPDF, urlToBase64: vi.fn() }));
vi.mock('../../src/utils/indexedDB', () => ({
  getImageBlob: vi.fn(async () => null),
  blobToBase64: vi.fn(),
  cacheImageBlob: vi.fn(),
}));
vi.mock('../../src/utils/storage', () => ({ loadCards }));
vi.mock('../../src/repositories/CardRepository', () => ({ CardRepository: { downloadImage: vi.fn() } }));
vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { generatePDF } from '../../src/services/PDFService';

// PNG de 1 × 1, para que las cartas se puedan dibujar de verdad.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const card = (id: string): Card => ({ id, title: `Carta ${id}`, image: 'data:image/png;base64,AAAA' });
const deck = ['a', 'b', 'c', 'd'].map(card);
// Los tableros traen sus propias copias de las cartas, en otro orden.
const boards: Board[] = [
  { id: 't1', gridSize: 9, cards: [card('c'), card('a')] },
  { id: 't2', gridSize: 9, cards: [card('d'), card('c')] },
];

/** Genera el PDF y devuelve, por nombre de carta, los números con los que se compuso. */
const composedNumbers = async (options: Parameters<typeof generatePDF>[1]) => {
  const numbers = new Map<string, Set<number | undefined>>();
  const composeCard = vi.fn(async ({ photo, name, number }: { photo: string; name: string; number?: number }) => {
    numbers.set(name, (numbers.get(name) ?? new Set()).add(number));
    return photo;
  });
  await generatePDF(boards, { ...options, composeCard });
  return { numbers, composeCard };
};

describe('el número de carta en el PDF (FEAT-30, US A1)', () => {
  beforeEach(() => {
    loadCards.mockReset();
    loadCards.mockResolvedValue([]);
    embedImageInPDF.mockReset();
    embedImageInPDF.mockImplementation(async (pdfDoc: PDFDocument) => ({
      image: await pdfDoc.embedPng(ONE_PIXEL_PNG),
      width: 1,
      height: 1,
    }));
  });

  it('cada carta se compone con el número de su lugar en la baraja', async () => {
    const { numbers } = await composedNumbers({ allCards: deck });

    expect([...numbers.get('Carta a')!]).toEqual([1]);
    expect([...numbers.get('Carta b')!]).toEqual([2]);
    expect([...numbers.get('Carta c')!]).toEqual([3]);
    expect([...numbers.get('Carta d')!]).toEqual([4]);
  });

  it('la misma carta lleva el mismo número en los tableros y en la baraja', async () => {
    const { numbers } = await composedNumbers({ allCards: deck });

    for (const used of numbers.values()) expect(used.size).toBe(1);
  });

  it('sin sesión, el número sale de la lista de cartas guardada en el navegador', async () => {
    loadCards.mockResolvedValue(deck);

    const { numbers } = await composedNumbers(undefined);

    expect([...numbers.get('Carta c')!]).toEqual([3]);
  });

  it('las cartas de una lotería temática no se numeran ni se componen', async () => {
    const { composeCard } = await composedNumbers({ allCards: deck, finishedCards: true });

    expect(composeCard).not.toHaveBeenCalled();
  });
});
