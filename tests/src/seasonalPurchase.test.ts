import { describe, expect, it } from 'vitest';
import { readSeasonalReturn, summarizeSales } from '../../src/utils/seasonalPurchase';

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

describe('summarizeSales', () => {
  it('cuenta como venta solo las compras aprobadas, pero recuerda si hay algún pago registrado', () => {
    const sales = summarizeSales([
      { loteria_id: 'a', status: 'approved' },
      { loteria_id: 'a', status: 'approved' },
      { loteria_id: 'a', status: 'repeated' },
      { loteria_id: 'b', status: 'repeated' },
    ]);
    expect(sales.get('a')).toEqual({ approved: 2, total: 3 });
    expect(sales.get('b')).toEqual({ approved: 0, total: 1 });
    expect(sales.get('c')).toBeUndefined();
  });
});
