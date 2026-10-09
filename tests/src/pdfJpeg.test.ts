import { describe, expect, it, vi } from 'vitest';
import { ensureJpegBytes } from '../../src/services/pdf/jpeg';

const ascii = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0));
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = new Uint8Array([...ascii('RIFF'), 0x10, 0x00, 0x00, 0x00, ...ascii('WEBP')]);
const UNKNOWN = new Uint8Array([0x47, 0x49, 0x46, 0x38]);
const CONVERTED = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]);

describe('las imágenes entran al PDF como JPEG (FEAT-27)', () => {
  it('una imagen que ya era JPEG no se vuelve a comprimir', async () => {
    const convert = vi.fn(async () => CONVERTED);

    expect(await ensureJpegBytes(JPEG, convert)).toBe(JPEG);
    expect(convert).not.toHaveBeenCalled();
  });

  it.each([
    ['PNG', PNG, 'png'],
    ['WebP', WEBP, 'webp'],
    ['de formato desconocido', UNKNOWN, 'otro'],
  ])('una imagen %s se convierte a JPEG', async (_name, bytes, format) => {
    const convert = vi.fn(async () => CONVERTED);

    expect(await ensureJpegBytes(bytes, convert)).toBe(CONVERTED);
    expect(convert).toHaveBeenCalledWith(bytes, format);
  });

  it('si la conversión falla, el error llega a quien arma el PDF', async () => {
    const convert = vi.fn(async () => {
      throw new Error('no se pudo leer la imagen');
    });

    await expect(ensureJpegBytes(PNG, convert)).rejects.toThrow('no se pudo leer la imagen');
  });
});
