import { describe, expect, it } from 'vitest';
import { MAX_CUSTOM_TOKENS, MIN_CUSTOM_TOKENS } from '../../src/utils/purchaseRules';
import { clampCustomTokens, packSummary, promoBonusTokens, stepCustomTokens } from '../../src/utils/tokenPacks';
import { googleRedirectUrl } from '../../src/utils/authRedirect';

const PACK = { base_tokens: 10, bonus_tokens: 2, price_cents: 2000 };

describe('lo que muestran los paquetes y Comprar tokens (FEAT-33, US A2 y A4)', () => {
  describe('tokens de promoción', () => {
    it('son el porcentaje de los tokens que se pagan, redondeado hacia abajo, igual que antes del rediseño', () => {
      expect(promoBonusTokens(10, 50)).toBe(5);
      expect(promoBonusTokens(5, 30)).toBe(1);
      expect(promoBonusTokens(20, 25)).toBe(5);
    });

    it('sin promoción no hay tokens extra', () => {
      expect(promoBonusTokens(10, 0)).toBe(0);
    });
  });

  describe('paquete', () => {
    it('las fotos que alcanza un paquete son tokens + regalo', () => {
      const summary = packSummary(PACK, 0);
      expect(summary.totalTokens).toBe(12);
      expect(summary.promoBonus).toBe(0);
    });

    it('con promoción, las fotos suman también los tokens de promoción', () => {
      const summary = packSummary(PACK, 50);
      expect(summary.promoBonus).toBe(5);
      expect(summary.totalTokens).toBe(17);
    });

    it('la promoción no cambia el precio del paquete', () => {
      expect(packSummary(PACK, 50).price).toBe('$20');
      expect(packSummary(PACK, 0).price).toBe('$20');
    });

    it('el precio por foto es el precio entre las fotos que alcanza', () => {
      expect(packSummary(PACK, 0).pricePerPhoto).toBe('$1.67');
      expect(packSummary(PACK, 50).pricePerPhoto).toBe('$1.18');
    });
  });

  describe('otra cantidad', () => {
    it('no baja del mínimo ni pasa del máximo de compra', () => {
      expect(clampCustomTokens(1)).toBe(MIN_CUSTOM_TOKENS);
      expect(clampCustomTokens(9999)).toBe(MAX_CUSTOM_TOKENS);
      expect(clampCustomTokens(15)).toBe(15);
    });

    it('los botones − y + suben y bajan de uno en uno, sin salirse de los límites', () => {
      expect(stepCustomTokens(15, 1)).toBe(16);
      expect(stepCustomTokens(15, -1)).toBe(14);
      expect(stepCustomTokens(MIN_CUSTOM_TOKENS, -1)).toBe(MIN_CUSTOM_TOKENS);
      expect(stepCustomTokens(MAX_CUSTOM_TOKENS, 1)).toBe(MAX_CUSTOM_TOKENS);
    });
  });

  describe('a dónde regresa Google', () => {
    const ORIGIN = 'https://chorroybuenas.com.mx';

    it('sin indicarlo, a Mi cuenta, como siempre', () => {
      expect(googleRedirectUrl(ORIGIN)).toBe(`${ORIGIN}/dashboard`);
    });

    it('desde Comprar tokens, de vuelta a Comprar tokens', () => {
      expect(googleRedirectUrl(ORIGIN, '/comprar-tokens')).toBe(`${ORIGIN}/comprar-tokens`);
    });

    it('nunca a otro sitio: una dirección que no es del sitio se cambia por Mi cuenta', () => {
      expect(googleRedirectUrl(ORIGIN, 'https://otro.com')).toBe(`${ORIGIN}/dashboard`);
      expect(googleRedirectUrl(ORIGIN, '//otro.com')).toBe(`${ORIGIN}/dashboard`);
    });
  });
});
