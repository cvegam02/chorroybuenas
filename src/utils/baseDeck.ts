/**
 * Baraja base (FEAT-50, decisión 3): las 54 cartas tradicionales que el administrador sube una vez y
 * que se usan como imagen de entrada al generar cartas temáticas con IA. Cada una se guarda con su
 * número como nombre de archivo (migración 056); el nombre sale de la baraja tradicional.
 */

import { TRADITIONAL_DECK } from './traditionalDeck';

export const BASE_DECK_SIZE = TRADITIONAL_DECK.length;
export const BASE_DECK_MAX_BYTES = 10 * 1024 * 1024;
export const BASE_DECK_ACCEPTED_MIME_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export interface BaseDeckSlot {
  number: number;
  name: string;
}

export const BASE_DECK_SLOTS: readonly BaseDeckSlot[] = TRADITIONAL_DECK.map((name, index) => ({
  number: index + 1,
  name,
}));

/** Nombre del archivo en el espacio privado: el número, sin extensión ni ceros a la izquierda. */
export const baseDeckPath = (number: number) => String(number);

/** El número de carta de un archivo del espacio privado, o null si no es una carta base. */
export const baseDeckNumberFromPath = (path: string): number | null => {
  if (!/^[1-9]\d?$/.test(path)) return null;
  const number = Number(path);
  return number <= BASE_DECK_SIZE ? number : null;
};

export interface UploadCandidate {
  name: string;
  type: string;
  size: number;
}

export interface BaseDeckAssignment<T extends UploadCandidate> {
  /** Qué archivo va en cada número de carta. */
  byNumber: Map<number, T>;
  /** Archivos que no se pueden subir, con el motivo en lenguaje llano. */
  rejected: { file: T; reason: string }[];
}

const leadingNumber = (fileName: string): number | null => {
  const match = /^0*(\d+)/.exec(fileName);
  if (!match) return null;
  const number = Number(match[1]);
  return number >= 1 && number <= BASE_DECK_SIZE ? number : null;
};

const byNaturalName = <T extends UploadCandidate>(a: T, b: T) =>
  a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' });

/**
 * Asigna los archivos elegidos a los números de carta. Si todos empiezan con un número distinto del
 * 1 al 54 («06-la-sirena.webp»), cada uno va a su número; si no, se acomodan en orden de nombre
 * desde la carta 1. Lo que pasa de 54, no es imagen o pesa demasiado se rechaza.
 */
export const assignBaseDeckFiles = <T extends UploadCandidate>(files: readonly T[]): BaseDeckAssignment<T> => {
  const rejected: { file: T; reason: string }[] = [];
  const valid = files.filter((file) => {
    if (!BASE_DECK_ACCEPTED_MIME_TYPES.includes(file.type)) {
      rejected.push({ file, reason: 'no es una imagen JPG, PNG o WebP' });
      return false;
    }
    if (file.size > BASE_DECK_MAX_BYTES) {
      rejected.push({ file, reason: 'pesa más de 10 MB' });
      return false;
    }
    return true;
  });

  const numbers = valid.map((file) => leadingNumber(file.name));
  const allNumbered = numbers.every((number) => number !== null) && new Set(numbers).size === numbers.length;

  const byNumber = new Map<number, T>();
  if (allNumbered) {
    valid.forEach((file, index) => byNumber.set(numbers[index] as number, file));
    return { byNumber, rejected };
  }

  [...valid].sort(byNaturalName).forEach((file, index) => {
    if (index < BASE_DECK_SIZE) byNumber.set(index + 1, file);
    else rejected.push({ file, reason: `sobra: la baraja base tiene ${BASE_DECK_SIZE} cartas` });
  });
  return { byNumber, rejected };
};
