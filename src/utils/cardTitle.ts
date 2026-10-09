/**
 * Lo que admite el nombre de una carta (contexto-negocio §4): letras con acentos, ñ y ü, números, espacios
 * y signos comunes. Son los caracteres que la tipografía del PDF sabe dibujar; emojis y otros alfabetos, no.
 */
const LETTERS_AND_DIGITS = 'A-Za-z0-9À-ÖØ-öø-ÿ';
const SIGNS = '.,;:¡!¿?"\'()&/#%+\\-';
/** Las variantes que escriben solos los teclados: comillas y apóstrofo curvos, comillas angulares y rayas. */
const TYPOGRAPHIC_SIGNS = '“”‘’«»–—';

const NOT_PRINTABLE = new RegExp(`[^${LETTERS_AND_DIGITS}${SIGNS}${TYPOGRAPHIC_SIGNS}\\s]`, 'g');

/** Junta la letra con su tilde cuando vienen separadas, para no tomar la tilde suelta por un carácter raro. */
const compose = (title: string) => title.normalize('NFC');

/** `true` si el nombre solo lleva caracteres admitidos. */
export function isPrintableCardTitle(title: string): boolean {
  return compose(title).search(NOT_PRINTABLE) === -1;
}

/** El nombre sin lo que el PDF no puede dibujar. Para las cartas guardadas antes de la regla. */
export function printableCardTitle(title: string): string {
  return compose(title).replace(NOT_PRINTABLE, '').replace(/\s+/g, ' ').trim();
}
