import { z } from 'zod';
import type { GridSize } from '../types';
import { minCardsForGrid } from './gridRules';

/** Cuántas cartas de cada lotería se piden para dibujar su abanico en Mi cuenta. */
export const PREVIEW_CARD_COUNT = 3;

/** Una carta del abanico tal como viene de la base: aún sin la dirección firmada de su imagen. */
export interface SetPreviewCardRow {
  id: string;
  title: string;
  imagePath: string | null;
  isAiGenerated: boolean;
}

/** Lo que Mi cuenta necesita saber de una lotería sin abrirla. */
export interface SetSummaryRow {
  setId: string;
  cardCount: number;
  boardCount: number;
  previewCards: SetPreviewCardRow[];
}

const countSchema = z.array(z.object({ count: z.number().int().nonnegative() }));

const summaryRowSchema = z.object({
  id: z.string(),
  card_count: countSchema,
  board_count: countSchema,
  preview: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      image_path: z.string().nullable().optional(),
      is_ai_generated: z.boolean().nullable().optional(),
    }),
  ),
});

/**
 * Convierte la respuesta de la consulta de resúmenes en datos del sitio. Lanza si la respuesta no trae
 * la forma esperada: es mejor avisar que mostrar conteos inventados.
 */
export const parseSetSummaryRows = (rows: unknown): SetSummaryRow[] =>
  z
    .array(summaryRowSchema)
    .parse(rows)
    .map((row) => ({
      setId: row.id,
      cardCount: row.card_count[0]?.count ?? 0,
      boardCount: row.board_count[0]?.count ?? 0,
      previewCards: row.preview.slice(0, PREVIEW_CARD_COUNT).map((card) => ({
        id: card.id,
        title: card.title,
        imagePath: card.image_path ?? null,
        isAiGenerated: card.is_ai_generated ?? false,
      })),
    }));

/** El modo de una lotería; las que no lo tienen guardado cuentan como Clásico, igual que al abrirlas. */
export const gridSizeOfSet = (set: { grid_size?: GridSize | null }): GridSize => set.grid_size ?? 16;

export type SetStatus =
  | { kind: 'empty' }
  | { kind: 'missingCards'; missing: number }
  | { kind: 'missingBoards' }
  | { kind: 'ready' };

interface SetStatusInput {
  cardCount: number;
  boardCount: number;
  gridSize: GridSize;
}

/**
 * En qué va una lotería: sin fotos, le faltan cartas para el mínimo de su modo, le faltan los tableros
 * o está lista para imprimir. El PDF se arma con los tableros, por eso «lista» pide al menos uno.
 */
export const setStatusOf = ({ cardCount, boardCount, gridSize }: SetStatusInput): SetStatus => {
  if (cardCount <= 0) return { kind: 'empty' };
  const missing = minCardsForGrid(gridSize) - cardCount;
  if (missing > 0) return { kind: 'missingCards', missing };
  if (boardCount <= 0) return { kind: 'missingBoards' };
  return { kind: 'ready' };
};

/**
 * Cuenta recién creada: el sitio le crea sola su primera lotería, así que «nueva» es tener solo esa
 * y sin cartas. Sin el resumen cargado no se puede saber, y entonces no cuenta como nueva.
 */
export const isNewAccount = (
  sets: readonly { id: string }[],
  summaries: ReadonlyMap<string, { cardCount: number }> | null,
): boolean => {
  if (sets.length !== 1 || summaries === null) return false;
  return summaries.get(sets[0].id)?.cardCount === 0;
};
