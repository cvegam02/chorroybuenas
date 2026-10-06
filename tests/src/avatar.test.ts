import { describe, expect, it } from 'vitest';
import { resolveAvatarSource } from '../../src/utils/avatar';

describe('resolveAvatarSource', () => {
  it('prefiere avatar_path', () => {
    expect(resolveAvatarSource({ avatar_path: 'u1/avatar.png', avatar_url: 'https://lh3.googleusercontent.com/a' }))
      .toEqual({ kind: 'path', path: 'u1/avatar.png' });
  });

  it('extrae la ruta de una URL firmada antigua del bucket card-images', () => {
    const legacy = 'https://x.supabase.co/storage/v1/object/sign/card-images/u1/avatar.webp?token=abc';
    expect(resolveAvatarSource({ avatar_url: legacy })).toEqual({ kind: 'path', path: 'u1/avatar.webp' });
  });

  it('decodifica rutas con caracteres codificados', () => {
    const legacy = 'https://x.supabase.co/storage/v1/object/sign/card-images/u1/mi%20avatar.png?token=abc';
    expect(resolveAvatarSource({ avatar_url: legacy })).toEqual({ kind: 'path', path: 'u1/mi avatar.png' });
  });

  it('una URL firmada con codificación inválida se usa como URL externa en vez de tronar', () => {
    const broken = 'https://x.supabase.co/storage/v1/object/sign/card-images/u1/%E0%A4%A.png?token=abc';
    expect(resolveAvatarSource({ avatar_url: broken })).toEqual({ kind: 'url', url: broken });
  });

  it('usa tal cual una URL externa (p. ej. foto de Google)', () => {
    expect(resolveAvatarSource({ avatar_url: 'https://lh3.googleusercontent.com/a' }))
      .toEqual({ kind: 'url', url: 'https://lh3.googleusercontent.com/a' });
  });

  it('no confunde una URL firmada de otro bucket', () => {
    const other = 'https://x.supabase.co/storage/v1/object/sign/otro-bucket/u1/avatar.png?token=abc';
    expect(resolveAvatarSource({ avatar_url: other })).toEqual({ kind: 'url', url: other });
  });

  it.each([
    ['sin metadata', undefined],
    ['metadata vacía', {}],
    ['valores no string', { avatar_path: 42, avatar_url: null }],
    ['strings vacíos', { avatar_path: '', avatar_url: '' }],
  ])('devuelve null: %s', (_name, metadata) => {
    expect(resolveAvatarSource(metadata as Record<string, unknown> | undefined)).toBe(null);
  });
});
