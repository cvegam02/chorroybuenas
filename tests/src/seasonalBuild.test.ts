import { describe, expect, it } from 'vitest';
import { placeImageInCard } from '../../src/services/pdf/layout';
import { seasonalPdfFileName } from '../../src/utils/seasonalLoteria';

describe('imagen de una carta dentro de su casilla del PDF', () => {
  const cell = { width: 96, height: 145.6 };

  it('una carta terminada (FEAT-23) cabe entera en la casilla, sin recortarse', () => {
    for (const [imgWidth, imgHeight] of [[1000, 1500], [1000, 1000], [1500, 1000]]) {
      const placed = placeImageInCard(imgWidth, imgHeight, cell.width, cell.height, 'contain');
      expect(placed.width).toBeLessThanOrEqual(cell.width + 0.001);
      expect(placed.height).toBeLessThanOrEqual(cell.height + 0.001);
      expect(placed.offsetX).toBeGreaterThanOrEqual(-0.001);
      expect(placed.offsetY).toBeGreaterThanOrEqual(-0.001);
      expect(placed.width / placed.height).toBeCloseTo(imgWidth / imgHeight, 3);
    }
  });

  it('una carta terminada queda centrada', () => {
    const placed = placeImageInCard(1000, 1500, cell.width, cell.height, 'contain');
    expect(placed.offsetX).toBeCloseTo((cell.width - placed.width) / 2);
    expect(placed.offsetY).toBeCloseTo((cell.height - placed.height) / 2);
  });

  it('la carta normal llena toda la casilla, ya sin franja para el nombre (FEAT-29)', () => {
    const placed = placeImageInCard(512, 768, cell.width, cell.height, 'cover');
    expect(placed.width).toBeGreaterThanOrEqual(cell.width - 0.001);
    expect(placed.height).toBeGreaterThanOrEqual(cell.height - 0.001);
    expect(placed.offsetY + placed.height / 2).toBeCloseTo(cell.height / 2);
  });

  it('una ilustración 2:3 casi no se recorta en las casillas de tableros y baraja (FEAT-29, US A2)', () => {
    // Casillas de un tablero de 4 × 4, de uno de 3 × 3 y de la baraja, en puntos.
    for (const [width, height] of [[96.04, 145.65], [129.47, 195.62], [141.75, 212.63]]) {
      const placed = placeImageInCard(512, 768, width, height, 'cover');
      const cutPerSideMm = ((placed.width - width) / 2 / 72) * 25.4;
      expect(cutPerSideMm).toBeGreaterThanOrEqual(-0.001);
      expect(cutPerSideMm).toBeLessThan(0.2);
      expect(placed.height).toBeCloseTo(height, 1);
    }
  });
});

describe('nombre del PDF armado en el sitio (FEAT-23)', () => {
  it('el archivo se llama como la lotería, sin caracteres raros', () => {
    expect(seasonalPdfFileName('Halloween 2026')).toBe('halloween-2026.pdf');
    expect(seasonalPdfFileName('  Día de Muertos: ¡edición niños!  ')).toBe('dia-de-muertos-edicion-ninos.pdf');
    expect(seasonalPdfFileName('///')).toBe('loteria-tematica.pdf');
  });
});
