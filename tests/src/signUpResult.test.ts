import { describe, expect, it } from 'vitest';
import { isEmailAlreadyRegistered } from '../../src/utils/signUpResult';

describe('isEmailAlreadyRegistered', () => {
  it('detecta la respuesta sin identidades que da Supabase cuando el correo ya tiene cuenta', () => {
    expect(isEmailAlreadyRegistered({ identities: [] })).toBe(true);
  });

  it('no marca un registro nuevo', () => {
    expect(isEmailAlreadyRegistered({ identities: [{ id: 'i1' }] })).toBe(false);
  });

  it('no marca una respuesta sin usuario o sin lista de identidades', () => {
    expect(isEmailAlreadyRegistered(null)).toBe(false);
    expect(isEmailAlreadyRegistered({})).toBe(false);
  });
});
