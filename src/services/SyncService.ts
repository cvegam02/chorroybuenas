import { CardRepository } from '../repositories/CardRepository';
import { BoardRepository } from '../repositories/BoardRepository';
import { SetRepository } from '../repositories/SetRepository';
import { loadCards, loadBoards } from '../utils/storage';
import { blobURLToBlob } from '../utils/indexedDB';
import type { Card } from '../types';

export class SyncService {
    /**
     * Main sync function called after successful login.
     * Migrates local cards and boards to Supabase.
     */
    static async syncLocalDataToCloud(userId: string): Promise<{ cardsMigrated: number, boardsMigrated: number }> {

        // Los tokens se leen siempre de la DB (TokenRepository.getBalance).
        // La fila en user_tokens se crea con app_config.initial_tokens la primera vez que se pide el balance (getBalance → initializeUser si no existe).

        // 1. Fetch local data
        const localCards = await loadCards();
        const localBoards = await loadBoards() || [];

        if (localCards.length === 0 && localBoards.length === 0) {
            return { cardsMigrated: 0, boardsMigrated: 0 };
        }

        // Get or create default set for migrated data (usa mutex para evitar duplicados)
        const sets = await SetRepository.getOrCreateDefaultSet(userId);
        const setId = sets[0].id;

        // 3. Migrate Cards
        const migratedCardIds: Record<string, string> = {};
        let cardsMigratedCount = 0;

        for (const localCard of localCards) {
            try {
                let imagePath: string | undefined;
                let originalImagePath: string | undefined;

                if (localCard.image) {
                    const body = localCard.image.startsWith('data:')
                        ? localCard.image
                        : await blobURLToBlob(localCard.image);
                    imagePath = await CardRepository.uploadImage(userId, localCard.id, body);
                }
                if (localCard.originalImage) {
                    const body = localCard.originalImage.startsWith('data:')
                        ? localCard.originalImage
                        : await blobURLToBlob(localCard.originalImage);
                    originalImagePath = await CardRepository.uploadImage(userId, localCard.id, body, true);
                }

                const dbCard = await CardRepository.createCard({
                    id: localCard.id,
                    user_id: userId,
                    set_id: setId,
                    title: localCard.title,
                    image_path: imagePath,
                    original_image_path: originalImagePath,
                    is_ai_generated: localCard.isAiGenerated || false
                });

                migratedCardIds[localCard.id] = dbCard.id!;
                cardsMigratedCount++;
            } catch (error) {
                console.error(`Failed to migrate card: ${localCard.title}`, error);
            }
        }

        // 4. Migrate Boards
        let boardsMigratedCount = 0;
        for (const localBoard of localBoards) {
            try {
                const cloudCards: Card[] = localBoard.cards
                    .map(localCard => ({
                        ...localCard,
                        id: migratedCardIds[localCard.id] || localCard.id
                    }))
                    .filter(card => migratedCardIds[card.id]);

                if (cloudCards.length > 0) {
                    await BoardRepository.saveBoard(userId, { ...localBoard, cards: cloudCards }, setId);
                    boardsMigratedCount++;
                }
            } catch (error) {
                console.error(`Failed to migrate board: ${localBoard.id}`, error);
            }
        }

        // 5. Cleanup (Optional/Deferred)
        // We might want to keep local data as backup for a while, 
        // but marking it as "synced" or clearing it is standard.
        // For now, let's keep it to be safe, or clear only after confirmation.
        // await cardStorage.clear();
        // localStorage.removeItem('loteria_boards');

        return { cardsMigrated: cardsMigratedCount, boardsMigrated: boardsMigratedCount };
    }
}
