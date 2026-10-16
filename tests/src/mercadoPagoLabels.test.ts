import { describe, expect, it } from 'vitest';
import { paymentMethodLabel, paymentResultLabel } from '../../src/utils/mercadoPagoLabels';

describe('paymentMethodLabel', () => {
  it('tarjetas con su marca', () => {
    expect(paymentMethodLabel('debit_card', 'debvisa')).toBe('Tarjeta de débito · Visa');
    expect(paymentMethodLabel('credit_card', 'master')).toBe('Tarjeta de crédito · Mastercard');
    expect(paymentMethodLabel('credit_card', 'amex')).toBe('Tarjeta de crédito · American Express');
  });

  it('efectivo con la tienda', () => {
    expect(paymentMethodLabel('ticket', 'oxxo')).toBe('Efectivo · OXXO');
  });

  it('transferencia SPEI', () => {
    expect(paymentMethodLabel('bank_transfer', 'clabe')).toBe('Transferencia SPEI');
  });

  it('saldo de Mercado Pago, sin marca', () => {
    expect(paymentMethodLabel('account_money', 'account_money')).toBe('Dinero en Mercado Pago');
  });

  it('una marca desconocida se muestra tal cual', () => {
    expect(paymentMethodLabel('credit_card', 'nuevamarca')).toBe('Tarjeta de crédito · nuevamarca');
  });

  it('un tipo desconocido se muestra tal cual', () => {
    expect(paymentMethodLabel('crypto', 'btc')).toBe('crypto · btc');
  });

  it('sin datos no inventa', () => {
    expect(paymentMethodLabel(null, null)).toBeNull();
  });
});

describe('paymentResultLabel', () => {
  it('traduce el resultado', () => {
    expect(paymentResultLabel('accredited')).toBe('Acreditado');
    expect(paymentResultLabel('pending_waiting_payment')).toBe('Esperando el pago');
    expect(paymentResultLabel('cc_rejected_insufficient_amount')).toBe('Rechazado por fondos insuficientes');
    expect(paymentResultLabel('refunded')).toBe('Devuelto al cliente');
  });

  it('un resultado desconocido se muestra tal cual', () => {
    expect(paymentResultLabel('algo_nuevo')).toBe('algo_nuevo');
  });

  it('sin datos no inventa', () => {
    expect(paymentResultLabel(null)).toBeNull();
  });
});
