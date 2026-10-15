import { describe, expect, it } from 'vitest';
import {
  minimumPurchaseLabel,
  packCard,
  packSalesLabel,
  parsePriceInput,
  priceChangeMessage,
  pricePerTokenLabel,
  welcomeEstimateLabel,
} from '../../src/utils/adminPricing';

describe('pricePerTokenLabel', () => {
  it('muestra el precio por token siempre con centavos', () => {
    expect(pricePerTokenLabel(200)).toBe('$2.00');
    expect(pricePerTokenLabel(250)).toBe('$2.50');
  });
});

describe('minimumPurchaseLabel', () => {
  it('usa el mínimo de compra y el precio vigente', () => {
    expect(minimumPurchaseLabel(200)).toBe('Mínimo de compra: 5 tokens ($10.00).');
    expect(minimumPurchaseLabel(250)).toBe('Mínimo de compra: 5 tokens ($12.50).');
  });
});

describe('welcomeEstimateLabel', () => {
  it('estima cuentas del mes × tokens de bienvenida, con su valor a precio de lista', () => {
    expect(welcomeEstimateLabel(86, 5, 200)).toBe(
      'Este mes se crearon 86 cuentas; a 5 tokens cada una, ≈ 430 tokens (≈ $860 a precio de lista).',
    );
  });

  it('respeta el singular y los centavos', () => {
    expect(welcomeEstimateLabel(1, 1, 250)).toBe(
      'Este mes se creó 1 cuenta; a 1 token cada una, ≈ 1 token (≈ $2.50 a precio de lista).',
    );
  });

  it('separa los miles', () => {
    expect(welcomeEstimateLabel(1200, 5, 200)).toBe(
      'Este mes se crearon 1,200 cuentas; a 5 tokens cada una, ≈ 6,000 tokens (≈ $12,000 a precio de lista).',
    );
  });

  it('dice cuando no hubo cuentas nuevas', () => {
    expect(welcomeEstimateLabel(0, 5, 200)).toBe('Este mes no se han creado cuentas.');
  });

  it('dice cuando las cuentas nuevas no reciben tokens', () => {
    expect(welcomeEstimateLabel(12, 0, 200)).toBe(
      'Este mes se crearon 12 cuentas; las cuentas nuevas no reciben tokens de bienvenida.',
    );
  });
});

describe('parsePriceInput', () => {
  it('lee pesos con punto o coma y los pasa a centavos', () => {
    expect(parsePriceInput('2.50')).toBe(250);
    expect(parsePriceInput('2,5')).toBe(250);
    expect(parsePriceInput(' 3 ')).toBe(300);
    expect(parsePriceInput('$1.99')).toBe(199);
    expect(parsePriceInput('0.01')).toBe(1);
  });

  it('rechaza vacío, cero, negativos, más de dos decimales y texto', () => {
    for (const bad of ['', '   ', '0', '0.00', '-2', '2.505', 'dos', '2.5.0', '1e3']) {
      expect(parsePriceInput(bad)).toBeNull();
    }
  });
});

describe('priceChangeMessage', () => {
  it('dice el precio de antes, el nuevo y a qué afecta', () => {
    expect(priceChangeMessage(200, 250)).toBe(
      '¿Cambiar el precio por token de $2.00 a $2.50? Afecta a todas las compras de cantidad libre desde ahora.',
    );
  });
});

describe('packCard', () => {
  const pack = { base_tokens: 20, bonus_tokens: 5, price_cents: 4000 };

  it('da total, desglose, precio, precio por token efectivo y ahorro contra suelto', () => {
    expect(packCard(pack, 200)).toEqual({
      total: '25 tokens',
      breakdown: '20 tokens + 5 de regalo',
      price: '$40',
      perToken: '$1.60 por token',
      savings: '20% menos que suelto',
    });
  });

  it('redondea el precio efectivo y el ahorro como la maqueta', () => {
    const small = packCard({ base_tokens: 10, bonus_tokens: 2, price_cents: 2000 }, 200);
    expect(small.perToken).toBe('$1.67 por token');
    expect(small.savings).toBe('17% menos que suelto');
    expect(packCard({ base_tokens: 50, bonus_tokens: 20, price_cents: 10000 }, 200).savings).toBe('29% menos que suelto');
  });

  it('el ahorro sigue al precio por token vigente', () => {
    expect(packCard(pack, 250).savings).toBe('36% menos que suelto');
  });

  it('dice cuando el pack no tiene regalo, cuesta igual o cuesta más que suelto', () => {
    const same = packCard({ base_tokens: 10, bonus_tokens: 0, price_cents: 2000 }, 200);
    expect(same.breakdown).toBe('10 tokens, sin regalo');
    expect(same.savings).toBe('Cuesta igual que suelto');
    expect(packCard({ base_tokens: 10, bonus_tokens: 0, price_cents: 2500 }, 200).savings).toBe('25% más que suelto');
  });

  it('sin precio por token no calcula el ahorro', () => {
    expect(packCard(pack, null).savings).toBeNull();
  });

  it('un pack gratis no tiene precio por token raro', () => {
    const free = packCard({ base_tokens: 5, bonus_tokens: 0, price_cents: 0 }, 200);
    expect(free.perToken).toBe('$0.00 por token');
    expect(free.savings).toBe('100% menos que suelto');
  });
});

describe('packSalesLabel', () => {
  it('cuenta las ventas del mes en singular o plural', () => {
    expect(packSalesLabel(0)).toBe('0 ventas este mes');
    expect(packSalesLabel(1)).toBe('1 venta este mes');
    expect(packSalesLabel(1234)).toBe('1,234 ventas este mes');
  });
});
