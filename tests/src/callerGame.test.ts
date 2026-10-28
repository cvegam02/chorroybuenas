import { describe, expect, it } from 'vitest';
import {
  browseBack,
  callOrderNumbers,
  calledNewestFirst,
  recentBeforeCurrent,
  browseForward,
  canSing,
  currentCardId,
  drawNext,
  drawnIds,
  isFinished,
  nameGoesBelow,
  newGame,
  parseSavedGame,
  reconcileGame,
} from '../../src/utils/callerGame';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i + 1}`);

/** Números «al azar» fijos, para que las pruebas den siempre lo mismo. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('cuándo se puede cantar (FEAT-55, decisión 7)', () => {
  it('con el mínimo de cartas del modo, tenga tableros o no', () => {
    expect(canSing(24, 16)).toBe(true);
    expect(canSing(23, 16)).toBe(false);
    expect(canSing(15, 9)).toBe(true);
    expect(canSing(14, 9)).toBe(false);
  });
});

describe('el nombre debajo de la carta (FEAT-55, decisión 5)', () => {
  it('solo cuando la carta no lo trae dibujado', () => {
    expect(nameGoesBelow('both')).toBe(false);
    expect(nameGoesBelow('name')).toBe(false);
    expect(nameGoesBelow('number')).toBe(true);
    expect(nameGoesBelow('none')).toBe(true);
  });
});

describe('barajar y cantar (FEAT-55, US A2)', () => {
  it('una partida nueva trae todas las cartas una vez, revueltas, y ninguna sacada', () => {
    const game = newGame(ids(54));
    expect(game.drawn).toBe(0);
    expect([...game.order].sort()).toEqual([...ids(54)].sort());
    expect(new Set(game.order).size).toBe(54);
    expect(currentCardId(game)).toBeNull();
  });

  it('dos partidas salen en distinto orden', () => {
    expect(newGame(ids(54)).order).not.toEqual(newGame(ids(54)).order);
  });

  it('sacar avanza una carta y no pasa del final', () => {
    let game = newGame(ids(3));
    game = drawNext(game);
    expect(game.drawn).toBe(1);
    expect(currentCardId(game)).toBe(game.order[0]);
    game = drawNext(drawNext(game));
    expect(isFinished(game)).toBe(true);
    expect(drawNext(game)).toEqual(game);
  });

  it('las cantadas son las sacadas, en el orden en que salieron', () => {
    const game = drawNext(drawNext(newGame(ids(5))));
    expect(drawnIds(game)).toEqual(game.order.slice(0, 2));
  });

  it('no cambia la partida que recibe', () => {
    const game = newGame(ids(5));
    drawNext(game);
    expect(game.drawn).toBe(0);
  });
});

describe('lotería editada a media partida (FEAT-55, US A2)', () => {
  it('las cartas borradas dejan de salir y el contador se ajusta', () => {
    const game = { order: ['a', 'b', 'c', 'd', 'e'], drawn: 3 };
    const next = reconcileGame(game, ['a', 'c', 'd', 'e']);
    expect(next.order).toEqual(['a', 'c', 'd', 'e']);
    expect(next.drawn).toBe(2);
  });

  it('las cartas nuevas entran en un lugar al azar entre las que faltan, nunca entre las cantadas', () => {
    const game = { order: ['a', 'b', 'c', 'd'], drawn: 2 };
    const first = reconcileGame(game, ['a', 'b', 'c', 'd', 'x'], sequence(0));
    expect(first.order).toEqual(['a', 'b', 'x', 'c', 'd']);
    const last = reconcileGame(game, ['a', 'b', 'c', 'd', 'x'], sequence(0.99));
    expect(last.order).toEqual(['a', 'b', 'c', 'd', 'x']);
    expect(first.drawn).toBe(2);
  });

  it('sin cambios, la partida queda igual', () => {
    const game = { order: ['a', 'b', 'c'], drawn: 1 };
    expect(reconcileGame(game, ['c', 'b', 'a'])).toEqual(game);
  });
});

describe('partida guardada en el navegador (FEAT-55, US A2)', () => {
  it('lee una partida guardada', () => {
    expect(parseSavedGame(JSON.stringify({ order: ['a', 'b'], drawn: 1 }))).toEqual({ order: ['a', 'b'], drawn: 1 });
  });

  it('descarta lo que no es una partida', () => {
    expect(parseSavedGame(null)).toBeNull();
    expect(parseSavedGame('no es json')).toBeNull();
    expect(parseSavedGame(JSON.stringify({ order: ['a'], drawn: 5 }))).toBeNull();
    expect(parseSavedGame(JSON.stringify({ order: ['a', 'a'], drawn: 0 }))).toBeNull();
    expect(parseSavedGame(JSON.stringify({ order: [1], drawn: 0 }))).toBeNull();
    expect(parseSavedGame(JSON.stringify({ order: ['a'], drawn: -1 }))).toBeNull();
  });
});

describe('recorrer las cantadas con las flechas (FEAT-55, decisión 19)', () => {
  it('← va a la anterior, desde la última cantada, y no pasa de la primera', () => {
    expect(browseBack(null, 5)).toBe(3);
    expect(browseBack(3, 5)).toBe(2);
    expect(browseBack(0, 5)).toBe(0);
  });

  it('→ avanza y al llegar a la última cantada vuelve a mostrarla como actual; nunca saca otra', () => {
    expect(browseForward(2, 5)).toBe(3);
    expect(browseForward(3, 5)).toBeNull();
    expect(browseForward(null, 5)).toBeNull();
  });

  it('con una sola carta o ninguna no hay a dónde ir', () => {
    expect(browseBack(null, 1)).toBeNull();
    expect(browseBack(null, 0)).toBeNull();
  });
});

describe('historial de cartas cantadas (FEAT-55, US A3)', () => {
  const game = { order: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], drawn: 7 };

  it('la tira trae las anteriores a la actual, de la más vieja a la más reciente', () => {
    expect(recentBeforeCurrent(game, 4)).toEqual(['c', 'd', 'e', 'f']);
    expect(recentBeforeCurrent({ ...game, drawn: 3 }, 4)).toEqual(['a', 'b']);
  });

  it('recién empezada, la tira está vacía', () => {
    expect(recentBeforeCurrent({ ...game, drawn: 1 }, 4)).toEqual([]);
    expect(recentBeforeCurrent({ ...game, drawn: 0 }, 4)).toEqual([]);
  });

  it('cada cantada lleva su número de salida; las que faltan, ninguno', () => {
    const numbers = callOrderNumbers({ ...game, drawn: 3 });
    expect(numbers.get('a')).toBe(1);
    expect(numbers.get('c')).toBe(3);
    expect(numbers.has('d')).toBe(false);
  });

  it('el panel de computadora lleva todas las cantadas, la más reciente primero (FEAT-59)', () => {
    expect(calledNewestFirst({ ...game, drawn: 3 })).toEqual(['c', 'b', 'a']);
    expect(calledNewestFirst({ ...game, drawn: 0 })).toEqual([]);
  });
});
