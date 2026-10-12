import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogLoteria } from '../../src/utils/seasonalCatalog';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';

const pricingQuery = vi.hoisted(() => ({
  result: { data: null, error: null } as {
    data: { price_per_token_cents: number } | null;
    error: { message: string } | null;
  },
}));

vi.mock('../../src/utils/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => pricingQuery.result }),
      }),
    }),
  },
}));

import { TokenPricingRepository } from '../../src/repositories/TokenPricingRepository';
import { aiCostAnswerKey, formatFromPrice, lowestThemedPriceCents } from '../../src/utils/landingPrices';
import { playsMp4Only } from '../../src/utils/landingVideo';

const NOW = new Date('2026-10-10T18:00:00.000Z');
const YESTERDAY = '2026-10-09T18:00:00.000Z';
const TOMORROW = '2026-10-11T18:00:00.000Z';

function loteria(id: string, overrides: Partial<CatalogLoteria> = {}): CatalogLoteria {
  return {
    id,
    season_id: 's-1',
    name_es: id,
    name_en: null,
    description_es: 'Lista',
    description_en: null,
    grid_size: 16,
    card_count: 54,
    board_count: 10,
    price_cents: 4900,
    is_published: true,
    valid_from: null,
    valid_until: null,
    cover_path: `${id}/portada.jpg`,
    sample_paths: [],
    ...overrides,
  };
}

describe('página de inicio (FEAT-32, P1)', () => {
  describe('precio «desde» de las loterías temáticas', () => {
    it('toma el precio más bajo de las loterías visibles hoy', () => {
      const cents = lowestThemedPriceCents(
        [loteria('a', { price_cents: 4900 }), loteria('b', { price_cents: 2900 }), loteria('c', { price_cents: 7900 })],
        NOW,
      );
      expect(cents).toBe(2900);
    });

    it('no cuenta las que no se ven en el catálogo: sin publicar, programadas o vencidas', () => {
      const cents = lowestThemedPriceCents(
        [
          loteria('borrador', { price_cents: 500, is_published: false }),
          loteria('programada', { price_cents: 600, valid_from: TOMORROW }),
          loteria('vencida', { price_cents: 700, valid_until: YESTERDAY }),
          loteria('visible', { price_cents: 4900 }),
        ],
        NOW,
      );
      expect(cents).toBe(4900);
    });

    it('no cuenta las que no tienen precio', () => {
      const cents = lowestThemedPriceCents(
        [loteria('sin-precio', { price_cents: null }), loteria('cero', { price_cents: 0 }), loteria('b', { price_cents: 3900 })],
        NOW,
      );
      expect(cents).toBe(3900);
    });

    it('devuelve null si no hay ninguna con precio, para que la etiqueta no aparezca', () => {
      expect(lowestThemedPriceCents([], NOW)).toBeNull();
      expect(lowestThemedPriceCents([loteria('sin-precio', { price_cents: null })], NOW)).toBeNull();
    });
  });

  describe('texto del precio', () => {
    it('escribe los pesos cerrados sin centavos', () => {
      expect(formatFromPrice(200)).toBe('$2');
      expect(formatFromPrice(4900)).toBe('$49');
    });

    it('escribe los centavos cuando los hay', () => {
      expect(formatFromPrice(250)).toBe('$2.50');
    });

    it('no devuelve texto si no hay precio', () => {
      expect(formatFromPrice(null)).toBeNull();
    });
  });

  describe('precio del token leído de la base', () => {
    beforeEach(() => {
      pricingQuery.result = { data: null, error: null };
    });

    it('devuelve el precio vigente', async () => {
      pricingQuery.result = { data: { price_per_token_cents: 300 }, error: null };
      expect(await TokenPricingRepository.getPricingOrNull('MXN')).toBe(300);
    });

    it('devuelve null si la consulta falla, para que inicio no muestre un precio que no leyó', async () => {
      pricingQuery.result = { data: null, error: { message: 'sin red' } };
      expect(await TokenPricingRepository.getPricingOrNull('MXN')).toBeNull();
    });

    it('devuelve null si no hay precio guardado', async () => {
      expect(await TokenPricingRepository.getPricingOrNull('MXN')).toBeNull();
    });
  });

  describe('qué video recibe cada navegador', () => {
    const SAFARI_MAC =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
    const SAFARI_IPHONE =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    const CHROME_IPHONE =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1';
    const CHROME_WINDOWS =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    const CHROME_ANDROID =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36';
    const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0';

    it('Safari y cualquier navegador de iPhone reciben solo el MP4, porque no pintan el fondo transparente', () => {
      expect(playsMp4Only(SAFARI_MAC)).toBe(true);
      expect(playsMp4Only(SAFARI_IPHONE)).toBe(true);
      expect(playsMp4Only(CHROME_IPHONE)).toBe(true);
    });

    it('los demás reciben primero el WebM transparente', () => {
      expect(playsMp4Only(CHROME_WINDOWS)).toBe(false);
      expect(playsMp4Only(CHROME_ANDROID)).toBe(false);
      expect(playsMp4Only(FIREFOX)).toBe(false);
    });
  });

  describe('respuesta «¿Cuánto cuesta la conversión con IA?»', () => {
    it('con precio, usa el texto que lo dice', () => {
      expect(aiCostAnswerKey('$2')).toBe('landing.faq.aiCost.answer');
      expect(es.landing.faq.aiCost.answer).toContain('{{price}}');
      expect(en.landing.faq.aiCost.answer).toContain('{{price}}');
    });

    it('sin precio, usa el texto que no trae cifra', () => {
      expect(aiCostAnswerKey(null)).toBe('landing.faq.aiCost.answerNoPrice');
      expect(es.landing.faq.aiCost.answerNoPrice).not.toMatch(/\{\{|\$/);
      expect(en.landing.faq.aiCost.answerNoPrice).not.toMatch(/\{\{|\$/);
    });

    it('en los dos casos avisa de la compra mínima de 5 tokens', () => {
      expect(es.landing.faq.aiCost.answer).toContain('5 tokens');
      expect(es.landing.faq.aiCost.answerNoPrice).toContain('5 tokens');
    });
  });

  describe('textos', () => {
    const keysOf = (value: unknown, prefix = ''): string[] =>
      value !== null && typeof value === 'object'
        ? Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key))
        : [prefix];

    it('inicio tiene los mismos textos en español y en inglés', () => {
      expect(keysOf(en.landing).sort()).toEqual(keysOf(es.landing).sort());
    });

    it('el pie de página tiene los mismos textos en español y en inglés', () => {
      expect(keysOf(en.footer).sort()).toEqual(keysOf(es.footer).sort());
    });

    it('ningún texto de inicio promete un mínimo de tableros', () => {
      expect(JSON.stringify(es.landing)).not.toMatch(/m[ií]nimo 8 tableros/i);
    });
  });
});
