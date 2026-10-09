import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { Board, Card } from '../../src/types';

const embedImageInPDF = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/pdf/images', () => ({ embedImageInPDF }));

import { drawBoardOnPage, drawCardOnPage } from '../../src/services/pdf/draw';
import { PdfCardsFailedError, formatFailedCardNames, uniqueFailedCards } from '../../src/services/pdf/failedCards';

// PNG de 1 × 1, para que las cartas que sí cargan se puedan dibujar de verdad.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const card = (id: string, image?: string): Card => ({ id, title: `Carta ${id}`, image });

const newPage = async () => {
  const pdfDoc = await PDFDocument.create();
  const image = await pdfDoc.embedPng(ONE_PIXEL_PNG);
  embedImageInPDF.mockImplementation(async (_doc: PDFDocument, src: string) => {
    if (src === 'rota') throw new Error('la imagen no cargó');
    return { image, width: 1, height: 1 };
  });
  const page = pdfDoc.addPage();
  return { pdfDoc, page, drawText: vi.spyOn(page, 'drawText') };
};

const drawnTexts = (drawText: { mock: { calls: unknown[][] } }) => drawText.mock.calls.map(([text]) => text);

describe('cartas que no se pueden dibujar en el PDF (FEAT-25, US A1)', () => {
  beforeEach(() => {
    embedImageInPDF.mockReset();
  });

  it('una carta que carga bien se dibuja y se reporta como dibujada', async () => {
    const { pdfDoc, page } = await newPage();

    expect(await drawCardOnPage(page, card('1', 'buena'), 0, 0, 100, 150, pdfDoc)).toBe(true);
  });

  it('una carta cuya imagen no carga se reporta como fallida, sin dibujar el recuadro de «Error»', async () => {
    const { pdfDoc, page, drawText } = await newPage();

    expect(await drawCardOnPage(page, card('1', 'rota'), 0, 0, 100, 150, pdfDoc)).toBe(false);
    expect(drawnTexts(drawText)).not.toContain('Error');
  });

  it('una carta sin imagen cuenta como fallida', async () => {
    const { pdfDoc, page } = await newPage();

    expect(await drawCardOnPage(page, card('1'), 0, 0, 100, 150, pdfDoc)).toBe(false);
    expect(embedImageInPDF).not.toHaveBeenCalled();
  });

  it('el tablero devuelve las cartas que no se pudieron dibujar', async () => {
    const { pdfDoc, page } = await newPage();
    const board: Board = {
      id: 'tablero-1',
      gridSize: 9,
      cards: [card('1', 'buena'), card('2', 'rota'), card('3'), card('4', 'buena')],
    };

    const failed = await drawBoardOnPage(page, board, 1, pdfDoc);

    expect(failed.map((c) => c.id)).toEqual(['2', '3']);
  });

  it('una carta que falla en varios tableros se cuenta una sola vez', () => {
    const failed = uniqueFailedCards([card('2'), card('3'), card('2')]);

    expect(failed.map((c) => c.id)).toEqual(['2', '3']);
  });

  it('el error de generación lleva las cartas fallidas', () => {
    const error = new PdfCardsFailedError([card('2'), card('3')]);

    expect(error).toBeInstanceOf(Error);
    expect(error.failedCards.map((c) => c.title)).toEqual(['Carta 2', 'Carta 3']);
  });

  it('los nombres se listan separados por comas, y la lista se corta si es muy larga', () => {
    expect(formatFailedCardNames(['El Gallo', 'La Dama'])).toBe('El Gallo, La Dama');
    expect(formatFailedCardNames(['a', 'b', 'c', 'd'], 2)).toBe('a, b…');
  });
});
