import { describe, expect, it } from 'vitest';
import { AUTO_RHYTHMS, CALL_INTRO, DEFAULT_RHYTHM, delayAfterCard, parseRhythm } from '../../src/utils/callerAuto';

describe('ritmos del modo automático (FEAT-55, US A5, decisión 16)', () => {
  it('son el tradicional y una carta cada 4, 6, 8 o 10 segundos; viene puesto el tradicional', () => {
    expect(AUTO_RHYTHMS).toEqual(['traditional', '4', '6', '8', '10']);
    expect(DEFAULT_RHYTHM).toBe('traditional');
  });

  it('tradicional: 1.5 s entre cartas y 3 s después de cada tercera', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((drawn) => delayAfterCard('traditional', drawn))).toEqual([
      1500, 1500, 3000, 1500, 1500, 3000, 1500,
    ]);
  });

  it('la partida empieza con «Se va y se corre con…»', () => {
    expect(CALL_INTRO).toBe('Se va y se corre con…');
  });

  it('parejo: siempre el mismo tiempo', () => {
    expect(delayAfterCard('4', 3)).toBe(4000);
    expect(delayAfterCard('10', 1)).toBe(10000);
  });

  it('un ritmo guardado desconocido vuelve al tradicional', () => {
    expect(parseRhythm('6')).toBe('6');
    expect(parseRhythm('7')).toBe('traditional');
    expect(parseRhythm(null)).toBe('traditional');
  });
});
