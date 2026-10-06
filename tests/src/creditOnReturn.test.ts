import { describe, expect, it } from 'vitest';
import { interpretCreditResponse, isPaymentId, readReturnedPaymentId } from '../../src/services/creditOnReturn';

// contexto-negocio §8: un pago aprobado acredita una sola vez; la página solo muestra
// "acreditado" cuando el servidor lo confirma.
describe('interpretCreditResponse', () => {
  it('acreditado solo si el servidor responde 200 con credited: true', () => {
    expect(interpretCreditResponse(200, { credited: true, new_balance: 81 })).toBe('credited');
  });

  it('pago ya acreditado antes por el aviso de Mercado Pago: también cuenta como acreditado', () => {
    expect(interpretCreditResponse(200, { credited: true, new_balance: 81 })).toBe('credited');
  });

  it.each([
    ['pago aún no aprobado', 200, { credited: false, reason: 'not_approved', status: 'in_process' }],
    ['pago no encontrado todavía', 200, { credited: false, reason: 'payment_not_found' }],
    ['metadata inválida', 200, { credited: false, reason: 'invalid_metadata' }],
    ['pago de otra cuenta', 403, { error: 'FORBIDDEN' }],
    ['sesión vencida', 401, { error: 'NOT_LOGGED_IN' }],
    ['payment_id inválido', 400, { error: 'INVALID_REQUEST' }],
    ['error del servidor', 500, { error: 'INTERNAL' }],
    ['respuesta vacía', 200, null],
    ['respuesta que no es objeto', 200, 'ok'],
    ['credited con un valor que no es true', 200, { credited: 'true' }],
    ['un 500 que dice credited: true no se cree', 500, { credited: true }],
  ])('%s: se trata como "en proceso", nunca como acreditado', (_name, status, body) => {
    expect(interpretCreditResponse(status, body)).toBe('processing');
  });
});

describe('isPaymentId', () => {
  it('acepta identificadores numéricos de Mercado Pago', () => {
    expect(isPaymentId('181777135707')).toBe(true);
  });

  it.each([null, '', 'abc', '12 34', '1/../x', '{payment_id}', '1'.repeat(21)])('rechaza %j', (value) => {
    expect(isPaymentId(value)).toBe(false);
  });
});

// Al volver, la dirección trae primero nuestro marcador sin sustituir, payment_id={payment_id},
// y después los datos reales que agrega Mercado Pago.
describe('readReturnedPaymentId', () => {
  const read = (query: string) => readReturnedPaymentId(new URLSearchParams(query));

  it('toma el identificador real aunque antes venga el marcador sin sustituir', () => {
    expect(read('success=1&payment_id=%7Bpayment_id%7D&collection_id=181780493347&collection_status=approved&payment_id=181780493347&status=approved'))
      .toBe('181780493347');
  });

  it('usa collection_id si ningún payment_id es válido', () => {
    expect(read('success=1&payment_id={payment_id}&collection_id=181780493347')).toBe('181780493347');
  });

  it('acepta una dirección con un solo payment_id numérico', () => {
    expect(read('success=1&payment_id=42')).toBe('42');
  });

  it.each([
    ['solo el marcador sin sustituir', 'success=1&payment_id=%7Bpayment_id%7D'],
    ['sin identificador', 'success=1'],
    ['identificadores que no son números', 'success=1&payment_id=abc&collection_id=null'],
  ])('devuelve null: %s', (_name, query) => {
    expect(read(query)).toBe(null);
  });
});
