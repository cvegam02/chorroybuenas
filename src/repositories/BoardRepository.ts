import { supabase } from '../utils/supabaseClient';
import { Board } from '../types';
import { CardRepository } from './CardRepository';

export interface BoardDB {
    id?: string;
    user_id: string;
    set_id: string;
    grid_size: number;
    created_at?: string;
}

export class BoardRepository {
    /**
     * Save a board and its card associations.
     */
    static async saveBoard(userId: string, board: Board, setId: string): Promise<string> {
        // 1. Create the board record
        const { data: boardData, error: boardError } = await supabase
            .from('boards')
            .insert({
                user_id: userId,
                set_id: setId,
                grid_size: board.cards.length
            })
            .select('id')
            .single();

        if (boardError) throw boardError;
        const boardId = boardData.id;

        // 2. Insert card associations
        const boardCards = board.cards.map((card, index) => ({
            board_id: boardId,
            card_id: card.id,
            position: index
        }));

        const { error: cardsError } = await supabase
            .from('board_cards')
            .insert(boardCards);

        if (cardsError) throw cardsError;

        return boardId;
    }

    /**
     * Fetch all boards for a user in the given set, including their associated cards.
     */
    static async getBoards(userId: string, setId: string): Promise<Board[]> {
        const { data, error } = await supabase
            .from('boards')
            .select(`
                id,
                grid_size,
                created_at,
                board_cards (
                    position,
                    cards (*)
                )
            `)
            .eq('user_id', userId)
            .eq('set_id', setId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Reunir todas las rutas de imagen y obtener signed URLs en un solo batch (reutiliza cache)
        const allPaths = data.flatMap((board) =>
            (board.board_cards as any[]).map((bc: any) => bc.cards?.image_path).filter(Boolean)
        ) as string[];
        const urlMap = allPaths.length > 0
            ? await CardRepository.getImageUrls([...new Set(allPaths)])
            : new Map<string, string>();

        return data.map((board) => {
            const sortedBc = [...board.board_cards].sort((a: any, b: any) => a.position - b.position);
            const cards = sortedBc.map((bc: any) => ({
                id: bc.cards.id,
                title: bc.cards.title,
                image: bc.cards.image_path ? urlMap.get(bc.cards.image_path) : undefined,
                imagePath: bc.cards.image_path ?? undefined,
                originalImagePath: bc.cards.original_image_path ?? undefined,
                isAiGenerated: bc.cards.is_ai_generated
            }));

            return {
                id: board.id,
                cards,
                gridSize: (board.grid_size === 9 ? 9 : 16) as 9 | 16
            };
        });
    }

    /**
     * Delete a board.
     */
    static async deleteBoard(boardId: string): Promise<void> {
        const { error } = await supabase
            .from('boards')
            .delete()
            .eq('id', boardId);

        if (error) throw error;
    }

    /**
     * Delete all boards for a user's set.
     */
    static async deleteAllBoardsForSet(userId: string, setId: string): Promise<void> {
        const { error } = await supabase
            .from('boards')
            .delete()
            .eq('user_id', userId)
            .eq('set_id', setId);

        if (error) throw error;
    }
}
