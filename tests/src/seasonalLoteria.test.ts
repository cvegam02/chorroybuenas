import { describe, expect, it } from 'vitest';
import {
  SEASONAL_PDF_MAX_BYTES,
  formatFileSize,
  parsePriceToCents,
  validatePdfFile,
  validateSeasonalLoteriaForm,
  type SeasonalLoteriaForm,
} from '../../src/utils/seasonalLoteria';

const COMPLETE_FORM: SeasonalLoteriaForm = {
  seasonId: 'season-1',
  nameEs: '  Posadas  ',
  nameEn: '',
  descriptionEs: 'Lotería navideña',
  descriptionEn: '   ',
  gridSize: 16,
  cardCount: '54',
  boardCount: '10',
  price: '49',
  validFrom: '',
  validUntil: '',
};

describe('precio de una lotería de temporada (FEAT-17, decisión 15)', () => {
  it('convierte pesos a centavos', () => {
    expect(parsePriceToCents('49')).toBe(4900);
    expect(parsePriceToCents('49.5')).toBe(4950);
    expect(parsePriceToCents(' 19.99 ')).toBe(1999);
  });

  it('un precio vacío es «sin precio»', () => {
    expect(parsePriceToCents('')).toBeNull();
    expect(parsePriceToCents('   ')).toBeNull();
  });

  it('lo que no es un precio no se convierte', () => {
    for (const text of ['abc', '-5', '10.999', '1e3', '49,50']) {
      expect(parsePriceToCents(text)).toBeNaN();
    }
  });
});

describe('formulario de lotería de temporada', () => {
  it('una ficha completa se acepta y se normaliza', () => {
    const { errors, input } = validateSeasonalLoteriaForm(COMPLETE_FORM);
    expect(errors).toEqual({});
    expect(input).toEqual({
      season_id: 'season-1',
      name_es: 'Posadas',
      name_en: null,
      description_es: 'Lotería navideña',
      description_en: null,
      grid_size: 16,
      card_count: 54,
      board_count: 10,
      price_cents: 4900,
      valid_from: null,
      valid_until: null,
    });
  });

  it('un borrador solo necesita temporada y nombre', () => {
    const { errors, input } = validateSeasonalLoteriaForm({
      ...COMPLETE_FORM,
      descriptionEs: '',
      cardCount: '',
      boardCount: '',
      price: '',
    });
    expect(errors).toEqual({});
    expect(input).toMatchObject({ description_es: null, card_count: null, board_count: null, price_cents: null });
  });

  it('sin temporada o sin nombre en español no se guarda', () => {
    const { errors, input } = validateSeasonalLoteriaForm({ ...COMPLETE_FORM, seasonId: '', nameEs: '   ' });
    expect(Object.keys(errors).sort()).toEqual(['nameEs', 'seasonId']);
    expect(input).toBeNull();
  });

  it('un precio menor a $10.00 se rechaza', () => {
    for (const price of ['5', '9.99', '0']) {
      const { errors, input } = validateSeasonalLoteriaForm({ ...COMPLETE_FORM, price });
      expect(errors.price).toContain('$10.00');
      expect(input).toBeNull();
    }
  });

  it('el precio mínimo exacto se acepta', () => {
    expect(validateSeasonalLoteriaForm({ ...COMPLETE_FORM, price: '10' }).input?.price_cents).toBe(1000);
  });

  it('un precio que no es un número se rechaza', () => {
    expect(validateSeasonalLoteriaForm({ ...COMPLETE_FORM, price: 'gratis' }).errors.price).toBeDefined();
  });

  it('un precio que no cabe en la base se rechaza', () => {
    expect(validateSeasonalLoteriaForm({ ...COMPLETE_FORM, price: '99999999999' }).errors.price).toBeDefined();
  });

  it('cartas y tableros deben ser enteros mayores que cero', () => {
    for (const value of ['0', '-3', '5.5', 'diez']) {
      const { errors } = validateSeasonalLoteriaForm({ ...COMPLETE_FORM, cardCount: value, boardCount: value });
      expect(errors.cardCount).toBeDefined();
      expect(errors.boardCount).toBeDefined();
    }
  });

  it('respeta los largos de nombre (80) y descripción (600)', () => {
    const { errors } = validateSeasonalLoteriaForm({
      ...COMPLETE_FORM,
      nameEs: 'x'.repeat(81),
      nameEn: 'x'.repeat(81),
      descriptionEs: 'x'.repeat(601),
      descriptionEn: 'x'.repeat(601),
    });
    expect(Object.keys(errors).sort()).toEqual(['descriptionEn', 'descriptionEs', 'nameEn', 'nameEs']);
    expect(validateSeasonalLoteriaForm({ ...COMPLETE_FORM, nameEs: 'x'.repeat(80) }).errors).toEqual({});
  });
});

