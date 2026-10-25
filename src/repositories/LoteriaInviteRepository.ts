import { supabase } from '../utils/supabaseClient';
import { inviteFromRow, invitePreviewFromJson, type InvitePreview, type LoteriaInvite } from '../utils/loteriaInvite';

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
