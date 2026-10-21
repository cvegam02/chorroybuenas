import { describe, expect, it } from 'vitest';
import type { BoardStorage, Card, GridSize } from '../../src/types';
import type { CardLabels } from '../../src/utils/cardLabels';
import {
  MAX_TRANSFER_ATTEMPTS,
  keepsOwnDestination,
  pickTransferTarget,
  runVisitorTransfer,
  type TransferPending,
  type VisitorTransferDeps,
} from '../../src/services/visitorTransfer';

const USER = 'user-1';

const card = (id: string): Card => ({ id, title: `Carta ${id}` });
const cards = (count: number, prefix = 'c'): Card[] => Array.from({ length: count }, (_, i) => card(`${prefix}${i + 1}`));
const board = (id: string, cardIds: string[]): BoardStorage => ({ id, cardIds });

interface World {
  localCards: Card[];
  localBoards: BoardStorage[];
  pending: TransferPending | null;
  sets: Array<{ id: string }>;
  cardCounts: Map<string, number>;
  failing: Set<string>;
  account: Map<string, string[]>;
  savedBoards: Array<{ setId: string; cardIds: string[] }>;
  gridSizes: Map<string, GridSize>;
  localCardLabels: CardLabels | null;
  cardLabels: Map<string, CardLabels>;
  cleared: boolean;
}

const makeWorld = (overrides: Partial<World> = {}): World => ({
  localCards: [],
  localBoards: [],
  pending: null,
  sets: [{ id: 'set-1' }],
  cardCounts: new Map(),
  failing: new Set(),
  account: new Map(),
  savedBoards: [],
  gridSizes: new Map(),
  localCardLabels: null,
  cardLabels: new Map(),
  cleared: false,
  ...overrides,
});

const depsOf = (world: World): VisitorTransferDeps => ({
  loadLocalCards: async () => world.localCards,
  loadLocalBoards: () => world.localBoards,
  loadPending: () => world.pending,
  savePending: (pending) => {
    world.pending = pending;
  },
  keepOnlyLocalCards: async (remaining) => {
    world.localCards = remaining;
  },
  clearLocal: async () => {
    world.localCards = [];
    world.localBoards = [];
    world.pending = null;
    world.cleared = true;
  },
  getSets: async () => world.sets,
  getCardCounts: async () => world.cardCounts,
  createSet: async (_userId, name, gridSize) => {
    const created = { id: `new:${name}` };
    world.sets = [...world.sets, created];
    world.gridSizes.set(created.id, gridSize);
    return created;
  },
  setGridSize: async (setId, _userId, gridSize) => {
    world.gridSizes.set(setId, gridSize);
  },
  loadLocalCardLabels: () => world.localCardLabels,
  setCardLabels: async (setId, _userId, labels) => {
    world.cardLabels.set(setId, labels);
  },
  saveCard: async (_userId, setId, localCard) => {
    if (world.failing.has(localCard.id)) throw new Error('sin conexión');
    world.account.set(setId, [...(world.account.get(setId) ?? []), localCard.id]);
  },
  saveBoard: async (_userId, setId, cardIds) => {
    world.savedBoards.push({ setId, cardIds });
  },
});

const options = { newSetName: (existing: number) => `Nueva lotería ${existing + 1}` };
const run = (world: World) => runVisitorTransfer(depsOf(world), USER, options);

describe('a qué lotería va el trabajo de visitante (FEAT-41, US A2)', () => {
  it('cuenta nueva: a su primera lotería, que está vacía', () => {
    expect(pickTransferTarget([{ id: 'a' }], new Map(), null)).toEqual({ kind: 'existing', setId: 'a' });
  });

  it('si la primera lotería ya tiene cartas, a una nueva', () => {
    expect(pickTransferTarget([{ id: 'a' }, { id: 'b' }], new Map([['a', 24]]), null)).toEqual({ kind: 'new' });
  });

  it('un traspaso que quedó a medias sigue en la misma lotería', () => {
    expect(pickTransferTarget([{ id: 'a' }, { id: 'b' }], new Map([['a', 24], ['b', 10]]), 'b'))
      .toEqual({ kind: 'existing', setId: 'b' });
  });

  it('si esa lotería ya no existe, se decide de nuevo', () => {
    expect(pickTransferTarget([{ id: 'a' }], new Map([['a', 24]]), 'borrada')).toEqual({ kind: 'new' });
  });
});

