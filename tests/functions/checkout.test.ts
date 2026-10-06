import { describe, expect, it } from 'vitest';
import { pickInitPoint, resolveAppUrl, resolveCheckoutMode } from '../../supabase/functions/_shared/checkout.ts';

const allowed = ['https://chorroybuenas.com.mx', 'https://dev.ngrok-free.dev'];
const fallback = 'https://chorroybuenas.com.mx/';

describe('resolveAppUrl', () => {
  it('acepta un origen de la lista y descarta path y query', () => {
    expect(resolveAppUrl('https://dev.ngrok-free.dev/algo?x=1', allowed, fallback)).toBe('https://dev.ngrok-free.dev');
  });
  it.each([
    ['origen ajeno', 'https://evil.test'],
    ['no es url', 'javascript:alert(1)'],
    ['texto cualquiera', 'hola'],
    ['null', null],
    ['subdominio parecido', 'https://chorroybuenas.com.mx.evil.test'],
    ['mismo host por http', 'http://chorroybuenas.com.mx'],
    ['credenciales en la url', 'https://chorroybuenas.com.mx@evil.test'],
  ])('usa el fallback sin diagonal final: %s', (_name, requested) => {
    expect(resolveAppUrl(requested, allowed, fallback)).toBe('https://chorroybuenas.com.mx');
  });
});

describe('modo de checkout', () => {
  it('producción por default; sandbox solo con el flag en "true"', () => {
    expect(resolveCheckoutMode(undefined)).toBe('production');
    expect(resolveCheckoutMode('false')).toBe('production');
    expect(resolveCheckoutMode('1')).toBe('production');
    expect(resolveCheckoutMode('TRUE')).toBe('production');
    expect(resolveCheckoutMode('true')).toBe('sandbox');
  });
  it('elige el init_point según el modo', () => {
    const mp = { init_point: 'https://mp/prod', sandbox_init_point: 'https://mp/sandbox' };
    expect(pickInitPoint('production', mp)).toBe('https://mp/prod');
    expect(pickInitPoint('sandbox', mp)).toBe('https://mp/sandbox');
    expect(pickInitPoint('sandbox', { init_point: 'https://mp/prod' })).toBe('https://mp/prod');
    expect(pickInitPoint('production', { sandbox_init_point: 'https://mp/sandbox' })).toBe(null);
    expect(pickInitPoint('production', {})).toBe(null);
  });
});
