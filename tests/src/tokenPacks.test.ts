import { describe, expect, it } from 'vitest';
import { highlightedPackIndex, lowestPricePerPhotoCents, packSummary } from '../../src/utils/tokenPacks';
import { faqJsonLd } from '../../src/utils/faqJsonLd';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';

describe('paquetes de tokens en Beneficios (FEAT-33, US A2)', () => {
  it('el total de fotos es tokens + regalo', () => {
    expect(packSummary({ base_tokens: 10, bonus_tokens: 2, price_cents: 2000 }).totalTokens).toBe(12);
  });

  it('el precio por foto es el precio entre el total de tokens', () => {
    expect(packSummary({ base_tokens: 10, bonus_tokens: 2, price_cents: 2000 }).pricePerPhoto).toBe('$1.67');
    expect(packSummary({ base_tokens: 20, bonus_tokens: 5, price_cents: 4000 }).pricePerPhoto).toBe('$1.60');
    expect(packSummary({ base_tokens: 50, bonus_tokens: 20, price_cents: 10000 }).pricePerPhoto).toBe('$1.43');
  });

  it('sin regalo, el precio por foto es el del token', () => {
    const summary = packSummary({ base_tokens: 5, bonus_tokens: 0, price_cents: 1000 });
    expect(summary.totalTokens).toBe(5);
    expect(summary.pricePerPhoto).toBe('$2');
  });

  it('escribe el precio del paquete en pesos', () => {
    expect(packSummary({ base_tokens: 20, bonus_tokens: 5, price_cents: 4000 }).price).toBe('$40');
  });

  it('con tres paquetes o más se marca el de en medio; con menos, ninguno', () => {
    expect(highlightedPackIndex(3)).toBe(1);
    expect(highlightedPackIndex(5)).toBe(2);
    expect(highlightedPackIndex(2)).toBeNull();
    expect(highlightedPackIndex(0)).toBeNull();
  });
});

describe('tarjeta de paquete, la misma en Beneficios y en Comprar tokens (FEAT-33)', () => {
  it('con la promoción de primera compra, las dos páginas dicen las mismas fotos y el mismo precio por foto', () => {
    const pack = { base_tokens: 10, bonus_tokens: 2, price_cents: 2000 };
    const summary = packSummary(pack, 10);
    expect(summary.promoBonus).toBe(1);
    expect(summary.totalTokens).toBe(13);
    expect(summary.pricePerPhoto).toBe('$1.54');
  });

  it('tiene los mismos textos en español y en inglés', () => {
    expect(Object.keys(en.tokenPacks).sort()).toEqual(Object.keys(es.tokenPacks).sort());
  });
});

describe('datos FAQPage (FEAT-33)', () => {
  const items = [
    { question: '¿Necesito la IA?', answer: 'No. Es opcional.' },
    { question: '¿Quién ve mis fotos?', answer: 'Solo tú. Consulta el', linkLabel: 'Aviso de privacidad' },
  ];

  it('lleva una pregunta por cada pregunta visible, con el mismo texto', () => {
    const data = faqJsonLd(items);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0].name).toBe('¿Necesito la IA?');
    expect(data.mainEntity[0].acceptedAnswer.text).toBe('No. Es opcional.');
  });

  it('una respuesta con enlace incluye el texto del enlace, como se lee en pantalla', () => {
    expect(faqJsonLd(items).mainEntity[1].acceptedAnswer.text).toBe('Solo tú. Consulta el Aviso de privacidad.');
  });
});

describe('precio «desde» de Beneficios (FEAT-33, US A7)', () => {
  const PACKS = [
    { base_tokens: 10, bonus_tokens: 2, price_cents: 2000 },
    { base_tokens: 20, bonus_tokens: 5, price_cents: 4000 },
    { base_tokens: 50, bonus_tokens: 20, price_cents: 10000 },
  ];

  it('es el menor precio por foto entre los paquetes y el precio por token', () => {
    expect(lowestPricePerPhotoCents(PACKS, 200)).toBe(143);
  });

  it('si ningún paquete baja del precio por token, es el precio por token', () => {
    expect(lowestPricePerPhotoCents([{ base_tokens: 10, bonus_tokens: 0, price_cents: 2500 }], 200)).toBe(200);
    expect(lowestPricePerPhotoCents([], 200)).toBe(200);
  });

  it('el precio por foto de un paquete se redondea a dos decimales', () => {
    expect(lowestPricePerPhotoCents([{ base_tokens: 10, bonus_tokens: 2, price_cents: 2000 }], 500)).toBe(167);
  });

  it('sin paquetes o sin precio por token no hay precio que mostrar', () => {
    expect(lowestPricePerPhotoCents(null, 200)).toBeNull();
    expect(lowestPricePerPhotoCents(PACKS, null)).toBeNull();
  });
});

