/**
 * Fondos de los tableros (FEAT-67). Un fondo es un color de base y, a veces, un patrón de figuras encima.
 * Lo mismo sirve para el PDF y para la pantalla: las figuras son trazos SVG en puntos, dentro del área del
 * fondo (el tablero, su encabezado y lo que sobresale para el corte), con el origen arriba a la izquierda.
 */

export type BoardBackgroundId =
  | 'crema'
  | 'rosa'
  | 'azul'
  | 'lila'
  | 'amarillo'
  | 'turquesa'
  | 'papel-picado'
  | 'talavera'
  | 'greca';

export type BoardPatternId = 'papel-picado' | 'talavera' | 'greca';

export interface BoardBackground {
  /** Un id del catálogo, o `color-rrggbb` para un color propio (US A5). */
  id: string;
  /** Color de base, en hexadecimal. */
  base: string;
  pattern?: BoardPatternId;
  /** Imagen propia (US A2): su dirección, para la pantalla o el PDF. */
  image?: string;
  /** Si a la imagen propia se le pone el velo blanco («Aclarar la imagen»). */
  lighten?: boolean;
}

export interface PatternShape {
  /** Trazo SVG, en coordenadas propias de la figura. */
  d: string;
  /** Dónde queda el origen de la figura dentro del área, en puntos, contando desde arriba a la izquierda. */
  x: number;
  y: number;
  /** Relleno; sin él, la figura solo lleva contorno. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity: number;
}

/** Colores de la paleta (`src/index.css`) de los que salen los fondos. */
const PALETTE = {
  white: '#ffffff',
  primaryLight: '#fb923c',
  primaryDark: '#c2410c',
  secondary: '#2dd4bf',
  secondaryLight: '#99f6e4',
  accent: '#fcd34d',
  accentLight: '#fde68a',
  cardPink: '#e8a3b8',
  cardBlue: '#93c5fd',
  cardLilac: '#c4b5fd',
} as const;

/** El crema de siempre del PDF, cercano a `--color-bg-subtle`. */
const CREAM = '#fef3e7';
/** Orilla del fondo: la línea fina que lleva desde antes alrededor del área. */
export const BOARD_BACKGROUND_EDGE = '#faebde';

const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);

/** Mezcla un color de la paleta con blanco: `amount` es cuánto queda del color (0 a 1). */
export function tint(hex: string, amount: number): string {
  const mixed = [0, 1, 2].map((index) => {
    const value = Math.round(channel(hex, index) * amount + 255 * (1 - amount));
    return value.toString(16).padStart(2, '0');
  });
  return `#${mixed.join('')}`;
}

/** Catálogo fijo, en el orden en que se ofrece (decisión 15). El crema va primero y es el de entrada. */
export const BOARD_BACKGROUNDS: readonly BoardBackground[] = [
  { id: 'crema', base: CREAM },
  { id: 'rosa', base: tint(PALETTE.cardPink, 0.4) },
  { id: 'azul', base: tint(PALETTE.cardBlue, 0.4) },
  { id: 'lila', base: tint(PALETTE.cardLilac, 0.45) },
  { id: 'amarillo', base: tint(PALETTE.accentLight, 0.6) },
  { id: 'turquesa', base: tint(PALETTE.secondaryLight, 0.5) },
  { id: 'papel-picado', base: CREAM, pattern: 'papel-picado' },
  { id: 'talavera', base: CREAM, pattern: 'talavera' },
  { id: 'greca', base: CREAM, pattern: 'greca' },
];

export const DEFAULT_BOARD_BACKGROUND: BoardBackgroundId = 'crema';

const DEFAULT_BACKGROUND = BOARD_BACKGROUNDS[0];

export function isBoardBackgroundId(value: unknown): value is BoardBackgroundId {
  return BOARD_BACKGROUNDS.some((background) => background.id === value);
}

const CUSTOM_COLOR_ID = /^color-([0-9a-f]{6})$/;

/** Id con que se guarda un color propio (US A5): `color-` y el color en hexadecimal, sin `#`. */
export function customColorId(hex: string): string {
  return `color-${hex.replace('#', '').toLowerCase()}`;
}

/** Si el id es de un color propio. */
export function isCustomColorId(id: string | null | undefined): boolean {
  return Boolean(id && CUSTOM_COLOR_ID.test(id));
}

