import { describe, expect, it } from 'vitest';
import { deckCutGuides, deckGridLayout, type CutMark } from '../../src/services/pdf/layout';

// Franja que una impresora casera no alcanza a imprimir (un cuarto de pulgada).
const PRINT_SAFE_MARGIN_PT = 18;

const deck = deckGridLayout();
const half = deck.gap / 2;
const isVertical = (segment: CutMark) => segment.start.x === segment.end.x;
const xs = (segments: CutMark[]) => segments.filter(isVertical).map((s) => s.start.x).sort((a, b) => a - b);
const ys = (segments: CutMark[]) => segments.filter((s) => !isVertical(s)).map((s) => s.start.y).sort((a, b) => a - b);

describe('guías de corte de la baraja (FEAT-27, US A7)', () => {
  describe('página completa', () => {
    const { lines, marks } = deckCutGuides(deck, deck.cols * deck.rows);

    it('hay una línea por cada espacio entre cartas y una en cada orilla del grupo', () => {
      expect(xs(lines)).toHaveLength(deck.cols + 1);
      expect(ys(lines)).toHaveLength(deck.rows + 1);
    });

    it('cada línea pasa a media distancia entre dos cartas, y las de la orilla a esa misma distancia', () => {
      xs(lines).forEach((x, i) => {
        expect(x).toBeCloseTo(deck.startX - half + i * (deck.cardWidth + deck.gap), 5);
      });
      ys(lines).forEach((y, j) => {
        const fromTop = deck.rows - j;
        expect(y).toBeCloseTo(deck.topY + half - fromTop * (deck.cardHeight + deck.gap), 5);
      });
    });

    it('las líneas van de lado a lado del grupo', () => {
      const [left, right] = [xs(lines)[0], xs(lines)[deck.cols]];
      const [bottom, top] = [ys(lines)[0], ys(lines)[deck.rows]];

      for (const line of lines) {
        if (isVertical(line)) {
          expect(Math.min(line.start.y, line.end.y)).toBeCloseTo(bottom, 5);
          expect(Math.max(line.start.y, line.end.y)).toBeCloseTo(top, 5);
        } else {
          expect(Math.min(line.start.x, line.end.x)).toBeCloseTo(left, 5);
          expect(Math.max(line.start.x, line.end.x)).toBeCloseTo(right, 5);
        }
      }
    });

    it('cada línea lleva una marca en cada extremo, alineada con ella y fuera del grupo', () => {
      expect(marks).toHaveLength(lines.length * 2);
      const [left, right] = [xs(lines)[0], xs(lines)[deck.cols]];
      const [bottom, top] = [ys(lines)[0], ys(lines)[deck.rows]];

      for (const mark of marks) {
        if (isVertical(mark)) {
          expect(xs(lines).some((x) => Math.abs(x - mark.start.x) < 1e-6)).toBe(true);
          expect(mark.start.y > top || mark.start.y < bottom).toBe(true);
        } else {
          expect(ys(lines).some((y) => Math.abs(y - mark.start.y) < 1e-6)).toBe(true);
          expect(mark.start.x > right || mark.start.x < left).toBe(true);
        }
      }
    });

    it('las marcas tienen largo y quedan dentro de lo que la impresora alcanza', () => {
      for (const mark of marks) {
        expect(Math.abs(mark.end.x - mark.start.x) + Math.abs(mark.end.y - mark.start.y)).toBeGreaterThan(1);
        for (const point of [mark.start, mark.end]) {
          expect(point.x).toBeGreaterThanOrEqual(PRINT_SAFE_MARGIN_PT);
          expect(point.x).toBeLessThanOrEqual(deck.pageWidth - PRINT_SAFE_MARGIN_PT);
          expect(point.y).toBeGreaterThanOrEqual(PRINT_SAFE_MARGIN_PT);
          expect(point.y).toBeLessThanOrEqual(deck.pageHeight - PRINT_SAFE_MARGIN_PT);
        }
      }
    });

    it('las marcas de arriba no llegan al título de la página', () => {
      for (const mark of marks) {
        expect(Math.max(mark.start.y, mark.end.y)).toBeLessThan(deck.areaTop);
      }
    });
  });

  describe('página con pocas cartas', () => {
    it('con menos cartas que una fila, las líneas rodean solo esas cartas', () => {
      const { lines } = deckCutGuides(deck, 4);

      expect(xs(lines)).toHaveLength(5);
      expect(ys(lines)).toHaveLength(2);
      expect(xs(lines)[4]).toBeCloseTo(deck.startX + 4 * deck.cardWidth + 3 * deck.gap + half, 5);
      expect(ys(lines)[0]).toBeCloseTo(deck.topY - deck.cardHeight - half, 5);
    });

    it('con la segunda fila a medias, las líneas cubren las dos filas', () => {
      const { lines } = deckCutGuides(deck, deck.cols + 2);

      expect(xs(lines)).toHaveLength(deck.cols + 1);
      expect(ys(lines)).toHaveLength(3);
    });

    it('sin cartas no hay guías', () => {
      expect(deckCutGuides(deck, 0)).toEqual({ lines: [], marks: [] });
    });
  });
});
