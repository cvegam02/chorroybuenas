import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';
import type { Board, Card } from '../../src/types';

const embedImageInPDF = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/pdf/images', () => ({ embedImageInPDF }));
// El logo no se puede leer fuera del navegador: se calla ese aviso.
vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { drawBoardOnPage, drawDeckPages } from '../../src/services/pdf/draw';
import { deckPageTitle } from '../../src/services/pdf/layout';

// PNG de 1 × 1, para que las cartas se puedan dibujar de verdad.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const CARD_BORDER_WIDTH = 2;

const photoCard: Card = { id: 'foto', title: 'El Gallo', image: 'compuesta' };
const aiCard: Card = { id: 'ia', title: 'La Dama', image: 'compuesta', isAiGenerated: true };

const newDocument = async () => {
  const pdfDoc = await PDFDocument.create();
  const image = await pdfDoc.embedPng(ONE_PIXEL_PNG);
  embedImageInPDF.mockResolvedValue({ image, width: 2, height: 3 });
  return pdfDoc;
};

/** Dibuja un tablero con esas cartas y devuelve los textos escritos y cuántas cartas llevan borde negro. */
const drawBoard = async (cards: Card[], finishedCards = false) => {
  const pdfDoc = await newDocument();
  const page = pdfDoc.addPage();
  const drawText = vi.spyOn(page, 'drawText');
  const drawRectangle = vi.spyOn(page, 'drawRectangle');

  await drawBoardOnPage(page, { id: 'b1', gridSize: 9, cards } as Board, 1, pdfDoc, undefined, finishedCards);

  return {
    texts: drawText.mock.calls.map(([text]) => text),
    borders: drawRectangle.mock.calls.filter(([options]) => options?.borderWidth === CARD_BORDER_WIDTH).length,
  };
};

describe('las cartas del PDF ya no llevan franja con el nombre (FEAT-29, US A1 y A2)', () => {
  beforeEach(() => {
    embedImageInPDF.mockReset();
  });

  it('el PDF no escribe el nombre de la carta: va dentro de su imagen', async () => {
    const { texts } = await drawBoard([photoCard, aiCard]);

    expect(texts).toEqual(['TABLERO 1']);
  });

  it('todas las cartas llevan el borde negro por fuera: foto normal, convertida con IA y temática', async () => {
    expect((await drawBoard([photoCard, aiCard])).borders).toBe(2);
    expect((await drawBoard([{ id: 't1', title: '', image: 'terminada' }], true)).borders).toBe(1);
  });

  it('en la baraja tampoco se escribe el nombre', async () => {
    const pdfDoc = await newDocument();
    const drawText = vi.spyOn(PDFPage.prototype, 'drawText');

    await drawDeckPages(pdfDoc, [photoCard, aiCard]);
    const texts = drawText.mock.calls.map(([text]) => text);
    drawText.mockRestore();

    expect(texts).toEqual([deckPageTitle(1)]);
  });
});
