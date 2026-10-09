import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { Card } from '../../src/types';

const embedImageInPDF = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/pdf/images', () => ({ embedImageInPDF }));

import { drawCardOnPage } from '../../src/services/pdf/draw';
import { BOARD_HEIGHT_PT, BOARD_WIDTH_PT, CARD_GAP_PT, MIN_TITLE_SIZE_PT } from '../../src/services/pdf/constants';

// PNG de 1 × 1, para que la carta se pueda dibujar de verdad.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Carta de un tablero de 4 × 4, con el tamaño de letra que usa ese tablero.
const CARD_WIDTH_PT = (BOARD_WIDTH_PT - 3 * CARD_GAP_PT) / 4;
const CARD_HEIGHT_PT = (BOARD_HEIGHT_PT - 3 * CARD_GAP_PT) / 4;
const BOARD_TITLE_SIZE = 11;
const NORMAL_SIZE_PT = BOARD_TITLE_SIZE - 1;
const TITLE_PADDING_PT = 6;

/** Dibuja una carta con ese nombre y devuelve cómo quedó escrito. */
const drawnTitle = async (title: string) => {
  const pdfDoc = await PDFDocument.create();
  const image = await pdfDoc.embedPng(ONE_PIXEL_PNG);
  embedImageInPDF.mockResolvedValue({ image, width: 1, height: 1 });
  const page = pdfDoc.addPage();
  const drawText = vi.spyOn(page, 'drawText');
  const card: Card = { id: '1', title, image: 'buena' };

  await drawCardOnPage(page, card, 0, 0, CARD_WIDTH_PT, CARD_HEIGHT_PT, pdfDoc, true, BOARD_TITLE_SIZE);

  expect(drawText).toHaveBeenCalledTimes(1);
  const [text, options] = drawText.mock.calls[0];
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const size = options?.size ?? 0;
  return { text, size, width: font.widthOfTextAtSize(text, size) };
};

describe('el nombre de la carta no se achica de más (FEAT-26, US A3)', () => {
  beforeEach(() => {
    embedImageInPDF.mockReset();
  });

  it('la letra más chica permitida es de 8 puntos', () => {
    expect(MIN_TITLE_SIZE_PT).toBe(8);
  });

  it('un nombre que cabe a tamaño normal no cambia', async () => {
    const title = await drawnTitle('El valiente');

    expect(title.text).toBe('EL VALIENTE');
    expect(title.size).toBe(NORMAL_SIZE_PT);
  });

  it('un nombre que no cabe a tamaño normal se achica, pero no por debajo de 8 puntos', async () => {
    const title = await drawnTitle('La abuela María');

    expect(title.text).toBe('LA ABUELA MARÍA');
    expect(title.size).toBeLessThan(NORMAL_SIZE_PT);
    expect(title.size).toBeGreaterThanOrEqual(MIN_TITLE_SIZE_PT);
  });

  it('un nombre que no cabe a 8 puntos se corta con «…» en un solo renglón, sin salirse de la carta', async () => {
    const title = await drawnTitle('El tío Pancho con su guitarra y el perro de la abuela');

    expect(title.size).toBe(MIN_TITLE_SIZE_PT);
    expect(title.text.endsWith('…')).toBe(true);
    expect(title.text.startsWith('EL TÍO PANCHO')).toBe(true);
    expect(title.width).toBeLessThanOrEqual(CARD_WIDTH_PT - TITLE_PADDING_PT * 2);
  });

  it('una sola palabra muy larga también se queda en 8 puntos y se corta', async () => {
    const title = await drawnTitle('Supercalifragilisticoespialidoso');

    expect(title.size).toBe(MIN_TITLE_SIZE_PT);
    expect(title.text.endsWith('…')).toBe(true);
  });
});