describe('PDF de una lotería de temporada', () => {
  it('acepta un PDF de hasta 50 MB', () => {
    expect(validatePdfFile({ type: 'application/pdf', size: 1024 })).toBeNull();
    expect(validatePdfFile({ type: 'application/pdf', size: SEASONAL_PDF_MAX_BYTES })).toBeNull();
  });

  it('rechaza lo que no es PDF', () => {
    expect(validatePdfFile({ type: 'image/png', size: 1024 })).toContain('PDF');
    expect(validatePdfFile({ type: '', size: 1024 })).toContain('PDF');
  });

  it('rechaza un PDF de más de 50 MB', () => {
    expect(validatePdfFile({ type: 'application/pdf', size: SEASONAL_PDF_MAX_BYTES + 1 })).toContain('50 MB');
  });

  it('rechaza un archivo vacío', () => {
    expect(validatePdfFile({ type: 'application/pdf', size: 0 })).not.toBeNull();
  });
});

describe('peso de un archivo', () => {
  it('lo muestra en KB o MB', () => {
    expect(formatFileSize(512)).toBe('1 KB');
    expect(formatFileSize(300 * 1024)).toBe('300 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(12.34 * 1024 * 1024)).toBe('12.3 MB');
  });
});

describe('fechas de una lotería de temporada (FEAT-17, decisión 5)', () => {
  it('sin fechas se guarda sin inicio ni fin', () => {
    const { input } = validateSeasonalLoteriaForm(COMPLETE_FORM);
    expect(input?.valid_from).toBeNull();
    expect(input?.valid_until).toBeNull();
  });

  it('guarda las fechas escritas', () => {
    const { input } = validateSeasonalLoteriaForm({
      ...COMPLETE_FORM,
      validFrom: '2026-10-01T00:00',
      validUntil: '2026-11-03T23:59',
    });
    expect(input?.valid_from).toBe(new Date(2026, 9, 1, 0, 0).toISOString());
    expect(input?.valid_until).toBe(new Date(2026, 10, 3, 23, 59).toISOString());
  });

  it('una fecha de fin anterior o igual a la de inicio se rechaza', () => {
    for (const validUntil of ['2026-09-30T00:00', '2026-10-01T00:00']) {
      const result = validateSeasonalLoteriaForm({ ...COMPLETE_FORM, validFrom: '2026-10-01T00:00', validUntil });
      expect(result.input).toBeNull();
      expect(result.errors.validUntil).toBeDefined();
    }
  });

  it('solo inicio o solo fin son válidos', () => {
    expect(validateSeasonalLoteriaForm({ ...COMPLETE_FORM, validFrom: '2026-10-01T00:00' }).input).not.toBeNull();
    expect(validateSeasonalLoteriaForm({ ...COMPLETE_FORM, validUntil: '2026-10-01T00:00' }).input).not.toBeNull();
  });

  it('lo que no es una fecha se rechaza', () => {
    const result = validateSeasonalLoteriaForm({ ...COMPLETE_FORM, validFrom: 'mañana' });
    expect(result.errors.validFrom).toBeDefined();
  });
});
