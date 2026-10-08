/**
 * Validación de la ficha y del PDF de una lotería de temporada (FEAT-17).
 * La base repite estos límites (supabase/migrations/027 y 028): ella es quien manda.
 */
import { localInputToIso } from './seasonalPublishing';

export const SEASONAL_NAME_MAX_LENGTH = 80;
export const SEASONAL_DESCRIPTION_MAX_LENGTH = 600;
export const SEASONAL_MIN_PRICE_CENTS = 1000;
export const SEASONAL_PDF_MAX_BYTES = 50 * 1024 * 1024;
export const SEASONAL_PDF_MIME_TYPE = 'application/pdf';

/** El precio se guarda en una columna entera. */
const MAX_PRICE_CENTS = 2_147_483_647;
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
const COUNT_PATTERN = /^\d+$/;

/** 9 = Kids 3×3, 16 = Clásico 4×4, igual que en las loterías de los usuarios. */
export type SeasonalGridSize = 9 | 16;

/** Lo que el administrador escribe en el formulario, tal cual. */
export interface SeasonalLoteriaForm {
  seasonId: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  gridSize: SeasonalGridSize;
  cardCount: string;
  boardCount: string;
  price: string;
  /** Fecha y hora de inicio y de fin, como las entrega un campo de fecha; vacías = sin límite. */
  validFrom: string;
  validUntil: string;
}

/** Lo que se guarda. Todo lo opcional queda en null mientras la lotería es un borrador. */
export interface SeasonalLoteriaInput {
  season_id: string;
  name_es: string;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  grid_size: SeasonalGridSize;
  card_count: number | null;
  board_count: number | null;
  price_cents: number | null;
  valid_from: string | null;
  valid_until: string | null;
}

export type SeasonalFormErrors = Partial<Record<keyof SeasonalLoteriaForm, string>>;

export interface SeasonalFormResult {
  errors: SeasonalFormErrors;
  /** null si hay algún error. */
  input: SeasonalLoteriaInput | null;
}

/** Pesos escritos a mano → centavos. Vacío → null; lo que no es un precio → NaN. */
export function parsePriceToCents(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!PRICE_PATTERN.test(trimmed)) return NaN;
  return Math.round(Number(trimmed) * 100);
}

function emptyToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

function priceError(cents: number | null): string | undefined {
  if (cents === null) return undefined;
  if (Number.isNaN(cents)) return 'Escribe el precio en pesos, por ejemplo 49 o 49.50.';
  if (cents < SEASONAL_MIN_PRICE_CENTS) return 'El precio mínimo es $10.00.';
  if (cents > MAX_PRICE_CENTS) return 'El precio es demasiado alto.';
  return undefined;
}

/** Vacío → null (aún sin definir); entero mayor que cero → el número; lo demás → NaN. */
function parseCount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!COUNT_PATTERN.test(trimmed)) return NaN;
  const count = Number(trimmed);
  return count > 0 && count <= MAX_PRICE_CENTS ? count : NaN;
}

function tooLong(text: string, max: number): string | undefined {
  return text.trim().length > max ? `Máximo ${max} caracteres.` : undefined;
}

function untilError(validFrom: string | null | undefined, validUntil: string | null): string | undefined {
  if (!validFrom || !validUntil) return undefined;
  return new Date(validUntil) <= new Date(validFrom)
    ? 'La fecha de fin tiene que ser posterior a la de inicio.'
    : undefined;
}

