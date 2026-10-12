import { describe, expect, it } from 'vitest';
import { TRADITIONAL_DECK } from '../../src/utils/traditionalDeck';

describe('las 54 cartas de la lotería tradicional (FEAT-33, US A6)', () => {
  it('son 54 nombres distintos', () => {
    expect(TRADITIONAL_DECK).toHaveLength(54);
    expect(new Set(TRADITIONAL_DECK).size).toBe(54);
  });

  it('van en el orden de la baraja', () => {
    expect(TRADITIONAL_DECK[0]).toBe('El Gallo');
    expect(TRADITIONAL_DECK[1]).toBe('El Diablito');
    expect(TRADITIONAL_DECK[5]).toBe('La Sirena');
    expect(TRADITIONAL_DECK[53]).toBe('La Rana');
  });

  it('conserva todos los nombres originales, como decidió Carlos', () => {
    expect(TRADITIONAL_DECK[25]).toBe('El Negrito');
    expect(TRADITIONAL_DECK[37]).toBe('El Apache');
  });
});
