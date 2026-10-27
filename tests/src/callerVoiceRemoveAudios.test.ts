import { beforeEach, describe, expect, it, vi } from 'vitest';

// Carpeta simulada del bucket caller-audio: `list` pagina con limit/offset y `remove` borra.
const bucket = vi.hoisted(() => ({ files: [] as string[], removeCalls: [] as string[][] }));

vi.mock('../../src/utils/supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        list: async (_folder: string, opts: { limit: number; offset?: number }) => {
          const start = opts.offset ?? 0;
          return { data: bucket.files.slice(start, start + opts.limit).map((name) => ({ name })), error: null };
        },
        remove: async (paths: string[]) => {
          bucket.removeCalls.push(paths);
          return { data: [], error: null };
        },
      }),
    },
  },
}));

import { CallerVoiceService } from '../../src/services/CallerVoiceService';

describe('CallerVoiceService.removeAudios (FEAT-58, H20)', () => {
  beforeEach(() => {
    bucket.files = [];
    bucket.removeCalls = [];
  });

  it('al borrar una lotería con más de 1,000 audios los borra todos', async () => {
    bucket.files = Array.from({ length: 2345 }, (_, i) => `card-${i}.mp3`);
    await CallerVoiceService.removeAudios('u1', 's1');
    const removed = bucket.removeCalls.flat();
    expect(removed).toHaveLength(2345);
    expect(new Set(removed).size).toBe(2345);
    expect(removed[0]).toBe('u1/s1/card-0.mp3');
    expect(bucket.removeCalls.every((paths) => paths.length <= 1000)).toBe(true);
  });

  it('una carta sola borra solo su audio, sin listar la carpeta', async () => {
    bucket.files = ['c1.mp3', 'c2.mp3'];
    await CallerVoiceService.removeAudios('u1', 's1', 'c1');
    expect(bucket.removeCalls).toEqual([['u1/s1/c1.mp3']]);
  });

  it('una carpeta vacía no borra nada', async () => {
    await CallerVoiceService.removeAudios('u1', 's1');
    expect(bucket.removeCalls).toEqual([]);
  });
});
