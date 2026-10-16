import { describe, expect, it } from 'vitest';
import {
  lastActivityLabel,
  paidLabel,
  providerLabel,
  purchasesLabel,
  seasonalLabel,
  signupDate,
  signupSalesPeriod,
  userDisplayName,
  userInitial,
  usersSummary,
} from '../../src/utils/adminUsers';

describe('userDisplayName', () => {
  it('usa el nombre, o el correo si la cuenta no tiene nombre', () => {
    expect(userDisplayName({ full_name: 'Ana López', email: 'ana@test.dev' })).toBe('Ana López');
    expect(userDisplayName({ full_name: null, email: 'beto@test.dev' })).toBe('beto@test.dev');
    expect(userDisplayName({ full_name: null, email: null })).toBe('Sin correo');
  });
});

describe('userInitial', () => {
  it('toma la primera letra del nombre o del correo, en mayúscula', () => {
    expect(userInitial({ full_name: 'ángel Ruiz', email: 'a@test.dev' })).toBe('Á');
    expect(userInitial({ full_name: null, email: 'beto@test.dev' })).toBe('B');
    expect(userInitial({ full_name: null, email: null })).toBe('?');
  });
});

describe('signupDate', () => {
  it('da la fecha de alta en Hermosillo', () => {
    // 2 de septiembre a las 23:00 en Hermosillo.
    expect(signupDate('2026-09-03T06:00:00Z')).toBe('2 sep 2026');
  });
});

describe('lastActivityLabel', () => {
  // 15 de octubre a las 12:00 en Hermosillo.
  const now = new Date('2026-10-15T19:00:00Z');

  it('dice «Hoy» u «Ayer» con la hora, según el día en Hermosillo', () => {
    expect(lastActivityLabel('2026-10-15T17:42:00Z', now)).toBe('Hoy, 10:42');
    // 14 de octubre a las 23:30 en Hermosillo, aunque en UTC ya es el 15.
    expect(lastActivityLabel('2026-10-15T06:30:00Z', now)).toBe('Ayer, 23:30');
  });

  it('antes de ayer da solo la fecha', () => {
    expect(lastActivityLabel('2026-10-09T18:00:00Z', now)).toBe('9 oct 2026');
  });
});

describe('paidLabel', () => {
  it('muestra pesos sin centavos cuando son cerrados', () => {
    expect(paidLabel(14000)).toBe('$140');
    expect(paidLabel(3550)).toBe('$35.50');
    expect(paidLabel(0)).toBe('$0');
  });
});

describe('usersSummary', () => {
  it('cuenta las cuentas y las nuevas del mes, en singular o plural', () => {
    expect(usersSummary(412, 86)).toBe('412 cuentas · 86 nuevas este mes');
    expect(usersSummary(1, 1)).toBe('1 cuenta · 1 nueva este mes');
    expect(usersSummary(1200, 0)).toBe('1,200 cuentas · 0 nuevas este mes');
  });
});

describe('providerLabel', () => {
  it('dice si entró con Google o con correo', () => {
    expect(providerLabel('google')).toBe('con Google');
    expect(providerLabel('email')).toBe('con correo');
  });

  it('otro proveedor se muestra tal cual, y sin dato no dice nada', () => {
    expect(providerLabel('apple')).toBe('con apple');
    expect(providerLabel(null)).toBeNull();
  });
});

describe('purchasesLabel', () => {
  it('cuenta las compras en singular o plural', () => {
    expect(purchasesLabel(4)).toBe('4 compras');
    expect(purchasesLabel(1)).toBe('1 compra');
    expect(purchasesLabel(0)).toBe('ninguna compra');
  });
});

describe('seasonalLabel', () => {
  it('cuenta las temáticas compradas en singular o plural', () => {
    expect(seasonalLabel(2)).toBe('2 temáticas compradas');
    expect(seasonalLabel(1)).toBe('1 temática comprada');
    expect(seasonalLabel(0)).toBe('ninguna temática');
  });
});

describe('signupSalesPeriod', () => {
  // 15 de octubre a las 12:00 en Hermosillo.
  const now = new Date('2026-10-15T19:00:00Z');

  it('va del día de alta en Hermosillo hasta hoy', () => {
    // 2 de septiembre a las 23:00 en Hermosillo, aunque en UTC ya es el 3.
    expect(signupSalesPeriod('2026-09-03T06:00:00Z', now)).toEqual({ from: '2026-09-02', to: '2026-10-15' });
  });

  it('una cuenta de hoy da solo el día de hoy', () => {
    expect(signupSalesPeriod('2026-10-15T15:00:00Z', now)).toEqual({ from: '2026-10-15', to: '2026-10-15' });
  });
});
