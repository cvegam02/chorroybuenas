import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import type { Board, Card } from '../../src/types';

const embedImageInPDF = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/pdf/images', () => ({ embedImageInPDF }));
vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { drawBoardOnPage } from '../../src/services/pdf/draw';
import {
  BOARD_HEIGHT_PT,
  BOARD_TITLE_CAP_HEIGHT_PT,
  BOARD_WIDTH_PT,
  CUT_AREA_HEIGHT_PT,
  CUT_AREA_WIDTH_PT,
  CUT_AREA_X_PT,
  CUT_AREA_Y_PT,
  LOGO_VISIBLE_BOX,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
} from '../../src/services/pdf/constants';
import { boardLogoBox, boardPageTitle, boardTitleLayout } from '../../src/services/pdf/layout';

const ptToCm = (pt: number) => (pt / 72) * 2.54;

// PNG de 1 × 1, para que las cartas se puedan dibujar de verdad.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// El borde negro de cada carta sobresale 1 pt de la cuadrícula.
const CARD_BORDER_OVERHANG_PT = 1;
const gridLeft = CUT_AREA_X_PT - CARD_BORDER_OVERHANG_PT;
const gridRight = CUT_AREA_X_PT + BOARD_WIDTH_PT + CARD_BORDER_OVERHANG_PT;
const gridTop = CUT_AREA_Y_PT + BOARD_HEIGHT_PT;
const pageCenterX = PAGE_WIDTH_PT / 2;

describe('encabezado del tablero en el PDF (FEAT-31, US A1)', () => {
  describe('medidas', () => {
    const titleWidth = 90;
    const { text, lines } = boardTitleLayout(titleWidth);
    const [leftLine, rightLine] = lines;

    it('el título va en mayúsculas', () => {
      expect(boardPageTitle(7)).toBe('TABLERO 7');
    });

    it('el título queda centrado, a 0.4 cm de la cuadrícula', () => {
      expect(text.x + titleWidth / 2).toBeCloseTo(pageCenterX, 5);
      expect(ptToCm(text.y - gridTop)).toBeCloseTo(0.4, 2);
    });

    it('cada línea va de la orilla de la cuadrícula a 0.4 cm del texto', () => {
      expect(leftLine.start.x).toBeCloseTo(gridLeft, 5);
      expect(ptToCm(text.x - leftLine.end.x)).toBeCloseTo(0.4, 2);
      expect(ptToCm(rightLine.start.x - (text.x + titleWidth))).toBeCloseTo(0.4, 2);
      expect(rightLine.end.x).toBeCloseTo(gridRight, 5);
    });

    it('las dos líneas son horizontales y van a media altura de las letras', () => {
      const middle = text.y + BOARD_TITLE_CAP_HEIGHT_PT / 2;
      for (const line of lines) {
        expect(line.start.y).toBeCloseTo(middle, 5);
        expect(line.end.y).toBeCloseTo(middle, 5);
      }
    });

    it('la parte visible del logo queda centrada, arriba del título y dentro del área de recorte', () => {
      const box = boardLogoBox(1);
      const visible = {
        left: box.x + box.width * LOGO_VISIBLE_BOX.left,
        right: box.x + box.width * LOGO_VISIBLE_BOX.right,
        top: box.y + box.height * (1 - LOGO_VISIBLE_BOX.top),
        bottom: box.y + box.height * (1 - LOGO_VISIBLE_BOX.bottom),
      };

      expect((visible.left + visible.right) / 2).toBeCloseTo(pageCenterX, 5);
      expect(visible.bottom).toBeGreaterThan(text.y + BOARD_TITLE_CAP_HEIGHT_PT);
      expect(visible.top).toBeLessThanOrEqual(CUT_AREA_Y_PT + CUT_AREA_HEIGHT_PT + 1e-6);
      expect(visible.left).toBeGreaterThan(CUT_AREA_X_PT);
      expect(visible.right).toBeLessThan(CUT_AREA_X_PT + CUT_AREA_WIDTH_PT);
    });

    it('el logo es más grande que antes: su parte visible pasa de 1.5 cm a más de 2.2 cm de alto', () => {
      const box = boardLogoBox(1);
      const visibleHeight = box.height * (LOGO_VISIBLE_BOX.bottom - LOGO_VISIBLE_BOX.top);

      expect(ptToCm(visibleHeight)).toBeGreaterThan(2.2);
    });

    it('el tablero sigue midiendo 14 × 21 cm: las cartas no cambian de tamaño', () => {
      expect(BOARD_WIDTH_PT / 28.35).toBeCloseTo(14, 5);
      expect(BOARD_HEIGHT_PT / 28.35).toBeCloseTo(21, 5);
    });
  });

  describe('al dibujar el tablero', () => {
    // El logo y la letra se piden con `fetch`; fuera del navegador se leen del disco.
    beforeAll(() => {
      vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(join(process.cwd(), url))));
    });
    afterAll(() => {
      vi.unstubAllGlobals();
    });

    beforeEach(() => {
      embedImageInPDF.mockReset();
      embedImageInPDF.mockImplementation(async (pdfDoc: PDFDocument) => ({
        image: await pdfDoc.embedPng(ONE_PIXEL_PNG),
        width: 1,
        height: 1,
      }));
    });

    it.each([16, 9] as const)('un tablero de %i cartas lleva el logo, el título en Arvo Bold y sus dos líneas', async (gridSize) => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
      const drawText = vi.spyOn(page, 'drawText');
      const drawLine = vi.spyOn(page, 'drawLine');
      const drawImage = vi.spyOn(page, 'drawImage');
      const cards: Card[] = Array.from({ length: gridSize }, (_, i) => ({ id: `c${i}`, title: `Carta ${i}`, image: 'buena' }));
      const almostBlack = rgb(0x1a / 255, 0x12 / 255, 0x0e / 255);

      await drawBoardOnPage(page, { id: 'b1', gridSize, cards } as Board, 12, pdfDoc);

      // Un solo texto: ya no hay título en la esquina.
      expect(drawText.mock.calls).toHaveLength(1);
      const [text, textOptions] = drawText.mock.calls[0];
      const font = textOptions?.font;
      expect(text).toBe('TABLERO 12');
      expect(font?.name).toContain('Arvo-Bold');
      expect(textOptions?.size).toBeGreaterThanOrEqual(16);
      expect(textOptions?.size).toBeLessThanOrEqual(18);
      expect(textOptions?.color).toEqual(almostBlack);

      const layout = boardTitleLayout(font!.widthOfTextAtSize('TABLERO 12', textOptions!.size!));
      expect(textOptions).toMatchObject(layout.text);

      const titleLines = drawLine.mock.calls.map(([options]) => options).filter((options) => options.color === textOptions?.color);
      expect(titleLines.map(({ start, end }) => ({ start, end }))).toEqual(layout.lines);
      for (const line of titleLines) {
        expect(line.thickness).toBeGreaterThanOrEqual(1);
        expect(line.thickness).toBeLessThanOrEqual(1.5);
        expect(line.color).toEqual(almostBlack);
      }

      // El logo es la primera imagen; las demás son las cartas.
      expect(drawImage.mock.calls).toHaveLength(gridSize + 1);
      expect(drawImage.mock.calls[0][1]).toEqual(boardLogoBox(1));
    });
  });
});