/** El fondo guardado en la lotería: del catálogo o un color propio; si no hay o no se reconoce, el crema de siempre. */
export function boardBackgroundOrDefault(id: string | null | undefined): BoardBackground {
  const custom = id ? CUSTOM_COLOR_ID.exec(id) : null;
  if (custom) return { id: id as string, base: `#${custom[1]}` };
  return BOARD_BACKGROUNDS.find((background) => background.id === id) ?? DEFAULT_BACKGROUND;
}

/** Color de «TABLERO N» y sus líneas en el PDF (#1A120E). */
export const BOARD_TITLE_INK = '#1a120e';
/** Contraste mínimo del título sobre el fondo para que se lea bien (el de texto normal de WCAG). */
const MIN_TITLE_CONTRAST = 4.5;

const luminance = (hex: string): number => {
  const [r, g, b] = [0, 1, 2].map((index) => {
    const value = channel(hex, index) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Si el fondo es tan oscuro que el título casi negro no alcanza a leerse bien (aviso de US A5). */
export function isDarkBackground(background: BoardBackground): boolean {
  const lighter = Math.max(luminance(background.base), luminance(BOARD_TITLE_INK));
  const darker = Math.min(luminance(background.base), luminance(BOARD_TITLE_INK));
  return (lighter + 0.05) / (darker + 0.05) < MIN_TITLE_CONTRAST;
}

/** Cuántas veces cabe `size` en `length`, con lo que sobra repartido a los dos lados. */
function tiles(length: number, size: number): { count: number; offset: number } {
  const count = Math.floor(length / size);
  return { count, offset: (length - count * size) / 2 };
}

const circle = (r: number) => `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 Z`;

const FLAG_WIDTH = 26;
const FLAG_HEIGHT = 30;
const FLAG_STEP = 34;
const GARLAND_GAP = 92;
// Banderita con la orilla de abajo en picos, como el papel picado.
const FLAG_PATH =
  'M 0 0 H 26 V 24 L 22.75 30 L 19.5 24 L 16.25 30 L 13 24 L 9.75 30 L 6.5 24 L 3.25 30 L 0 24 Z';
const FLAG_COLORS = [PALETTE.cardPink, PALETTE.secondary, PALETTE.accent, PALETTE.primaryLight, PALETTE.cardLilac];

/** Tiras de banderitas de colores colgadas de un hilo, con sus agujeritos recortados. */
function papelPicado(width: number, height: number): PatternShape[] {
  const shapes: PatternShape[] = [];
  const columns = tiles(width, FLAG_STEP);
  const rows = tiles(height, GARLAND_GAP);
  for (let row = 0; row < rows.count; row++) {
    const top = rows.offset + row * GARLAND_GAP + (GARLAND_GAP - FLAG_HEIGHT) / 2;
    shapes.push({ d: `M 0 0 H ${width}`, x: 0, y: top, stroke: PALETTE.primaryDark, strokeWidth: 0.6, opacity: 0.35 });
    for (let column = 0; column < columns.count; column++) {
      const left = columns.offset + column * FLAG_STEP + (FLAG_STEP - FLAG_WIDTH) / 2;
      const fill = FLAG_COLORS[(row + column) % FLAG_COLORS.length];
      shapes.push({ d: FLAG_PATH, x: left, y: top, fill, opacity: 0.4 });
      for (const [dx, dy] of [[8, 9], [18, 9], [13, 16]]) {
        shapes.push({ d: circle(2.2), x: left + dx, y: top + dy, fill: CREAM, opacity: 1 });
      }
    }
  }
  return shapes;
}

const TILE = 48;
const PETAL = circle(6.5);

/** Azulejos de talavera: una flor de cuatro pétalos al centro y cuartos de círculo en las esquinas. */
function talavera(width: number, height: number): PatternShape[] {
  const shapes: PatternShape[] = [];
  const columns = tiles(width, TILE);
  const rows = tiles(height, TILE);
  for (let row = 0; row < rows.count; row++) {
    for (let column = 0; column < columns.count; column++) {
      const cx = columns.offset + column * TILE + TILE / 2;
      const cy = rows.offset + row * TILE + TILE / 2;
      shapes.push({ d: `M 0 0 H ${TILE} V ${TILE} H 0 Z`, x: cx - TILE / 2, y: cy - TILE / 2, stroke: PALETTE.cardBlue, strokeWidth: 0.8, opacity: 0.7 });
      for (const [dx, dy] of [[-9, 0], [9, 0], [0, -9], [0, 9]]) {
        shapes.push({ d: PETAL, x: cx + dx, y: cy + dy, fill: PALETTE.cardBlue, opacity: 0.75 });
      }
      shapes.push({ d: circle(4), x: cx, y: cy, fill: PALETTE.accent, opacity: 0.9 });
      // Un cuarto de círculo en cada esquina: con los azulejos vecinos forman otra flor.
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const corner = `M 0 0 L ${-sx * 9} 0 A 9 9 0 0 ${sx * sy > 0 ? 0 : 1} 0 ${-sy * 9} Z`;
        shapes.push({ d: corner, x: cx + (sx * TILE) / 2, y: cy + (sy * TILE) / 2, fill: PALETTE.cardBlue, opacity: 0.45 });
      }
    }
  }
  return shapes;
}

const FRET = 24;
const BAND_GAP = 60;
// Un escalón de la greca: sube, gira y baja, y empata con el siguiente.
const FRET_PATH = 'M 0 20 V 4 H 16 V 14 H 8 V 10 M 12 20 H 24';

/** Franjas de greca escalonada, en terracota, entre dos líneas. */
function greca(width: number, height: number): PatternShape[] {
  const shapes: PatternShape[] = [];
  const columns = tiles(width, FRET);
  const rows = tiles(height, BAND_GAP);
  const line = { stroke: PALETTE.primaryDark, strokeWidth: 1.6, opacity: 0.32 };
  for (let row = 0; row < rows.count; row++) {
    const top = rows.offset + row * BAND_GAP + (BAND_GAP - FRET) / 2;
    const left = columns.offset;
    const right = columns.offset + columns.count * FRET;
    shapes.push({ d: `M 0 0 H ${right - left}`, x: left, y: top, ...line });
    shapes.push({ d: `M 0 0 H ${right - left}`, x: left, y: top + FRET, ...line });
    for (let column = 0; column < columns.count; column++) {
      shapes.push({ d: FRET_PATH, x: left + column * FRET, y: top, ...line });
    }
  }
  return shapes;
}

/** Las figuras del patrón de un fondo para un área de `width` × `height` puntos; sin patrón, ninguna. */
export function boardPatternShapes(background: BoardBackground, width: number, height: number): PatternShape[] {
  switch (background.pattern) {
    case 'papel-picado':
      return papelPicado(width, height);
    case 'talavera':
      return talavera(width, height);
    case 'greca':
      return greca(width, height);
    default:
      return [];
  }
}

/** Dónde va el logo o «TABLERO N» en el encabezado del tablero (US A4): cada uno se mueve por su lado. */
export type BoardLogoPosition = 'left' | 'center' | 'right';
export type BoardTitlePosition = BoardLogoPosition;

export const BOARD_LOGO_POSITIONS: readonly BoardLogoPosition[] = ['left', 'center', 'right'];

/** La posición guardada en la lotería; si no hay o no se reconoce, al centro, como siempre. */
export function boardLogoPositionOrDefault(value: string | null | undefined): BoardLogoPosition {
  return BOARD_LOGO_POSITIONS.find((position) => position === value) ?? 'center';
}

/** Id del fondo cuando es la imagen propia de la lotería (US A2). */
export const OWN_IMAGE_BACKGROUND_ID = 'imagen';

/** Cuánto blanco lleva encima la imagen propia con «Aclarar la imagen». */
export const OWN_IMAGE_VEIL_OPACITY = 0.55;

/** La imagen propia como fondo; mientras no se tenga su dirección, se ve el crema. */
export function ownImageBackground(image: string | null | undefined, lighten: boolean): BoardBackground {
  return { id: OWN_IMAGE_BACKGROUND_ID, base: CREAM, image: image ?? undefined, lighten };
}

/** Lo mismo que se acepta para las cartas (§5): PNG, JPEG o WebP, de hasta 5 MB. */
export const BOARD_IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
export const BOARD_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Por qué no se acepta un archivo como imagen de fondo, o `null` si sí se acepta. */
export function boardImageFileError(file: { type: string; size: number }): 'type' | 'size' | null {
  if (!BOARD_IMAGE_TYPES.includes(file.type)) return 'type';
  if (file.size > BOARD_IMAGE_MAX_BYTES) return 'size';
  return null;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

/** Ruta de la imagen de fondo de una lotería: en la carpeta de la dueña, con un nombre nuevo cada vez. */
export function boardBackgroundImagePath(userId: string, setId: string, contentType: string, now: number): string {
  return `${userId}/board-bg-${setId}_${now}.${IMAGE_EXTENSIONS[contentType] ?? 'png'}`;
}
