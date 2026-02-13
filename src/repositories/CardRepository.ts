import { supabase } from '../utils/supabaseClient';
import { Card } from '../types';
import { z } from 'zod';

// Zod Schema for Card Validation
export const CardSchema = z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required').max(50),
    image_path: z.string().optional(),
    original_image_path: z.string().optional(),
    is_ai_generated: z.boolean().default(false),
    user_id: z.string().uuid(),
    set_id: z.string().uuid().optional().nullable()
});

export type CardDB = z.infer<typeof CardSchema>;

/** Cache en memoria para signed URLs: evita repetir llamadas a Storage para la misma ruta hasta que expire. */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
/** Margen (ms) antes del expiry para considerar la URL como válida (evita usar URLs a punto de caducar). */
const CACHE_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/** Cache para getCards: evita 2+ llamadas a la tabla cards al cargar (p. ej. Strict Mode). */
const cardsCache = new Map<string, { cards: Card[]; expiresAt: number }>();

export class CardRepository {
    private static BUCKET_NAME = 'card-images';

    /**
     * Upload an image (base64 or Blob) to Supabase Storage
     */
    static async uploadImage(userId: string, cardId: string, imageData: string | Blob, isOriginal = false): Promise<string> {
        let body: Blob;

        if (typeof imageData === 'string') {
            // Convert base64 to Blob if needed
            const { base64ToBlob } = await import('../utils/indexedDB');
            body = base64ToBlob(imageData);
        } else {
            body = imageData;
        }

        // Preserve the real content-type/extension (important for correct rendering later).
        const contentType = body.type || 'image/png';
        const ext =
            contentType === 'image/jpeg' || contentType === 'image/jpg'
                ? 'jpg'
                : contentType === 'image/png'
                    ? 'png'
                    : 'png';
        const fileName = `${userId}/${cardId}${isOriginal ? '_orig' : ''}_${Date.now()}.${ext}`;

        const { data, error } = await supabase.storage
            .from(this.BUCKET_NAME)
            .upload(fileName, body, {
                contentType,
                upsert: true
            });

        if (error) throw error;
        return data.path;
    }

    /** Default expiry for signed URLs (1 hour) */
    private static SIGNED_URL_EXPIRY_SEC = 3600;

    /**
     * Descarga un archivo de imagen desde Storage por path (para prefetch y PDF).
     */
    static async downloadImage(path: string): Promise<Blob> {
        const { data, error } = await supabase.storage.from(this.BUCKET_NAME).download(path);
        if (error) throw error;
        if (!data) throw new Error('Storage download returned no data');
        return data;
    }

    /**
     * Get a signed URL for a stored image (bucket privado: solo quien tiene sesión puede ver).
     * Usa cache en memoria para no repetir llamadas a Storage para la misma ruta hasta que expire.
     */
    static async getImageUrl(path: string, expireIn = this.SIGNED_URL_EXPIRY_SEC): Promise<string> {
        const now = Date.now();
        const entry = signedUrlCache.get(path);
        if (entry && entry.expiresAt > now + CACHE_EXPIRY_MARGIN_MS) {
            return entry.url;
        }
        const { data, error } = await supabase.storage
            .from(this.BUCKET_NAME)
            .createSignedUrl(path, expireIn);
        if (error) throw error;
        const expiresAt = now + expireIn * 1000;
        signedUrlCache.set(path, { url: data.signedUrl, expiresAt });
        return data.signedUrl;
    }

    /**
     * Obtiene signed URLs para varias rutas en paralelo, reutilizando cache.
     * Útil para reducir picos de llamadas: solo se piden las que no están en cache.
     */
    static async getImageUrls(paths: string[], expireIn = this.SIGNED_URL_EXPIRY_SEC): Promise<Map<string, string>> {
        const now = Date.now();
        const result = new Map<string, string>();
        const toFetch: string[] = [];
        for (const path of paths) {
            if (!path) continue;
            const entry = signedUrlCache.get(path);
            if (entry && entry.expiresAt > now + CACHE_EXPIRY_MARGIN_MS) {
                result.set(path, entry.url);
            } else {
                toFetch.push(path);
            }
        }
        const fetched = await Promise.all(
            toFetch.map(async (path) => {
                const url = await this.getImageUrl(path, expireIn);
                return { path, url };
            })
        );
        for (const { path, url } of fetched) {
            result.set(path, url);
        }
        return result;
    }

