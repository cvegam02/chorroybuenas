import { describe, expect, it } from 'vitest';
import { buildCorsHeaders, parseAllowedOrigins } from '../../supabase/functions/_shared/cors.ts';

const allowed = ['https://chorroybuenas.com.mx', 'http://localhost:5173'];

describe('parseAllowedOrigins', () => {
  it('separa por coma, recorta y quita diagonal final', () => {
    expect(parseAllowedOrigins(' https://a.dev/ , http://localhost:5173 ,, ')).toEqual(['https://a.dev', 'http://localhost:5173']);
  });
  it('sin valor devuelve lista vacía', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});

describe('buildCorsHeaders', () => {
  it('refleja un origen permitido', () => {
    const h = buildCorsHeaders('http://localhost:5173', allowed);
    expect(h['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(h['Vary']).toBe('Origin');
  });
  it('acepta el origen con diagonal final', () => {
    expect(buildCorsHeaders('http://localhost:5173/', allowed)['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });
  it('para un origen no permitido responde con el primero de la lista', () => {
    expect(buildCorsHeaders('https://evil.test', allowed)['Access-Control-Allow-Origin']).toBe('https://chorroybuenas.com.mx');
  });
  it('sin cabecera Origin responde con el primero de la lista', () => {
    expect(buildCorsHeaders(null, allowed)['Access-Control-Allow-Origin']).toBe('https://chorroybuenas.com.mx');
  });
  it('sin lista configurada no emite Allow-Origin', () => {
    expect(buildCorsHeaders('https://evil.test', [])['Access-Control-Allow-Origin']).toBeUndefined();
  });
  it('nunca responde con comodín', () => {
    expect(Object.values(buildCorsHeaders('https://evil.test', allowed))).not.toContain('*');
  });
});
