/**
 * Pantalla Temáticas del panel de administración (FEAT-48, US A1): el estado de cada tarjeta, sus
 * renglones, el resumen del encabezado y el filtro por temática.
 */
import type { SeasonalPdf } from '../repositories/SeasonalRepository';
import type { SeasonalLoteriaInput } from './seasonalLoteria';
import { paidLabel } from './adminUsers';
import { missingToPublish, seasonalStatus } from './seasonalPublishing';

const TIME_ZONE = 'America/Hermosillo';

/** Las publicadas se dividen como en el catálogo; los borradores, en listos e incompletos. */
export type LoteriaCardState = 'published' | 'scheduled' | 'expired' | 'ready' | 'incomplete';

export const LOTERIA_CARD_STATE_LABELS: Record<LoteriaCardState, string> = {
  published: 'Publicada',
  scheduled: 'Programada',
  expired: 'Fuera de fechas',
  ready: 'Borrador listo',
  incomplete: 'Borrador incompleto',
};

export type LoteriaCardInput = Pick<
  SeasonalLoteriaInput,
  'season_id' | 'name_es' | 'description_es' | 'grid_size' | 'card_count' | 'board_count' | 'price_cents' | 'valid_from' | 'valid_until'
> & {
  is_published: boolean;
  cover_path: string | null;
  pdf: SeasonalPdf | null;
};

// En la tarjeta cabe menos que en el formulario: «tableros» en vez de «número de tableros».
const SHORT_MISSING: Record<string, string> = {
  'número de cartas': 'cartas',
  'número de tableros': 'tableros',
};

function missingFor(loteria: LoteriaCardInput): string[] {
  return missingToPublish({
    name_es: loteria.name_es,
    description_es: loteria.description_es,
    card_count: loteria.card_count,
    board_count: loteria.board_count,
    price_cents: loteria.price_cents,
    hasPdf: loteria.pdf !== null,
    hasCover: !!loteria.cover_path,
  }).map((label) => SHORT_MISSING[label] ?? label);
}

export function loteriaCardState(loteria: LoteriaCardInput, now: Date): LoteriaCardState {
  const status = seasonalStatus(loteria, now);
  if (status !== 'draft') return status;
  return missingFor(loteria).length === 0 ? 'ready' : 'incomplete';
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** «Clásico · 54 cartas · 20 tableros»; sin lo que aún no tiene. */
export function loteriaDetailLine(loteria: Pick<LoteriaCardInput, 'grid_size' | 'card_count' | 'board_count'>): string {
  return [
    loteria.grid_size === 9 ? 'Kids' : 'Clásico',
    loteria.card_count === null ? null : plural(loteria.card_count, 'carta', 'cartas'),
    loteria.board_count === null ? null : plural(loteria.board_count, 'tablero', 'tableros'),
  ]
    .filter(Boolean)
    .join(' · ');
}

function joinWithAnd(items: readonly string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function shortDate(iso: string, now: Date): string {
  const yearOf = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric' }).format(date);
  const date = new Date(iso);
  const sameYear = yearOf(date) === yearOf(now);
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
    .format(date)
    .replace(/\./g, '')
    .replace(/ de /g, ' ');
}

/** El renglón bajo el detalle: lo que le falta (en rojo) o desde cuándo se verá. Nada en los demás casos. */
export function loteriaNoteLine(loteria: LoteriaCardInput, now: Date): { text: string; danger: boolean } | null {
  const state = loteriaCardState(loteria, now);
  if (state === 'incomplete') {
    const missing = missingFor(loteria);
    return { text: `${missing.length === 1 ? 'Falta' : 'Faltan'}: ${joinWithAnd(missing)}`, danger: true };
  }
  if (state === 'scheduled' && loteria.valid_from) {
    return { text: `Visible desde el ${shortDate(loteria.valid_from, now)}`, danger: false };
  }
  return null;
}

/** «5 loterías · 3 publicadas · $1,300 vendidos este mes». Publicadas = visibles hoy en el catálogo. */
export function seasonalOverviewLine(loterias: readonly LoteriaCardInput[], monthRevenueCents: number, now: Date): string {
  const visible = loterias.filter((loteria) => seasonalStatus(loteria, now) === 'published').length;
  return [
    plural(loterias.length, 'lotería', 'loterías'),
    plural(visible, 'publicada', 'publicadas'),
    `${paidLabel(monthRevenueCents)} vendidos este mes`,
  ].join(' · ');
}

export interface ThemeChip {
  /** '' = todas. */
  id: string;
  label: string;
  count: number;
}

/** Botones del filtro: Todas y una por temática, en el orden del catálogo. */
export function themeChips(
  seasons: readonly { id: string; name_es: string }[],
  loterias: readonly { season_id: string }[],
): ThemeChip[] {
  return [
    { id: '', label: 'Todas', count: loterias.length },
    ...seasons.map((season) => ({
      id: season.id,
      label: season.name_es,
      count: loterias.filter((loteria) => loteria.season_id === season.id).length,
    })),
  ];
}
