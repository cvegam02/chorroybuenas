import { describe, expect, it } from 'vitest';
import {
  TRADITIONAL_CARD_COUNT,
  TRADITIONAL_MAX_BOARDS,
  addEmptyBoard,
  addRandomBoards,
  duplicateBoardNumbers,
  fillBoardEmptyCells,
  fillEmptyCells,
  hasPlacedCards,
  startingTraditionalState,
  incompleteBoardNumbers,
  traditionalPdfBoards,
  placeCard,
  swapCells,
  toggleFixed,
  emptyTraditionalState,
  parseTraditionalState,
  removeBoard,
  reshuffleAll,
  reshuffleBoard,
  traditionalCardImage,
  type TraditionalBoard,
} from '../../src/utils/traditionalBoards';

const key = (board: TraditionalBoard) => [...board.cards].sort((a, b) => a - b).join('|');

function expectValidBoards(boards: readonly TraditionalBoard[], gridSize: number) {
  for (const board of boards) {
    expect(board.cards).toHaveLength(gridSize);
    expect(new Set(board.cards).size).toBe(gridSize);
    for (const card of board.cards) {
      expect(card).toBeGreaterThanOrEqual(1);
      expect(card).toBeLessThanOrEqual(TRADITIONAL_CARD_COUNT);
    }
  }
  expect(new Set(boards.map(key)).size).toBe(boards.length);
  expect(new Set(boards.map((b) => b.id)).size).toBe(boards.length);
}

describe('tableros de lotería tradicional (FEAT-53, US A1)', () => {
  it('agrega tableros sin cartas repetidas y sin dos tableros iguales', () => {
    const boards = addRandomBoards([], 27, 16);
    expect(boards).toHaveLength(27);
    expectValidBoards(boards, 16);
  });

  it('los nuevos no repiten a los que ya había y los anteriores no cambian', () => {
    const first = addRandomBoards([], 10, 9);
    const all = addRandomBoards(first, 8, 9);
    expect(all.slice(0, 10)).toEqual(first);
    expect(all).toHaveLength(18);
    expectValidBoards(all, 9);
  });

  it('no deja pasar de 50 tableros', () => {
    const boards = addRandomBoards(addRandomBoards([], 45, 16), 20, 16);
    expect(boards).toHaveLength(TRADITIONAL_MAX_BOARDS);
    expect(addRandomBoards(boards, 1, 16)).toBe(boards);
  });

  it('pedir cero o menos no agrega nada', () => {
    expect(addRandomBoards([], 0, 16)).toEqual([]);
    expect(addRandomBoards([], -3, 16)).toEqual([]);
  });

  it('revolver un tablero cambia solo ese y lo deja distinto de los demás', () => {
    const boards = addRandomBoards([], 12, 16);
    const target = boards[4];
    const result = reshuffleBoard(boards, target.id, 16);
    expect(result).toHaveLength(12);
    result.forEach((board, i) => {
      if (i !== 4) expect(board).toBe(boards[i]);
    });
    expect(result[4].id).toBe(target.id);
    expect(key(result[4])).not.toBe(key(target));
    expectValidBoards(result, 16);
  });

  it('revolver todos conserva la cantidad y los identificadores', () => {
    const boards = addRandomBoards([], 18, 9);
    const result = reshuffleAll(boards, 9);
    expect(result.map((b) => b.id)).toEqual(boards.map((b) => b.id));
    expectValidBoards(result, 9);
  });

  it('borrar quita solo ese tablero', () => {
    const boards = addRandomBoards([], 5, 16);
    const result = removeBoard(boards, boards[2].id);
    expect(result).toEqual([boards[0], boards[1], boards[3], boards[4]]);
  });

  it('cada carta tiene su imagen de pantalla y de impresión', () => {
    expect(traditionalCardImage(1, 'screen')).toBe('/media/loteria-tradicional/pantalla/01.jpg');
    expect(traditionalCardImage(54, 'print')).toBe('/media/loteria-tradicional/impresion/54.jpg');
  });

  describe('lo guardado en el navegador', () => {
    it('recupera lo que se guardó', () => {
      const state = { gridSize: 9 as const, boards: addRandomBoards([], 3, 9) };
      expect(parseTraditionalState(JSON.stringify(state))).toEqual(state);
    });

    it.each([
      ['nada', null],
      ['texto que no es JSON', '{roto'],
      ['un modo que no existe', JSON.stringify({ gridSize: 25, boards: [] })],
      ['tableros que no son lista', JSON.stringify({ gridSize: 16, boards: 'x' })],
    ])('con %s empieza vacío', (_, raw) => {
      expect(parseTraditionalState(raw)).toEqual(emptyTraditionalState());
    });

    it('descarta los tableros dañados y conserva los buenos', () => {
      const good = addRandomBoards([], 2, 16);
      const raw = JSON.stringify({
        gridSize: 16,
        boards: [
          good[0],
          { id: 'corto', cards: [1, 2, 3] },
          { id: 'repetida', cards: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
          { id: 'fuera', cards: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 55] },
          { cards: good[1].cards },
          good[1],
        ],
      });
      expect(parseTraditionalState(raw).boards).toEqual(good);
    });

    it('no recupera más de 50 tableros', () => {
      const boards = addRandomBoards([], 50, 16);
      const extra = addRandomBoards([], 5, 16).map((b, i) => ({ ...b, id: `extra-${i}` }));
      const raw = JSON.stringify({ gridSize: 16, boards: [...boards, ...extra] });
      expect(parseTraditionalState(raw).boards).toHaveLength(50);
    });
  });
});

