/** Pantalla C2 Tableros (FEAT-34, US A4): atajos, botones − y +, y la pila de hojas de muestra. */

/** El selector deja generar desde 1 tablero; el máximo lo calcula `maxUniqueBoards`. */
export const MIN_BOARD_COUNT = 1;

const BASE_SHORTCUTS = [8, 10, 16, 20];

export interface BoardCountShortcut {
  count: number;
  isSuggested: boolean;
}

/** Los atajos fijos más el sugerido, una sola vez, en orden y sin pasar del máximo. */
export function boardCountShortcuts(suggested: number, max: number): BoardCountShortcut[] {
  return [...new Set([...BASE_SHORTCUTS, suggested])]
    .filter((count) => count >= MIN_BOARD_COUNT && count <= max)
    .sort((a, b) => a - b)
    .map((count) => ({ count, isSuggested: count === suggested }));
}

/** El número que queda al pulsar − o +, siempre dentro de lo que se puede generar. */
export function stepBoardCount(current: number, delta: number, max: number): number {
  const top = Math.max(max, MIN_BOARD_COUNT);
  return Math.min(Math.max(current + delta, MIN_BOARD_COUNT), top);
}

/** Hojas de la pila de muestra: crece con el número de tableros y nunca tiene más hojas que tableros. */
export function sheetPileSize(boardCount: number): number {
  let sheets = 5;
  if (boardCount <= 8) sheets = 2;
  else if (boardCount <= 12) sheets = 3;
  else if (boardCount <= 20) sheets = 4;
  return Math.max(1, Math.min(sheets, boardCount));
}

/** `size` elementos al azar, sin repetir y sin cambiar la lista original. */
export function pickSample<T>(items: readonly T[], size: number, random: () => number = Math.random): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, size);
}

/** Las cartas de una hoja de la pila: la del frente va tal cual; las de atrás, las mismas en otro orden. */
export function pileSheetCards<T>(sample: readonly T[], sheetIndex: number): T[] {
  if (sample.length === 0) return [];
  const offset = (sheetIndex * 5) % sample.length;
  return [...sample.slice(offset), ...sample.slice(0, offset)];
}
