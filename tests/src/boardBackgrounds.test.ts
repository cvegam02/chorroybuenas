import { describe, expect, it, vi } from 'vitest';
import { rgb, type PDFPage } from 'pdf-lib';
import {
  BOARD_BACKGROUNDS,
  DEFAULT_BOARD_BACKGROUND,
  boardBackgroundOrDefault,
  boardLogoPositionOrDefault,
  boardPatternShapes,
  customColorId,
  isBoardBackgroundId,
  isCustomColorId,
  isDarkBackground,
  tint,
} from '../../src/utils/boardBackgrounds';
import { drawBoardBackground } from '../../src/services/pdf/background';
import { boardBackgroundArea, boardLogoBox, boardTitleLayout } from '../../src/services/pdf/layout';
import { boardSheetGeometry } from '../../src/services/pdf/sheetGeometry';
import { BOARD_HEIGHT_PT, BOARD_WIDTH_PT, CUT_AREA_BLEED_PT, CUT_AREA_HEIGHT_PT, CUT_AREA_WIDTH_PT, CUT_AREA_X_PT, CARD_BORDER_PT, LOGO_VISIBLE_BOX } from '../../src/services/pdf/constants';

describe('catálogo de fondos de los tableros (FEAT-67, US A1)', () => {
  it('trae los nueve fondos aprobados, con el crema primero', () => {
    expect(BOARD_BACKGROUNDS.map((b) => b.id)).toEqual([
      'crema', 'rosa', 'azul', 'lila', 'amarillo', 'turquesa', 'papel-picado', 'talavera', 'greca',
    ]);
    expect(DEFAULT_BOARD_BACKGROUND).toBe('crema');
  });

  it('el crema es el color de siempre del PDF', () => {
    expect(boardBackgroundOrDefault('crema').base).toBe('#fef3e7');
  });

  it('sin fondo o con uno que no se reconoce, se usa el crema', () => {
    expect(boardBackgroundOrDefault(undefined).id).toBe('crema');
    expect(boardBackgroundOrDefault(null).id).toBe('crema');
    expect(boardBackgroundOrDefault('neon').id).toBe('crema');
    expect(isBoardBackgroundId('talavera')).toBe(true);
    expect(isBoardBackgroundId('neon')).toBe(false);
  });

  it('los ids caben en la regla de la base', () => {
    for (const { id } of BOARD_BACKGROUNDS) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('los colores lisos son claros, para que el texto se lea', () => {
    for (const { base } of BOARD_BACKGROUNDS) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16));
      expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeGreaterThan(200);
    }
  });

  it('mezcla un color con blanco', () => {
    expect(tint('#000000', 0)).toBe('#ffffff');
    expect(tint('#336699', 1)).toBe('#336699');
    expect(tint('#000000', 0.5)).toBe('#808080');
  });

  it('los colores lisos no llevan figuras; los patrones sí, dentro del área', () => {
    const { width, height } = boardBackgroundArea();
    for (const background of BOARD_BACKGROUNDS) {
      const shapes = boardPatternShapes(background, width, height);
      if (!background.pattern) {
        expect(shapes).toEqual([]);
        continue;
      }
      expect(shapes.length).toBeGreaterThan(20);
      for (const shape of shapes) {
        expect(shape.x).toBeGreaterThanOrEqual(0);
        expect(shape.x).toBeLessThanOrEqual(width);
        expect(shape.y).toBeGreaterThanOrEqual(0);
        expect(shape.y).toBeLessThanOrEqual(height);
        expect(shape.fill ?? shape.stroke).toBeTruthy();
      }
    }
  });
});

