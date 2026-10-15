import { describe, expect, it } from 'vitest';
import {
  customPeriod,
  dailyMoney,
  periodDays,
  percentChange,
  previousPeriod,
  hermosilloDayRange,
  hermosilloToday,
  summaryMoney,
  summaryPeriod,
  waitingSince,
} from '../../src/utils/adminSummary';

describe('día de hoy en Hermosillo (FEAT-43, A1)', () => {
  it('a las 23:30 de Hermosillo todavía es el mismo día, aunque en UTC ya sea el siguiente', () => {
    expect(hermosilloToday(new Date('2026-10-16T06:30:00Z'))).toBe('2026-10-15');
  });

  it('a la medianoche de Hermosillo empieza el día siguiente', () => {
    expect(hermosilloToday(new Date('2026-10-16T07:00:00Z'))).toBe('2026-10-16');
  });
});

describe('periodos del Resumen', () => {
  // Jueves 15 de octubre de 2026, mediodía en Hermosillo.
  const now = new Date('2026-10-15T19:00:00Z');

  it('«Este mes» va del día 1 a hoy', () => {
    expect(summaryPeriod('month', now)).toEqual({ from: '2026-10-01', to: '2026-10-15' });
  });

  it('«Hoy» es solo hoy', () => {
    expect(summaryPeriod('today', now)).toEqual({ from: '2026-10-15', to: '2026-10-15' });
  });

  it('«Semana» va del lunes a hoy', () => {
    expect(summaryPeriod('week', now)).toEqual({ from: '2026-10-12', to: '2026-10-15' });
  });

  it('en domingo, la semana empezó el lunes anterior', () => {
    expect(summaryPeriod('week', new Date('2026-10-18T19:00:00Z'))).toEqual({ from: '2026-10-12', to: '2026-10-18' });
  });

  it('en lunes, la semana es solo hoy', () => {
    expect(summaryPeriod('week', new Date('2026-10-12T19:00:00Z'))).toEqual({ from: '2026-10-12', to: '2026-10-12' });
  });

  it('«Año» va del 1 de enero a hoy', () => {
    expect(summaryPeriod('year', now)).toEqual({ from: '2026-01-01', to: '2026-10-15' });
  });

  it('el mes se cuenta en hora de Hermosillo: la noche del 31 sigue siendo del mes anterior', () => {
    expect(summaryPeriod('month', new Date('2026-11-01T06:00:00Z'))).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });
});

