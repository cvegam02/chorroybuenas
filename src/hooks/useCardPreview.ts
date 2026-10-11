import { useEffect, useState } from 'react';
import { composeCard } from '../services/cardCompose/compose';
import { logger } from '../utils/logger';

/** Espera a que se deje de escribir antes de volver a componer la carta. */
const COMPOSE_DELAY_MS = 250;

interface CardPreviewInput {
  photo: string | null;
  name: string;
  number?: number;
  /** Con margen y marco (foto normal) o sin ellos (carta ya convertida con IA). */
  framed?: boolean;
}

/**
 * La carta como va a salir impresa (foto, marco, número y nombre), para verla mientras se escribe su nombre.
 * Usa el mismo compositor que las cartas de la cuadrícula. Devuelve `null` mientras se compone la primera
 * vez o si no se pudo: ahí quien la usa muestra la foto. No guarda nada.
 */
export const useCardPreview = ({ photo, name, number, framed = true }: CardPreviewInput): string | null => {
  const [preview, setPreview] = useState<{ photo: string; url: string } | null>(null);

  useEffect(() => {
    if (!photo) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      composeCard({ photo, name, framed, number })
        .then((url) => {
          if (!cancelled) setPreview({ photo, url });
        })
        .catch((error) => {
          logger.error('Error composing the card preview:', error);
        });
    }, COMPOSE_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [photo, name, number, framed]);

  // Mientras se escribe se deja la carta anterior; con otra foto, la vista previa vieja ya no vale.
  return photo && preview?.photo === photo ? preview.url : null;
};
