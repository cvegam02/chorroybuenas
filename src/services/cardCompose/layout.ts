import { printableCardTitle } from '../../utils/cardTitle';
import {
  CARD_FRAME_RATIO,
  CARD_HEIGHT_RATIO,
  CARD_MARGIN_RATIO,
  CARD_NAME_MIN_SIZE_RATIO,
  CARD_NAME_SIZE_RATIO,
  CARD_NUMBER_SIZE_RATIO,
  CARD_TEXT_PADDING_RATIO,
} from './constants';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardNameLayout {
  /** Tamaño de letra normal y el más chico permitido. */
  maxSize: number;
  minSize: number;
  /** Ancho que puede ocupar el nombre, contorno incluido. */
  maxWidth: number;
  centerX: number;
  /** Hasta dónde puede bajar el nombre. */
  bottom: number;
}

export interface CardComposeLayout {
  width: number;
  height: number;
  /** Marco negro alrededor de la foto; `null` en la carta sin marco. */
  frame: Rect | null;
  photo: Rect;
  name: CardNameLayout;
  /** Lugar reservado al número de carta, que todavía no se dibuja. */
  number: { x: number; top: number; size: number };
}

/** Medidas de la carta compuesta, con el origen arriba a la izquierda. Todo sale del ancho de la carta. */
export function cardComposeLayout(width: number, framed: boolean): CardComposeLayout {
  const height = width * CARD_HEIGHT_RATIO;
  const margin = width * CARD_MARGIN_RATIO;
  const inset = margin + width * CARD_FRAME_RATIO;
  const padding = width * CARD_TEXT_PADDING_RATIO;

  // El texto va en el mismo lugar con marco o sin él, para que las cartas de un tablero se vean parejas.
  const textArea: Rect = { x: inset, y: inset, width: width - inset * 2, height: height - inset * 2 };

  return {
    width,
    height,
    frame: framed ? { x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 } : null,
    photo: framed ? textArea : { x: 0, y: 0, width, height },
    name: {
      maxSize: width * CARD_NAME_SIZE_RATIO,
      minSize: width * CARD_NAME_MIN_SIZE_RATIO,
      maxWidth: textArea.width - padding * 2,
      centerX: width / 2,
      bottom: textArea.y + textArea.height - padding,
    },
    number: { x: textArea.x + padding, top: textArea.y + padding, size: width * CARD_NUMBER_SIZE_RATIO },
  };
}

/** El nombre como se escribe en la carta: en mayúsculas y sin lo que la letra no sabe dibujar. */
export function cardNameText(title: string): string {
  return printableCardTitle(title).toLocaleUpperCase('es-MX');
}

/** Ancho de un texto a un tamaño de letra. */
export type TextMeasurer = (text: string, size: number) => number;

const ELLIPSIS = '…';

const truncateToWidth = (text: string, measure: TextMeasurer, size: number, maxWidth: number): string => {
  let length = text.length;
  while (length > 0 && measure(`${text.slice(0, length).trimEnd()}${ELLIPSIS}`, size) > maxWidth) length--;
  return `${text.slice(0, length).trimEnd()}${ELLIPSIS}`;
};

/** Parte el nombre en dos renglones por el espacio que los deja más parejos. `null` si no tiene espacios. */
const balancedSplit = (text: string, measure: TextMeasurer, size: number): [string, string] | null => {
  let best: { lines: [string, string]; widest: number } | null = null;

  for (let i = text.indexOf(' '); i !== -1; i = text.indexOf(' ', i + 1)) {
    const lines: [string, string] = [text.slice(0, i), text.slice(i + 1)];
    const widest = Math.max(measure(lines[0], size), measure(lines[1], size));
    if (!best || widest < best.widest) best = { lines, widest };
  }
  return best ? best.lines : null;
};

/** Llena el primer renglón con las palabras que quepan y corta el resto con «…» en el segundo. */
const truncatedLines = (text: string, measure: TextMeasurer, size: number, maxWidth: number): string[] => {
  const words = text.split(' ');
  let first = '';
  let used = 0;
  while (used < words.length && measure(first ? `${first} ${words[used]}` : words[used], size) <= maxWidth) {
    first = first ? `${first} ${words[used]}` : words[used];
    used++;
  }

  // Ni la primera palabra cabe sola: no hay por dónde partir.
  if (used === 0) return [truncateToWidth(text, measure, size, maxWidth)];
  return [first, truncateToWidth(words.slice(used).join(' '), measure, size, maxWidth)];
};

/**
 * Renglones y tamaño de letra del nombre (FEAT-29, decisiones 3 y 12). Un renglón a tamaño normal si cabe;
 * si no, un renglón con la letra más grande que quepa, sin bajar del mínimo; si ni así, dos renglones con
 * la letra más chica. Lo que tampoco cabe en dos renglones se corta con «…».
 */
export function fitCardName(text: string, measure: TextMeasurer, name: CardNameLayout): { lines: string[]; size: number } {
  const fits = (line: string, size: number) => measure(line, size) <= name.maxWidth;

  const widthAtMaxSize = measure(text, name.maxSize);
  if (widthAtMaxSize <= name.maxWidth) return { lines: [text], size: name.maxSize };

  // El ancho crece en proporción al tamaño; se redondea hacia abajo para no quedar justo en la orilla.
  const proportional = Math.floor((name.maxSize * name.maxWidth * 2) / widthAtMaxSize) / 2;
  const size = Math.max(name.minSize, proportional);
  if (fits(text, size)) return { lines: [text], size };

  const split = balancedSplit(text, measure, size);
  if (split && fits(split[0], size) && fits(split[1], size)) return { lines: split, size };

  return { lines: truncatedLines(text, measure, size, name.maxWidth), size };
}
