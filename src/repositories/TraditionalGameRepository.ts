import { supabase } from '../utils/supabaseClient';
import type { GridSize } from '../types';
import type { TraditionalBoard } from '../utils/traditionalBoards';
import { traditionalGameFromRow, type TraditionalGame } from '../utils/traditionalGames';

const TABLE = 'traditional_games';
const COLUMNS = 'id, name, grid_size, boards, updated_at';

export interface TraditionalGameChanges {
  name?: string;
  gridSize?: GridSize;
  boards?: readonly TraditionalBoard[];
}

const toRow = (changes: TraditionalGameChanges) => ({
  ...(changes.name !== undefined && { name: changes.name.trim() }),
  ...(changes.gridSize !== undefined && { grid_size: changes.gridSize }),
  ...(changes.boards !== undefined && { boards: changes.boards }),
});

function readGame(row: unknown): TraditionalGame {
  const game = traditionalGameFromRow(row);
  if (!game) throw new Error('El juego guardado no tiene la forma esperada');
  return game;
}

/**
 * Juegos de lotería tradicional de la cuenta (FEAT-53, US A5; tabla `traditional_games`, migración 059).
 * La regla de acceso de la tabla deja ver y cambiar solo los propios; el dueño lo pone la base.
 */
export class TraditionalGameRepository {
  /** Los juegos de la cuenta, el más reciente primero. */
  static async list(): Promise<TraditionalGame[]> {
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(traditionalGameFromRow).filter((game): game is TraditionalGame => game !== null);
  }

  /** Un juego por su id; `null` si no existe o no es de la cuenta. */
  static async get(id: string): Promise<TraditionalGame | null> {
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? traditionalGameFromRow(data) : null;
  }

  static async create(game: Required<TraditionalGameChanges>): Promise<TraditionalGame> {
    const { data, error } = await supabase.from(TABLE).insert(toRow(game)).select(COLUMNS).single();
    if (error) throw error;
    return readGame(data);
  }

  static async update(id: string, changes: TraditionalGameChanges): Promise<void> {
    const { error } = await supabase.from(TABLE).update(toRow(changes)).eq('id', id);
    if (error) throw error;
  }

  static async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  }
}
