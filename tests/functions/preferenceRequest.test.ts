import { describe, expect, it } from 'vitest';
import { parsePreferenceRequest } from '../../supabase/functions/_shared/validation.ts';

const PACK = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('parsePreferenceRequest', () => {
  it('acepta un pack_id uuid', () => {
    expect(parsePreferenceRequest({ pack_id: PACK })).toEqual({
      ok: true,
      value: { packId: PACK, customTokens: null, promoCode: null, appUrl: null },
    });
  });

  it('acepta custom_tokens entero y normaliza el código', () => {
    const r = parsePreferenceRequest({ custom_tokens: 25, promo_code: '  verano2026 ', app_url: 'https://x.dev' });
    expect(r).toEqual({
      ok: true,
      value: { packId: null, customTokens: 25, promoCode: 'VERANO2026', appUrl: 'https://x.dev' },
    });
  });

  it('acepta los límites 1 y 500', () => {
    expect(parsePreferenceRequest({ custom_tokens: 1 }).ok).toBe(true);
    expect(parsePreferenceRequest({ custom_tokens: 500 }).ok).toBe(true);
  });

  it('trata null como ausente', () => {
    expect(parsePreferenceRequest({ pack_id: PACK, custom_tokens: null, promo_code: null }).ok).toBe(true);
  });

  it.each([
    ['no es objeto', 'hola'],
    ['null', null],
    ['sin pack ni tokens', {}],
    ['ambos a la vez', { pack_id: PACK, custom_tokens: 5 }],
    ['pack_id no uuid', { pack_id: 'abc' }],
    ['pack_id numérico', { pack_id: 123 }],
    ['tokens fraccionarios', { custom_tokens: 1.5 }],
    ['tokens como string', { custom_tokens: '5' }],
    ['tokens NaN', { custom_tokens: Number.NaN }],
    ['tokens infinitos', { custom_tokens: Number.POSITIVE_INFINITY }],
    ['tokens en 0', { custom_tokens: 0 }],
    ['tokens negativos', { custom_tokens: -5 }],
    ['tokens sobre el máximo', { custom_tokens: 501 }],
    ['promo_code no string', { custom_tokens: 5, promo_code: 123 }],
    ['promo_code demasiado largo', { custom_tokens: 5, promo_code: 'A'.repeat(65) }],
  ])('rechaza: %s', (_name, body) => {
    expect(parsePreferenceRequest(body).ok).toBe(false);
  });

  it('trata promo_code vacío como ausente', () => {
    const r = parsePreferenceRequest({ custom_tokens: 5, promo_code: '   ' });
    expect(r.ok && r.value.promoCode).toBe(null);
  });

  it('ignora un app_url que no es texto o es demasiado largo', () => {
    const a = parsePreferenceRequest({ custom_tokens: 5, app_url: 42 });
    const b = parsePreferenceRequest({ custom_tokens: 5, app_url: 'https://x.dev/' + 'a'.repeat(600) });
    expect(a.ok && a.value.appUrl).toBe(null);
    expect(b.ok && b.value.appUrl).toBe(null);
  });
});
