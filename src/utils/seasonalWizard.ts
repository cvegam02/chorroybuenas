/**
 * Asistente de lotería temática (FEAT-48, US A2): sus cinco pasos, cuándo cada uno está terminado y el
 * aviso de guardado automático.
 */
import type { GridSize } from '../types';
import { cardCountMessage } from './seasonalBuild';
import { hasEnoughCards, seasonalMinCards } from './seasonalCards';
import { parsePriceToCents, seasonalPriceError } from './seasonalLoteria';

export type WizardStepId = 'basics' | 'cards' | 'boards' | 'showcase' | 'publish';

/** Lo guardado que decide si un paso está terminado. */
export interface WizardFacts {
  name_es: string;
  description_es: string | null;
  card_count: number | null;
  board_count: number | null;
  price_cents: number | null;
  hasPdf: boolean;
  hasCover: boolean;
}

export interface WizardStep {
  id: WizardStepId;
  title: string;
  description: string;
  done: boolean;
}

const filled = (text: string | null) => (text ?? '').trim() !== '';
const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

/** Los pasos en orden, con la descripción corta que va debajo de cada uno. */
export function wizardSteps(facts: WizardFacts): WizardStep[] {
  return [
    { id: 'basics', title: 'Lo básico', description: 'Nombre, temática y modo', done: filled(facts.name_es) && filled(facts.description_es) },
    {
      id: 'cards',
      title: 'Cartas',
      description: facts.card_count === null ? 'Sube tus cartas' : count(facts.card_count, 'carta', 'cartas'),
      done: facts.card_count !== null,
    },
    {
      id: 'boards',
      title: 'Tableros',
      description: facts.board_count === null ? 'Cuántos tableros' : count(facts.board_count, 'tablero', 'tableros'),
      done: facts.board_count !== null && facts.hasPdf,
    },
    { id: 'showcase', title: 'Vitrina', description: 'Portada y muestras', done: facts.hasCover },
    { id: 'publish', title: 'Precio y publicación', description: 'Precio, fechas y publicar', done: facts.price_cents !== null },
  ];
}

/** «hace unos segundos», «hace 5 min», «hace más de una hora». */
export function savedAgoLabel(savedAt: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - savedAt.getTime()) / 60_000);
  if (minutes < 1) return 'hace unos segundos';
  if (minutes < 60) return `hace ${minutes} min`;
  return 'hace más de una hora';
}

/* Paso 5, «Lista para publicar» (FEAT-48, decisión 14) */

/** Lo que decide si se puede publicar: lo escrito en la ficha y lo que ya se armó o subió. */
export interface PublishCheckInput {
  nameEs: string;
  descriptionEs: string;
  /** Con «Subir mis cartas», las cartas cargadas y los tableros generados; si no, lo escrito en el paso 2. */
  cardCount: number | null;
  boardCount: number | null;
  /** Lo escrito en el campo de precio. */
  price: string;
  gridSize: GridSize;
  /** «Subir mis cartas»: el sitio arma el PDF y se aplica el mínimo de cartas del modo (§18). */
  buildsPdf: boolean;
  hasPdf: boolean;
  /** El PDF guardado se armó con las cartas y los tableros de ahora. */
  pdfIsCurrent: boolean;
  hasCover: boolean;
}

export interface PublishCheck {
  id: 'texts' | 'cards' | 'boards' | 'pdf' | 'cover' | 'price';
  /** El paso donde se completa. */
  step: WizardStepId;
  ok: boolean;
  label: string;
}

const MONEY = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function textsCheck({ nameEs, descriptionEs }: PublishCheckInput): PublishCheck {
  const hasName = filled(nameEs);
  const hasDescription = filled(descriptionEs);
  const label =
    hasName && hasDescription
      ? 'Nombre y descripción'
      : !hasName && !hasDescription
        ? 'Faltan el nombre y la descripción'
        : hasName
          ? 'Falta la descripción'
          : 'Falta el nombre';
  return { id: 'texts', step: 'basics', ok: hasName && hasDescription, label };
}

function cardsCheck({ cardCount, gridSize, buildsPdf }: PublishCheckInput): PublishCheck {
  const check = { id: 'cards', step: 'cards' } as const;
  if (!buildsPdf) {
    return cardCount === null
      ? { ...check, ok: false, label: 'Falta el número de cartas' }
      : { ...check, ok: true, label: count(cardCount, 'carta', 'cartas') };
  }
  const min = seasonalMinCards(gridSize);
  if (cardCount === null || cardCount === 0) {
    return { ...check, ok: false, label: `Faltan las cartas (mínimo ${min} en ${gridSize === 9 ? 'Kids' : 'Clásico'})` };
  }
  return hasEnoughCards(cardCount, gridSize)
    ? { ...check, ok: true, label: `${count(cardCount, 'carta', 'cartas')} (mínimo ${min})` }
    : { ...check, ok: false, label: cardCountMessage(cardCount, gridSize) };
}

function boardsCheck({ boardCount, buildsPdf }: PublishCheckInput): PublishCheck {
  const check = { id: 'boards', step: buildsPdf ? 'boards' : 'cards' } as const;
  if (boardCount !== null) return { ...check, ok: true, label: count(boardCount, 'tablero', 'tableros') };
  return { ...check, ok: false, label: buildsPdf ? 'Faltan los tableros' : 'Falta el número de tableros' };
}

/** Con «Subir mis cartas», el PDF que falta o quedó atrás se arma al guardar, si ya hay tableros (decisión 12). */
function pdfCheck({ buildsPdf, hasPdf, pdfIsCurrent, boardCount }: PublishCheckInput): PublishCheck {
  if (!buildsPdf) {
    return { id: 'pdf', step: 'cards', ok: hasPdf, label: hasPdf ? 'PDF subido' : 'Falta subir el PDF' };
  }
  const check = { id: 'pdf', step: 'boards' } as const;
  if (hasPdf && pdfIsCurrent) return { ...check, ok: true, label: 'PDF generado' };
  if (boardCount === null) return { ...check, ok: false, label: 'Falta generar el PDF' };
  return { ...check, ok: true, label: hasPdf ? 'El PDF se vuelve a armar al guardar, con los últimos cambios' : 'El PDF se arma al guardar' };
}

function priceCheck({ price }: PublishCheckInput): PublishCheck {
  const check = { id: 'price', step: 'publish' } as const;
  const cents = parsePriceToCents(price);
  if (cents === null) return { ...check, ok: false, label: 'Falta el precio' };
  const error = seasonalPriceError(cents);
  return error ? { ...check, ok: false, label: error } : { ...check, ok: true, label: `Precio: ${MONEY.format(cents / 100)}` };
}

/** Los requisitos de §18 para publicar, en el orden de los pasos, cada uno con lo que falta. */
export function publishChecklist(input: PublishCheckInput): PublishCheck[] {
  return [
    textsCheck(input),
    cardsCheck(input),
    boardsCheck(input),
    pdfCheck(input),
    { id: 'cover', step: 'showcase', ok: input.hasCover, label: input.hasCover ? 'Portada' : 'Falta la portada' },
    priceCheck(input),
  ];
}

/** «Publicar» solo se activa con todo en ✓. */
export const canPublish = (checks: readonly PublishCheck[]): boolean => checks.every((check) => check.ok);