    private static invalidateCardsCache(userId: string, setId: string): void {
        cardsCache.delete(`${userId}:${setId}`);
    }

    /**
     * Save card metadata to PostgreSQL
     */
    static async createCard(card: Omit<CardDB, 'created_at' | 'updated_at'>): Promise<CardDB> {
        const validated = CardSchema.parse(card);
        if (validated.set_id) this.invalidateCardsCache(validated.user_id, validated.set_id);
        const { data, error } = await supabase
            .from('cards')
            .insert(validated)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update card metadata in PostgreSQL.
     * Si se pasa userId, se filtra por user_id para evitar actualizar filas de otro usuario (RLS + filtro explícito).
     */
    static async updateCard(cardId: string, updates: Partial<CardDB>, userId?: string): Promise<CardDB> {
        if (userId !== undefined && updates.set_id != null) {
            this.invalidateCardsCache(userId, updates.set_id);
        }
        let query = supabase.from('cards').update(updates).eq('id', cardId);
        if (userId !== undefined) {
            query = query.eq('user_id', userId);
        }
        const { data, error } = await query.select().single();
        if (error) throw error;
        if (data?.user_id && data?.set_id) this.invalidateCardsCache(data.user_id, data.set_id);
        return data;
    }

    /**
     * Insert or update card (evita 409 cuando la fila ya existe p. ej. por race con addCard).
     */
    static async upsertCard(card: Omit<CardDB, 'created_at' | 'updated_at'>): Promise<CardDB> {
        const validated = CardSchema.parse(card);
        const { data, error } = await supabase
            .from('cards')
            .upsert(validated, { onConflict: 'id' })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * Fetch all cards for the current user in the given set.
     * Las signed URLs se obtienen en batch y se reutiliza cache para no repetir llamadas a Storage.
     */
    static async getCards(userId: string, setId: string): Promise<Card[]> {
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .eq('user_id', userId)
            .eq('set_id', setId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const paths = data.flatMap((c) => [c.image_path, c.original_image_path].filter(Boolean)) as string[];
        const urlMap = paths.length > 0 ? await this.getImageUrls([...new Set(paths)]) : new Map<string, string>();

        return data.map((dbCard) => ({
            id: dbCard.id,
            title: dbCard.title,
            image: dbCard.image_path ? urlMap.get(dbCard.image_path) : undefined,
            originalImage: dbCard.original_image_path ? urlMap.get(dbCard.original_image_path) : undefined,
            imagePath: dbCard.image_path ?? undefined,
            originalImagePath: dbCard.original_image_path ?? undefined,
            isAiGenerated: dbCard.is_ai_generated
        }));
    }

    /**
     * Delete a card and its associated images from storage
     */
    static async deleteCard(cardId: string): Promise<void> {
        // 1. Get images paths and set_id for cache invalidation
        const { data: card, error: fetchError } = await supabase
            .from('cards')
            .select('image_path, original_image_path, user_id, set_id')
            .eq('id', cardId)
            .single();

        if (fetchError) throw fetchError;

        // 2. Delete metadata from DB
        const { error: deleteError } = await supabase
            .from('cards')
            .delete()
            .eq('id', cardId);

        if (deleteError) throw deleteError;
        if (card?.user_id && card?.set_id) this.invalidateCardsCache(card.user_id, card.set_id);

        // 3. Delete files from Storage (best-effort: no lanzar para que la UI pueda actualizarse)
        const pathsToDelete = [];
        if (card.image_path) pathsToDelete.push(card.image_path);
        if (card.original_image_path) pathsToDelete.push(card.original_image_path);

        if (pathsToDelete.length > 0) {
            try {
                await supabase.storage.from(this.BUCKET_NAME).remove(pathsToDelete);
            } catch (storageErr) {
                console.warn('Error removing card images from storage (card already deleted from DB):', storageErr);
            }
        }
    }
}
