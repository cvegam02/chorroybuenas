import { describe, expect, it } from 'vitest';
import {
  AUTO_RHYTHMS,
  CALL_INTRO,
  DEFAULT_CUSTOM_RHYTHM,
  DEFAULT_RHYTHM,
  clampCustomRhythm,
  delayAfterCard,
  isManual,
  parseCustomRhythm,
  parseRhythm,
} from '../../src/utils/callerAuto';

describe('ritmos del modo automático (FEAT-55, US A5, decisión 16)', () => {
  it('son el tradicional, una carta cada 4, 6, 8 o 10 segundos, personalizado y manual; viene puesto el tradicional', () => {
    expect(AUTO_RHYTHMS).toEqual(['traditional', '4', '6', '8', '10', 'custom', 'manual']);
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

  it('manual se guarda y se reconoce: nada corre solo (FEAT-59, US A2)', () => {
    expect(parseRhythm('manual')).toBe('manual');
    expect(isManual('manual')).toBe(true);
    expect(isManual('traditional')).toBe(false);
    expect(isManual('4')).toBe(false);
  });

});

describe('ritmo personalizado (FEAT-59, US A3, decisión 3)', () => {
  const custom = { gapSeconds: 1, pauseEvery: 2, pauseSeconds: 5 };

  it('empieza en 3 s entre cartas, pausa cada 3 cartas y 5 s de pausa', () => {
    expect(DEFAULT_CUSTOM_RHYTHM).toEqual({ gapSeconds: 3, pauseEvery: 3, pauseSeconds: 5 });
    expect(parseRhythm('custom')).toBe('custom');
  });

  it('espera lo de «Entre cartas» y, cada tantas cartas, lo de la pausa', () => {
    expect([1, 2, 3, 4].map((drawn) => delayAfterCard('custom', drawn, custom))).toEqual([1000, 5000, 1000, 5000]);
  });

  it('con pausa «nunca» siempre espera lo de «Entre cartas»', () => {
    const never = { ...custom, pauseEvery: 0 };
    expect([1, 2, 3].map((drawn) => delayAfterCard('custom', drawn, never))).toEqual([1000, 1000, 1000]);
  });

  it('los valores fuera de los límites se quedan en el límite', () => {
    expect(clampCustomRhythm({ gapSeconds: 20, pauseEvery: 11, pauseSeconds: 25 })).toEqual({
      gapSeconds: 15,
      pauseEvery: 10,
      pauseSeconds: 20,
    });
    expect(clampCustomRhythm({ gapSeconds: 0, pauseEvery: 1, pauseSeconds: 0 })).toEqual({
      gapSeconds: 1,
      pauseEvery: 2,
      pauseSeconds: 1,
    });
    expect(clampCustomRhythm({ gapSeconds: 2.6, pauseEvery: 0, pauseSeconds: Number.NaN })).toEqual({
      gapSeconds: 3,
      pauseEvery: 0,
      pauseSeconds: 5,
    });
  });

  it('lo guardado en el navegador se lee con límites; si falta o está roto, el de inicio', () => {
    expect(parseCustomRhythm(null)).toEqual(DEFAULT_CUSTOM_RHYTHM);
    expect(parseCustomRhythm('{roto')).toEqual(DEFAULT_CUSTOM_RHYTHM);
    expect(parseCustomRhythm('{"gapSeconds":40,"pauseEvery":0,"pauseSeconds":2}')).toEqual({
      gapSeconds: 15,
      pauseEvery: 0,
      pauseSeconds: 2,
    });
    expect(parseCustomRhythm('{"gapSeconds":"x"}')).toEqual(DEFAULT_CUSTOM_RHYTHM);
  });
});
