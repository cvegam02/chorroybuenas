import { describe, expect, it } from 'vitest';
import { cardComposeLayout, cardNameText, fitCardName } from '../../src/services/cardCompose/layout';
import { BOARD_WIDTH_PT, CARD_GAP_PT, MIN_TITLE_SIZE_PT } from '../../src/services/pdf/constants';

// Carta de referencia del diseño (FEAT-29, decisión 1).
const REFERENCE_WIDTH_PX = 1000;
// Ancho, en puntos, de la carta más chica que se imprime: la de un tablero de 4 × 4.
const SMALLEST_CARD_WIDTH_PT = (BOARD_WIDTH_PT - 3 * CARD_GAP_PT) / 4;

// Letra de mentira: cada carácter mide 0.6 veces el tamaño de la letra.
const measure = (text: string, size: number) => text.length * size * 0.6;

describe('medidas de la carta compuesta (FEAT-29, US A1)', () => {
  const framed = cardComposeLayout(REFERENCE_WIDTH_PX, true);

  it('la carta es 2:3 vertical', () => {
    expect(framed.width).toBe(1000);
    expect(framed.height).toBe(1500);
  });

  it('la carta con marco lleva margen crema del 4 % y un marco negro fino alrededor de la foto', () => {
    expect(framed.frame).toEqual({ x: 40, y: 40, width: 920, height: 1420 });
    expect(framed.photo).toEqual({ x: 45, y: 45, width: 910, height: 1410 });
  });

  it('el nombre mide 120 px como máximo y queda a 35 px del marco', () => {
    expect(framed.name.maxSize).toBe(120);
    expect(framed.name.maxWidth).toBe(910 - 2 * 35);
    expect(framed.name.centerX).toBe(500);
    expect(framed.name.bottom).toBe(45 + 1410 - 35);
  });

  it('la letra más chica equivale a 8 puntos en la carta de un tablero de 4 × 4', () => {
    const minSizePt = (framed.name.minSize / framed.width) * SMALLEST_CARD_WIDTH_PT;
    expect(minSizePt).toBeCloseTo(MIN_TITLE_SIZE_PT);
  });

  it('el lugar del número queda reservado en la esquina superior izquierda', () => {
    expect(framed.number).toEqual({ x: 45 + 35, top: 45 + 35, size: 110 });
  });

  it('las medidas salen del ancho de la carta', () => {
    const small = cardComposeLayout(500, true);
    expect(small.photo).toEqual({ x: 22.5, y: 22.5, width: 455, height: 705 });
    expect(small.name.maxSize).toBe(60);
  });

  it('la carta sin marco (convertida con IA) deja la ilustración entera', () => {
    const unframed = cardComposeLayout(REFERENCE_WIDTH_PX, false);
    expect(unframed.frame).toBeNull();
    expect(unframed.photo).toEqual({ x: 0, y: 0, width: 1000, height: 1500 });
  });

  it('el nombre va en el mismo lugar con marco o sin él', () => {
    const unframed = cardComposeLayout(REFERENCE_WIDTH_PX, false);
    expect(unframed.name).toEqual(framed.name);
    expect(unframed.number).toEqual(framed.number);
  });
});

describe('nombre de la carta compuesta (FEAT-29, US A1)', () => {
  const { name } = cardComposeLayout(REFERENCE_WIDTH_PX, true);

  it('va en mayúsculas, respetando acentos y Ñ, sin espacios de más', () => {
    expect(cardNameText('  el  niño   maría ')).toBe('EL NIÑO MARÍA');
    expect(cardNameText('pingüino')).toBe('PINGÜINO');
  });

  it('pierde lo que la letra no sabe dibujar', () => {
    expect(cardNameText('El gallo 🐓')).toBe('EL GALLO');
  });

  it('un nombre que cabe a tamaño normal no cambia', () => {
    const fitted = fitCardName('EL GALLO', measure, name);

    expect(fitted).toEqual({ lines: ['EL GALLO'], size: 120 });
  });

  it('un nombre que no cabe a tamaño normal se achica lo justo para caber en un renglón', () => {
    const fitted = fitCardName('LA ABUELA MARÍA', measure, name);

    expect(fitted.lines).toEqual(['LA ABUELA MARÍA']);
    expect(fitted.size).toBeLessThan(name.maxSize);
    expect(fitted.size).toBeGreaterThanOrEqual(name.minSize);
    expect(measure(fitted.lines[0], fitted.size)).toBeLessThanOrEqual(name.maxWidth + 0.001);
  });
});

describe('nombres largos en dos renglones (FEAT-29, US A3)', () => {
  const { name } = cardComposeLayout(REFERENCE_WIDTH_PX, true);
  const fits = (line: string, size: number) => measure(line, size) <= name.maxWidth + 0.001;

  it('un nombre que no cabe en un renglón con la letra más chica se parte en dos, por un espacio y parejo', () => {
    const fitted = fitCardName('EL CUMPLEAÑOS DE LA ABUELA', measure, name);

    expect(fitted).toEqual({ lines: ['EL CUMPLEAÑOS', 'DE LA ABUELA'], size: name.minSize });
  });

  it('el corte busca renglones parejos, no llenar el primero', () => {
    const fitted = fitCardName('LA TÍA DE MI PRIMA LUPITA', measure, name);

    expect(fitted.lines).toEqual(['LA TÍA DE MI', 'PRIMA LUPITA']);
  });

  it('un nombre que no cabe ni en dos renglones se corta con «…» al final del segundo', () => {
    const fitted = fitCardName('EL TÍO PANCHO CON SU GUITARRA Y EL PERRO DE LA ABUELA', measure, name);

    expect(fitted.size).toBe(name.minSize);
    expect(fitted.lines).toEqual(['EL TÍO PANCHO', 'CON SU GUITARRA…']);
    expect(fitted.lines.every((line) => fits(line, fitted.size))).toBe(true);
  });

  it('una sola palabra que no cabe se queda en un renglón, cortada con «…»', () => {
    const fitted = fitCardName('SUPERCALIFRAGILISTICOESPIALIDOSO', measure, name);

    expect(fitted.size).toBe(name.minSize);
    expect(fitted.lines).toHaveLength(1);
    expect(fitted.lines[0].endsWith('…')).toBe(true);
    expect(fits(fitted.lines[0], fitted.size)).toBe(true);
  });

  it('si la primera palabra no cabe sola, el nombre se corta en un renglón', () => {
    const fitted = fitCardName('SUPERCALIFRAGILISTICO DE LA ABUELA', measure, name);

    expect(fitted.lines).toHaveLength(1);
    expect(fitted.lines[0].endsWith('…')).toBe(true);
  });
});
