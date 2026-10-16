import { describe, expect, it } from 'vitest';
import {
  pageRange,
  pendingSalesPeriod,
  saleDateTime,
  saleItemLabel,
  saleOfferLabel,
  saleReceived,
  saleStatus,
} from '../../src/utils/adminSales';

describe('saleItemLabel', () => {
  it('nombra el pack por sus tokens base', () => {
    expect(saleItemLabel({ kind: 'tokens', pack_id: 'p1', base_tokens: 20, loteria_name: null })).toBe('Pack de 20 tokens');
  });

  it('una compra sin pack dice solo cuántos tokens', () => {
    expect(saleItemLabel({ kind: 'tokens', pack_id: null, base_tokens: 15, loteria_name: null })).toBe('15 tokens');
  });

  it('una temática dice el nombre de la lotería', () => {
    expect(saleItemLabel({ kind: 'seasonal', pack_id: null, base_tokens: null, loteria_name: 'Muertos' })).toBe('Muertos');
  });
});

describe('saleStatus', () => {
  it('traduce aprobada y pendiente', () => {
    expect(saleStatus('approved')).toEqual({ label: 'Aprobada', tone: 'approved' });
    expect(saleStatus('pending')).toEqual({ label: 'Pendiente', tone: 'pending' });
  });

  it('traduce rechazada y devuelta por si llegan a guardarse', () => {
    expect(saleStatus('rejected')).toEqual({ label: 'Rechazada', tone: 'rejected' });
    expect(saleStatus('refunded')).toEqual({ label: 'Devuelta', tone: 'refunded' });
  });

  it('un estado desconocido se muestra tal cual', () => {
    expect(saleStatus('in_mediation')).toEqual({ label: 'in_mediation', tone: 'other' });
    expect(saleStatus(null)).toEqual({ label: '—', tone: 'other' });
  });
});

describe('saleDateTime', () => {
  it('da la fecha y la hora en Hermosillo', () => {
    expect(saleDateTime('2026-10-05T18:00:00Z')).toEqual({ date: '5 oct 2026', time: '11:00' });
  });

  it('una compra a las 11 de la noche de Hermosillo queda en ese día', () => {
    expect(saleDateTime('2026-10-16T06:00:00Z')).toEqual({ date: '15 oct 2026', time: '23:00' });
  });
});

describe('pageRange', () => {
  it('dice qué renglones se ven', () => {
    expect(pageRange(0, 20, 65)).toBe('Mostrando 1–20 de 65');
    expect(pageRange(3, 20, 65)).toBe('Mostrando 61–65 de 65');
  });

  it('sin ventas no inventa un rango', () => {
    expect(pageRange(0, 20, 0)).toBe('Sin ventas');
  });
});

describe('saleReceived', () => {
  const tokens = { kind: 'tokens' as const, base_tokens: 20, bonus_tokens: 5, total_tokens: 25 };
  const seasonal = { kind: 'seasonal' as const, base_tokens: null, bonus_tokens: null, total_tokens: null };

  it('separa los tokens base y los de regalo', () => {
    expect(saleReceived({ ...tokens, payment_status: 'approved' })).toBe('25 tokens (20 + 5 de regalo)');
  });

  it('sin regalo dice solo cuántos tokens', () => {
    expect(
      saleReceived({ kind: 'tokens', base_tokens: 10, bonus_tokens: 0, total_tokens: 10, payment_status: 'approved' }),
    ).toBe('10 tokens');
  });

  it('una temática aprobada da acceso a la lotería y su PDF', () => {
    expect(saleReceived({ ...seasonal, payment_status: 'approved' })).toBe('Acceso a la lotería y su PDF');
  });

  it('una pendiente todavía no ha recibido nada', () => {
    expect(saleReceived({ ...seasonal, payment_status: 'pending' })).toBe('Nada todavía: se entrega al confirmarse el pago');
  });

  it('otro estado no supone una entrega', () => {
    expect(saleReceived({ ...tokens, payment_status: 'refunded' })).toBe('—');
  });
});

describe('pendingSalesPeriod', () => {
  const now = new Date('2026-10-15T20:00:00Z');

  it('va del día del pago pendiente más viejo, en Hermosillo, a hoy', () => {
    // 19 de septiembre a las 23:00 en Hermosillo.
    expect(pendingSalesPeriod('2026-09-20T06:00:00Z', now)).toEqual({ from: '2026-09-19', to: '2026-10-15' });
  });

  it('un pendiente de hoy da solo el día de hoy', () => {
    expect(pendingSalesPeriod('2026-10-15T15:00:00Z', now)).toEqual({ from: '2026-10-15', to: '2026-10-15' });
  });

  it('sin fecha del más viejo, el mes en curso', () => {
    expect(pendingSalesPeriod(null, now)).toEqual({ from: '2026-10-01', to: '2026-10-15' });
  });
});

describe('saleOfferLabel', () => {
  it('nombra la oferta con su descuento (FEAT-49, decisión 16)', () => {
    expect(saleOfferLabel({ offer_name: 'Buen Fin 2026', offer_percent: 25 })).toBe('Buen Fin 2026 −25%');
  });

  it('sin oferta, nada', () => {
    expect(saleOfferLabel({ offer_name: null, offer_percent: null })).toBe(null);
  });

  it('si la oferta ya no tiene nombre, solo el descuento', () => {
    expect(saleOfferLabel({ offer_name: null, offer_percent: 25 })).toBe('Oferta −25%');
  });
});
