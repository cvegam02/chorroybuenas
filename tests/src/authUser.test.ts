import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { nextAuthUser } from '../../src/utils/authUser';

const user = (id: string) => ({ id }) as User;

describe('nextAuthUser', () => {
  it('al renovar el permiso del mismo usuario, conserva el mismo objeto (la página no se recarga)', () => {
    const prev = user('u1');
    expect(nextAuthUser(prev, user('u1'), 'TOKEN_REFRESHED')).toBe(prev);
  });

  it('si cambian sus datos, toma el nuevo', () => {
    const next = user('u1');
    expect(nextAuthUser(user('u1'), next, 'USER_UPDATED')).toBe(next);
  });

  it('al entrar otro usuario o salir, toma el nuevo', () => {
    const other = user('u2');
    expect(nextAuthUser(user('u1'), other, 'SIGNED_IN')).toBe(other);
    expect(nextAuthUser(user('u1'), null, 'SIGNED_OUT')).toBeNull();
  });

  it('sin usuario antes, toma el nuevo aunque sea renovación', () => {
    const next = user('u1');
    expect(nextAuthUser(null, next, 'TOKEN_REFRESHED')).toBe(next);
  });
});
