import { describe, expect, it } from 'vitest';
import { computePromotionBonus } from '../../supabase/functions/_shared/promotions';
import {
  dateInputFromIso,
  previewPack,
  promoBonusTokens,
  promoPreviewText,
  promoStatus,
  promoValidity,
  validFromIso,
  validUntilIso,
} from '../../src/utils/adminPromotions';

const NOW = new Date('2026-10-15T18:00:00Z'); // 15 oct, 11:00 en Hermosillo

describe('promoBonusTokens', () => {
  it('calcula igual que el servidor: porcentaje sobre los tokens base, hacia abajo', () => {
    for (let base = 1; base <= 120; base++) {
      for (const percent of [1, 5, 10, 15, 20, 25, 33, 50, 99, 100]) {
        expect(promoBonusTokens(base, percent)).toBe(computePromotionBonus(base, percent));
      }
    }
  });
});

describe('promoPreviewText', () => {
  it('suma tokens del pack, regalo y promoción, como la maqueta', () => {
    expect(promoPreviewText({ base_tokens: 20, bonus_tokens: 5 }, 20)).toBe(
      'Con un Pack 20 tokens, el cliente recibiría 20 + 5 de regalo + 4 de la promoción = 29 tokens.',
    );
  });

  it('sin regalo del pack no lo menciona', () => {
    expect(promoPreviewText({ base_tokens: 10, bonus_tokens: 0 }, 15)).toBe(
      'Con un Pack 10 tokens, el cliente recibiría 10 + 1 de la promoción = 11 tokens.',
    );
  });

  it('avisa cuando el porcentaje no alcanza ni un token', () => {
    expect(promoPreviewText({ base_tokens: 5, bonus_tokens: 1 }, 10)).toBe(
      'Con un Pack 5 tokens, el 10% no alcanza ni un token: el cliente recibiría solo los 6 tokens del pack y la promoción no cuenta como usada.',
    );
  });

  it('sin packs, usa 20 tokens sueltos', () => {
    expect(promoPreviewText(null, 20)).toBe(
      'Con 20 tokens sueltos, el cliente recibiría 20 + 4 de la promoción = 24 tokens.',
    );
  });
});

describe('previewPack', () => {
  const pack = (id: string, base: number, active = true) => ({
    id, base_tokens: base, bonus_tokens: 0, price_cents: 0, sort_order: 0, is_active: active, created_at: '',
  });

  it('prefiere el pack activo de 20 tokens; si no, el primero activo; si no, ninguno', () => {
    expect(previewPack([pack('a', 10), pack('b', 20)])?.id).toBe('b');
    expect(previewPack([pack('a', 20, false), pack('b', 50), pack('c', 10)])?.id).toBe('b');
    expect(previewPack([pack('a', 20, false)])).toBeNull();
  });
});

describe('promoStatus', () => {
  const promo = (is_active: boolean, valid_from: string | null, valid_until: string | null) => ({
    is_active, valid_from, valid_until,
  });

  it('distingue activa, programada, vencida y apagada', () => {
    expect(promoStatus(promo(true, null, null), NOW)).toBe('active');
    expect(promoStatus(promo(true, '2026-10-01T07:00:00Z', '2026-10-31T06:59:59Z'), NOW)).toBe('active');
    expect(promoStatus(promo(true, '2026-10-20T07:00:00Z', null), NOW)).toBe('scheduled');
    expect(promoStatus(promo(true, null, '2026-08-31T06:59:59Z'), NOW)).toBe('expired');
    expect(promoStatus(promo(false, null, null), NOW)).toBe('off');
  });

  it('una vencida apagada se ve vencida, como la maqueta', () => {
    expect(promoStatus(promo(false, null, '2026-08-31T06:59:59Z'), NOW)).toBe('expired');
  });
});

describe('promoValidity', () => {
  it('muestra la vigencia en hora de Hermosillo', () => {
    expect(promoValidity(null, null, NOW)).toBe('Sin límite');
    expect(promoValidity(validFromIso('2026-10-20'), validUntilIso('2026-11-03'), NOW)).toBe('20 oct – 3 nov');
    expect(promoValidity(validFromIso('2026-10-20'), null, NOW)).toBe('Desde 20 oct');
    expect(promoValidity(null, validUntilIso('2026-08-31'), NOW)).toBe('Hasta 31 ago');
  });

  it('pone el año si no es el actual', () => {
    expect(promoValidity(validFromIso('2025-07-01'), validUntilIso('2025-08-31'), NOW)).toBe('1 jul 2025 – 31 ago 2025');
  });
});

describe('fechas del formulario', () => {
  it('«Desde» empieza el día y «Hasta» lo termina, en hora de Hermosillo', () => {
    expect(validFromIso('2026-10-20')).toBe('2026-10-20T00:00:00-07:00');
    expect(validUntilIso('2026-11-03')).toBe('2026-11-03T23:59:59-07:00');
    expect(validFromIso('')).toBeNull();
    expect(validUntilIso('')).toBeNull();
  });

  it('lee la fecha guardada como el día de Hermosillo', () => {
    expect(dateInputFromIso('2026-11-04T06:59:59+00:00')).toBe('2026-11-03');
    expect(dateInputFromIso('2026-10-20T07:00:00+00:00')).toBe('2026-10-20');
    expect(dateInputFromIso(null)).toBe('');
  });
});
