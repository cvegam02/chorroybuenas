import { describe, expect, it } from 'vitest';
import { buildPayer, ITEM_CATEGORY, STATEMENT_DESCRIPTOR } from '../../supabase/functions/_shared/mpBuyer.ts';

// FEAT-64, US P2: datos que Mercado Pago pide para aprobar pagos con tarjeta.
describe('buildPayer', () => {
  it('en producción manda correo, nombre y apellido', () => {
    expect(buildPayer('production', { email: 'ana@correo.mx', fullName: 'Ana María López Pérez' }))
      .toEqual({ email: 'ana@correo.mx', first_name: 'Ana', last_name: 'María López Pérez' });
  });

  it('con un solo nombre no manda apellido', () => {
    expect(buildPayer('production', { email: 'ana@correo.mx', fullName: '  Ana  ' }))
      .toEqual({ email: 'ana@correo.mx', first_name: 'Ana' });
  });

  it('sin nombre en el perfil manda solo el correo', () => {
    expect(buildPayer('production', { email: 'ana@correo.mx', fullName: null })).toEqual({ email: 'ana@correo.mx' });
    expect(buildPayer('production', { email: 'ana@correo.mx', fullName: '   ' })).toEqual({ email: 'ana@correo.mx' });
  });

  it('en pruebas no manda comprador', () => {
    expect(buildPayer('sandbox', { email: 'ana@correo.mx', fullName: 'Ana López' })).toBeUndefined();
  });

  it('sin correo no manda comprador', () => {
    expect(buildPayer('production', { email: null, fullName: 'Ana López' })).toBeUndefined();
    expect(buildPayer('production', { email: '', fullName: 'Ana López' })).toBeUndefined();
  });

  it('nombre en el estado de cuenta y categoría del producto', () => {
    expect(STATEMENT_DESCRIPTOR).toBe('CHORROYBUENAS');
    expect(ITEM_CATEGORY).toBe('virtual_goods');
  });
});
