/**
 * La lista de cartas que se generan con IA en una lotería temática (FEAT-50, decisiones 4 a 6): cada
 * carta lleva número, nombre y escena, y se captura pegando un renglón por carta,
 * «número | NOMBRE | escena». La baraja tradicional es una plantilla que llena las 54.
 */

import { BASE_DECK_SIZE } from './baseDeck';
import { TRADITIONAL_DECK } from './traditionalDeck';

export const AI_CARD_MAX_NUMBER = 999;
export const AI_CARD_NAME_MAX_LENGTH = 80;
export const AI_CARD_SCENE_MAX_LENGTH = 2000;
export const AI_GENERAL_PROMPT_MAX_LENGTH = 4000;

export type AiInputSource = 'base' | 'reference' | 'none';
export type AiQuality = 'low' | 'medium' | 'high';

export interface AiCardText {
  number: number;
  name: string;
  scene: string;
}

export interface AiCardListError {
  /** Renglón, contando desde 1 y contando los vacíos, como lo ve quien pegó la lista. */
  line: number;
  text: string;
  reason: string;
}

type LineResult = { card: AiCardText } | { reason: string };

const parseLine = (text: string, seen: Set<number>): LineResult => {
  const [rawNumber, rawName, ...rest] = text.split('|');
  const numberText = rawNumber.trim();
  if (!/^\d+$/.test(numberText)) return { reason: 'empieza sin número' };
  const number = Number(numberText);
  if (number < 1 || number > AI_CARD_MAX_NUMBER) return { reason: `el número va del 1 al ${AI_CARD_MAX_NUMBER}` };
  if (seen.has(number)) return { reason: `el número ${number} ya está en la lista` };
  const name = (rawName ?? '').trim();
  if (name === '') return { reason: 'le falta el nombre' };
  if (name.length > AI_CARD_NAME_MAX_LENGTH) return { reason: `el nombre pasa de ${AI_CARD_NAME_MAX_LENGTH} letras` };
  const scene = rest.join('|').trim();
  if (scene.length > AI_CARD_SCENE_MAX_LENGTH) return { reason: `la escena pasa de ${AI_CARD_SCENE_MAX_LENGTH} letras` };
  return { card: { number, name, scene } };
};

/** Lee la lista pegada; los renglones vacíos se ignoran y los mal escritos se señalan sin perder los demás. */
export const parseCardList = (text: string): { cards: AiCardText[]; errors: AiCardListError[] } => {
  const cards: AiCardText[] = [];
  const errors: AiCardListError[] = [];
  const seen = new Set<number>();
  text.split(/\r?\n/).forEach((raw, index) => {
    if (raw.trim() === '') return;
    const result = parseLine(raw, seen);
    if ('reason' in result) {
      errors.push({ line: index + 1, text: raw.trim(), reason: result.reason });
      return;
    }
    seen.add(result.card.number);
    cards.push(result.card);
  });
  return { cards, errors };
};

/** Las 54 de la baraja tradicional, con el nombre en mayúsculas como va dibujado en la carta. */
export const traditionalCardList = (): AiCardText[] =>
  TRADITIONAL_DECK.map((name, index) => ({ number: index + 1, name: name.toLocaleUpperCase('es'), scene: '' }));

/** Se parte de la baraja base cuando todas las cartas tienen ahí su número; si no, solo del prompt. */
export const defaultInputSource = (cards: readonly { number: number }[]): AiInputSource =>
  cards.every((card) => card.number <= BASE_DECK_SIZE) ? 'base' : 'none';

const sameName = (a: string, b: string) => a.trim().localeCompare(b.trim(), 'es', { sensitivity: 'base' }) === 0;

/** Lo que un renglón cambia en una carta: la escena y, si trae otro nombre, el nombre (decisión 12). */
export interface SceneUpdate {
  scene: string;
  name?: string;
}

type SceneLineResult = { number: number; update: SceneUpdate } | { reason: string };

const parseSceneLine = (text: string, names: ReadonlyMap<number, string>, seen: Set<number>): SceneLineResult => {
  const [rawNumber, ...rest] = text.split('|');
  const numberText = rawNumber.trim();
  if (!/^\d+$/.test(numberText)) return { reason: 'empieza sin número' };
  const number = Number(numberText);
  const name = names.get(number);
  if (name === undefined) return { reason: `no hay carta ${number} en la lista` };
  if (seen.has(number)) return { reason: `el número ${number} ya está en la lista` };
  // «6 | NOMBRE | escena»: el nombre se ignora si es el de la carta; si es otro, la carta se renombra.
  const newName = rest.length > 1 ? rest[0].trim() : null;
  if (newName === '') return { reason: 'le falta el nombre' };
  if (newName && newName.length > AI_CARD_NAME_MAX_LENGTH) return { reason: `el nombre pasa de ${AI_CARD_NAME_MAX_LENGTH} letras` };
  const scene = (newName === null ? rest : rest.slice(1)).join('|').trim();
  if (scene === '') return { reason: 'le falta la escena' };
  if (scene.length > AI_CARD_SCENE_MAX_LENGTH) return { reason: `la escena pasa de ${AI_CARD_SCENE_MAX_LENGTH} letras` };
  return { number, update: newName && !sameName(newName, name) ? { name: newName, scene } : { scene } };
};

/**
 * Escenas pegadas sobre la lista ya cargada (FEAT-50, decisiones 11 y 12): «6 | escena» o «6 | NOMBRE | escena».
 * Cada escena va a la carta de ese número y, si el nombre es otro, la renombra; los renglones que no
 * sirven se señalan sin perder los demás.
 */
export const parseSceneList = (
  text: string,
  cards: readonly { number: number; name: string }[],
): { scenes: Map<number, SceneUpdate>; errors: AiCardListError[] } => {
  const names = new Map(cards.map((card) => [card.number, card.name]));
  const scenes = new Map<number, SceneUpdate>();
  const errors: AiCardListError[] = [];
  const seen = new Set<number>();
  text.split(/\r?\n/).forEach((raw, index) => {
    if (raw.trim() === '') return;
    const result = parseSceneLine(raw, names, seen);
    if ('reason' in result) {
      errors.push({ line: index + 1, text: raw.trim(), reason: result.reason });
      return;
    }
    seen.add(result.number);
    scenes.set(result.number, result.update);
  });
  return { scenes, errors };
};
