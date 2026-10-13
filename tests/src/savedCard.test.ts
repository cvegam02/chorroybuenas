import { describe, expect, it, vi } from 'vitest';
import type { Card } from '../../src/types';

vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { createComposedCardStore } from '../../src/services/cardCompose/composedCards';
import { cardAfterSave } from '../../src/utils/savedCard';

// Carta de una cuenta, ya convertida con IA: su imagen es una dirección firmada y se reconoce por su ruta.
const aiCard: Card = {
  id: 'c1',
  title: 'La Dama',
  image: 'https://storage/c1_1.jpg?token=a',
  imagePath: 'u1/c1_1.jpg',
  isAiGenerated: true,
};

describe('la carta en pantalla tras guardarle cambios', () => {
  it('con una imagen nueva queda con su dirección y su ruta', () => {
    const saved = cardAfterSave(
      aiCard,
      { image: 'data:image/jpeg;base64,nueva', isAiGenerated: true, isProcessing: false },
      { imagePath: 'u1/c1_2.jpg', imageUrl: 'https://storage/c1_2.jpg?token=b' }
    );

    expect(saved).toMatchObject({
      image: 'https://storage/c1_2.jpg?token=b',
      imagePath: 'u1/c1_2.jpg',
      isProcessing: false,
    });
  });

  it('sin imagen nueva conserva la que tenía', () => {
    const saved = cardAfterSave(aiCard, { title: 'La Catrina' }, {});

    expect(saved).toEqual({ ...aiCard, title: 'La Catrina' });
  });

  it('a una carta con IA a la que se le hace otra versión se le compone la nueva, sin recargar', async () => {
    const compose = vi.fn(async ({ photo }: { photo: string }) => `compuesta:${photo}`);
    const store = createComposedCardStore({ readImage: async () => 'guardada', compose });

    await store.get(aiCard);
    const regenerated = cardAfterSave(
      aiCard,
      { image: 'data:image/jpeg;base64,nueva', isAiGenerated: true, isProcessing: false },
      { imagePath: 'u1/c1_2.jpg', imageUrl: 'https://storage/c1_2.jpg?token=b' }
    );
    await store.get(regenerated);

    expect(compose).toHaveBeenCalledTimes(2);
  });
});
