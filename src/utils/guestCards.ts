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

export type GuestCardError = 'duplicateTitle' | 'closed' | 'invalidTitle' | 'guestLimit' | 'unknown';

/** El motivo por el que la base no aceptó la carta, a partir de su mensaje. */
export const guestCardError = (message: string | undefined): GuestCardError => {
  if (message?.includes('DUPLICATE_TITLE')) return 'duplicateTitle';
  if (message?.includes('INVITE_UNAVAILABLE')) return 'closed';
  if (message?.includes('INVALID_TITLE')) return 'invalidTitle';
  if (message?.includes('GUEST_LIMIT')) return 'guestLimit';
  return 'unknown';
};

/** Cartas que cada invitado puede subir a una lotería (FEAT-58, decisión 9; la base lo exige, migración 070). */
export const GUEST_CARDS_PER_LOTERIA = 60;

/** Cuántas cartas más puede subir el invitado a esta lotería. */
export const guestCardsLeft = (cards: ReadonlyArray<{ uploadedBy: string | null }>, guestId: string): number =>
  Math.max(0, GUEST_CARDS_PER_LOTERIA - cards.filter((card) => card.uploadedBy === guestId).length);

/** Lo que se espera cuando la base pide calma (10 cartas por minuto) y cuántas veces, unos dos minutos en total. */
const RATE_LIMIT_WAIT_MS = 15_000;
const RATE_LIMIT_RETRIES = 8;

/**
 * Agrega la carta; si el invitado ya subió 10 en el último minuto (FEAT-58, decisión 9), espera y vuelve a
 * intentar con la misma imagen, ya subida. `add` devuelve el mensaje de error de la base, o nada si entró.
 */
export async function addRetryingWhenRateLimited(
  add: () => Promise<string | undefined>,
  wait: (ms: number) => Promise<void>,
): Promise<string | undefined> {
  let error = await add();
  for (let attempt = 0; attempt < RATE_LIMIT_RETRIES && error?.includes('RATE_LIMITED'); attempt++) {
    await wait(RATE_LIMIT_WAIT_MS);
    error = await add();
  }
  return error;
}

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
