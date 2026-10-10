import { describe, expect, it, vi } from 'vitest';
import type { Card } from '../../src/types';

vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { createCardPreparer } from '../../src/services/pdf/prepareCards';

const photoCard: Card = { id: 'c1', title: 'El Gallo', image: 'blob:foto' };
const aiCard: Card = { id: 'c2', title: 'La Dama', image: 'blob:ilustracion', isAiGenerated: true };

const preparer = (overrides: Partial<Parameters<typeof createCardPreparer>[0]> = {}) => {
  const readImage = vi.fn(async (card: Card) => `guardada:${card.id}`);
  const compose = vi.fn(async ({ photo }: { photo: string }) => `compuesta:${photo}`);
  const prepare = createCardPreparer({ readImage, compose, finishedCards: false, ...overrides });
  return { prepare, readImage, compose };
};

describe('cartas listas para dibujarse en el PDF (FEAT-29, US A1 y A2)', () => {
  it('una carta con foto normal se compone con marco y con su nombre', async () => {
    const { prepare, compose } = preparer();

    const prepared = await prepare(photoCard);

    expect(compose).toHaveBeenCalledWith({ photo: 'guardada:c1', name: 'El Gallo', framed: true });
    expect(prepared).toEqual({ ...photoCard, image: 'compuesta:guardada:c1' });
  });

  it('una carta convertida con IA se compone sin margen ni marco nuevo', async () => {
    const { prepare, compose } = preparer();

    await prepare(aiCard);

    expect(compose).toHaveBeenCalledWith({ photo: 'guardada:c2', name: 'La Dama', framed: false });
  });

  it('cada carta se compone una sola vez, aunque salga en varios tableros y en la baraja', async () => {
    const { prepare, compose } = preparer();

    const prepared = await Promise.all([prepare(photoCard), prepare(photoCard), prepare(photoCard)]);

    expect(compose).toHaveBeenCalledTimes(1);
    expect(prepared.map((card) => card.image)).toEqual(Array(3).fill('compuesta:guardada:c1'));
  });

  it('si no hay copia guardada, se compone con la imagen que trae la carta', async () => {
    const { prepare, compose } = preparer({ readImage: async () => null });

    await prepare(photoCard);

    expect(compose).toHaveBeenCalledWith({ photo: 'blob:foto', name: 'El Gallo', framed: true });
  });

  it('una carta que no se puede componer se queda sin imagen, para que cuente como fallida', async () => {
    const { prepare } = preparer({ compose: async () => { throw new Error('no se pudo componer'); } });

    const prepared = await prepare(photoCard);

    expect(prepared.image).toBeUndefined();
    expect(prepared.title).toBe('El Gallo');
  });

  it('una carta sin imagen no se compone', async () => {
    const { prepare, compose } = preparer({ readImage: async () => null });

    const prepared = await prepare({ id: 'c3', title: 'Sin foto' });

    expect(compose).not.toHaveBeenCalled();
    expect(prepared.image).toBeUndefined();
  });

  it('las cartas de una lotería temática no se componen: ya traen su nombre', async () => {
    const { prepare, compose } = preparer({ finishedCards: true });

    const prepared = await prepare(photoCard);

    expect(compose).not.toHaveBeenCalled();
    expect(prepared).toEqual({ ...photoCard, image: 'guardada:c1' });
  });
});
