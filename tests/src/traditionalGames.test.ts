import { describe, expect, it, vi } from 'vitest';
import { createLatestSaver, traditionalGameFromRow } from '../../src/utils/traditionalGames';

const board = { id: 'a', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9], fixed: [3] };

describe('juegos de lotería tradicional guardados (FEAT-53, US A5)', () => {
  it('lee una fila de la base', () => {
    expect(
      traditionalGameFromRow({
        id: 'g1',
        name: 'Posada',
        grid_size: 9,
        boards: [board],
        updated_at: '2026-10-22T10:00:00Z',
      }),
    ).toEqual({ id: 'g1', name: 'Posada', gridSize: 9, boards: [board], updatedAt: '2026-10-22T10:00:00Z' });
  });

  it('descarta los tableros dañados de una fila y conserva los buenos', () => {
    const game = traditionalGameFromRow({
      id: 'g1',
      name: 'Posada',
      grid_size: 9,
      boards: [board, { id: 'x', cards: [1] }],
      updated_at: '2026-10-22T10:00:00Z',
    });
    expect(game?.boards).toEqual([board]);
  });

  it.each([
    ['nada', null],
    ['sin id', { name: 'x', grid_size: 9, boards: [] }],
    ['un modo que no existe', { id: 'g', name: 'x', grid_size: 25, boards: [] }],
  ])('con %s no hay juego', (_, row) => {
    expect(traditionalGameFromRow(row)).toBeNull();
  });
});

describe('cola de guardado (FEAT-53, US A5)', () => {
  const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };

  it('guarda uno a la vez y, al terminar, solo el último cambio que llegó mientras tanto', async () => {
    const calls: string[] = [];
    const gates: Array<() => void> = [];
    const saver = createLatestSaver<string>(async (value) => {
      calls.push(value);
      const gate = deferred();
      gates.push(gate.resolve);
      await gate.promise;
    });

    void saver.save('a');
    void saver.save('b');
    const last = saver.save('c');
    expect(calls).toEqual(['a']);

    gates[0]();
    await vi.waitFor(() => expect(calls).toEqual(['a', 'c']));
    gates[1]();
    await last;
    expect(calls).toEqual(['a', 'c']);
  });

  it('si un guardado falla, avisa y el siguiente cambio se vuelve a intentar', async () => {
    const onError = vi.fn();
    let fail = true;
    const saved: string[] = [];
    const saver = createLatestSaver<string>(async (value) => {
      if (fail) throw new Error('sin red');
      saved.push(value);
    }, onError);

    await saver.save('a');
    expect(onError).toHaveBeenCalledTimes(1);
    fail = false;
    await saver.save('b');
    expect(saved).toEqual(['b']);
  });
});
