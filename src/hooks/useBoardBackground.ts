import { useEffect, useMemo, useState } from 'react';
import { CardRepository } from '../repositories/CardRepository';
import { logger } from '../utils/logger';
import {
  OWN_IMAGE_BACKGROUND_ID,
  boardBackgroundOrDefault,
  ownImageBackground,
  type BoardBackground,
} from '../utils/boardBackgrounds';

interface SetBackgroundFields {
  board_background?: string;
  board_background_image_path?: string | null;
  board_background_lighten?: boolean;
}

interface BoardBackgroundState {
  /** El fondo de los tableros de la lotería, listo para la pantalla. */
  background: BoardBackground;
  /** Dirección de la imagen propia guardada (US A2), aunque el fondo elegido sea otro; null si no hay. */
  imageUrl: string | null;
}

/**
 * El fondo de los tableros de una lotería (FEAT-67). Si tiene imagen propia, pide su dirección al
 * almacenamiento privado; mientras llega, o si no se pudo, se ve el crema.
 */
export const useBoardBackground = (set: SetBackgroundFields | null): BoardBackgroundState => {
  const path = set?.board_background_image_path ?? null;
  const [image, setImage] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    CardRepository.getImageUrl(path)
      .then((url) => {
        if (!cancelled) setImage({ path, url });
      })
      .catch((error: unknown) => logger.error('Error loading board background image:', error));
    return () => {
      cancelled = true;
    };
  }, [path]);

  const imageUrl = image && image.path === path ? image.url : null;
  const id = set?.board_background;
  const lighten = set?.board_background_lighten ?? true;
  const background = useMemo(
    () => (id === OWN_IMAGE_BACKGROUND_ID ? ownImageBackground(imageUrl, lighten) : boardBackgroundOrDefault(id)),
    [id, imageUrl, lighten]
  );
  return { background, imageUrl };
};
