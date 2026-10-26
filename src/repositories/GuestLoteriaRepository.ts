import { supabase } from '../utils/supabaseClient';
import type { Card, GridSize } from '../types';
import type { CardLabels } from '../utils/cardLabels';
import { base64ToBlob } from '../utils/indexedDB';
import { withCardNumbers } from '../utils/cardNumbers';
import { guestCardError, guestImagePath, type GuestCardError, type LoteriaMember } from '../utils/guestCards';
import { CardRepository } from './CardRepository';
import { newUuid } from '../utils/newUuid';

export interface GuestLoteria {
  id: string;
  name: string;
  ownerId: string;
  gridSize: GridSize;
  cardLabels: CardLabels | undefined;
}

export interface GuestCard extends Card {
  /** Invitado que la subió; null si la subió el dueño. */
  uploadedBy: string | null;
}

/** Una lotería donde participa quien tiene la sesión («Loterías donde participo», US B5). */
export interface MyGuestLoteria {
  id: string;
  name: string;
  /** El nombre de la cuenta de quien organiza; null si no tiene. */
  organizerName: string | null;
  cardCount: number;
  /** El enlace sigue abierto: puede subir fotos. */
  canUpload: boolean;
}

export class GuestCardRejected extends Error {
  constructor(readonly reason: GuestCardError) {
    super(reason);
  }
}

/**
 * La lotería colectiva vista por un invitado (FEAT-56, US B3; migración 064). La base solo le deja leer la
 * lotería y sus cartas, y agregar cartas con `add_guest_card` mientras el enlace esté abierto.
 */
export class GuestLoteriaRepository {
  /** La lotería; null si no existe o ya no es invitado (lo quitaron). */
  static async getLoteria(setId: string): Promise<GuestLoteria | null> {
    const { data, error } = await supabase
      .from('loteria_sets')
      .select('id, name, user_id, grid_size, card_labels')
      .eq('id', setId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      ownerId: data.user_id,
      gridSize: data.grid_size === 9 ? 9 : 16,
      cardLabels: data.card_labels ?? undefined,
    };
  }

  /** Las loterías donde participa como invitado vigente, la más reciente primero (migración 067). */
  static async listMine(): Promise<MyGuestLoteria[]> {
    const { data, error } = await supabase.rpc('list_my_guest_loterias');
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      set_id: string;
      name: string;
      organizer_name: string | null;
      card_count: number;
      can_upload: boolean;
    }>;
    return rows.map((row) => ({
      id: row.set_id,
      name: row.name,
      organizerName: row.organizer_name,
      cardCount: row.card_count,
      canUpload: row.can_upload,
    }));
  }

  /** Si todavía puede subir fotos (es invitado y el enlace está abierto). */
  static async canUpload(setId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_upload_as_guest', { p_set_id: setId });
    if (error) throw error;
    return data === true;
  }

  /** Quiénes participan, con el nombre de su cuenta. */
  static async getMembers(setId: string): Promise<Map<string, LoteriaMember>> {
    const { data, error } = await supabase.rpc('loteria_members', { p_set_id: setId });
    if (error) throw error;
    const rows = (data ?? []) as Array<{ user_id: string; full_name: string | null; is_owner: boolean }>;
    return new Map(rows.map((row) => [row.user_id, { name: row.full_name, isOwner: row.is_owner }]));
  }

  /** Las cartas en el orden de la baraja, con su número y quién las subió. */
  static async getCards(setId: string): Promise<GuestCard[]> {
    const { data, error } = await supabase
      .from('cards')
      .select('id, title, image_path, is_ai_generated, uploaded_by')
      .eq('set_id', setId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const paths = [...new Set(data.map((c) => c.image_path).filter(Boolean))] as string[];
    const urls = paths.length > 0 ? await CardRepository.getImageUrls(paths) : new Map<string, string>();
    return withCardNumbers(
      data.map((c) => ({
        id: c.id,
        title: c.title,
        image: c.image_path ? urls.get(c.image_path) : undefined,
        imagePath: c.image_path ?? undefined,
        isAiGenerated: c.is_ai_generated ?? false,
        uploadedBy: c.uploaded_by ?? null,
      })),
    );
  }

  /**
   * Sube la imagen a la carpeta del invitado y agrega la carta al final de la baraja. Rechaza con
   * GuestCardRejected si la base no la acepta (título repetido, enlace cerrado…).
   */
  static async addCard(loteria: GuestLoteria, guestId: string, image: string, title: string): Promise<void> {
    const body = base64ToBlob(image);
    const cardId = newUuid();
    const path = guestImagePath(loteria.ownerId, guestId, cardId, body.type, Date.now());
    const { error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(path, body, { contentType: body.type || 'image/png', upsert: false });
    if (uploadError) {
      const reason = guestCardError(uploadError.message);
      // Con el enlace cerrado, la base ya no deja subir la imagen
      throw new GuestCardRejected(reason === 'unknown' && /row-level security/i.test(uploadError.message) ? 'closed' : reason);
    }
    const { error } = await supabase.rpc('add_guest_card', {
      p_set_id: loteria.id,
      p_card_id: cardId,
      p_title: title,
      p_image_path: path,
    });
    if (error) throw new GuestCardRejected(guestCardError(error.message));
  }
}
