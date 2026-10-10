import { describe, expect, it, vi } from 'vitest';
import type { Card } from '../../src/types';

vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { createComposedCardStore } from '../../src/services/cardCompose/composedCards';

// Cartas de una lotería guardada: su imagen es una dirección remota y se compone con la copia guardada.
const photoCard: Card = { id: 'c1', title: 'El Gallo', image: 'https://storage/foto' };
const aiCard: Card = { id: 'c2', title: 'La Dama', image: 'https://storage/ilustracion', isAiGenerated: true };
// Carta recién subida: su imagen vive en el navegador.
const localCard: Card = { id: 'c4', title: 'El Sol', image: 'blob:foto-local' };

const newStore = (overrides: Partial<Parameters<typeof createComposedCardStore>[0]> = {}) => {
  const readImage = vi.fn(async (card: Card) => `guardada:${card.id}`);
  const compose = vi.fn(async ({ photo, name }: { photo: string; name: string }) => `compuesta:${photo}:${name}`);
  return { store: createComposedCardStore({ readImage, compose, ...overrides }), readImage, compose };
};

describe('cartas compuestas para la pantalla (FEAT-29, US A4)', () => {
  it('la foto normal se compone con marco y la convertida con IA, sin él', async () => {
    const { store, compose } = newStore();

    expect(await store.get(photoCard)).toBe('compuesta:guardada:c1:El Gallo');
    await store.get(aiCard);

    expect(compose).toHaveBeenCalledWith({ photo: 'guardada:c1', name: 'El Gallo', framed: true });
    expect(compose).toHaveBeenCalledWith({ photo: 'guardada:c2', name: 'La Dama', framed: false });
  });

  it('cada carta se compone una vez y se reutiliza entre tableros', async () => {
    const { store, compose, readImage } = newStore();

    await Promise.all([store.get(photoCard), store.get({ ...photoCard }), store.get(photoCard)]);

    expect(readImage).toHaveBeenCalledTimes(1);
    expect(compose).toHaveBeenCalledTimes(1);
  });

  it('la carta ya compuesta se puede leer al instante; la que no, todavía no', async () => {
    const { store } = newStore();

    expect(store.peek(photoCard)).toBeNull();
    await store.get(photoCard);

    expect(store.peek(photoCard)).toBe('compuesta:guardada:c1:El Gallo');
  });

  it('si cambia el nombre o la foto de la carta, se vuelve a componer', async () => {
    const { store, compose } = newStore();

    await store.get(photoCard);
    await store.get({ ...photoCard, title: 'El Gallo Giro' });
    await store.get({ ...photoCard, image: 'https://storage/otra-foto' });
    await store.get({ ...photoCard, isAiGenerated: true });

    expect(compose).toHaveBeenCalledTimes(4);
  });

  it('si no hay copia guardada, se compone con la imagen que trae la carta', async () => {
    const { store, compose } = newStore({ readImage: async () => null });

    await store.get(photoCard);

    expect(compose).toHaveBeenCalledWith({ photo: 'https://storage/foto', name: 'El Gallo', framed: true });
  });

  it('una imagen que ya está en el navegador se compone tal cual, sin leer la copia guardada', async () => {
    const { store, compose, readImage } = newStore();

    await store.get(localCard);

    expect(compose).toHaveBeenCalledWith({ photo: 'blob:foto-local', name: 'El Sol', framed: true });
    expect(readImage).not.toHaveBeenCalled();
  });

  it('si la imagen del navegador ya no sirve, se usa la copia guardada', async () => {
    const compose = vi.fn(async ({ photo }: { photo: string }) => {
      if (photo.startsWith('blob:')) throw new Error('dirección caducada');
      return `compuesta:${photo}`;
    });
    const { store } = newStore({ compose });

    expect(await store.get(localCard)).toBe('compuesta:guardada:c4');
  });

  it('una carta que no se puede componer devuelve null, para mostrar la foto como hoy, y se puede reintentar', async () => {
    const compose = vi.fn()
      .mockRejectedValueOnce(new Error('no se pudo componer'))
      .mockResolvedValueOnce('compuesta');
    const { store } = newStore({ compose });

    expect(await store.get(photoCard)).toBeNull();
    expect(store.peek(photoCard)).toBeNull();
    expect(await store.get(photoCard)).toBe('compuesta');
  });

  it('una carta sin imagen no se compone', async () => {
    const { store, compose } = newStore({ readImage: async () => null });

    expect(await store.get({ id: 'c3', title: 'Sin foto' })).toBeNull();
    expect(compose).not.toHaveBeenCalled();
  });

  it('al vaciar, las cartas se vuelven a componer', async () => {
    const { store, compose } = newStore();

    await store.get(photoCard);
    store.clear();

    expect(store.peek(photoCard)).toBeNull();
    await store.get(photoCard);
    expect(compose).toHaveBeenCalledTimes(2);
  });
});
