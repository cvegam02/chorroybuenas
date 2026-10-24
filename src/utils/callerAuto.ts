/**
 * Ritmos del modo automático del cantador (FEAT-55, US A5, decisión 16): el tradicional, tres cartas
 * seguidas y una pausa para poner los frijoles, o parejo, una carta cada tantos segundos.
 */
export type AutoRhythm = 'traditional' | '4' | '6' | '8' | '10';

export const AUTO_RHYTHMS: readonly AutoRhythm[] = ['traditional', '4', '6', '8', '10'];

export const DEFAULT_RHYTHM: AutoRhythm = 'traditional';

/** Lo que dice el cantador al empezar la partida, antes de la primera carta. Siempre en español (decisión 10). */
export const CALL_INTRO = 'Se va y se corre con…';

const TRADITIONAL_GAP_MS = 1500;
const TRADITIONAL_PAUSE_MS = 3000;
const TRADITIONAL_RUN = 3;

/** Cuánto esperar, desde que la voz termina, después de la carta número `drawn` (la primera es 1). */
export const delayAfterCard = (rhythm: AutoRhythm, drawn: number): number => {
  if (rhythm !== 'traditional') return Number(rhythm) * 1000;
  return drawn % TRADITIONAL_RUN === 0 ? TRADITIONAL_PAUSE_MS : TRADITIONAL_GAP_MS;
};

/** El ritmo guardado en el navegador, o el tradicional si falta o no se reconoce. */
export const parseRhythm = (value: string | null): AutoRhythm =>
  AUTO_RHYTHMS.includes(value as AutoRhythm) ? (value as AutoRhythm) : DEFAULT_RHYTHM;
