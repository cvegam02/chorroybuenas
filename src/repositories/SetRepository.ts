import { supabase } from '../utils/supabaseClient';

const SETS_CACHE_TTL_MS = 15 * 1000; // 15 segundos
const setsCache = new Map<string, { sets: LoteriaSet[]; expiresAt: number }>();
const setsInFlight = new Map<string, Promise<LoteriaSet[]>>();

export type GridSize = 9 | 16;

export interface LoteriaSet {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  /** 9 = Kids 3x3, 16 = Classic 4x4. Defaults to 16 if missing (pre-migration). */
  grid_size?: GridSize;
}

function invalidateSetsCache(userId: string): void {
  setsCache.delete(userId);
}

/** Mutex por usuario para evitar crear múltiples sets por defecto en paralelo. */
const createDefaultSetMutex = new Map<string, Promise<LoteriaSet[]>>();

export class SetRepository {
  /**
   * Lista de sets del usuario. Usa cache y deduplicación en vuelo para evitar 3+ llamadas al cargar.
   */
  static async getSets(userId: string): Promise<LoteriaSet[]> {
    const now = Date.now();
    const cached = setsCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.sets;
    }
    let promise = setsInFlight.get(userId);
    if (promise) {
      return promise;
    }
    promise = this._fetchSets(userId);
    setsInFlight.set(userId, promise);
    try {
      const sets = await promise;
      setsCache.set(userId, { sets, expiresAt: now + SETS_CACHE_TTL_MS });
      return sets;
    } finally {
      setsInFlight.delete(userId);
    }
  }

  private static async _fetchSets(userId: string): Promise<LoteriaSet[]> {
    const { data, error } = await supabase
      .from('loteria_sets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  static async getSet(setId: string, userId: string): Promise<LoteriaSet | null> {
    const { data, error } = await supabase
      .from('loteria_sets')
      .select('*')
      .eq('id', setId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * Obtiene los sets del usuario. Si no tiene ninguno, crea uno por defecto.
   * Usa mutex para evitar que múltiples llamadas simultáneas creen duplicados.
   */
  static async getOrCreateDefaultSet(userId: string, defaultName = 'Mi primera lotería'): Promise<LoteriaSet[]> {
    let mutex = createDefaultSetMutex.get(userId);
    if (!mutex) {
      mutex = (async () => {
        let list = await this.getSets(userId);
        if (list.length === 0) {
          const newSet = await this.createSet(userId, defaultName);
          list = [newSet];
        }
        return list;
      })();
      createDefaultSetMutex.set(userId, mutex);
    }
    try {
      const result = await mutex;
      createDefaultSetMutex.delete(userId);
      return result;
    } catch (e) {
      createDefaultSetMutex.delete(userId);
      throw e;
    }
  }

  static async createSet(userId: string, name: string, gridSize: GridSize = 16): Promise<LoteriaSet> {
    invalidateSetsCache(userId);
    const { data, error } = await supabase
      .from('loteria_sets')
      .insert({ user_id: userId, name, grid_size: gridSize })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSet(setId: string, userId: string, updates: { name?: string; grid_size?: GridSize }): Promise<LoteriaSet> {
    invalidateSetsCache(userId);
    const { data, error } = await supabase
      .from('loteria_sets')
      .update(updates)
      .eq('id', setId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSet(setId: string, userId: string): Promise<void> {
    invalidateSetsCache(userId);
    const { error } = await supabase
      .from('loteria_sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Elimina un set junto con todas sus cartas, tableros e imágenes en Storage.
   */
  static async deleteSetWithImages(setId: string, userId: string): Promise<void> {
    const { data: cards, error: fetchError } = await supabase
      .from('cards')
      .select('image_path, original_image_path')
      .eq('set_id', setId)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    const paths = (cards ?? []).flatMap((c) =>
      [c.image_path, c.original_image_path].filter(Boolean)
    ) as string[];
    const uniquePaths = [...new Set(paths)];

    if (uniquePaths.length > 0) {
      try {
        await supabase.storage.from('card-images').remove(uniquePaths);
      } catch (storageErr) {
        console.warn('Error removing set images from storage:', storageErr);
      }
    }

    await this.deleteSet(setId, userId);
  }
}
