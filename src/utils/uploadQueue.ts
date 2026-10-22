/** Ventanas de subir fotos (FEAT-34, US A6): el número de la carta nueva y la cola de fotos por nombrar. */

/** El número que le toca a la carta que se está nombrando: las cartas nuevas van al final de la baraja. */
export function nextCardNumber(existingCards: number, namedInThisBatch: number = 0): number {
  return existingCards + namedInThisBatch + 1;
}

export type QueueItemState = 'done' | 'current' | 'pending';

/** Cómo va una foto de la cola: ya pasó, es la que se está nombrando o todavía espera. */
export function queueItemState(index: number, currentIndex: number): QueueItemState {
  if (index < currentIndex) return 'done';
  return index === currentIndex ? 'current' : 'pending';
}

/** Avance de la cola, de 0 a 100, contando la foto actual. */
export function queuePercent(currentIndex: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round(((currentIndex + 1) / total) * 100));
}

/** Avance al preparar las fotos antes de abrir «Nombra tus fotos», de 0 a 100 (FEAT-52). */
export function readingPercent(read: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((read / total) * 100));
}
