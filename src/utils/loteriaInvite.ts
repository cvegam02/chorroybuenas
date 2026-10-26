/** El enlace para invitar a subir fotos a una lotería (FEAT-56, US B1; tabla `loteria_invites`). */
export interface LoteriaInvite {
  setId: string;
  code: string;
  /** Cerrado: nadie más puede unirse ni subir fotos con él. */
  isOpen: boolean;
}

/** La página pública para unirse a la lotería (P9). */
export const inviteLink = (origin: string, code: string): string => `${origin.replace(/\/+$/, '')}/unirse/${code}`;

/** Abre WhatsApp con el mensaje ya escrito: la app en el celular, WhatsApp Web en la computadora. */
export const whatsAppShareLink = (message: string): string => `https://wa.me/?text=${encodeURIComponent(message)}`;

export function inviteFromRow(row: unknown): LoteriaInvite {
  const r = row as { set_id?: unknown; code?: unknown; is_open?: unknown } | null;
  if (!r || typeof r.set_id !== 'string' || typeof r.code !== 'string' || typeof r.is_open !== 'boolean') {
    throw new Error('El enlace de la lotería no tiene la forma esperada');
  }
  return { setId: r.set_id, code: r.code, isOpen: r.is_open };
}

/** Quién abre el enlace: el dueño de la lotería, un invitado o nadie de ella todavía. */
export type InviteRole = 'owner' | 'guest' | 'none';

/** Lo que muestra la página del enlace (P9; `get_loteria_invite`, migración 063). */
export type InvitePreview =
  | {
      status: 'open';
      role: InviteRole;
      /** Solo para el dueño y los invitados, para llevarlos a la lotería. */
      setId: string | null;
      setName: string;
      /** El nombre de la cuenta que organiza; null si no tiene. Nunca el correo. */
      organizerName: string | null;
      cardCount: number;
    }
  | { status: 'unavailable' }
  | { status: 'removed' };

const ROLES: readonly InviteRole[] = ['owner', 'guest', 'none'];

/** Lee la respuesta de la base; lo que no entiende lo toma como un enlace que no sirve. */
export function invitePreviewFromJson(json: unknown): InvitePreview {
  const j = json as Record<string, unknown> | null;
  if (j?.status === 'removed') return { status: 'removed' };
  if (j?.status !== 'open') return { status: 'unavailable' };
  const role = ROLES.find((r) => r === j.role);
  const setId = typeof j.set_id === 'string' ? j.set_id : null;
  const organizerName = typeof j.organizer_name === 'string' ? j.organizer_name : null;
  if (!role || typeof j.set_name !== 'string' || typeof j.card_count !== 'number' || (role !== 'none' && !setId)) {
    return { status: 'unavailable' };
  }
  return { status: 'open', role, setId, setName: j.set_name, organizerName, cardCount: j.card_count };
}
