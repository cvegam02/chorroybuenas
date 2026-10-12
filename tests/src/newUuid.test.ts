import { afterEach, describe, expect, it, vi } from 'vitest';
import { newUuid } from '../../src/utils/newUuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa el identificador del navegador cuando lo da', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111');
    vi.stubGlobal('crypto', { randomUUID, getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });

    expect(newUuid()).toBe('11111111-1111-4111-8111-111111111111');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('sin página segura (http por la red local) arma un UUID v4 válido', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });

    expect(newUuid()).toMatch(UUID_V4);
  });

  it('sin página segura no repite identificadores', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });

    const ids = new Set(Array.from({ length: 200 }, () => newUuid()));
    expect(ids.size).toBe(200);
  });
});
