import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyMpSignature } from '../../supabase/functions/_shared/mpSignature.ts';

const secret = 'test-secret';
const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex');

describe('verifyMpSignature', () => {
  it('acepta una firma válida', async () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;');
    expect(await verifyMpSignature({
      signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '123456', secret,
    })).toBe(true);
  });

  it('tolera espacios alrededor de las partes del header', async () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;');
    expect(await verifyMpSignature({
      signatureHeader: ` ts=1700000000 , v1=${v1} `, requestId: 'req-1', dataId: '123456', secret,
    })).toBe(true);
  });

  it('normaliza data.id a minúsculas', async () => {
    const v1 = sign('id:abc123;request-id:req-1;ts:1700000000;');
    expect(await verifyMpSignature({
      signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: 'ABC123', secret,
    })).toBe(true);
  });

  it('omite del manifest las partes ausentes', async () => {
    const v1 = sign('ts:1700000000;');
    expect(await verifyMpSignature({
      signatureHeader: `ts=1700000000,v1=${v1}`, requestId: null, dataId: null, secret,
    })).toBe(true);
  });

  it('rechaza si cambia el data.id', async () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;');
    expect(await verifyMpSignature({
      signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '999999', secret,
    })).toBe(false);
  });

  it('rechaza una firma hecha con otro secret', async () => {
    const v1 = createHmac('sha256', 'otro').update('id:123456;request-id:req-1;ts:1700000000;').digest('hex');
    expect(await verifyMpSignature({
      signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '123456', secret,
    })).toBe(false);
  });

  it.each([
    ['header ausente', null],
    ['header sin v1', 'ts=1700000000'],
    ['header sin ts', 'v1=abcdef'],
    ['header basura', 'hola'],
    ['v1 de otra longitud', 'ts=1700000000,v1=abc'],
  ])('rechaza: %s', async (_name, signatureHeader) => {
    expect(await verifyMpSignature({ signatureHeader, requestId: 'req-1', dataId: '123456', secret })).toBe(false);
  });
});
