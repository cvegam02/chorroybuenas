import type { BoardStorage, Card, GridSize } from '../types';
import { logger } from '../utils/logger';

/** Intentos antes de dejar de insistir con las cartas que no se pudieron guardar. */
export const MAX_TRANSFER_ATTEMPTS = 3;

/** Lo que queda anotado en el navegador cuando un traspaso no terminó. */
export interface TransferPending {
  userId: string;
  setId: string;
  /** Cartas que ya están en la cuenta. */
  cardIds: string[];
  attempts: number;
}

export interface TransferResult {
  setId: string;
  cardsMigrated: number;
  cardsFailed: number;
  boardsMigrated: number;
}

export interface TransferOptions {
  /** Nombre de la lotería nueva, según cuántas tiene ya la cuenta. */
  newSetName: (existingSets: number) => string;
  onProgress?: (done: number, total: number) => void;
}

/** Acceso al navegador y a la cuenta. `SyncService` da el real; las pruebas, uno de mentira. */
export interface VisitorTransferDeps {
  loadLocalCards: () => Promise<Card[]>;
  loadLocalBoards: () => BoardStorage[];
  loadPending: () => TransferPending | null;
  savePending: (pending: TransferPending) => void;
  keepOnlyLocalCards: (cards: Card[]) => Promise<void>;
  clearLocal: () => Promise<void>;
  getSets: (userId: string) => Promise<Array<{ id: string }>>;
  getCardCounts: (userId: string) => Promise<ReadonlyMap<string, number>>;
  createSet: (userId: string, name: string, gridSize: GridSize) => Promise<{ id: string }>;
  setGridSize: (setId: string, userId: string, gridSize: GridSize) => Promise<void>;
  /** Sube la carta a la cuenta. Si ya estaba, termina sin error. */
  saveCard: (userId: string, setId: string, card: Card) => Promise<void>;
  saveBoard: (userId: string, setId: string, cardIds: string[]) => Promise<void>;
}

export type TransferTarget = { kind: 'existing'; setId: string } | { kind: 'new' };

const OWN_DESTINATION_PATHS = ['/comprar-tokens', '/tematicas'];

/** Páginas donde iniciar sesión tiene su propio regreso: ahí se guarda sin cambiar de página. */
export function keepsOwnDestination(pathname: string): boolean {
  return OWN_DESTINATION_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * A qué lotería va el trabajo de visitante: a la del traspaso que quedó a medias, si sigue existiendo;
 * a la primera de la cuenta, si está vacía; si no, a una nueva, para no mezclarlo con lo que ya había.
 */
export function pickTransferTarget(
  sets: ReadonlyArray<{ id: string }>,
  cardCounts: ReadonlyMap<string, number>,
  pendingSetId: string | null
): TransferTarget {
  if (pendingSetId && sets.some((set) => set.id === pendingSetId)) {
    return { kind: 'existing', setId: pendingSetId };
  }
  const first = sets[0];
  if (first && (cardCounts.get(first.id) ?? 0) === 0) {
    return { kind: 'existing', setId: first.id };
  }
  return { kind: 'new' };
}

const gridSizeOf = (board: BoardStorage): GridSize | undefined =>
  board.cardIds.length === 9 || board.cardIds.length === 16 ? board.cardIds.length : undefined;

/** Tableros completos y hechos solo con estas cartas (en el navegador pueden quedar de otra lotería). */
const boardsOf = (boards: BoardStorage[], cardIds: ReadonlySet<string>): BoardStorage[] =>
  boards.filter((board) => gridSizeOf(board) !== undefined && board.cardIds.every((id) => cardIds.has(id)));

async function saveCards(
  deps: VisitorTransferDeps,
  userId: string,
  setId: string,
  localCards: Card[],
  onProgress?: TransferOptions['onProgress']
): Promise<{ saved: string[]; failed: Card[] }> {
  const saved: string[] = [];
  const failed: Card[] = [];
  for (const card of localCards) {
    try {
      await deps.saveCard(userId, setId, card);
      saved.push(card.id);
    } catch (error) {
      logger.error(`No se pudo pasar la carta a la cuenta: ${card.title}`, error);
      failed.push(card);
    }
    onProgress?.(saved.length + failed.length, localCards.length);
  }
  return { saved, failed };
}

async function saveBoards(deps: VisitorTransferDeps, userId: string, setId: string, boards: BoardStorage[]): Promise<number> {
  let saved = 0;
  for (const board of boards) {
    try {
      await deps.saveBoard(userId, setId, board.cardIds);
      saved += 1;
    } catch (error) {
      logger.error(`No se pudo pasar el tablero a la cuenta: ${board.id}`, error);
    }
  }
  return saved;
}

/**
 * Pasa a la cuenta las cartas y los tableros hechos sin sesión. Devuelve `null` si no había nada que pasar.
 * Las cartas que fallan se quedan en el navegador para el siguiente intento; los tableros se guardan
 * hasta que todas las cartas están en la cuenta, para no dejar tableros incompletos.
 */
export async function runVisitorTransfer(
  deps: VisitorTransferDeps,
  userId: string,
  options: TransferOptions
): Promise<TransferResult | null> {
  const localCards = await deps.loadLocalCards();
  if (localCards.length === 0) return null;

  const stored = deps.loadPending();
  const pending = stored?.userId === userId ? stored : null;
  if (pending && pending.attempts >= MAX_TRANSFER_ATTEMPTS) {
    await deps.clearLocal();
    return null;
  }

  const alreadySaved = pending?.cardIds ?? [];
  const visitorCardIds = new Set([...alreadySaved, ...localCards.map((card) => card.id)]);
  const boards = boardsOf(deps.loadLocalBoards(), visitorCardIds);
  const gridSize = boards[0] ? gridSizeOf(boards[0]) : undefined;

  const sets = await deps.getSets(userId);
  const target = pickTransferTarget(sets, await deps.getCardCounts(userId), pending?.setId ?? null);
  let setId: string;
  if (target.kind === 'new') {
    setId = (await deps.createSet(userId, options.newSetName(sets.length), gridSize ?? 16)).id;
  } else {
    setId = target.setId;
    if (gridSize !== undefined) await deps.setGridSize(setId, userId, gridSize);
  }

  const { saved, failed } = await saveCards(deps, userId, setId, localCards, options.onProgress);

  if (failed.length > 0) {
    deps.savePending({
      userId,
      setId,
      cardIds: [...alreadySaved, ...saved],
      attempts: (pending?.attempts ?? 0) + 1,
    });
    if (saved.length > 0) await deps.keepOnlyLocalCards(failed);
    return { setId, cardsMigrated: saved.length, cardsFailed: failed.length, boardsMigrated: 0 };
  }

  const boardsMigrated = await saveBoards(deps, userId, setId, boards);
  await deps.clearLocal();
  return { setId, cardsMigrated: saved.length, cardsFailed: 0, boardsMigrated };
}
