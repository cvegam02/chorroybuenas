/**
 * Ritmos del cantador (FEAT-55, US A5, decisión 16): el tradicional, tres cartas seguidas y una pausa para
 * poner los frijoles, o parejo, una carta cada tantos segundos. Personalizado (FEAT-59, US A3): los tiempos
 * los pone quien canta. Manual (FEAT-59, US A2): nada corre solo, quien canta saca cada carta.
 */
export type AutoRhythm = 'traditional' | '4' | '6' | '8' | '10' | 'custom' | 'manual';

/** Los ritmos que sacan cartas solos. */
type TimedRhythm = Exclude<AutoRhythm, 'manual'>;

export const AUTO_RHYTHMS: readonly AutoRhythm[] = ['traditional', '4', '6', '8', '10', 'custom', 'manual'];

export const DEFAULT_RHYTHM: AutoRhythm = 'traditional';

/** Lo que dice el cantador al empezar la partida, antes de la primera carta. Siempre en español (decisión 10). */
export const CALL_INTRO = 'Se va y se corre con…';

const TRADITIONAL_GAP_MS = 1500;
const TRADITIONAL_PAUSE_MS = 3000;
const TRADITIONAL_RUN = 3;

/** Los tiempos del ritmo personalizado (FEAT-59, US A3, decisión 3). `pauseEvery` 0 es «nunca». */
export interface CustomRhythm {
  gapSeconds: number;
  pauseEvery: number;
  pauseSeconds: number;
}

export const DEFAULT_CUSTOM_RHYTHM: CustomRhythm = { gapSeconds: 3, pauseEvery: 3, pauseSeconds: 5 };

export const CUSTOM_LIMITS = {
  gapSeconds: { min: 1, max: 15 },
  pauseEvery: { min: 2, max: 10 },
  pauseSeconds: { min: 1, max: 20 },
} as const;

const clampField = (value: number, field: keyof CustomRhythm): number => {
  if (!Number.isFinite(value)) return DEFAULT_CUSTOM_RHYTHM[field];
  const { min, max } = CUSTOM_LIMITS[field];
  return Math.min(max, Math.max(min, Math.round(value)));
};

/** Deja cada campo dentro de sus límites; en «Pausa cada», 0 o menos es «nunca». */
export const clampCustomRhythm = (custom: CustomRhythm): CustomRhythm => ({
  gapSeconds: clampField(custom.gapSeconds, 'gapSeconds'),
  pauseEvery: custom.pauseEvery <= 0 ? 0 : clampField(custom.pauseEvery, 'pauseEvery'),
  pauseSeconds: clampField(custom.pauseSeconds, 'pauseSeconds'),
});

/** El ritmo personalizado guardado en el navegador, dentro de sus límites; si falta o está roto, el de inicio. */
export const parseCustomRhythm = (raw: string | null): CustomRhythm => {
  if (!raw) return DEFAULT_CUSTOM_RHYTHM;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return DEFAULT_CUSTOM_RHYTHM;
  }
  if (typeof saved !== 'object' || saved === null) return DEFAULT_CUSTOM_RHYTHM;
  const field = (key: keyof CustomRhythm): number => {
    const value = (saved as Record<string, unknown>)[key];
    return typeof value === 'number' ? value : DEFAULT_CUSTOM_RHYTHM[key];
  };
  return clampCustomRhythm({ gapSeconds: field('gapSeconds'), pauseEvery: field('pauseEvery'), pauseSeconds: field('pauseSeconds') });
};

/** Cuánto esperar, desde que la voz termina, después de la carta número `drawn` (la primera es 1). */
export const delayAfterCard = (rhythm: TimedRhythm, drawn: number, custom: CustomRhythm = DEFAULT_CUSTOM_RHYTHM): number => {
  if (rhythm === 'custom') {
    const pause = custom.pauseEvery > 0 && drawn % custom.pauseEvery === 0;
    return (pause ? custom.pauseSeconds : custom.gapSeconds) * 1000;
  }
  if (rhythm !== 'traditional') return Number(rhythm) * 1000;
  return drawn % TRADITIONAL_RUN === 0 ? TRADITIONAL_PAUSE_MS : TRADITIONAL_GAP_MS;
};

/** El ritmo guardado en el navegador, o el tradicional si falta o no se reconoce. */
export const parseRhythm = (value: string | null): AutoRhythm =>
  AUTO_RHYTHMS.includes(value as AutoRhythm) ? (value as AutoRhythm) : DEFAULT_RHYTHM;

/** En manual nada corre solo (FEAT-59, US A2). */
export const isManual = (rhythm: AutoRhythm): rhythm is 'manual' => rhythm === 'manual';
