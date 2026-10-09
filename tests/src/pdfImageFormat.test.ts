import { describe, expect, it } from 'vitest';
import { imageFormatOfBytes } from '../../src/services/pdf/imageFormat';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);
const ascii = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0));

describe('formato de una imagen por sus primeros bytes (FEAT-27)', () => {
  it('reconoce un JPEG', () => {
    expect(imageFormatOfBytes(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe('jpeg');
  });

  it('reconoce un PNG', () => {
    expect(imageFormatOfBytes(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe('png');
  });

  it('reconoce un WebP', () => {
    expect(imageFormatOfBytes(bytes(...ascii('RIFF'), 0x10, 0x00, 0x00, 0x00, ...ascii('WEBP')))).toBe('webp');
  });

  it('un RIFF que no es WebP no se toma por WebP', () => {
    expect(imageFormatOfBytes(bytes(...ascii('RIFF'), 0x10, 0x00, 0x00, 0x00, ...ascii('WAVE')))).toBe('otro');
  });

  it('unos bytes vacíos o desconocidos son «otro»', () => {
    expect(imageFormatOfBytes(bytes())).toBe('otro');
    expect(imageFormatOfBytes(bytes(0x47, 0x49, 0x46, 0x38))).toBe('otro');
  });
});