describe('cambiar cartas de un tablero (FEAT-53, US A2)', () => {
  const board = (id: string, cards: number[]): TraditionalBoard => ({ id, cards, fixed: [] });
  const kids = (id: string, first: number) => board(id, [first, 2, 3, 4, 5, 6, 7, 8, 9]);

  it('poner una carta que no está en el tablero la reemplaza en esa casilla', () => {
    const boards = [kids('a', 1), kids('b', 10)];
    const result = placeCard(boards, 'a', 4, 30);
    expect(result[0].cards).toEqual([1, 2, 3, 4, 30, 6, 7, 8, 9]);
    expect(result[1]).toBe(boards[1]);
  });

  it('poner una carta que ya está en el tablero intercambia las dos casillas', () => {
    const result = placeCard([kids('a', 1)], 'a', 0, 9);
    expect(result[0].cards).toEqual([9, 2, 3, 4, 5, 6, 7, 8, 1]);
  });

  it('poner la misma carta en su casilla no cambia nada', () => {
    const boards = [kids('a', 1)];
    expect(placeCard(boards, 'a', 2, 3)).toBe(boards);
  });

  it('intercambiar dos casillas del mismo tablero', () => {
    const result = swapCells([kids('a', 1)], 'a', 0, 8);
    expect(result[0].cards).toEqual([9, 2, 3, 4, 5, 6, 7, 8, 1]);
  });

  it('casillas fuera del tablero, una carta que no existe o un tablero desconocido no cambian nada', () => {
    const boards = [kids('a', 1)];
    expect(placeCard(boards, 'a', 9, 30)).toBe(boards);
    expect(placeCard(boards, 'a', 0, 55)).toBe(boards);
    expect(placeCard(boards, 'zzz', 0, 30)).toBe(boards);
    expect(swapCells(boards, 'a', 0, 0)).toBe(boards);
    expect(swapCells(boards, 'a', -1, 3)).toBe(boards);
  });

  it('avisa qué tableros son iguales a otro, aunque estén en otro orden', () => {
    const boards = [
      kids('a', 1),
      kids('b', 10),
      board('c', [9, 8, 7, 6, 5, 4, 3, 2, 1]),
      kids('d', 11),
    ];
    const duplicates = duplicateBoardNumbers(boards);
    expect(duplicates.get('a')).toEqual([3]);
    expect(duplicates.get('c')).toEqual([1]);
    expect(duplicates.has('b')).toBe(false);
    expect(duplicates.has('d')).toBe(false);
  });
});

