/** Cartas que suben los invitados de una lotería colectiva (FEAT-56, US B3; migración 064). */

/** La imagen del invitado va en `<dueño>/guests/<invitado>/…`: la única carpeta donde la base lo deja subir. */
export const guestImagePath = (
  ownerId: string,
  guestId: string,
  cardId: string,
  contentType: string,
  now: number,
): string => {
  const ext = contentType === 'image/jpeg' || contentType === 'image/jpg' ? 'jpg' : 'png';
  return `${ownerId}/guests/${guestId}/${cardId}_${now}.${ext}`;
};

export type GuestCardError = 'duplicateTitle' | 'closed' | 'invalidTitle' | 'unknown';

/** El motivo por el que la base no aceptó la carta, a partir de su mensaje. */
export const guestCardError = (message: string | undefined): GuestCardError => {
  if (message?.includes('DUPLICATE_TITLE')) return 'duplicateTitle';
  if (message?.includes('INVITE_UNAVAILABLE')) return 'closed';
  if (message?.includes('INVALID_TITLE')) return 'invalidTitle';
  return 'unknown';
};

export interface LoteriaMember {
  /** El nombre de la cuenta; null si no tiene. */
  name: string | null;
  isOwner: boolean;
}

export type Uploader = { kind: 'named'; name: string } | { kind: 'owner' } | { kind: 'guest' };

/** Quién subió una carta: el invitado de `uploadedBy` o, si no hay, el dueño de la lotería. */
export const uploaderName = (uploadedBy: string | null, members: ReadonlyMap<string, LoteriaMember>): Uploader => {
  const member = uploadedBy
    ? members.get(uploadedBy)
    : [...members.values()].find((m) => m.isOwner);
  if (member?.name) return { kind: 'named', name: member.name };
  return member?.isOwner ? { kind: 'owner' } : { kind: 'guest' };
};