describe('fondo del tablero en el PDF (FEAT-67, US A1)', () => {
  const fakePage = () => ({ drawRectangle: vi.fn(), drawSvgPath: vi.fn() });

  it('el área es la de siempre: tablero, encabezado y lo que sobresale para el corte', () => {
    const area = boardBackgroundArea();
    expect(area.width).toBeCloseTo(CUT_AREA_WIDTH_PT + 2 * CUT_AREA_BLEED_PT, 5);
    expect(area.height).toBeCloseTo(CUT_AREA_HEIGHT_PT + 2 * CUT_AREA_BLEED_PT, 5);
  });

  it('un color liso llena el área y no dibuja figuras', () => {
    const page = fakePage();
    drawBoardBackground(page as unknown as PDFPage, boardBackgroundOrDefault('crema'));
    expect(page.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({ ...boardBackgroundArea(), color: rgb(0xfe / 255, 0xf3 / 255, 0xe7 / 255) })
    );
    expect(page.drawSvgPath).not.toHaveBeenCalled();
  });

  it('un patrón dibuja cada figura, contando desde arriba del área', () => {
    const page = fakePage();
    const background = boardBackgroundOrDefault('talavera');
    const area = boardBackgroundArea();
    const shapes = boardPatternShapes(background, area.width, area.height);
    drawBoardBackground(page as unknown as PDFPage, background);
    expect(page.drawSvgPath).toHaveBeenCalledTimes(shapes.length);
    const [d, options] = page.drawSvgPath.mock.calls[0];
    expect(d).toBe(shapes[0].d);
    expect(options.x).toBeCloseTo(area.x + shapes[0].x, 5);
    expect(options.y).toBeCloseTo(area.y + area.height - shapes[0].y, 5);
  });
});

describe('vista previa del tablero con las medidas del PDF (FEAT-67, US A1)', () => {
  it('las cartas llenan el tablero, de izquierda a derecha y de arriba abajo', () => {
    for (const gridSize of [9, 16] as const) {
      const { cards } = boardSheetGeometry(gridSize);
      const size = gridSize === 9 ? 3 : 4;
      expect(cards).toHaveLength(gridSize);
      const first = cards[0];
      const last = cards[cards.length - 1];
      expect(first.left).toBeCloseTo(CUT_AREA_BLEED_PT, 5);
      expect(last.left + last.width - first.left).toBeCloseTo(BOARD_WIDTH_PT, 5);
      expect(last.top + last.height - first.top).toBeCloseTo(BOARD_HEIGHT_PT, 5);
      expect(cards[1].left).toBeGreaterThan(first.left);
      expect(cards[size].top).toBeGreaterThan(first.top);
    }
  });

  it('el logo y el título quedan arriba de las cartas, dentro del área', () => {
    const { logo, title, cards, width } = boardSheetGeometry(16);
    expect(logo.top).toBeGreaterThanOrEqual(0);
    // Lo centrado es la parte visible del logo, no la imagen con sus orillas transparentes.
    const visibleCenter = logo.left + (logo.width * (LOGO_VISIBLE_BOX.left + LOGO_VISIBLE_BOX.right)) / 2;
    expect(visibleCenter).toBeCloseTo(width / 2, 5);
    expect(title.baseline).toBeLessThan(cards[0].top);
    expect(logo.top + logo.height * LOGO_VISIBLE_BOX.bottom).toBeLessThanOrEqual(title.baseline - title.capHeight);
    expect(title.left + title.width / 2).toBeCloseTo(width / 2, 5);
  });
});

