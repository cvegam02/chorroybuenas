import { describe, expect, it } from 'vitest';
import { promoCheckFromRpc } from '../../src/utils/promoCheck';

describe('promoCheckFromRpc (FEAT-58, decisión 3)', () => {
  it('un porcentaje mayor a 0 es un código válido', () => {
    expect(promoCheckFromRpc(20, null)).toEqual({ kind: 'valid', percent: 20 });
  });

  it('0 es un código sin bono', () => {
    expect(promoCheckFromRpc(0, null)).toEqual({ kind: 'invalid' });
  });

  it('RATE_LIMITED es el tope de intentos', () => {
    expect(promoCheckFromRpc(null, { message: 'RATE_LIMITED' })).toEqual({ kind: 'limited' });
  });

  it('cualquier otro error no se toma como intento fallido', () => {
    expect(promoCheckFromRpc(null, { message: 'network' })).toEqual({ kind: 'error' });
    expect(promoCheckFromRpc('x', null)).toEqual({ kind: 'error' });
  });
});
