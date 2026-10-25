import { supabase } from '../utils/supabaseClient';
import { inviteFromRow, invitePreviewFromJson, type InvitePreview, type LoteriaInvite } from '../utils/loteriaInvite';

/** Un invitado vigente de la lotería, como lo ve su dueño en «Invitados» (M19). */
export interface LoteriaInvitee {
  userId: string;
  /** El nombre de su cuenta; null si no tiene. */
  name: string | null;
  cardCount: number;
}

/**
 * Enlaces para invitar a subir fotos (FEAT-56, US B1; migración 062). Solo el dueño de la lotería los ve;
 * se escriben solo con las funciones de la base, que escogen el código.
 */
export class LoteriaInviteRepository {
  /** El enlace de la lotería; si no tenía, lo crea abierto (y la lotería pasa a ser «Colectiva»). */
  static async open(setId: string): Promise<LoteriaInvite> {
    const { data, error } = await supabase.rpc('open_loteria_invite', { p_set_id: setId });
    if (error) throw error;
    return inviteFromRow(data);
  }

  /** Otro código, abierto: el enlace anterior deja de servir. */
  static async regenerate(setId: string): Promise<LoteriaInvite> {
    const { data, error } = await supabase.rpc('regenerate_loteria_invite', { p_set_id: setId });
    if (error) throw error;
    return inviteFromRow(data);
  }

  static async close(setId: string): Promise<LoteriaInvite> {
    const { data, error } = await supabase.rpc('close_loteria_invite', { p_set_id: setId });
    if (error) throw error;
    return inviteFromRow(data);
  }

  /** Las loterías de la cuenta que son colectivas (tienen enlace, abierto o cerrado). */
  static async listCollectiveSetIds(): Promise<Set<string>> {
    const { data, error } = await supabase.from('loteria_invites').select('set_id');
    if (error) throw error;
    return new Set((data ?? []).map((row) => row.set_id as string));
  }

  /** «N fotos nuevas» de cada lotería colectiva de la cuenta; solo salen las que tienen alguna (US B4). */
  static async listNewGuestCardCounts(): Promise<Map<string, number>> {
    const { data, error } = await supabase.rpc('loteria_new_guest_cards');
    if (error) throw error;
    const rows = (data ?? []) as Array<{ set_id: string; new_count: number }>;
    return new Map(rows.map((row) => [row.set_id, row.new_count]));
  }

  /** El dueño abre la lotería: devuelve sus cartas nuevas de invitados y el contador se borra (US B4). */
  static async seeGuestCards(setId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('see_loteria_guest_cards', { p_set_id: setId });
    if (error) throw error;
    return ((data ?? []) as Array<{ card_id: string }>).map((row) => row.card_id);
  }

  /** Los invitados vigentes, con cuántas fotos subió cada uno (M19, US B4). */
  static async listInvitees(setId: string): Promise<LoteriaInvitee[]> {
    const { data, error } = await supabase.rpc('list_loteria_invitees', { p_set_id: setId });
    if (error) throw error;
    const rows = (data ?? []) as Array<{ user_id: string; full_name: string | null; card_count: number }>;
    return rows.map((row) => ({ userId: row.user_id, name: row.full_name, cardCount: row.card_count }));
  }

  /** Quita a un invitado: pierde el acceso y sus fotos se quedan (US B4). */
  static async removeInvitee(setId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_loteria_invitee', { p_set_id: setId, p_user_id: userId });
    if (error) throw error;
  }

  /** Lo que muestra la página del enlace (P9, US B2); también sin sesión. */
  static async preview(code: string): Promise<InvitePreview> {
    const { data, error } = await supabase.rpc('get_loteria_invite', { p_code: code });
    if (error) throw error;
    return invitePreviewFromJson(data);
  }

  /**
   * Se une a la lotería con el enlace y devuelve su id. Rechaza con un Error cuyo message es el código de la
   * base: INVITE_UNAVAILABLE (cerrado, reemplazado o inventado) o INVITEE_REMOVED.
   */
  static async join(code: string): Promise<string> {
    const { data, error } = await supabase.rpc('join_loteria', { p_code: code });
    if (error) {
      const known = ['INVITE_UNAVAILABLE', 'INVITEE_REMOVED'].find((c) => error.message?.includes(c));
      throw known ? new Error(known) : error;
    }
    return data as string;
  }
}