describe('páginas que conservan su propio regreso (FEAT-41, decisión 2)', () => {
  it('Comprar tokens y las loterías temáticas no cambian de página', () => {
    expect(keepsOwnDestination('/comprar-tokens')).toBe(true);
    expect(keepsOwnDestination('/tematicas')).toBe(true);
    expect(keepsOwnDestination('/tematicas/abc')).toBe(true);
  });

  it('el resto lleva a la lotería guardada', () => {
    for (const path of ['/', '/dashboard', '/cards', '/board-count', '/preview', '/como-se-juega']) {
      expect(keepsOwnDestination(path)).toBe(false);
    }
  });
});

describe('traspaso del trabajo de visitante a la cuenta (FEAT-41, US A1)', () => {
  it('sin cartas en el navegador no hace nada', async () => {
    const world = makeWorld({ localBoards: [board('viejo', ['x1', 'x2'])] });
    expect(await run(world)).toBeNull();
    expect(world.cleared).toBe(false);
    expect(world.sets).toHaveLength(1);
  });

  it('cuenta nueva: pasa cartas y tableros a la primera lotería y limpia el navegador', async () => {
    const local = cards(16);
    const world = makeWorld({ localCards: local, localBoards: [board('b1', local.map((c) => c.id))] });

    expect(await run(world)).toEqual({ setId: 'set-1', cardsMigrated: 16, cardsFailed: 0, boardsMigrated: 1 });
    expect(world.account.get('set-1')).toHaveLength(16);
    expect(world.savedBoards).toEqual([{ setId: 'set-1', cardIds: local.map((c) => c.id) }]);
    expect(world.cleared).toBe(true);
    expect(world.sets).toHaveLength(1);
  });

  it('avisa del avance carta por carta', async () => {
    const seen: Array<[number, number]> = [];
    const world = makeWorld({ localCards: cards(3) });
    await runVisitorTransfer(depsOf(world), USER, { ...options, onProgress: (done, total) => seen.push([done, total]) });
    expect(seen).toEqual([[1, 3], [2, 3], [3, 3]]);
  });

  it('con cartas previas en la cuenta crea una lotería nueva y no toca la anterior', async () => {
    const world = makeWorld({ localCards: cards(4), cardCounts: new Map([['set-1', 24]]) });

    const result = await run(world);

    expect(result?.setId).toBe('new:Nueva lotería 2');
    expect(world.account.get('set-1')).toBeUndefined();
    expect(world.account.get('new:Nueva lotería 2')).toHaveLength(4);
  });

  it('una lotería Kids se guarda como Kids', async () => {
    const local = cards(9);
    const world = makeWorld({ localCards: local, localBoards: [board('b1', local.map((c) => c.id))] });
    await run(world);
    expect(world.gridSizes.get('set-1')).toBe(9);
  });

  it('una lotería nueva Kids se crea como Kids', async () => {
    const local = cards(9);
    const world = makeWorld({
      localCards: local,
      localBoards: [board('b1', local.map((c) => c.id))],
      cardCounts: new Map([['set-1', 24]]),
    });
    await run(world);
    expect(world.gridSizes.get('new:Nueva lotería 2')).toBe(9);
  });

  it('lo que se ve en las cartas pasa a la lotería de la cuenta (FEAT-51)', async () => {
    const world = makeWorld({ localCards: cards(4), localCardLabels: 'number' });
    await run(world);
    expect(world.cardLabels.get('set-1')).toBe('number');
  });

  it('también pasa a una lotería nueva (FEAT-51)', async () => {
    const world = makeWorld({ localCards: cards(4), localCardLabels: 'none', cardCounts: new Map([['set-1', 24]]) });
    await run(world);
    expect(world.cardLabels.get('new:Nueva lotería 2')).toBe('none');
  });

  it('si el visitante no lo cambió, la lotería se queda como estaba (FEAT-51)', async () => {
    const world = makeWorld({ localCards: cards(4) });
    await run(world);
    expect(world.cardLabels.size).toBe(0);
  });

  it('ignora tableros que no son de estas cartas', async () => {
    const local = cards(16);
    const world = makeWorld({
      localCards: local,
      localBoards: [board('ajeno', cards(9, 'x').map((c) => c.id)), board('b1', local.map((c) => c.id))],
    });

    const result = await run(world);

    expect(result?.boardsMigrated).toBe(1);
    expect(world.gridSizes.get('set-1')).toBe(16);
  });

  it('si falla una carta, las demás pasan; la que faltó se queda y no se guardan tableros', async () => {
    const local = cards(16);
    const world = makeWorld({
      localCards: local,
      localBoards: [board('b1', local.map((c) => c.id))],
      failing: new Set(['c3']),
    });

    expect(await run(world)).toEqual({ setId: 'set-1', cardsMigrated: 15, cardsFailed: 1, boardsMigrated: 0 });
    expect(world.localCards.map((c) => c.id)).toEqual(['c3']);
    expect(world.localBoards).toHaveLength(1);
    expect(world.savedBoards).toEqual([]);
    expect(world.cleared).toBe(false);
    expect(world.pending).toMatchObject({ userId: USER, setId: 'set-1', attempts: 1 });
    expect(world.pending?.cardIds).toHaveLength(15);
  });

  it('el reintento termina en la misma lotería y entonces guarda los tableros', async () => {
    const local = cards(16);
    const world = makeWorld({
      localCards: local,
      localBoards: [board('b1', local.map((c) => c.id))],
      failing: new Set(['c3']),
    });
    await run(world);
    // Para entonces la primera lotería ya tiene cartas: sin lo anotado, se crearía otra.
    world.cardCounts = new Map([['set-1', 15]]);
    world.failing = new Set();

    expect(await run(world)).toEqual({ setId: 'set-1', cardsMigrated: 1, cardsFailed: 0, boardsMigrated: 1 });
    expect(world.account.get('set-1')).toHaveLength(16);
    expect(world.savedBoards).toHaveLength(1);
    expect(world.cleared).toBe(true);
    expect(world.sets).toHaveLength(1);
  });

  it('si no pasa ninguna, lo del navegador queda intacto', async () => {
    const local = cards(3);
    const world = makeWorld({ localCards: local, failing: new Set(local.map((c) => c.id)) });

    expect(await run(world)).toEqual({ setId: 'set-1', cardsMigrated: 0, cardsFailed: 3, boardsMigrated: 0 });
    expect(world.localCards).toHaveLength(3);
    expect(world.cleared).toBe(false);
    expect(world.pending).toMatchObject({ setId: 'set-1', attempts: 1, cardIds: [] });
  });

  it('un fallo total sobre una lotería nueva no crea otra en el reintento', async () => {
    const local = cards(3);
    const world = makeWorld({
      localCards: local,
      cardCounts: new Map([['set-1', 24]]),
      failing: new Set(local.map((c) => c.id)),
    });
    await run(world);
    world.failing = new Set();

    const result = await run(world);

    expect(result?.setId).toBe('new:Nueva lotería 2');
    expect(world.sets).toHaveLength(2);
  });

  it('tras varios intentos fallidos deja de insistir y limpia el navegador', async () => {
    const local = cards(2);
    const world = makeWorld({
      localCards: local,
      pending: { userId: USER, setId: 'set-1', cardIds: [], attempts: MAX_TRANSFER_ATTEMPTS },
    });

    expect(await run(world)).toBeNull();
    expect(world.cleared).toBe(true);
    expect(world.account.size).toBe(0);
  });

  it('lo anotado de otra cuenta no se usa', async () => {
    const world = makeWorld({
      localCards: cards(2),
      pending: { userId: 'otra', setId: 'set-9', cardIds: ['z'], attempts: MAX_TRANSFER_ATTEMPTS },
    });

    const result = await run(world);

    expect(result).toMatchObject({ setId: 'set-1', cardsMigrated: 2 });
  });
});