describe('rango de fechas elegido a mano', () => {
  it('acepta un rango en orden', () => {
    expect(customPeriod('2026-09-01', '2026-09-30')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('acepta un solo día', () => {
    expect(customPeriod('2026-09-01', '2026-09-01')).toEqual({ from: '2026-09-01', to: '2026-09-01' });
  });

  it.each([
    ['', '2026-09-30'],
    ['2026-09-01', ''],
    ['2026-09-30', '2026-09-01'],
    ['ayer', '2026-09-01'],
  ])('rechaza «%s» a «%s»', (from, to) => {
    expect(customPeriod(from, to)).toBeNull();
  });
});

describe('filtro de fechas de Uso de IA en hora de Hermosillo', () => {
  it('el día empieza y termina a la medianoche de Hermosillo', () => {
    expect(hermosilloDayRange('2026-10-01', '2026-10-15')).toEqual({
      from: '2026-10-01T00:00:00-07:00',
      to: '2026-10-15T23:59:59.999-07:00',
    });
  });

  it('sin fechas no filtra', () => {
    expect(hermosilloDayRange('', '')).toEqual({ from: null, to: null });
  });
});

describe('dinero del Resumen', () => {
  const totals = { tokensRevenueCents: 20000, seasonalRevenueCents: 9800, aiImages: 100 };

  it('ingresos suma tokens y temáticas; el gasto en IA usa el mismo cálculo que Uso de IA', () => {
    // 100 imágenes × 0.013 USD = 1.3 USD; con 0.05 USD por peso son $26.00.
    expect(summaryMoney(totals, 0.013, 0.05)).toEqual({
      revenueCents: 29800,
      aiCostCents: 2600,
      profitCents: 27200,
    });
  });

  it('el gasto en IA se redondea al centavo, igual que en Uso de IA', () => {
    // 7 × 0.013 = 0.091 USD; / 0.0545 = 1.66972… pesos → 167 centavos.
    expect(summaryMoney({ ...totals, aiImages: 7 }, 0.013, 0.0545).aiCostCents).toBe(167);
  });

  it('la ganancia puede ser negativa si la IA costó más de lo que entró', () => {
    expect(summaryMoney({ tokensRevenueCents: 0, seasonalRevenueCents: 0, aiImages: 100 }, 0.013, 0.05).profitCents).toBe(-2600);
  });

  it('sin tipo de cambio válido no inventa el gasto ni la ganancia', () => {
    expect(summaryMoney(totals, 0.013, 0)).toEqual({ revenueCents: 29800, aiCostCents: null, profitCents: null });
  });
});

describe('periodo anterior para comparar (US A3)', () => {
  it('«Este mes» se compara con el mismo tramo del mes pasado', () => {
    expect(previousPeriod('month', { from: '2026-10-01', to: '2026-10-15' })).toEqual({ from: '2026-09-01', to: '2026-09-15' });
  });

  it('si el mes pasado es más corto, el tramo termina en su último día', () => {
    expect(previousPeriod('month', { from: '2026-03-01', to: '2026-03-31' })).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('en enero, el mes anterior es diciembre del año pasado', () => {
    expect(previousPeriod('month', { from: '2027-01-01', to: '2027-01-10' })).toEqual({ from: '2026-12-01', to: '2026-12-10' });
  });

  it('«Hoy» se compara con ayer', () => {
    expect(previousPeriod('today', { from: '2026-10-01', to: '2026-10-01' })).toEqual({ from: '2026-09-30', to: '2026-09-30' });
  });

  it('«Semana» se compara con los mismos días de la semana pasada', () => {
    expect(previousPeriod('week', { from: '2026-10-12', to: '2026-10-15' })).toEqual({ from: '2026-10-05', to: '2026-10-08' });
  });

  it('«Año» se compara con el mismo tramo del año pasado', () => {
    expect(previousPeriod('year', { from: '2026-01-01', to: '2026-10-15' })).toEqual({ from: '2025-01-01', to: '2025-10-15' });
  });

  it('un 29 de febrero se compara hasta el 28 del año anterior', () => {
    expect(previousPeriod('year', { from: '2028-01-01', to: '2028-02-29' })).toEqual({ from: '2027-01-01', to: '2027-02-28' });
  });

  it('un rango a mano se compara con los mismos días justo antes', () => {
    expect(previousPeriod('range', { from: '2026-09-10', to: '2026-09-19' })).toEqual({ from: '2026-08-31', to: '2026-09-09' });
  });
});

describe('cambio contra el periodo anterior (US A3)', () => {
  it('sube', () => {
    expect(percentChange(118, 100)).toBe(18);
  });

  it('baja', () => {
    expect(percentChange(96, 100)).toBe(-4);
  });

  it('se redondea al entero', () => {
    expect(percentChange(2, 3)).toBe(-33);
  });

  it('sin cambio da cero', () => {
    expect(percentChange(50, 50)).toBe(0);
  });

  it.each([
    [10, 0],
    [0, 0],
    [10, -5],
  ])('con %s contra %s no hay porcentaje (sin datos previos)', (current, previous) => {
    expect(percentChange(current, previous)).toBeNull();
  });
});

describe('serie por día de la gráfica (US A4)', () => {
  const rows = [
    { day: '2026-10-01', revenueCents: 5500, aiImages: 100 },
    { day: '2026-10-02', revenueCents: 0, aiImages: 0 },
    { day: '2026-10-03', revenueCents: 4900, aiImages: 7 },
  ];

  it('pasa los ingresos a pesos y el gasto en IA con el mismo cálculo que las tarjetas', () => {
    expect(dailyMoney(rows, 0.013, 0.05)).toEqual([
      { day: '2026-10-01', revenue: 55, aiCost: 26 },
      { day: '2026-10-02', revenue: 0, aiCost: 0 },
      { day: '2026-10-03', revenue: 49, aiCost: 1.82 },
    ]);
  });

  it('la suma de los días coincide con la tarjeta de Ingresos', () => {
    const total = dailyMoney(rows, 0.013, 0.05).reduce((sum, d) => sum + d.revenue, 0);
    expect(total * 100).toBe(5500 + 4900);
  });

  it('sin tipo de cambio válido, el gasto en IA queda en cero en lugar de inventarse', () => {
    expect(dailyMoney(rows, 0.013, 0).map((d) => d.aiCost)).toEqual([0, 0, 0]);
  });
});

describe('días de un periodo (US A4)', () => {
  it.each([
    ['2026-10-01', '2026-10-01', 1],
    ['2026-10-01', '2026-10-15', 15],
    ['2028-01-01', '2028-12-31', 366],
  ])('del %s al %s son %s días', (from, to, days) => {
    expect(periodDays({ from, to })).toBe(days);
  });
});

describe('antigüedad del pago pendiente más viejo (US A5)', () => {
  const now = new Date('2026-10-15T19:00:00Z');

  it('de hoy', () => {
    expect(waitingSince('2026-10-15T08:00:00Z', now)).toBe('de hoy');
  });

  it('de ayer', () => {
    expect(waitingSince('2026-10-14T18:00:00Z', now)).toBe('de hace 1 día');
  });

  it('de hace varios días', () => {
    expect(waitingSince('2026-10-11T19:00:00Z', now)).toBe('de hace 4 días');
  });
});
