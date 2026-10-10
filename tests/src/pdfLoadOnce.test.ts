import { describe, expect, it, vi } from 'vitest';
import { createOnceLoader } from '../../src/services/pdf/loadOnce';

describe('lectura de las imágenes del PDF, una sola vez por carta (FEAT-25)', () => {
  it('una carta que aparece en varios tableros se lee una sola vez, aunque se pida al mismo tiempo', async () => {
    const loadOnce = createOnceLoader<string>();
    const read = vi.fn(async () => 'data:image/jpeg;base64,AAAA');

    const results = await Promise.all(Array.from({ length: 10 }, () => loadOnce('carta-1', read)));

    expect(read).toHaveBeenCalledTimes(1);
    expect(new Set(results)).toEqual(new Set(['data:image/jpeg;base64,AAAA']));
  });

  it('una carta ya leída no se vuelve a leer más adelante', async () => {
    const loadOnce = createOnceLoader<string>();
    const read = vi.fn(async () => 'imagen');

    await loadOnce('carta-1', read);
    await loadOnce('carta-1', read);

    expect(read).toHaveBeenCalledTimes(1);
  });

  it('cada carta distinta se lee por separado', async () => {
    const loadOnce = createOnceLoader<string>();
    const read = vi.fn(async () => 'imagen');

    await Promise.all([loadOnce('carta-1', read), loadOnce('carta-2', read)]);

    expect(read).toHaveBeenCalledTimes(2);
  });

  it('si la imagen no se encontró, el fallo no se queda guardado y se vuelve a pedir', async () => {
    const loadOnce = createOnceLoader<string>();
    const read = vi.fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('imagen');

    expect(await loadOnce('carta-1', read)).toBeNull();
    expect(await loadOnce('carta-1', read)).toBe('imagen');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('si la lectura falla con error, tampoco se queda guardado', async () => {
    const loadOnce = createOnceLoader<string>();
    const read = vi.fn<() => Promise<string | null>>()
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockResolvedValueOnce('imagen');

    await expect(loadOnce('carta-1', read)).rejects.toThrow('sin conexión');
    expect(await loadOnce('carta-1', read)).toBe('imagen');
  });
});
