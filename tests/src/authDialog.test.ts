import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';
import { authErrorKind } from '../../src/components/Auth/authErrors';
import { DISPOSABLE_EMAIL_MESSAGE, EMAIL_ALREADY_REGISTERED_MESSAGE } from '../../src/utils/signUpResult';

type Texts = { [key: string]: string | Texts };

/** Claves de un bloque de textos, con las anidadas como `alerts.credentialsTitle`. */
const keysOf = (texts: Texts, prefix = ''): string[] =>
  Object.entries(texts).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keysOf(value, `${prefix}${key}.`),
  );

const textsOf = (texts: Texts, prefix = ''): [string, string][] =>
  Object.entries(texts).flatMap(([key, value]): [string, string][] =>
    typeof value === 'string' ? [[`${prefix}${key}`, value]] : textsOf(value, `${prefix}${key}.`),
  );

describe('ventanas de cuenta: textos (FEAT-38)', () => {
  it('español e inglés tienen las mismas claves de cuenta, incluidas las anidadas', () => {
    expect(keysOf(en.common.auth).sort()).toEqual(keysOf(es.common.auth).sort());
  });

  it('ningún texto de cuenta está vacío', () => {
    for (const locale of [es, en]) {
      for (const [key, text] of textsOf(locale.common.auth)) {
        expect(text.trim(), key).not.toBe('');
      }
    }
  });

  it('los tokens de regalo nunca van escritos como número fijo', () => {
    for (const locale of [es, en]) {
      const giftTexts = textsOf(locale.common.auth).filter(([key]) => /gift/i.test(key));
      expect(giftTexts.length).toBeGreaterThan(0);
      for (const [key, text] of giftTexts) {
        expect(text, key).not.toMatch(/\d/);
        if (key.endsWith('_other')) expect(text, key).toContain('{{count}}');
      }
    }
  });

  it('los textos acordados con Carlos no prometen lo que el sitio no hace (decisiones 8 a 10)', () => {
    expect(es.common.auth.checkEmailReset).toBe('Ábrelo para crear tu contraseña nueva.');
    expect(es.common.auth.checkEmailConfirm).toBe('Ábrelo para confirmar tu cuenta y entrar.');
    expect(es.common.auth.passwordSavedText).toBe(
      'Ya entraste a tu cuenta. La próxima vez usa tu correo y tu contraseña nueva.',
    );
  });
});

describe('ventanas de cuenta: qué error fue (FEAT-38, US A3)', () => {
  it('reconoce el correo o la contraseña equivocados, por código o por mensaje', () => {
    expect(authErrorKind({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('credentials');
    expect(authErrorKind(new Error('Invalid login credentials'))).toBe('credentials');
    expect(authErrorKind(new Error('invalid_credentials'))).toBe('credentials');
  });

  it('reconoce el correo que ya tiene cuenta', () => {
    expect(authErrorKind(new Error(EMAIL_ALREADY_REGISTERED_MESSAGE))).toBe('emailTaken');
    expect(authErrorKind({ code: 'user_already_exists', message: 'x' })).toBe('emailTaken');
  });

  it('reconoce el correo desechable (FEAT-58, decisión 1)', () => {
    expect(authErrorKind(new Error(DISPOSABLE_EMAIL_MESSAGE))).toBe('disposable');
  });

  it('lo demás es un error cualquiera', () => {
    expect(authErrorKind(new Error('Email not confirmed'))).toBe('other');
    expect(authErrorKind(new Error('Failed to fetch'))).toBe('other');
    expect(authErrorKind(null)).toBe('other');
    expect(authErrorKind('algo')).toBe('other');
  });
});