describe('tablero vacío y cartas fijas (FEAT-53, US A3)', () => {
  const kids = (id: string, first: number, fixed: number[] = []): TraditionalBoard => ({
    id,
    cards: [first, 2, 3, 4, 5, 6, 7, 8, 9],
    fixed,
  });

  it('agrega un tablero vacío, sin pasar de 50', () => {
    const boards = addEmptyBoard([], 16);
    expect(boards).toHaveLength(1);
    expect(boards[0].cards).toEqual(Array(16).fill(null));
    const full = addRandomBoards([], 50, 16);
    expect(addEmptyBoard(full, 16)).toBe(full);
  });

  it('llenar casillas vacías: la carta se pone; si ya estaba en el tablero, se mueve y su casilla queda vacía', () => {
    const empty = addEmptyBoard([], 9);
    const id = empty[0].id;
    const one = placeCard(empty, id, 0, 30);
    expect(one[0].cards).toEqual([30, null, null, null, null, null, null, null, null]);
    const moved = placeCard(one, id, 4, 30);
    expect(moved[0].cards).toEqual([null, null, null, null, 30, null, null, null, null]);
  });

  it('fijar y quitar el fijado de una carta; una casilla vacía no se fija', () => {
    const boards = [kids('a', 1)];
    const fixed = toggleFixed(boards, 'a', 2);
    expect(fixed[0].fixed).toEqual([3]);
    expect(toggleFixed(fixed, 'a', 2)[0].fixed).toEqual([]);
    const empty = addEmptyBoard([], 9);
    expect(toggleFixed(empty, empty[0].id, 0)).toBe(empty);
  });

  it('al revolver un tablero, las fijadas no se mueven y las vacías se llenan', () => {
    const boards: TraditionalBoard[] = [
      { id: 'a', cards: [40, null, 3, null, 5, 6, 7, 8, 9], fixed: [40, 5] },
    ];
    const [result] = reshuffleBoard(boards, 'a', 9);
    expect(result.cards[0]).toBe(40);
    expect(result.cards[4]).toBe(5);
    expect(result.cards).not.toContain(null);
    expect(new Set(result.cards).size).toBe(9);
    expect(result.fixed).toEqual([40, 5]);
  });

  it('con todas las cartas fijas, revolver deja el tablero igual', () => {
    const all = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const boards = [kids('a', 1, all)];
    expect(reshuffleBoard(boards, 'a', 9)[0].cards).toEqual(boards[0].cards);
    expect(reshuffleAll(boards, 9)[0].cards).toEqual(boards[0].cards);
  });

  it('revolver todos respeta las fijadas de cada tablero', () => {
    const boards = [kids('a', 1, [1]), kids('b', 10, [10, 9])];
    const result = reshuffleAll(boards, 9);
    expect(result[0].cards[0]).toBe(1);
    expect(result[1].cards[0]).toBe(10);
    expect(result[1].cards[8]).toBe(9);
  });

  it('una carta fijada que se reemplaza deja de estar fijada; si se mueve, sigue fijada', () => {
    const boards = [kids('a', 1, [1, 2])];
    expect(placeCard(boards, 'a', 0, 30)[0].fixed).toEqual([2]);
    expect(swapCells(boards, 'a', 0, 8)[0].fixed).toEqual([1, 2]);
  });

  it('los tableros con casillas vacías no cuentan como iguales', () => {
    const boards = addEmptyBoard(addEmptyBoard([], 9), 9);
    expect(duplicateBoardNumbers(boards).size).toBe(0);
  });

  it('lo guardado conserva vacías y fijadas, y descarta fijadas que no están en el tablero', () => {
    const raw = JSON.stringify({
      gridSize: 9,
      boards: [{ id: 'a', cards: [1, null, 3, 4, 5, 6, 7, 8, 9], fixed: [1, 2, 'x'] }],
    });
    expect(parseTraditionalState(raw).boards).toEqual([
      { id: 'a', cards: [1, null, 3, 4, 5, 6, 7, 8, 9], fixed: [1] },
    ]);
  });

  it('lo guardado antes de esta historia, sin fijadas, se sigue leyendo', () => {
    const raw = JSON.stringify({ gridSize: 9, boards: [{ id: 'a', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9] }] });
    expect(parseTraditionalState(raw).boards[0].fixed).toEqual([]);
  });
});