describe('color propio (FEAT-67, US A5)', () => {
  it('se guarda como color-rrggbb, en minúsculas y sin #', () => {
    expect(customColorId('#1E3A8A')).toBe('color-1e3a8a');
    expect(customColorId('#1E3A8A')).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('se lee igual: el color tal cual y sin figuras', () => {
    const background = boardBackgroundOrDefault('color-1e3a8a');
    expect(background).toEqual({ id: 'color-1e3a8a', base: '#1e3a8a' });
    expect(isCustomColorId('color-1e3a8a')).toBe(true);
    expect(boardPatternShapes(background, 100, 100)).toEqual([]);
  });

  it('un valor que no es un color válido se toma como crema', () => {
    for (const id of ['color-12345', 'color-zzzzzz', 'color-', 'color-1234567']) {
      expect(boardBackgroundOrDefault(id).id).toBe('crema');
      expect(isCustomColorId(id)).toBe(false);
    }
  });

  it('avisa con un color oscuro y no con uno claro', () => {
    expect(isDarkBackground(boardBackgroundOrDefault('color-1e3a8a'))).toBe(true);
    expect(isDarkBackground(boardBackgroundOrDefault('color-000000'))).toBe(true);
    expect(isDarkBackground(boardBackgroundOrDefault('color-bbf7d0'))).toBe(false);
  });

  it('ningún fondo del catálogo lleva el aviso', () => {
    for (const background of BOARD_BACKGROUNDS) expect(isDarkBackground(background)).toBe(false);
  });

  it('el PDF pinta el color propio', () => {
    const page = { drawRectangle: vi.fn(), drawSvgPath: vi.fn() };
    drawBoardBackground(page as unknown as PDFPage, boardBackgroundOrDefault('color-1e3a8a'));
    expect(page.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({ color: rgb(0x1e / 255, 0x3a / 255, 0x8a / 255) })
    );
  });
});

describe('fondo en pantalla (FEAT-67)', () => {
  it('un patrón se arma una sola vez como imagen y se reusa', async () => {
    const { boardBackgroundImage } = await import('../../src/components/BoardGenerator/BoardBackgroundLayer');
    const talavera = boardBackgroundOrDefault('talavera');
    const first = boardBackgroundImage(talavera);
    expect(boardBackgroundImage(talavera)).toBe(first);
    expect(first.startsWith('url("data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(first.slice('url("data:image/svg+xml,'.length, -2));
    expect(svg).toContain(`fill="${talavera.base}"`);
    const area = boardBackgroundArea();
    expect(svg.match(/<path /g)).toHaveLength(boardPatternShapes(talavera, area.width, area.height).length);
  });
});

describe('posición del logo (FEAT-67, US A4)', () => {
  const visibleLeft = (box: { x: number; width: number }) => box.x + box.width * LOGO_VISIBLE_BOX.left;
  const visibleRight = (box: { x: number; width: number }) => box.x + box.width * LOGO_VISIBLE_BOX.right;
  const gridLeft = CUT_AREA_X_PT - CARD_BORDER_PT / 2;
  const gridRight = CUT_AREA_X_PT + CUT_AREA_WIDTH_PT + CARD_BORDER_PT / 2;

  it('sin posición o con una que no se reconoce, va al centro', () => {
    expect(boardLogoPositionOrDefault(undefined)).toBe('center');
    expect(boardLogoPositionOrDefault('arriba')).toBe('center');
    expect(boardLogoPositionOrDefault('left')).toBe('left');
    expect(boardLogoBox(1)).toEqual(boardLogoBox(1, 'center'));
  });

  it('a la izquierda o a la derecha, la parte visible se alinea con la orilla de las cartas', () => {
    expect(visibleLeft(boardLogoBox(1, 'left'))).toBeCloseTo(gridLeft, 5);
    expect(visibleRight(boardLogoBox(1, 'right'))).toBeCloseTo(gridRight, 5);
  });

  it('solo se mueve a lo ancho: misma altura y mismo tamaño', () => {
    const center = boardLogoBox(1, 'center');
    for (const position of ['left', 'right'] as const) {
      const box = boardLogoBox(1, position);
      expect(box.y).toBe(center.y);
      expect(box.width).toBe(center.width);
      expect(box.height).toBe(center.height);
    }
  });

  it('el título no depende de la posición del logo', () => {
    expect(boardSheetGeometry(16, 'left').title).toEqual(boardSheetGeometry(16, 'center').title);
  });

  it('el título se mueve por su lado: a los lados se alinea con las cartas y lleva una sola línea', () => {
    const width = 90;
    const center = boardTitleLayout(width);
    expect(center).toEqual(boardTitleLayout(width, 'center'));
    expect(center.lines).toHaveLength(2);

    const left = boardTitleLayout(width, 'left');
    expect(left.text.x).toBeCloseTo(gridLeft, 5);
    expect(left.lines).toHaveLength(1);
    expect(left.lines[0].start.x).toBeGreaterThan(left.text.x + width);
    expect(left.lines[0].end.x).toBeCloseTo(gridRight, 5);

    const right = boardTitleLayout(width, 'right');
    expect(right.text.x + width).toBeCloseTo(gridRight, 5);
    expect(right.lines).toHaveLength(1);
    expect(right.lines[0].start.x).toBeCloseTo(gridLeft, 5);
    expect(right.lines[0].end.x).toBeLessThan(right.text.x);

    // Misma altura en las tres posiciones.
    expect(left.text.y).toBe(center.text.y);
    expect(right.text.y).toBe(center.text.y);
  });

  it('la vista previa mueve el logo igual que el PDF', () => {
    const area = boardBackgroundArea();
    for (const position of ['left', 'center', 'right'] as const) {
      expect(boardSheetGeometry(16, position).logo.left).toBeCloseTo(boardLogoBox(1, position).x - area.x, 5);
    }
  });
});
