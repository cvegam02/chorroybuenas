/**
 * Cálculos de la sección Promociones de Precios y promos (FEAT-46, US A4): vista previa, estado y vigencia.
 * Las fechas se muestran y se eligen en hora de Hermosillo, como el resto del Admin.
 */
import type { AdminPromotion, AdminTokenPack } from '../repositories/AdminRepository';

const TIME_ZONE = 'America/Hermosillo';
/** Sonora no cambia de horario: siempre UTC−7. */
const HERMOSILLO_OFFSET = '-07:00';
const PREVIEW_BASE_TOKENS = 20;

const countFormat = new Intl.NumberFormat('es-MX');
const dayFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: TIME_ZONE });
const dayYearFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });
const yearFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', timeZone: TIME_ZONE });
const dateInputFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE });

/** Tokens que da la promoción: porcentaje sobre los tokens base, hacia abajo (igual que `computePromotionBonus`). */
export function promoBonusTokens(baseTokens: number, percent: number): number {
  return percent > 0 ? Math.floor(baseTokens * (percent / 100)) : 0;
}

/** Pack de la vista previa: el activo de 20 tokens; si no hay, el primero activo; si no, ninguno. */
export function previewPack(packs: readonly AdminTokenPack[]): AdminTokenPack | null {
  const active = packs.filter((p) => p.is_active);
  return active.find((p) => p.base_tokens === PREVIEW_BASE_TOKENS) ?? active[0] ?? null;
}

/** «Con un Pack 20 tokens, el cliente recibiría 20 + 5 de regalo + 4 de la promoción = 29 tokens.» */
export function promoPreviewText(
  pack: { base_tokens: number; bonus_tokens: number } | null,
  percent: number,
): string {
  const base = pack?.base_tokens ?? PREVIEW_BASE_TOKENS;
  const gift = pack?.bonus_tokens ?? 0;
  const promo = promoBonusTokens(base, percent);
  const intro = pack ? `Con un Pack ${countFormat.format(base)} tokens` : `Con ${countFormat.format(base)} tokens sueltos`;
  if (promo === 0) {
    return (
      `${intro}, el ${percent}% no alcanza ni un token: el cliente recibiría solo los ` +
      `${countFormat.format(base + gift)} tokens del pack y la promoción no cuenta como usada.`
    );
  }
  const parts = [countFormat.format(base)];
  if (gift > 0) parts.push(`${countFormat.format(gift)} de regalo`);
  parts.push(`${countFormat.format(promo)} de la promoción`);
  return `${intro}, el cliente recibiría ${parts.join(' + ')} = ${countFormat.format(base + gift + promo)} tokens.`;
}

export type PromoStatus = 'active' | 'scheduled' | 'expired' | 'off';

export const PROMO_STATUS_LABELS: Record<PromoStatus, string> = {
  active: 'Activa',
  scheduled: 'Programada',
  expired: 'Vencida',
  off: 'Apagada',
};

interface PromoDates {
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

/** Estado calculado (decisión 7). Una vencida se ve vencida aunque esté apagada, como en la maqueta. */
export function promoStatus(promo: PromoDates, now: Date = new Date()): PromoStatus {
  if (promo.valid_until && new Date(promo.valid_until) < now) return 'expired';
  if (!promo.is_active) return 'off';
  if (promo.valid_from && new Date(promo.valid_from) > now) return 'scheduled';
  return 'active';
}

const dayLabel = (iso: string, now: Date) => {
  const date = new Date(iso);
  return yearFormat.format(date) === yearFormat.format(now) ? dayFormat.format(date) : dayYearFormat.format(date);
};

/** Vigencia para la tabla: «Sin límite», «Desde 20 oct», «Hasta 31 ago», «20 oct – 3 nov». */
export function promoValidity(validFrom: string | null, validUntil: string | null, now: Date = new Date()): string {
  if (validFrom && validUntil) return `${dayLabel(validFrom, now)} – ${dayLabel(validUntil, now)}`;
  if (validFrom) return `Desde ${dayLabel(validFrom, now)}`;
  if (validUntil) return `Hasta ${dayLabel(validUntil, now)}`;
  return 'Sin límite';
}

/** «Desde» del formulario (AAAA-MM-DD): el día empieza a las 00:00 de Hermosillo. Vacío, sin límite. */
export function validFromIso(date: string): string | null {
  return date ? `${date}T00:00:00${HERMOSILLO_OFFSET}` : null;
}

/** «Hasta» del formulario: el día termina a las 23:59:59 de Hermosillo. Vacío, sin límite. */
export function validUntilIso(date: string): string | null {
  return date ? `${date}T23:59:59${HERMOSILLO_OFFSET}` : null;
}

/** Fecha guardada → valor del campo de fecha (AAAA-MM-DD en Hermosillo). */
export function dateInputFromIso(iso: string | null): string {
  return iso ? dateInputFormat.format(new Date(iso)) : '';
}

/** Porcentaje extra guardado en la promoción; 0 si falta. */
export function promoPercent(promo: Pick<AdminPromotion, 'config'>): number {
  const percent = (promo.config as { percent?: unknown }).percent;
  return typeof percent === 'number' ? percent : 0;
}

/** Nombre en la tabla: el código, o «Primera compra». */
export function promoName(promo: Pick<AdminPromotion, 'type' | 'code'>): string {
  return promo.type === 'code' && promo.code ? promo.code : 'Primera compra';
}
