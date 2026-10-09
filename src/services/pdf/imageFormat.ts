export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'otro';

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];
const WEBP_SIGNATURE_OFFSET = 8;

const hasSignature = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length && signature.every((value, i) => bytes[offset + i] === value);

/**
 * Formato de una imagen según sus primeros bytes. Es más fiable que el tipo que declara el archivo:
 * Storage a veces sirve un JPEG como `image/png`.
 */
export const imageFormatOfBytes = (bytes: Uint8Array): ImageFormat => {
  if (hasSignature(bytes, JPEG_SIGNATURE)) return 'jpeg';
  if (hasSignature(bytes, PNG_SIGNATURE)) return 'png';
  if (hasSignature(bytes, RIFF_SIGNATURE) && hasSignature(bytes, WEBP_SIGNATURE, WEBP_SIGNATURE_OFFSET)) return 'webp';
  return 'otro';
};