describe('descargar el PDF (FEAT-53, US A4)', () => {
  const withEmpty: TraditionalBoard = { id: 'b', cards: [40, null, 3, null, 5, 6, 7, 8, 9], fixed: [] };
  const full: TraditionalBoard = { id: 'a', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9], fixed: [] };

  it('dice qué tableros tienen casillas vacías, por su número', () => {
    expect(incompleteBoardNumbers([full, withEmpty, full])).toEqual([2]);
    expect(incompleteBoardNumbers([full])).toEqual([]);
  });

  it('llenar al azar las vacías respeta todas las cartas ya puestas', () => {
    const [same, filled] = fillEmptyCells([full, withEmpty], 9);
    expect(same).toBe(full);
    expect(filled.id).toBe('b');
    [40, 3, 5, 6, 7, 8, 9].forEach((card) => expect(filled.cards[withEmpty.cards.indexOf(card)]).toBe(card));
    expect(filled.cards).not.toContain(null);
    expect(new Set(filled.cards).size).toBe(9);
  });

  it('sin casillas vacías, llenar no cambia nada', () => {
    const boards = [full];
    expect(fillEmptyCells(boards, 9)).toBe(boards);
  });

  it('prepara los tableros para el PDF con la imagen de impresión y el nombre de cada carta', () => {
    const [board] = traditionalPdfBoards([full], 9, 'https://chorroybuenas.com.mx');
    expect(board.gridSize).toBe(9);
    expect(board.cards).toHaveLength(9);
    expect(board.cards[0]).toEqual({
      id: 'tradicional-01',
      title: 'El Gallo',
      image: 'https://chorroybuenas.com.mx/media/loteria-tradicional/impresion/01.jpg',
    });
  });

  it('no prepara el PDF si hay casillas vacías', () => {
    expect(() => traditionalPdfBoards([withEmpty], 9, 'https://x')).toThrow();
  });
});

describe('«Arma tus tableros»: tableros personalizados (FEAT-53, decisiones 20 a 25)', () => {
  it('la página empieza con un tablero vacío del modo elegido', () => {
    const start = startingTraditionalState(9);
    expect(start.gridSize).toBe(9);
    expect(start.boards).toHaveLength(1);
    expect(start.boards[0].cards).toEqual(Array(9).fill(null));
    expect(startingTraditionalState(16).boards[0].cards).toHaveLength(16);
  });

  it('sabe si ya hay alguna carta puesta, para no guardar juegos vacíos', () => {
    expect(hasPlacedCards([])).toBe(false);
    expect(hasPlacedCards(startingTraditionalState(9).boards)).toBe(false);
  });

  it('una carta puesta en el tablero de inicio cuenta', () => {
    const start = startingTraditionalState(9).boards;
    expect(hasPlacedCards(placeCard(start, start[0].id, 0, 7))).toBe(true);
  });

  it('«Llenar al azar» de un tablero solo llena sus vacías y no toca los demás', () => {
    const other: TraditionalBoard = { id: 'b', cards: [1, null, 3, 4, 5, 6, 7, 8, 9], fixed: [] };
    const mine: TraditionalBoard = { id: 'a', cards: [40, null, null, 4, 5, 6, 7, 8, 9], fixed: [] };
    const [filled, untouched] = fillBoardEmptyCells([mine, other], 'a', 9);
    expect(untouched).toBe(other);
    expect(filled.cards[0]).toBe(40);
    expect(filled.cards.slice(3)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(filled.cards).not.toContain(null);
    expect(new Set(filled.cards).size).toBe(9);
  });

  it('un tablero sin vacías no cambia al llenarlo', () => {
    const boards: TraditionalBoard[] = [{ id: 'a', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9], fixed: [] }];
    expect(fillBoardEmptyCells(boards, 'a', 9)).toBe(boards);
  });
});

