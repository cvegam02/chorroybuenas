import { describe, expect, it } from 'vitest';
import {
  assertPredictionSucceeded, buildPredictionBody, mapSpendError, parseTransformRequest, toErrorResponse,
} from '../../supabase/functions/_shared/transform.ts';
import { isUuid, validateImageDataUri } from '../../supabase/functions/_shared/validation.ts';

const IMG = 'data:image/jpeg;base64,AAAA';
const SET = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('validateImageDataUri', () => {
  it('acepta jpeg, png y webp en base64', () => {
    for (const mime of ['jpeg', 'png', 'webp']) {
      expect(validateImageDataUri(`data:image/${mime};base64,AAAA`).ok).toBe(true);
    }
  });

  it.each([
    ['no string', 42],
    ['ausente', undefined],
    ['url http', 'https://evil.test/a.jpg'],
    ['svg', 'data:image/svg+xml;base64,AAAA'],
    ['sin base64', 'data:image/png,AAAA'],
    ['payload vacío', 'data:image/png;base64,'],
    ['caracteres inválidos', 'data:image/png;base64,<script>'],
  ])('rechaza: %s', (_name, image) => {
    expect(validateImageDataUri(image).ok).toBe(false);
  });

  it('rechaza imágenes sobre el tope', () => {
    expect(validateImageDataUri('data:image/png;base64,' + 'A'.repeat(50), 40)).toEqual({ ok: false, message: 'La imagen es demasiado grande.' });
  });
});

describe('isUuid', () => {
  it('distingue uuids', () => {
    expect(isUuid(SET)).toBe(true);
    expect(isUuid('nope')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe('parseTransformRequest', () => {
  it('aplica los valores por defecto', () => {
    expect(parseTransformRequest({ image: IMG })).toEqual({
      ok: true, value: { image: IMG, model: 'gpt-image', promptVariant: 0, strength: 0.5, setId: null },
    });
  });

  it('respeta parámetros válidos', () => {
    expect(parseTransformRequest({ image: IMG, model: 'flux', prompt_variant: 2, prompt_strength: 0.3, set_id: SET })).toEqual({
      ok: true, value: { image: IMG, model: 'flux', promptVariant: 2, strength: 0.3, setId: SET },
    });
  });

  it('normaliza parámetros fuera de rango en vez de fallar', () => {
    const r = parseTransformRequest({ image: IMG, model: 'otro', prompt_variant: 9, prompt_strength: 5, set_id: 'x' });
    expect(r).toEqual({ ok: true, value: { image: IMG, model: 'gpt-image', promptVariant: 0, strength: 0.5, setId: null } });
  });

  it.each([
    ['cuerpo nulo', null],
    ['cuerpo que no es objeto', 'hola'],
    ['sin imagen', {}],
    ['imagen como url', { image: 'https://example.com/a.jpg' }],
  ])('rechaza: %s', (_name, body) => {
    expect(parseTransformRequest(body).ok).toBe(false);
  });
});

describe('buildPredictionBody', () => {
  const base = { image: IMG, model: 'gpt-image' as const, promptVariant: 0 as const, strength: 0.5, setId: null };

  it('gpt-image: fidelidad alta sobre 0.4 y prompt según variante', () => {
    const high = buildPredictionBody(base).input as Record<string, unknown>;
    expect(high).toMatchObject({ input_images: [IMG], input_fidelity: 'high', aspect_ratio: '2:3' });
    const low = buildPredictionBody({ ...base, strength: 0.3, promptVariant: 2 }).input as Record<string, unknown>;
    expect(low.input_fidelity).toBe('low');
    expect(low.prompt).toContain('symbolic illustration');
    expect(low.prompt).not.toBe(high.prompt);
  });

  it('flux: acota el denoising entre 0.45 y 0.72 y usa 0.65 si la fuerza es 0', () => {
    const d = (strength: number) =>
      (buildPredictionBody({ ...base, model: 'flux', strength }).input as { denoising: number }).denoising;
    expect(d(0.1)).toBe(0.45);
    expect(d(0.6)).toBe(0.6);
    expect(d(1)).toBe(0.72);
    expect(d(0)).toBe(0.65);
  });

  it('cada modelo usa su propia versión', () => {
    expect(buildPredictionBody(base).version).not.toBe(buildPredictionBody({ ...base, model: 'flux' }).version);
  });
});

describe('assertPredictionSucceeded', () => {
  it('no lanza si la predicción terminó bien', () => {
    expect(() => assertPredictionSucceeded({ id: 'p', status: 'succeeded' })).not.toThrow();
  });

  it.each([
    ['NSFW detected', 'NSFW_FILTER'],
    ['request blocked by safety system', 'NSFW_FILTER'],
    ['violates content policy', 'NSFW_FILTER'],
    ['flagged as sensitive (E005)', 'SENSITIVE_CONTENT_FILTER'],
  ])('clasifica "%s" como %s', (error, code) => {
    expect(() => assertPredictionSucceeded({ id: 'p', status: 'failed', error })).toThrow(code);
  });

  it('detecta el filtro también en los logs', () => {
    expect(() => assertPredictionSucceeded({ id: 'p', status: 'failed', error: null, logs: 'code e005' })).toThrow('SENSITIVE_CONTENT_FILTER');
  });

  it('otros fallos y cancelaciones lanzan un error genérico', () => {
    expect(() => assertPredictionSucceeded({ id: 'p', status: 'failed', error: 'CUDA out of memory' })).toThrow('Predicción failed');
    expect(() => assertPredictionSucceeded({ id: 'p', status: 'canceled' })).toThrow('Predicción canceled');
  });
});

describe('mapSpendError', () => {
  it('reconoce los códigos de la RPC dentro del mensaje de Postgres', () => {
    expect(mapSpendError('INSUFFICIENT_TOKENS').message).toBe('INSUFFICIENT_TOKENS');
    expect(mapSpendError('ERROR: RATE_LIMITED').message).toBe('RATE_LIMITED');
  });
  it('otros errores conservan el detalle para el log', () => {
    expect(mapSpendError('connection refused').message).toBe('spend_tokens_for_user: connection refused');
  });
});

describe('toErrorResponse', () => {
  it.each([
    ['INSUFFICIENT_TOKENS', 402],
    ['RATE_LIMITED', 429],
    ['NSFW_FILTER', 422],
    ['SENSITIVE_CONTENT_FILTER', 422],
    ['AI_TIMEOUT', 504],
  ])('%s responde %i con su propio código', (code, status) => {
    const r = toErrorResponse(new Error(code));
    expect(r).toMatchObject({ status, body: { error: code }, internal: false });
    expect(r.body.message.length).toBeGreaterThan(0);
  });

  it('cualquier otro error responde AI_ERROR genérico sin filtrar el detalle', () => {
    const r = toErrorResponse(new Error('Replicate API (422): secret internal detail'));
    expect(r).toMatchObject({ status: 502, body: { error: 'AI_ERROR' }, internal: true });
    expect(r.body.message).not.toContain('secret');
  });

  it('acepta valores que no son Error', () => {
    expect(toErrorResponse('RATE_LIMITED').status).toBe(429);
    expect(toErrorResponse(undefined).status).toBe(502);
  });
});
