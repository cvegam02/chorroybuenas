import { CardRepository } from '../repositories/CardRepository';
import { BoardRepository } from '../repositories/BoardRepository';
import { SetRepository } from '../repositories/SetRepository';
import {
    clearAllData,
    loadBoardsCollection,
    loadCards,
    loadTransferPending,
    saveCards,
    saveTransferPending,
} from '../utils/storage';
import { blobURLToBlob } from '../utils/indexedDB';
import type { Card } from '../types';
import {
    runVisitorTransfer,
    type TransferOptions,
    type TransferResult,
    type VisitorTransferDeps,
} from './visitorTransfer';

/** Código de Postgres para «ya existe una fila con esa llave». */
const UNIQUE_VIOLATION = '23505';

const isAlreadyInAccount = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'code' in error && error.code === UNIQUE_VIOLATION;

const imageBody = (image: string): Promise<string | Blob> =>
    image.startsWith('data:') ? Promise.resolve(image) : blobURLToBlob(image);

const saveCard = async (userId: string, setId: string, card: Card): Promise<void> => {
    const imagePath = card.image
        ? await CardRepository.uploadImage(userId, card.id, await imageBody(card.image))
        : undefined;
    const originalImagePath = card.originalImage
        ? await CardRepository.uploadImage(userId, card.id, await imageBody(card.originalImage), true)
        : undefined;

    try {
        await CardRepository.createCard({
            id: card.id,
            user_id: userId,
            set_id: setId,
            title: card.title,
            image_path: imagePath,
            original_image_path: originalImagePath,
            is_ai_generated: card.isAiGenerated || false
        });
    } catch (error) {
        // Un intento anterior ya la había guardado: la carta está en la cuenta.
        if (!isAlreadyInAccount(error)) throw error;
    }
};

const deps: VisitorTransferDeps = {
    loadLocalCards: loadCards,
    loadLocalBoards: () => loadBoardsCollection()?.boards ?? [],
    loadPending: loadTransferPending,
    savePending: saveTransferPending,
    keepOnlyLocalCards: saveCards,
    clearLocal: clearAllData,
    getSets: (userId) => SetRepository.getOrCreateDefaultSet(userId),
    getCardCounts: async (userId) => {
        const summaries = await SetRepository.getSetSummaries(userId);
        return new Map(summaries.map((summary) => [summary.setId, summary.cardCount]));
    },
    createSet: (userId, name, gridSize) => SetRepository.createSet(userId, name, gridSize),
    setGridSize: async (setId, userId, gridSize) => {
        await SetRepository.updateSet(setId, userId, { grid_size: gridSize });
    },
    saveCard,
    saveBoard: async (userId, setId, cardIds) => {
        // `saveBoard` solo usa el id de cada carta y cuántas son.
        await BoardRepository.saveBoard(userId, { id: '', cards: cardIds.map((id) => ({ id, title: '' })) }, setId);
    },
};

const inFlight = new Map<string, Promise<TransferResult | null>>();

/**
 * Service to handle synchronization between LocalStorage/IndexedDB and Supabase
 */
export class SyncService {
    /**
     * Pasa a la cuenta lo hecho sin sesión en este navegador (FEAT-41). La lógica está en `runVisitorTransfer`.
     * Dos llamadas a la vez para la misma cuenta comparten un solo traspaso.
     */
    static syncLocalDataToCloud(userId: string, options: TransferOptions): Promise<TransferResult | null> {
        const running = inFlight.get(userId);
        if (running) return running;

        const transfer = runVisitorTransfer(deps, userId, options).finally(() => inFlight.delete(userId));
        inFlight.set(userId, transfer);
        return transfer;
    }
}
