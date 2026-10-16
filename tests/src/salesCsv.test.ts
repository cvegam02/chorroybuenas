import { describe, expect, it } from 'vitest';
import type { AdminSaleRow } from '../../src/repositories/AdminRepository';
import { salesCsv, salesCsvFileName } from '../../src/utils/salesCsv';

const tokens: AdminSaleRow = {
  id: 'a1',
  user_id: 'u1',
  kind: 'tokens',
  loteria_name: null,
  pack_id: 'p1',
  base_tokens: 20,
  bonus_tokens: 5,
  total_tokens: 25,
  amount_cents: 3500,
  payment_id: '131948220517',
  payment_status: 'approved',
  created_at: '2026-10-16T06:00:00Z',
  email: 'ana@test.dev',
  full_name: 'Ana López',
};

const seasonal: AdminSaleRow = {
  ...tokens,
  id: 'b2',
  kind: 'seasonal',
  loteria_name: 'Muertos, "edición" especial',
  pack_id: null,
  base_tokens: null,
  bonus_tokens: null,
  total_tokens: null,
  amount_cents: 4900,
  payment_status: 'pending',
  user_id: null,
  email: null,
  full_name: null,
};

const lines = (csv: string) => csv.replace(/^\uFEFF/, '').split('\r\n');

describe('salesCsv', () => {
  it('empieza con la marca UTF-8 para que Excel lea los acentos', () => {
    expect(salesCsv([]).startsWith('\uFEFF')).toBe(true);
  });

  it('trae el encabezado en español', () => {
    expect(lines(salesCsv([]))[0]).toBe(
      'Fecha,Hora,Cliente,Correo,Tipo,Qué compró,Tokens entregados,Monto (MXN),Estado,Payment ID,ID de la compra',
    );
  });

  it('una compra de tokens, con fecha y hora de Hermosillo', () => {
    expect(lines(salesCsv([tokens]))[1]).toBe(
      '2026-10-15,23:00,Ana López,ana@test.dev,Tokens,Pack de 20 tokens,25,35.00,Aprobada,131948220517,a1',
    );
  });

  it('entrecomilla lo que trae comas o comillas, y una cuenta borrada queda sin cliente', () => {
    expect(lines(salesCsv([seasonal]))[1]).toBe(
      '2026-10-15,23:00,Cuenta borrada,,Temática,"Muertos, ""edición"" especial",,49.00,Pendiente,131948220517,b2',
    );
  });

  it('un texto que empieza como fórmula no se ejecuta en la hoja de cálculo', () => {
    const row = lines(salesCsv([{ ...tokens, full_name: '=HYPERLINK("x")' }]))[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('un renglón por venta', () => {
    expect(lines(salesCsv([tokens, seasonal]))).toHaveLength(3);
  });
});

describe('salesCsvFileName', () => {
  it('nombra el archivo con el periodo', () => {
    expect(salesCsvFileName({ from: '2026-10-01', to: '2026-10-15' })).toBe('ventas-2026-10-01-a-2026-10-15.csv');
  });

  it('un solo día no repite la fecha', () => {
    expect(salesCsvFileName({ from: '2026-10-15', to: '2026-10-15' })).toBe('ventas-2026-10-15.csv');
  });
});
