import type { CheckoutMode } from './checkout.ts';

/** Nombre que ve el comprador en su estado de cuenta (FEAT-64, decisión 5). */
export const STATEMENT_DESCRIPTOR = 'CHORROYBUENAS';

/** Categoría de Mercado Pago para tokens y PDFs: bienes digitales. */
export const ITEM_CATEGORY = 'virtual_goods';

export interface Payer {
  email: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Comprador para la preferencia (FEAT-64, decisión 2): solo en producción, porque con credenciales de
 * prueba Mercado Pago rechaza el checkout si el correo es de una cuenta real. El correo sale de la sesión
 * y el nombre del perfil; sin nombre va solo el correo. El nombre se parte en el primer espacio.
 */
export function buildPayer(
  mode: CheckoutMode,
  buyer: { email: string | null | undefined; fullName: string | null | undefined },
): Payer | undefined {
  if (mode !== 'production' || !buyer.email) return undefined;
  const payer: Payer = { email: buyer.email };
  const name = (buyer.fullName ?? '').trim().replace(/\s+/g, ' ');
  if (name) {
    const space = name.indexOf(' ');
    if (space === -1) {
      payer.first_name = name;
    } else {
      payer.first_name = name.slice(0, space);
      payer.last_name = name.slice(space + 1);
    }
  }
  return payer;
}
