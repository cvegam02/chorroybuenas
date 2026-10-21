import { describe, expect, it } from 'vitest';
import type { Card } from '../../src/types';
import {
  CARD_LABELS,
  DEFAULT_CARD_LABELS,
  cardLabelsOrDefault,
  labeledForCompose,
} from '../../src/utils/cardLabels';

const card: Card = { id: 'c1', title: 'El Gallo', number: 3, image: 'data:image/png;base64,AAA' };

describe('qué se ve en las cartas (FEAT-51)', () => {
  it('hay cuatro opciones y se empieza con nombre y número', () => {
    expect(CARD_LABELS).toEqual(['both', 'name', 'number', 'none']);
    expect(DEFAULT_CARD_LABELS).toBe('both');
  });

  it('un valor guardado desconocido o vacío vuelve a nombre y número', () => {
    expect(cardLabelsOrDefault('number')).toBe('number');
    expect(cardLabelsOrDefault('titulo')).toBe('both');
    expect(cardLabelsOrDefault(null)).toBe('both');
    expect(cardLabelsOrDefault(undefined)).toBe('both');
  });

  it('nombre y número deja la carta igual', () => {
    expect(labeledForCompose(card, 'both')).toEqual(card);
  });

  it('solo nombre quita el número', () => {
    expect(labeledForCompose(card, 'name')).toEqual({ ...card, number: undefined });
  });

  it('solo número quita el nombre', () => {
    expect(labeledForCompose(card, 'number')).toEqual({ ...card, title: '' });
  });

  it('nada quita los dos', () => {
    expect(labeledForCompose(card, 'none')).toEqual({ ...card, title: '', number: undefined });
  });

  it('no cambia la carta original', () => {
    labeledForCompose(card, 'none');
    expect(card).toEqual({ id: 'c1', title: 'El Gallo', number: 3, image: 'data:image/png;base64,AAA' });
  });
});
