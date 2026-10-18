import { describe, expect, it } from 'vitest';
import { AI_CARD_FILTERS, aiCardStatus, filterAiCards, countAiCardFilters, neighborCardId } from '../../src/utils/aiCardView';

const card = (id: string, { chosen = null as string | null, scene = 'una escena' } = {}) => ({ id, chosenAttemptId: chosen, scene });

const none = new Set<string>();
const noErrors = new Map<string, string>();

describe('estado de cada carta en la cuadrícula (FEAT-50, US A6)', () => {
  it('sin intento elegido está sin generar; con intento, lista', () => {
    expect(aiCardStatus(card('a'), none, noErrors)).toBe('pending');
    expect(aiCardStatus(card('a', { chosen: 'x' }), none, noErrors)).toBe('ready');
  });

  it('generando manda sobre todo lo demás, y un error manda sobre lista', () => {
    const errors = new Map([['a', 'Replicate tardó demasiado.']]);
    expect(aiCardStatus(card('a', { chosen: 'x' }), new Set(['a']), errors)).toBe('generating');
    expect(aiCardStatus(card('a', { chosen: 'x' }), none, errors)).toBe('error');
  });
});

describe('filtros de la cuadrícula (FEAT-50, US A6)', () => {
  const cards = [
    card('lista', { chosen: 'x' }),
    card('sin-escena', { scene: '   ' }),
    card('pendiente'),
    card('generando'),
    card('falla'),
  ];
  const generating = new Set(['generando']);
  const errors = new Map([['falla', 'Error']]);
  const ids = (filter: (typeof AI_CARD_FILTERS)[number]) => filterAiCards(cards, filter, generating, errors).map((c) => c.id);

  it('cada filtro deja solo sus cartas, en el orden de la lista', () => {
    expect(ids('all')).toEqual(['lista', 'sin-escena', 'pendiente', 'generando', 'falla']);
    expect(ids('noScene')).toEqual(['sin-escena']);
    expect(ids('pending')).toEqual(['sin-escena', 'pendiente', 'generando']);
    expect(ids('ready')).toEqual(['lista']);
    expect(ids('error')).toEqual(['falla']);
  });

  it('cuenta las cartas de cada filtro', () => {
    expect(countAiCardFilters(cards, generating, errors)).toEqual({ all: 5, noScene: 1, pending: 3, ready: 1, error: 1 });
  });
});

describe('pasar de carta con las flechas (FEAT-50, US A6)', () => {
  const shown = [card('a'), card('b'), card('c')];

  it('da la carta de al lado dentro de lo que se ve', () => {
    expect(neighborCardId(shown, 'b', 1)).toBe('c');
    expect(neighborCardId(shown, 'b', -1)).toBe('a');
  });

  it('en las orillas, o si la carta ya no se ve, no hay a dónde ir', () => {
    expect(neighborCardId(shown, 'c', 1)).toBeNull();
    expect(neighborCardId(shown, 'a', -1)).toBeNull();
    expect(neighborCardId(shown, 'z', 1)).toBeNull();
  });
});
