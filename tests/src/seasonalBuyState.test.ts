import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';
import { seasonalBuyStateOf, type SeasonalBuyFlags } from '../../src/utils/seasonalBuyState';

const NOTHING: SeasonalBuyFlags = {
  isOwned: false,
  isPending: false,
  isStartingPayment: false,
  buyFailed: false,
  notice: null,
};

describe('estado de la caja de compra de una lotería temática (FEAT-37, US A2)', () => {
  it('sin nada especial, se ofrece comprar', () => {
    expect(seasonalBuyStateOf(NOTHING)).toBe('idle');
  });

  it('al pedir el pago, está abriendo Mercado Pago', () => {
    expect(seasonalBuyStateOf({ ...NOTHING, isStartingPayment: true })).toBe('starting');
  });

  it('si no se pudo pedir el pago, falló', () => {
    expect(seasonalBuyStateOf({ ...NOTHING, buyFailed: true })).toBe('failed');
  });

  it('al volver con el pago aprobado, se está confirmando', () => {
    expect(seasonalBuyStateOf({ ...NOTHING, notice: 'confirming' })).toBe('confirming');
  });

  it('al volver sin pagar, el pago no se completó', () => {
    expect(seasonalBuyStateOf({ ...NOTHING, notice: 'cancel' })).toBe('cancelled');
  });

  it('el aviso de pago en proceso no cambia la caja mientras la base no lo confirme', () => {
    expect(seasonalBuyStateOf({ ...NOTHING, notice: 'pending' })).toBe('idle');
  });

  it('con el pago en proceso registrado, espera el pago', () => {
    expect(seasonalBuyStateOf({ ...NOTHING, isPending: true, notice: 'pending' })).toBe('pending');
  });

  it('ya comprada gana a todo lo demás', () => {
    expect(
      seasonalBuyStateOf({ isOwned: true, isPending: true, isStartingPayment: true, buyFailed: true, notice: 'cancel' }),
    ).toBe('owned');
    expect(seasonalBuyStateOf({ ...NOTHING, isOwned: true, notice: 'success' })).toBe('owned');
  });

  it('el pago pendiente gana a un intento nuevo, a un fallo y a un regreso cancelado', () => {
    expect(
      seasonalBuyStateOf({ ...NOTHING, isPending: true, isStartingPayment: true, buyFailed: true, notice: 'cancel' }),
    ).toBe('pending');
  });

  it('un intento nuevo gana al fallo y al regreso cancelado anteriores', () => {
    expect(seasonalBuyStateOf({ ...NOTHING, isStartingPayment: true, buyFailed: true, notice: 'cancel' })).toBe(
      'starting',
    );
  });

  it('un fallo al reintentar gana al aviso de pago no completado', () => {
    expect(seasonalBuyStateOf({ ...NOTHING, buyFailed: true, notice: 'cancel' })).toBe('failed');
  });
});

describe('textos del detalle de una lotería temática (FEAT-37)', () => {
  const keys = [
    'samplesCount',
    'oneTime',
    'noTokens',
    'buy',
    'buying',
    'retryBuy',
    'buyError',
    'loginHint',
    'loginHintShort',
    'login',
    'payHint',
    'startingHint',
    'cancelHint',
    'owned',
    'ownedHintBefore',
    'ownedHintAfter',
    'myAccount',
    'pendingTag',
    'pendingText',
    'toAccount',
    'confirming',
    'closeNotice',
    'unavailable',
    'unavailableText',
    'toCatalog',
    'includesTitle',
    'samplePosition',
    'samplePrevious',
    'sampleNext',
  ];

  it.each(keys)('«%s» existe en español y en inglés', (key) => {
    expect((es.seasonal.detail as Record<string, unknown>)[key]).toBeTruthy();
    expect((en.seasonal.detail as Record<string, unknown>)[key]).toBeTruthy();
  });

  it.each(['success', 'pending', 'cancel'])('el aviso «%s» existe en español y en inglés', (key) => {
    expect((es.seasonal.detail.notice as Record<string, string>)[key]).toBeTruthy();
    expect((en.seasonal.detail.notice as Record<string, string>)[key]).toBeTruthy();
  });

  it.each(['payment', 'download', 'account', 'digital'])('la garantía «%s» existe en español y en inglés', (key) => {
    const guarantees = (locale: typeof es) =>
      (locale.seasonal.detail as unknown as { guarantees?: Record<string, string> }).guarantees ?? {};
    expect(guarantees(es)[key]).toBeTruthy();
    expect(guarantees(en as typeof es)[key]).toBeTruthy();
  });

  type Group = Record<string, string>;
  const group = (locale: unknown, name: string): Group =>
    ((locale as { seasonal: { detail: Record<string, Group | undefined> } }).seasonal.detail[name] ?? {});

  it.each([
    'boardsText',
    'cardsTitle_one',
    'cardsTitle_other',
    'cardsText',
    'letterTitle',
    'letterText',
    'cleanTitle',
    'cleanText',
  ])('«Qué incluye»: «%s» existe en español y en inglés', (key) => {
    expect(group(es, 'includes')[key]).toBeTruthy();
    expect(group(en, 'includes')[key]).toBeTruthy();
  });

  it.each(['firstTime', 'ownPhotos'])('el bloque «%s» tiene título, texto y enlace en los dos idiomas', (name) => {
    for (const locale of [es, en]) {
      expect(group(locale, name).title).toBeTruthy();
      expect(group(locale, name).text).toBeTruthy();
      expect(group(locale, name).cta).toBeTruthy();
    }
  });

  it('el bloque de crear con tus fotos no nombra ninguna temática: sale en todas', () => {
    for (const locale of [es, en]) {
      expect(group(locale, 'ownPhotos').text).not.toMatch(/halloween/i);
    }
  });
});
