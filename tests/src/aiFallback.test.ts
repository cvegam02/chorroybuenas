import { describe, expect, it, vi } from 'vitest';
import { aiErrorToI18nKey, isSensitiveContentError, transformWithFallback, type EdgeCall } from '../../src/services/aiFallback';

const delay = async () => {};
const failing = (...messages: string[]): EdgeCall => {
  const queue = [...messages];
  return vi.fn(async () => {
    const next = queue.shift();
    if (next === undefined || next === 'OK') return 'https://out';
    throw new Error(next);
  });
};

describe('transformWithFallback', () => {
  it('devuelve el resultado al primer intento', async () => {
    const call = failing('OK');
    expect(await transformWithFallback(call, { delay })).toBe('https://out');
    expect(call).toHaveBeenCalledTimes(1);
    expect(vi.mocked(call).mock.calls[0][0]).toEqual({ prompt_variant: 0 });
  });

  it('en contenido sensible avanza por las variantes 0 → 1 → 2 y avisa', async () => {
    const call = failing('SENSITIVE_CONTENT_FILTER', 'SENSITIVE_CONTENT_FILTER', 'OK');
    const onSensitiveRetry = vi.fn();
    await transformWithFallback(call, { onSensitiveRetry, delay });
    expect(vi.mocked(call).mock.calls.map((c) => c[0].prompt_variant)).toEqual([0, 1, 2]);
    expect(onSensitiveRetry.mock.calls).toEqual([
      [1, 'cardEditor.errors.aiSensitiveRetrying'],
      [2, 'cardEditor.errors.aiSensitiveRetrying'],
    ]);
  });

  it('si las tres variantes son sensibles se rinde sin probar otro modelo', async () => {
    const call = failing('SENSITIVE_CONTENT_FILTER', 'SENSITIVE_CONTENT_FILTER', 'SENSITIVE_CONTENT_FILTER', 'OK');
    await expect(transformWithFallback(call, { delay })).rejects.toThrow('SENSITIVE_PHOTO_NOT_SUPPORTED');
    expect(vi.mocked(call).mock.calls.map((c) => c[0])).toEqual([{ prompt_variant: 0 }, { prompt_variant: 1 }, { prompt_variant: 2 }]);
  });

  it('NSFW se reintenta como máximo 2 veces y luego se rinde', async () => {
    const call = failing('NSFW_FILTER', 'NSFW_FILTER', 'NSFW_FILTER', 'NSFW_FILTER');
    await expect(transformWithFallback(call, { delay })).rejects.toThrow('NSFW_FILTER');
    expect(call).toHaveBeenCalledTimes(3);
  });

  it('NSFW que pasa al reintentar devuelve la imagen', async () => {
    const call = failing('NSFW_FILTER', 'OK');
    expect(await transformWithFallback(call, { delay })).toBe('https://out');
  });

  it.each(['INSUFFICIENT_TOKENS', 'RATE_LIMITED', 'NOT_LOGGED_IN', 'AI_NOT_CONFIGURED', 'AI_TIMEOUT', 'AI_ERROR'])(
    '%s corta de inmediato sin reintentar', async (message) => {
      const call = failing(message, 'OK');
      await expect(transformWithFallback(call, { delay })).rejects.toThrow(message);
      expect(call).toHaveBeenCalledTimes(1);
    });

  it('acepta rechazos que no son Error', async () => {
    const call: EdgeCall = vi.fn(async () => { throw 'RATE_LIMITED'; });
    await expect(transformWithFallback(call, { delay })).rejects.toBe('RATE_LIMITED');
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('sin delay inyectado usa una espera real', async () => {
    const call = failing('NSFW_FILTER', 'OK');
    const started = Date.now();
    await transformWithFallback(call);
    expect(Date.now() - started).toBeGreaterThanOrEqual(400);
  });
});

describe('aiErrorToI18nKey', () => {
  it.each([
    ['INSUFFICIENT_TOKENS', 'cardEditor.errors.insufficientTokens'],
    ['SENSITIVE_PHOTO_NOT_SUPPORTED', 'cardEditor.errors.aiSensitivePhotoNotSupported'],
    ['SENSITIVE_CONTENT_FILTER', 'cardEditor.errors.aiSensitiveContent'],
    ['NSFW_FILTER', 'cardEditor.errors.aiSensitiveContent'],
    ['NOT_LOGGED_IN', 'cardEditor.errors.aiNotLoggedIn'],
    ['RATE_LIMITED', 'cardEditor.errors.aiRateLimited'],
    ['AI_TIMEOUT', 'cardEditor.errors.aiTimeout'],
    ['AI_ERROR', 'cardEditor.errors.genericContactAdmin'],
    ['cualquier otra cosa', 'cardEditor.errors.genericContactAdmin'],
  ])('%s → %s', (message, key) => {
    expect(aiErrorToI18nKey(message)).toBe(key);
  });
});

describe('isSensitiveContentError', () => {
  it('reconoce los códigos de contenido sensible y bloqueado', () => {
    expect(isSensitiveContentError('SENSITIVE_CONTENT_FILTER')).toBe(true);
    expect(isSensitiveContentError('SENSITIVE_PHOTO_NOT_SUPPORTED')).toBe(true);
    expect(isSensitiveContentError('NSFW_FILTER')).toBe(true);
  });
  it('no confunde otros errores', () => {
    expect(isSensitiveContentError('INSUFFICIENT_TOKENS')).toBe(false);
    expect(isSensitiveContentError('AI_ERROR')).toBe(false);
  });
});
