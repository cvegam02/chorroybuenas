/**
 * Visibilidad de una lotería de temporada (FEAT-17): su estado, qué le falta para publicarse y
 * las fechas del formulario. La base repite estas reglas (supabase/migrations/027, 029 y 030): ella manda.
 */
export type SeasonalStatus = 'draft' | 'published' | 'scheduled' | 'expired';

export const SEASONAL_STATUS_LABELS: Record<SeasonalStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  scheduled: 'Programada',
  expired: 'Fuera de fechas',
};

export interface SeasonalVisibility {
  is_published: boolean;
  /** Fechas en formato ISO; null = sin límite. */
  valid_from: string | null;
  valid_until: string | null;
}

/** Visible para el público solo si el resultado es 'published'. */
export function seasonalStatus(loteria: SeasonalVisibility, now: Date): SeasonalStatus {
  if (!loteria.is_published) return 'draft';
  const time = now.getTime();
  if (loteria.valid_until !== null && new Date(loteria.valid_until).getTime() <= time) return 'expired';
  if (loteria.valid_from !== null && new Date(loteria.valid_from).getTime() > time) return 'scheduled';
  return 'published';
}

/** Lo que hace falta mirar para saber si una lotería se puede publicar. */
export interface PublishableLoteria {
  name_es: string;
  description_es: string | null;
  card_count: number | null;
  board_count: number | null;
  price_cents: number | null;
  hasPdf: boolean;
  hasCover: boolean;
}

/** Lo que falta para poder publicar, en el orden del formulario. Vacío si no falta nada. */
export function missingToPublish(loteria: PublishableLoteria): string[] {
  const requirements: [string, boolean][] = [
    ['nombre', loteria.name_es.trim() !== ''],
    ['descripción', (loteria.description_es ?? '').trim() !== ''],
    ['número de cartas', loteria.card_count !== null],
    ['número de tableros', loteria.board_count !== null],
    ['precio', loteria.price_cents !== null],
    ['PDF', loteria.hasPdf],
    ['portada', loteria.hasCover],
  ];
  return requirements.filter(([, met]) => !met).map(([label]) => label);
}

/** «2026-10-31T08:30» en la hora del navegador → ISO. Vacío → null; lo que no es una fecha → undefined. */
export function localInputToIso(text: string): string | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** ISO → el valor que espera un campo de fecha y hora, en la hora del navegador. */
export function isoToLocalInput(iso: string | null): string {
  if (iso === null) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
