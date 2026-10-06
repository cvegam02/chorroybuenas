import { afterEach, describe, expect, it, vi } from 'vitest';
import { getErrorMessage } from '../../src/utils/errors';
import { logger } from '../../src/utils/logger';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('logger', () => {
  it('en desarrollo escribe avisos y errores', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.warn('aviso', 1);
    logger.error('error', { a: 1 });
    expect(warn).toHaveBeenCalledWith('aviso', 1);
    expect(error).toHaveBeenCalledWith('error', { a: 1 });
  });

  it('en producción silencia los avisos pero no los errores', () => {
    vi.stubEnv('PROD', true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.warn('aviso');
    logger.error('error');
    expect(warn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('error');
  });
});

describe('getErrorMessage', () => {
  it.each([
    ['un Error', new Error('falló'), 'falló'],
    ['un objeto con message', { message: 'de supabase', code: '42501' }, 'de supabase'],
    ['un texto', 'texto plano', 'texto plano'],
    ['un número', 404, '404'],
    ['null', null, ''],
    ['undefined', undefined, ''],
    ['un objeto con message que no es texto', { message: 42 }, '[object Object]'],
  ])('%s', (_name, value, expected) => {
    expect(getErrorMessage(value)).toBe(expected);
  });
});
