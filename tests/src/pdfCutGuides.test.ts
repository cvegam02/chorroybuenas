import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { Board, Card } from '../../src/types';

const embedImageInPDF = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/pdf/images', () => ({ embedImageInPDF }));
// El logo no se puede leer fuera del navegador; el tablero se dibuja sin él y lo avisa por el logger.
vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { drawBoardOnPage } from '../../src/services/pdf/draw';
import {
  CUT_AREA_BLEED_PT,
  CUT_AREA_HEIGHT_PT,
  CUT_AREA_WIDTH_PT,
  CUT_AREA_X_PT,
  CUT_AREA_Y_PT,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
} from '../../src/services/pdf/constants';
import { cutGuides } from '../../src/services/pdf/layout';

// Franja que una impresora casera no alcanza a imprimir (un cuarto de pulgada).
const PRINT_SAFE_MARGIN_PT = 18;
const ptToCm = (pt: number) => (pt / 72) * 2.54;

// PNG de 1 × 1, para que las cartas se puedan dibujar de verdad.
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const cream = {
  left: CUT_AREA_X_PT - CUT_AREA_BLEED_PT,
  right: CUT_AREA_X_PT + CUT_AREA_WIDTH_PT + CUT_AREA_BLEED_PT,
  bottom: CUT_AREA_Y_PT - CUT_AREA_BLEED_PT,
  top: CUT_AREA_Y_PT + CUT_AREA_HEIGHT_PT + CUT_AREA_BLEED_PT,
};

describe('guías para recortar el tablero (FEAT-26, US A2)', () => {
  const { line, marks } = cutGuides();
  const lineRight = line.x + line.width;
  const lineTop = line.y + line.height;

  it('la línea de corte rodea el tablero y su encabezado, separada 3 mm por los cuatro lados', () => {
    expect(ptToCm(CUT_AREA_X_PT - line.x)).toBeCloseTo(0.3, 2);
    expect(ptToCm(CUT_AREA_Y_PT - line.y)).toBeCloseTo(0.3, 2);
    expect(ptToCm(lineRight - (CUT_AREA_X_PT + CUT_AREA_WIDTH_PT))).toBeCloseTo(0.3, 2);
    expect(ptToCm(lineTop - (CUT_AREA_Y_PT + CUT_AREA_HEIGHT_PT))).toBeCloseTo(0.3, 2);
  });

  it('el fondo crema sobresale de la línea de corte por los cuatro lados', () => {
    expect(cream.left).toBeLessThan(line.x);
    expect(cream.bottom).toBeLessThan(line.y);
    expect(cream.right).toBeGreaterThan(lineRight);
    expect(cream.top).toBeGreaterThan(lineTop);
  });

  it('hay dos marcas por esquina, alineadas con los lados de la línea de corte', () => {
    const vertical = marks.filter((mark) => mark.start.x === mark.end.x);
    const horizontal = marks.filter((mark) => mark.start.y === mark.end.y);

    expect(marks).toHaveLength(8);
    expect(vertical.map((mark) => mark.start.x).sort()).toEqual([line.x, line.x, lineRight, lineRight].sort());
    expect(horizontal.map((mark) => mark.start.y).sort()).toEqual([line.y, line.y, lineTop, lineTop].sort());
  });

  it('las marcas quedan fuera del fondo crema y dentro de lo que la impresora alcanza', () => {
    for (const mark of marks) {
      for (const point of [mark.start, mark.end]) {
        const outsideCream =
          point.x < cream.left || point.x > cream.right || point.y < cream.bottom || point.y > cream.top;
        expect(outsideCream).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(PRINT_SAFE_MARGIN_PT);
        expect(point.x).toBeLessThanOrEqual(PAGE_WIDTH_PT - PRINT_SAFE_MARGIN_PT);
        expect(point.y).toBeGreaterThanOrEqual(PRINT_SAFE_MARGIN_PT);
        expect(point.y).toBeLessThanOrEqual(PAGE_HEIGHT_PT - PRINT_SAFE_MARGIN_PT);
      }
    }
  });

  describe('al dibujar el tablero', () => {
    beforeEach(() => {
      embedImageInPDF.mockReset();
      embedImageInPDF.mockImplementation(async (pdfDoc: PDFDocument) => ({
        image: await pdfDoc.embedPng(ONE_PIXEL_PNG),
        width: 1,
        height: 1,
      }));
    });

    it.each([16, 9] as const)('un tablero de %i cartas lleva la línea punteada y las ocho marcas', async (gridSize) => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
      const drawRectangle = vi.spyOn(page, 'drawRectangle');
      const drawLine = vi.spyOn(page, 'drawLine');
      const cards: Card[] = Array.from({ length: gridSize }, (_, i) => ({ id: `c${i}`, title: `Carta ${i}`, image: 'buena' }));

      await drawBoardOnPage(page, { id: 'b1', gridSize, cards } as Board, 1, pdfDoc);

      const dashed = drawRectangle.mock.calls.map(([options]) => options).filter((options) => options?.borderDashArray);
      expect(dashed).toHaveLength(1);
      expect(dashed[0]).toMatchObject(line);
      // Además de las marcas, el tablero dibuja las dos líneas de su título.
      const lines = drawLine.mock.calls.map(([options]) => ({ start: options.start, end: options.end }));
      expect(lines).toHaveLength(marks.length + 2);
      expect(lines).toEqual(expect.arrayContaining(marks));
    });
  });
});