export function validateSeasonalLoteriaForm(form: SeasonalLoteriaForm): SeasonalFormResult {
  const priceCents = parsePriceToCents(form.price);
  const cardCount = parseCount(form.cardCount);
  const boardCount = parseCount(form.boardCount);
  const countMessage = 'Escribe un número entero mayor que cero.';
  const validFrom = localInputToIso(form.validFrom);
  const validUntil = localInputToIso(form.validUntil);
  const dateMessage = 'Escribe una fecha válida.';

  const candidates: SeasonalFormErrors = {
    seasonId: form.seasonId === '' ? 'Elige una temporada.' : undefined,
    nameEs:
      form.nameEs.trim() === '' ? 'Escribe el nombre en español.' : tooLong(form.nameEs, SEASONAL_NAME_MAX_LENGTH),
    nameEn: tooLong(form.nameEn, SEASONAL_NAME_MAX_LENGTH),
    descriptionEs: tooLong(form.descriptionEs, SEASONAL_DESCRIPTION_MAX_LENGTH),
    descriptionEn: tooLong(form.descriptionEn, SEASONAL_DESCRIPTION_MAX_LENGTH),
    cardCount: Number.isNaN(cardCount) ? countMessage : undefined,
    boardCount: Number.isNaN(boardCount) ? countMessage : undefined,
    price: priceError(priceCents),
    validFrom: validFrom === undefined ? dateMessage : undefined,
    validUntil: validUntil === undefined ? dateMessage : untilError(validFrom, validUntil),
  };
  const errors = Object.fromEntries(
    Object.entries(candidates).filter(([, message]) => message !== undefined),
  ) as SeasonalFormErrors;

  if (Object.keys(errors).length > 0) return { errors, input: null };

  return {
    errors,
    input: {
      season_id: form.seasonId,
      name_es: form.nameEs.trim(),
      name_en: emptyToNull(form.nameEn),
      description_es: emptyToNull(form.descriptionEs),
      description_en: emptyToNull(form.descriptionEn),
      grid_size: form.gridSize,
      card_count: cardCount,
      board_count: boardCount,
      price_cents: priceCents,
      valid_from: validFrom ?? null,
      valid_until: validUntil ?? null,
    },
  };
}

/** Devuelve el motivo del rechazo, o null si el archivo sirve como PDF de una lotería. */
export function validatePdfFile(file: { type: string; size: number }): string | null {
  if (file.type !== SEASONAL_PDF_MIME_TYPE) return 'El archivo tiene que ser un PDF.';
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > SEASONAL_PDF_MAX_BYTES) return 'El PDF pesa más de 50 MB.';
  return null;
}

export function formatFileSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(1)} MB`;
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

/** La ficha tal como queda al armar el PDF en el sitio: solo cambian el número de cartas y el de tableros (FEAT-23). */
export function withBuiltCounts(
  loteria: SeasonalLoteriaInput,
  cardCount: number,
  boardCount: number,
): SeasonalLoteriaInput {
  return {
    season_id: loteria.season_id,
    name_es: loteria.name_es,
    name_en: loteria.name_en,
    description_es: loteria.description_es,
    description_en: loteria.description_en,
    grid_size: loteria.grid_size,
    card_count: cardCount,
    board_count: boardCount,
    price_cents: loteria.price_cents,
    valid_from: loteria.valid_from,
    valid_until: loteria.valid_until,
  };
}

/** «Día de Muertos» → «dia-de-muertos.pdf». */
export function seasonalPdfFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'loteria-de-temporada'}.pdf`;
}

/** Pestañas de la ventana de la ficha, en el orden en que se muestran. */
export const SEASONAL_FORM_TABS = [
  { id: 'datos', label: 'Datos' },
  { id: 'precio', label: 'Precio y fechas' },
  { id: 'archivos', label: 'Archivos' },
] as const;

export type SeasonalFormTab = (typeof SEASONAL_FORM_TABS)[number]['id'];

const TAB_OF_FIELD: Record<keyof SeasonalLoteriaForm, SeasonalFormTab> = {
  seasonId: 'datos',
  nameEs: 'datos',
  nameEn: 'datos',
  descriptionEs: 'datos',
  descriptionEn: 'datos',
  gridSize: 'datos',
  cardCount: 'datos',
  boardCount: 'datos',
  price: 'precio',
  validFrom: 'precio',
  validUntil: 'precio',
};

/** Las pestañas que tienen algún campo con error, en el orden en que se muestran. */
export function tabsWithErrors(errors: SeasonalFormErrors): SeasonalFormTab[] {
  const withErrors = new Set(
    (Object.keys(errors) as (keyof SeasonalLoteriaForm)[]).filter((field) => errors[field]).map((field) => TAB_OF_FIELD[field]),
  );
  return SEASONAL_FORM_TABS.map((tab) => tab.id).filter((id) => withErrors.has(id));
}
