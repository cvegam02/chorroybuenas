import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { Board, Card } from '../../src/types';

const embedImageInPDF = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/pdf/images', () => ({ embedImageInPDF, urlToBase64: vi.fn() }));
vi.mock('../../src/utils/indexedDB', () => ({
  getImageBlob: vi.fn(async () => null),
  blobToBase64: vi.fn(),
  cacheImageBlob: vi.fn(),
}));
vi.mock('../../src/services/cardCompose/compose', () => ({ composeCard: vi.fn(async ({ photo }: { photo: string }) => photo) }));
vi.mock('../../src/utils/storage', () => ({ loadCards: vi.fn(async () => []) }));
vi.mock('../../src/repositories/CardRepository', () => ({ CardRepository: { downloadImage: vi.fn() } }));
// El logo no se puede leer fuera del navegador; el tablero se dibuja sin él y lo avisa por el logger.
vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { generatePDF } from '../../src/services/PDFService';

// PNG de 1 × 1, para que las cartas se puedan dibujar de verdad.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const cards: Card[] = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, title: `Carta ${i}`, image: 'data:image/png;base64,AAAA' }));
const boards: Board[] = [0, 1, 2].map((i) => ({ id: `t${i}`, cards: cards.slice(i, i + 9), gridSize: 9 }));

const pageCount = async (blob: Blob) => (await PDFDocument.load(await blob.arrayBuffer())).getPageCount();

describe('PDF sin la baraja para recortar (FEAT-53, US A4)', () => {
  beforeEach(() => {
    embedImageInPDF.mockReset();
    embedImageInPDF.mockImplementation(async (pdfDoc: PDFDocument) => ({
      image: await pdfDoc.embedPng(ONE_PIXEL_PNG),
      width: 1,
      height: 1,
    }));
  });

  it('con includeDeck en false trae una hoja por tablero y nada más', async () => {
    const blob = await generatePDF(boards, { allCards: cards, finishedCards: true, includeDeck: false });
    expect(await pageCount(blob)).toBe(3);
  });

  it('por defecto sigue trayendo la baraja después de los tableros', async () => {
    const blob = await generatePDF(boards, { allCards: cards, finishedCards: true });
    expect(await pageCount(blob)).toBeGreaterThan(3);
  });
});
