import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guardas de regresión sobre el código fuente: los handlers dependen de Deno y no se ejecutan
// en estos tests, así que aquí se fija lo que no deben volver a hacer.
const root = join(__dirname, '..', '..');
const functionsDir = join(root, 'supabase', 'functions');
const handlers = readdirSync(functionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
  .map((entry) => ({ name: entry.name, source: readFileSync(join(functionsDir, entry.name, 'index.ts'), 'utf8') }));

const BROWSER_FUNCTIONS = [
  'create-payment-preference', 'create-seasonal-preference', 'credit-payment-on-return', 'transform-loteria',
];

describe('edge functions: endurecimiento', () => {
  it('se revisan las cinco funciones', () => {
    expect(handlers.map((h) => h.name).sort()).toEqual([...BROWSER_FUNCTIONS, 'webhook-mercadopago'].sort());
  });

  it.each(handlers)('$name no usa CORS con comodín ni cabeceras CORS escritas a mano', ({ source }) => {
    expect(source).not.toMatch(/Access-Control-Allow-Origin/);
    expect(source).not.toMatch(/['"]\*['"]\s*,?\s*\n?\s*['"]Access-Control/);
  });

  it.each(handlers.filter((h) => BROWSER_FUNCTIONS.includes(h.name)))(
    '$name responde con la lista blanca de orígenes', ({ source }) => {
      expect(source).toContain("buildCorsHeaders(req.headers.get('Origin')");
      expect(source).toContain("Deno.env.get('ALLOWED_ORIGINS')");
    });

  it('el webhook no emite cabeceras CORS (lo llama un servidor)', () => {
    const webhook = handlers.find((h) => h.name === 'webhook-mercadopago');
    expect(webhook?.source).not.toContain('buildCorsHeaders');
  });

  it.each(handlers)('$name no devuelve el campo details', ({ source }) => {
    expect(source).not.toMatch(/\bdetails\s*:/);
  });

  it.each(handlers)('$name no reenvía al cliente el mensaje de un error capturado', ({ source }) => {
    // reply(...) nunca recibe err.message, error.message, userError.message ni el texto crudo de MP.
    const replies = source.match(/reply\([^;]*\);/gs) ?? [];
    expect(replies.length).toBeGreaterThan(0);
    for (const call of replies) {
      expect(call).not.toMatch(/\b(err|error|userError|rpcError|refundError)\b\??\.message/);
      expect(call).not.toMatch(/responseText|String\(err/);
    }
  });
});

describe('cliente: errores de compra', () => {
  const purchaseService = readFileSync(join(root, 'src', 'services', 'PurchaseService.ts'), 'utf8');

  it('no muestra al usuario detalles internos del servidor', () => {
    expect(purchaseService).not.toContain('Detalles:');
    expect(purchaseService).not.toMatch(/body\?\.details/);
  });
});
