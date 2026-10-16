import { describe, expect, it } from 'vitest';
import { readSeasonalReturn } from '../../src/utils/seasonalPurchase';

const params = (query: string) => new URLSearchParams(query);

describe('readSeasonalReturn', () => {
  it('sin datos de regreso no hay aviso', () => {
    expect(readSeasonalReturn(params(''))).toBeNull();
  });

  it('pago aprobado: toma el identificador real, no el marcador sin sustituir', () => {
    expect(readSeasonalReturn(params('success=1&payment_id={payment_id}&payment_id=123456&status=approved')))
      .toEqual({ kind: 'approved', paymentId: '123456' });
  });

  it('pago aprobado sin identificador válido: se trata como en proceso', () => {
    expect(readSeasonalReturn(params('success=1&payment_id={payment_id}'))).toEqual({ kind: 'pending', paymentId: null });
  });

  it('pago pendiente', () => {
    expect(readSeasonalReturn(params('pending=1&payment_id={payment_id}&payment_id=123')))
      .toEqual({ kind: 'pending', paymentId: '123' });
  });

  it('pago cancelado', () => {
    expect(readSeasonalReturn(params('cancel=1'))).toEqual({ kind: 'cancel' });
  });
});
