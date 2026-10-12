import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';

const NEW_KEYS = [
  'loginTitle',
  'loginSubtitle',
  'signUpTitle',
  'signUpSubtitle',
  'signUpSubtitleShort',
  'tabsLabel',
  'tabLogin',
  'tabSignUp',
  'continueGoogle',
  'orEmail',
  'emailLabel',
  'forgotShort',
  'noAccountLead',
  'createFree',
  'noAccountGift_one',
  'noAccountGift_other',
  'giftLead',
  'giftAmount_one',
  'giftAmount_other',
  'giftTail',
  'nameLabel',
  'optional',
  'passwordHint',
  'repeatPassword',
  'submitSignUp',
  'privacyLead',
  'privacyLink',
] as const;

describe('ventanas de cuenta (FEAT-38, US A1 y A2)', () => {
  it('español e inglés tienen las mismas claves de cuenta', () => {
    expect(Object.keys(en.common.auth).sort()).toEqual(Object.keys(es.common.auth).sort());
  });

  it('los textos nuevos existen y no están vacíos en los dos idiomas', () => {
    for (const key of NEW_KEYS) {
      expect(es.common.auth[key], `es: ${key}`).toBeTruthy();
      expect(en.common.auth[key], `en: ${key}`).toBeTruthy();
    }
  });

  it('los tokens de regalo nunca van escritos como número fijo', () => {
    for (const locale of [es, en]) {
      for (const key of ['noAccountGift_one', 'noAccountGift_other', 'giftAmount_one', 'giftAmount_other'] as const) {
        expect(locale.common.auth[key]).toContain('{{count}}');
        expect(locale.common.auth[key]).not.toMatch(/\d/);
      }
    }
  });
});
