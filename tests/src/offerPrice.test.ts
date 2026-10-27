import { describe, expect, it } from 'vitest';
import { applyOfferDiscount } from '../../supabase/functions/_shared/offers';
import { resolvePurchaseItem } from '../../supabase/functions/_shared/preference';
import { customOfferPriceCents, offerChangeNotice, offerDiscountCents, formatMxn } from '../../src/utils/offerPrice';
import { packSummary } from '../../src/utils/tokenPacks';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';

describe('precio con oferta en Comprar tokens (FEAT-49, US A3)', () => {
  it('el descuento es el mismo que cobra el servidor', () => {
    for (let cents = 1; cents <= 12000; cents += 13) {
      for (const percent of [1, 10, 25, 33, 50, 99]) {
        expect(offerDiscountCents(cents, percent)).toBe(applyOfferDiscount(cents, percent));
      }
    }
  });

  it('la cantidad libre cuesta lo mismo que cobra el servidor', () => {
    for (const price of [150, 199, 200, 250]) {
      for (let tokens = 5; tokens <= 500; tokens += 7) {
        const server = resolvePurchaseItem({ pack: null, customTokens: tokens, pricePerTokenCents: price, offer: { id: 'o', percent: 25 } });
        const client = customOfferPriceCents(tokens, price, 25);
        // Por debajo de $10 el servidor no cobra (FEAT-58, decisión 2); la página no deja elegir esa cantidad
        if (client < 1000) expect(server.ok).toBe(false);
        else expect(client).toBe(server.ok ? server.value.amountCents : NaN);
      }
    }
  });

  it('sin oferta, la cantidad libre cuesta tokens × precio', () => {
    expect(customOfferPriceCents(15, 200, null)).toBe(3000);
  });

  it('con 25%: 15 tokens a $1.50 = $22.50', () => {
    expect(customOfferPriceCents(15, 200, 25)).toBe(2250);
  });

  it('escribe pesos con centavos solo si los hay', () => {
    expect(formatMxn(4000)).toBe('$40 MXN');
    expect(formatMxn(150)).toBe('$1.50 MXN');
    expect(formatMxn(2250)).toBe('$22.50 MXN');
    expect(formatMxn(150000)).toBe('$1,500 MXN');
  });
});

describe('tarjeta de pack con oferta', () => {
  const pack20 = { base_tokens: 20, bonus_tokens: 5, price_cents: 4000 };

  it('precio normal tachado y precio con descuento', () => {
    const summary = packSummary(pack20, 0, 25);
    expect(summary.listPrice).toBe('$40');
    expect(summary.price).toBe('$30');
    expect(summary.priceCents).toBe(3000);
  });

  it('el precio por foto usa el precio con descuento', () => {
    expect(packSummary(pack20, 0, 25).pricePerPhoto).toBe('$1.20');
  });

  it('oferta y promoción se suman: menos precio y más tokens', () => {
    const summary = packSummary(pack20, 20, 25);
    expect(summary.price).toBe('$30');
    expect(summary.totalTokens).toBe(29);
  });

  it('sin oferta no hay precio tachado', () => {
    const summary = packSummary(pack20);
    expect(summary.listPrice).toBe(null);
    expect(summary.price).toBe('$40');
    expect(summary.priceCents).toBe(4000);
  });
});

describe('textos de la oferta', () => {
  it('existen en español y en inglés', () => {
    for (const locale of [es, en]) {
      expect(locale.tokenPacks.was).toBeTruthy();
      expect(locale.tokenPacks.offerTag).toBe('−{{percent}}%');
      expect(locale.buyTokens.offerEnded).toBeTruthy();
      expect(locale.buyTokens.offerChanged).toBeTruthy();
    }
  });
});

describe('pantalla abierta cuando cambia la oferta (decisión 18)', () => {
  it('la misma oferta: se sigue al pago', () => {
    expect(offerChangeNotice(25, 25)).toBe(null);
    expect(offerChangeNotice(null, null)).toBe(null);
  });

  it('la oferta terminó', () => {
    expect(offerChangeNotice(25, null)).toBe('ended');
  });

  it('empezó una oferta o cambió el descuento', () => {
    expect(offerChangeNotice(null, 10)).toBe('changed');
    expect(offerChangeNotice(25, 10)).toBe('changed');
  });

  it('si no se pudo revisar, se sigue al pago: el servidor pone el precio', () => {
    expect(offerChangeNotice(25, undefined)).toBe(null);
  });
});
