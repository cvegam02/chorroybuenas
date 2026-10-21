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
import { PdfCardsFailedError } from '../../src/services/pdf/failedCards';
import type { CardLabels } from '../../src/utils/cardLabels';

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

/** Genera el PDF con el ajuste y devuelve con qué nombre y número se compuso cada carta (tableros y baraja). */
const composedWith = async (cardLabels: CardLabels | undefined) => {
  const inputs: Array<{ name: string; number?: number }> = [];
  const composeCard = vi.fn(async ({ photo, name, number }: { photo: string; name: string; number?: number }) => {
    inputs.push({ name, number });
    return photo;
  });
  await generatePDF(boards, { allCards: deck, composeCard, ...(cardLabels ? { cardLabels } : {}) });
  return inputs;
};

describe('qué se ve en las cartas del PDF (FEAT-51, US A2)', () => {
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

  it('sin ajuste, nombre y número como siempre', async () => {
    const inputs = await composedWith(undefined);
    expect(inputs).toContainEqual({ name: 'Carta c', number: 3 });
  });

  it('solo nombre: ninguna carta lleva número', async () => {
    const inputs = await composedWith('name');
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every((input) => input.number === undefined && input.name.startsWith('Carta'))).toBe(true);
  });

  it('solo número: ninguna carta lleva nombre', async () => {
    const inputs = await composedWith('number');
    expect(inputs).toContainEqual({ name: '', number: 3 });
    expect(inputs.every((input) => input.name === '')).toBe(true);
  });

  it('nada: ni nombre ni número, en tableros y baraja', async () => {
    const inputs = await composedWith('none');
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every((input) => input.name === '' && input.number === undefined)).toBe(true);
  });

  it('una carta que no se pudo dibujar se reporta con su nombre aunque no se imprima', async () => {
    const composeCard = vi.fn(async () => {
      throw new Error('sin foto');
    });
    const failure = await generatePDF(boards, { allCards: deck, composeCard, cardLabels: 'none' }).catch((error) => error);

    expect(failure).toBeInstanceOf(PdfCardsFailedError);
    expect((failure as PdfCardsFailedError).failedCards.map((failed) => failed.title)).toContain('Carta c');
  });

  it('las cartas de una lotería temática no cambian', async () => {
    const composeCard = vi.fn(async ({ photo }: { photo: string }) => photo);
    await generatePDF(boards, { allCards: deck, composeCard, finishedCards: true, cardLabels: 'none' });
    expect(composeCard).not.toHaveBeenCalled();
  });
});
