import type { PreferenceMetadata } from './credit.ts';
import { computePromotionBonus, type SelectedPromotion } from './promotions.ts';
import { fail, type ParseResult } from './validation.ts';

const DEFAULT_PRICE_PER_TOKEN_CENTS = 200;

export interface PackRow {
  id: string;
  base_tokens: number;
  bonus_tokens: number;
  price_cents: number;
}

/** Lo que se compra: tokens base, bono del pack y monto en centavos. */
export interface PurchaseItem {
  packId: string | null;
  baseTokens: number;
  bonusTokens: number;
  amountCents: number;
}

const isPositiveInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1;

/** Tokens y monto de la compra a partir del pack o de la cantidad libre. El precio nunca viene del cliente. */
export function resolvePurchaseItem(input: {
  pack: PackRow | null;
  customTokens: number | null;
  pricePerTokenCents: number | null;
}): ParseResult<PurchaseItem> {
  let item: PurchaseItem;
  if (input.pack) {
    item = {
      packId: input.pack.id,
      baseTokens: input.pack.base_tokens,
      bonusTokens: input.pack.bonus_tokens,
      amountCents: input.pack.price_cents,
    };
  } else if (input.customTokens !== null) {
    const price = input.pricePerTokenCents ?? DEFAULT_PRICE_PER_TOKEN_CENTS;
    item = { packId: null, baseTokens: input.customTokens, bonusTokens: 0, amountCents: input.customTokens * price };
  } else {
    return fail('Debes proporcionar pack_id o custom_tokens.');
  }

  if (!isPositiveInt(item.baseTokens)) return fail('La cantidad de tokens es inválida.');
  if (!isPositiveInt(item.amountCents)) return fail('El monto de la compra debe ser mayor a cero.');
  return { ok: true, value: item };
}

/** Cuerpo de POST /checkout/preferences de Mercado Pago, con la metadata que se usará al acreditar. */
export function buildPreference(input: {
  item: PurchaseItem;
  promotion: SelectedPromotion | null;
  userId: string;
  appUrl: string;
  notificationUrl: string;
}) {
  const { item, userId, appUrl } = input;
  const promotionBonus = input.promotion ? computePromotionBonus(item.baseTokens, input.promotion.percent) : 0;
  // Una promoción cuyo bono redondea a 0 no cuenta como usada.
  const appliedPromotion = promotionBonus > 0 ? input.promotion : null;
  const totalTokens = item.baseTokens + item.bonusTokens + promotionBonus;

  const metadata: PreferenceMetadata = {
    user_id: userId,
    pack_id: item.packId,
    base_tokens: item.baseTokens,
    bonus_tokens: item.bonusTokens,
    promotion_bonus: promotionBonus,
    total_tokens: totalTokens,
    amount_cents: item.amountCents,
    promotion_id: appliedPromotion?.id ?? null,
    promotion_type: appliedPromotion?.type ?? null,
  };

  return {
    items: [
      {
        title: `Tokens de IA - ${totalTokens} tokens`,
        description:
          `Pack de ${item.baseTokens} tokens` +
          (item.bonusTokens > 0 ? ` + ${item.bonusTokens} de regalo` : '') +
          (promotionBonus > 0 ? ` + ${promotionBonus} de promoción` : ''),
        quantity: 1,
        unit_price: item.amountCents / 100, // MP espera pesos, no centavos
        currency_id: 'MXN',
      },
    ],
    // No se envía payer: con credenciales de prueba MP rechaza el checkout si el correo es de una
    // cuenta real, y en producción el comprador se identifica en el propio checkout.
    back_urls: {
      success: `${appUrl}/comprar-tokens?success=1&payment_id={payment_id}`,
      failure: `${appUrl}/comprar-tokens?cancel=1`,
      pending: `${appUrl}/comprar-tokens?pending=1&payment_id={payment_id}`,
    },
    auto_return: 'approved',
    external_reference: userId,
    notification_url: input.notificationUrl,
    metadata,
  };
}
