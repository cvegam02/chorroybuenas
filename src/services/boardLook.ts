import { logger } from '../utils/logger';
import type { BoardLogoPosition, BoardTitlePosition } from '../utils/boardBackgrounds';

/** Lo que se guarda de los tableros de una lotería desde M22 (FEAT-67). */
export interface BoardLookUpdate {
  board_background: string;
  board_logo_position: BoardLogoPosition;
  board_title_position: BoardTitlePosition;
  board_background_lighten: boolean;
  /** Solo va cuando se subió una imagen nueva. */
  board_background_image_path?: string;
}

/** `T` es lo que devuelve guardar la lotería (en el sitio, la lotería ya guardada). */
export interface BoardLookDeps<T> {
  uploadImage: (file: File) => Promise<string>;
  removeImage: (path: string) => Promise<void>;
  updateSet: (update: BoardLookUpdate) => Promise<T>;
}

interface BoardLookInput {
  background: string;
  logoPosition: BoardLogoPosition;
  titlePosition: BoardTitlePosition;
  lighten: boolean;
  file: File | null;
  /** Ruta de la imagen propia que la lotería tiene guardada ahora; null si no tiene. */
  previousImagePath: string | null;
}

/**
 * Guarda fondo, posición del logo y «Aclarar la imagen». Con imagen nueva (US A2): primero la sube, luego
 * guarda la lotería y al final borra la anterior, para que la lotería nunca apunte a un archivo que no
 * existe. Si guardar la lotería falla, borra la recién subida. Lanza si no se pudo guardar.
 */
export async function saveBoardLook<T>(input: BoardLookInput, deps: BoardLookDeps<T>): Promise<T> {
  const newImagePath = input.file ? await deps.uploadImage(input.file) : null;
  const update: BoardLookUpdate = {
    board_background: input.background,
    board_logo_position: input.logoPosition,
    board_title_position: input.titlePosition,
    board_background_lighten: input.lighten,
    ...(newImagePath ? { board_background_image_path: newImagePath } : {}),
  };

  let saved: T;
  try {
    saved = await deps.updateSet(update);
  } catch (error) {
    if (newImagePath) {
      await deps.removeImage(newImagePath).catch((cleanupError: unknown) =>
        logger.warn('Could not remove the board background image after a failed save:', cleanupError)
      );
    }
    throw error;
  }

  // La imagen anterior ya no se usa: solo hay una por lotería (decisión 10).
  if (newImagePath && input.previousImagePath && input.previousImagePath !== newImagePath) {
    await deps.removeImage(input.previousImagePath).catch((error: unknown) =>
      logger.warn('Could not remove the previous board background image:', error)
    );
  }
  return saved;
}
