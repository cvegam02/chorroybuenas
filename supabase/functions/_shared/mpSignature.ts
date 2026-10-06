/**
 * Verifica el header x-signature de Mercado Pago (HMAC-SHA256 en hex del manifest
 * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"). Las partes ausentes se omiten del manifest.
 */
export async function verifyMpSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): Promise<boolean> {
  if (!input.signatureHeader) return false;

  const parts = new Map<string, string>();
  for (const chunk of input.signatureHeader.split(',')) {
    const [key, value] = chunk.split('=').map((s) => s.trim());
    if (key && value) parts.set(key, value);
  }
  const ts = parts.get('ts');
  const v1 = parts.get('v1');
  if (!ts || !v1) return false;

  let manifest = '';
  if (input.dataId) manifest += `id:${input.dataId.toLowerCase()};`;
  if (input.requestId) manifest += `request-id:${input.requestId};`;
  manifest += `ts:${ts};`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(input.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');

  // Comparación en tiempo constante.
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
