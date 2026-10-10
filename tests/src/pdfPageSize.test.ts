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
import {
  BOARD_HEIGHT_PT,
  BOARD_WIDTH_PT,
  CUT_AREA_BLEED_PT,
  CUT_AREA_HEIGHT_PT,
  CUT_AREA_WIDTH_PT,
  CUT_AREA_X_PT,
  CUT_AREA_Y_PT,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
} from '../../src/services/pdf/constants';
import { deckGridLayout } from '../../src/services/pdf/layout';

// Hoja carta: 8.5 × 11 pulgadas, a 72 puntos por pulgada.
const LETTER_WIDTH_PT = 612;
const LETTER_HEIGHT_PT = 792;
// Franja que una impresora casera no alcanza a imprimir (un cuarto de pulgada).
const PRINT_SAFE_MARGIN_PT = 18;
const ptToCm = (pt: number) => (pt / 72) * 2.54;

// PNG de 1 × 1, para que las cartas se puedan dibujar de verdad.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const cards = (count: number): Card[] =>
  Array.from({ length: count }, (_, i) => ({ id: `c${i}`, title: `Carta ${i}`, image: 'data:image/png;base64,AAAA' }));

const pageSizes = async (blob: Blob) => {
  const pdf = await PDFDocument.load(await blob.arrayBuffer());
  return pdf.getPages().map((page) => page.getSize());
};

describe('el PDF sale en hoja carta (FEAT-26, US A1)', () => {
  beforeEach(() => {
    embedImageInPDF.mockReset();
    embedImageInPDF.mockImplementation(async (pdfDoc: PDFDocument) => ({
      image: await pdfDoc.embedPng(ONE_PIXEL_PNG),
      width: 1,
      height: 1,
    }));
  });

  it('las páginas de tableros van en carta vertical y las de la baraja, en carta acostada', async () => {
    const deck = cards(24);
    const boards: Board[] = [
      { id: 'b1', cards: deck.slice(0, 16), gridSize: 16 } as Board,
      { id: 'b2', cards: deck.slice(0, 9), gridSize: 9 } as Board,
    ];

    const sizes = await pageSizes(await generatePDF(boards, { allCards: deck }));

    // 2 tableros + 3 páginas de baraja (24 cartas, 10 por página).
    expect(sizes).toHaveLength(5);
    expect(sizes.slice(0, 2)).toEqual(Array(2).fill({ width: LETTER_WIDTH_PT, height: LETTER_HEIGHT_PT }));
    expect(sizes.slice(2)).toEqual(Array(3).fill({ width: LETTER_HEIGHT_PT, height: LETTER_WIDTH_PT }));
  });

  it('la hoja de los tableros mide carta', () => {
    expect(PAGE_WIDTH_PT).toBe(LETTER_WIDTH_PT);
    expect(PAGE_HEIGHT_PT).toBe(LETTER_HEIGHT_PT);
  });

  it('el tablero sigue midiendo 14 × 21 cm', () => {
    expect(ptToCm(BOARD_WIDTH_PT)).toBeCloseTo(14, 1);
    expect(ptToCm(BOARD_HEIGHT_PT)).toBeCloseTo(21, 1);
  });

  it('el tablero, su encabezado y el fondo crema caben en la hoja con margen imprimible', () => {
    const left = CUT_AREA_X_PT - CUT_AREA_BLEED_PT;
    const bottom = CUT_AREA_Y_PT - CUT_AREA_BLEED_PT;
    const right = CUT_AREA_X_PT + CUT_AREA_WIDTH_PT + CUT_AREA_BLEED_PT;
    const top = CUT_AREA_Y_PT + CUT_AREA_HEIGHT_PT + CUT_AREA_BLEED_PT;

    expect(left).toBeGreaterThanOrEqual(PRINT_SAFE_MARGIN_PT);
    expect(bottom).toBeGreaterThanOrEqual(PRINT_SAFE_MARGIN_PT);
    expect(right).toBeLessThanOrEqual(PAGE_WIDTH_PT - PRINT_SAFE_MARGIN_PT);
    expect(top).toBeLessThanOrEqual(PAGE_HEIGHT_PT - PRINT_SAFE_MARGIN_PT);
  });

  it('la baraja cabe completa en la hoja acostada, con margen imprimible y sin tapar el título', () => {
    const deck = deckGridLayout();
    const gridWidth = deck.cols * deck.cardWidth + (deck.cols - 1) * deck.gap;
    const gridHeight = deck.rows * deck.cardHeight + (deck.rows - 1) * deck.gap;

    expect(deck.pageWidth).toBe(LETTER_HEIGHT_PT);
    expect(deck.pageHeight).toBe(LETTER_WIDTH_PT);
    expect(deck.startX).toBeGreaterThanOrEqual(PRINT_SAFE_MARGIN_PT);
    expect(deck.startX + gridWidth).toBeLessThanOrEqual(deck.pageWidth - PRINT_SAFE_MARGIN_PT);
    expect(deck.topY - gridHeight).toBeGreaterThanOrEqual(PRINT_SAFE_MARGIN_PT);
    expect(deck.topY).toBeLessThanOrEqual(deck.titleY);
  });

  it('las cartas de la baraja conservan la proporción 2:3 de las cartas del tablero', () => {
    const deck = deckGridLayout();

    expect(deck.cardWidth / deck.cardHeight).toBeCloseTo(2 / 3, 5);
    expect(deck.cols * deck.rows).toBe(10);
  });
});
