/**
 * Banner de la oferta (FEAT-49, US A4 y A5; contexto-negocio.md §9): revisión de archivos y campos,
 * textos por idioma, a dónde lleva el botón y la cuenta regresiva.
 */

const MB = 1024 * 1024;
const MAX_FILE_BYTES = 8 * MB;
const MAX_VIDEO_SECONDS = 15;
/** Los codificadores redondean la duración: 15.04 s es un video de 15 s. */
const DURATION_TOLERANCE = 0.05;
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const LIMITS = { title: 80, text: 200, button: 40 } as const;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type BannerTarget = 'buy_tokens' | 'create' | 'themed';

/** A dónde lleva el botón del banner. */
export const BANNER_TARGET_PATHS: Record<BannerTarget, string> = {
  buy_tokens: '/comprar-tokens',
  create: '/cards',
  themed: '/tematicas',
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Tiempo que falta: «29 días», «2 días 5 h», «5 h», «45 min». Las horas tras los días, solo si se piden. */
export function durationLabel(ms: number, withHours: boolean): string {
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  if (days >= 1) return withHours && hours > 0 ? `${plural(days, 'día', 'días')} ${hours} h` : plural(days, 'día', 'días');
  if (hours >= 1) return `${hours} h`;
  return `${Math.max(1, Math.floor(ms / MINUTE))} min`;
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

/** Lo que falta para que termine la oferta. Antes de empezar (vista previa) cuenta desde el inicio; terminada, null. */
export function timeLeft(endsAt: string, startsAt: string, now: Date): TimeLeft | null {
  const from = Math.max(now.getTime(), new Date(startsAt).getTime());
  const left = new Date(endsAt).getTime() - from;
  if (left <= 0) return null;
  return { days: Math.floor(left / DAY), hours: Math.floor((left % DAY) / HOUR), minutes: Math.floor((left % HOUR) / MINUTE) };
}

/** Contador del aviso (US A6): «31d 23h» con un día o más; si no, «23h 15m». Nunca «0m». */
export function formatCountdown({ days, hours, minutes }: TimeLeft): string {
  if (days >= 1) return `${days}d ${hours}h`;
  return `${hours}h ${hours === 0 ? Math.max(1, minutes) : minutes}m`;
}

/** Contador del indicador minimizado (US A7): «31d»; con menos de un día, «23h»; en la última hora, minutos. */
export function formatMiniCountdown({ days, hours, minutes }: TimeLeft): string {
  if (days >= 1) return `${days}d`;
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, minutes)}m`;
}

/** El aviso aparece a los 3 s de cargar o al bajar más de 300 px, lo que pase primero (US A6). */
export const TOAST_DELAY_MS = 3000;
export const TOAST_SCROLL_PX = 300;

export function shouldRevealToast(elapsedMs: number, scrollY: number): boolean {
  return elapsedMs >= TOAST_DELAY_MS || scrollY > TOAST_SCROLL_PX;
}

/** El video del banner: MP4, hasta 8 MB y 15 segundos (decisión 10). Null si sirve. */
export function checkBannerVideo(file: { type: string; size: number; duration: number }): string | null {
  if (file.type !== 'video/mp4') return 'El video tiene que ser MP4.';
  if (file.size > MAX_FILE_BYTES) return 'El video pesa más de 8 MB.';
  if (!Number.isFinite(file.duration)) return 'No se pudo leer el video. Prueba con otro MP4.';
  if (file.duration > MAX_VIDEO_SECONDS + DURATION_TOLERANCE) return 'El video dura más de 15 segundos.';
  return null;
}

/** La imagen fija para celular: JPG, PNG o WebP, hasta 8 MB. Null si sirve. */
export function checkBannerImage(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES[file.type]) return 'La imagen tiene que ser JPG, PNG o WebP.';
  if (file.size > MAX_FILE_BYTES) return 'La imagen pesa más de 8 MB.';
  return null;
}

export interface BannerForm {
  enabled: boolean;
  /** Hay video guardado o elegido. */
  hasVideo: boolean;
  hasImage: boolean;
  titleEs: string;
  textEs: string;
  buttonEs: string;
  titleEn: string;
  textEn: string;
  buttonEn: string;
  target: BannerTarget;
  onHome: boolean;
  onDashboard: boolean;
  countdown: boolean;
}

export type BannerFormErrors = Partial<Record<'video' | 'image' | 'titleEs' | 'textEs' | 'buttonEs' | 'titleEn' | 'textEn' | 'buttonEn' | 'screens', string>>;

/** Revisa la parte «2 · El banner». Encendido pide lo mismo que la base (migración 055). */
export function validateBannerForm(form: BannerForm): BannerFormErrors {
  const errors: BannerFormErrors = {};
  const tooLong: [keyof BannerFormErrors, string, number][] = [
    ['titleEs', form.titleEs, LIMITS.title], ['textEs', form.textEs, LIMITS.text], ['buttonEs', form.buttonEs, LIMITS.button],
    ['titleEn', form.titleEn, LIMITS.title], ['textEn', form.textEn, LIMITS.text], ['buttonEn', form.buttonEn, LIMITS.button],
  ];
  for (const [field, value, max] of tooLong) {
    if (value.trim().length > max) errors[field] = `Hasta ${max} caracteres.`;
  }
  if (!form.enabled) return errors;
  if (!form.hasVideo) errors.video = 'Sube el video.';
  if (!form.hasImage) errors.image = 'Falta la imagen para celular.';
  if (!form.titleEs.trim()) errors.titleEs = 'Escribe el título.';
  if (!form.buttonEs.trim()) errors.buttonEs = 'Escribe el texto del botón.';
  if (!form.onHome && !form.onDashboard) errors.screens = 'Elige al menos una pantalla.';
  return errors;
}

export interface BannerTextFields {
  banner_title_es: string | null;
  banner_text_es: string | null;
  banner_button_es: string | null;
  banner_title_en: string | null;
  banner_text_en: string | null;
  banner_button_en: string | null;
}

/** Los textos en el idioma del sitio: en inglés, cada uno que falte se muestra en español (decisión 15). */
export function bannerTexts(banner: BannerTextFields, language: string): { title: string; text: string; button: string } {
  const english = language.toLowerCase().startsWith('en');
  const pick = (es: string | null, en: string | null) => (english && en?.trim() ? en.trim() : (es ?? '').trim());
  return {
    title: pick(banner.banner_title_es, banner.banner_title_en),
    text: pick(banner.banner_text_es, banner.banner_text_en),
    button: pick(banner.banner_button_es, banner.banner_button_en),
  };
}

/** Dónde se guarda un archivo del banner: <id de la oferta>/<tipo>-<momento>.<extensión>. */
export function bannerFilePath(offerId: string, kind: 'video' | 'image', mimeType: string, at: number): string {
  const ext = kind === 'video' ? 'mp4' : (IMAGE_TYPES[mimeType] ?? 'jpg');
  return `${offerId}/${kind}-${at}.${ext}`;
}

/** Las columnas del banner en la oferta (migración 055). */
export interface OfferBannerFields extends BannerTextFields {
  banner_enabled: boolean;
  banner_video_path: string | null;
  banner_image_path: string | null;
  banner_target: BannerTarget;
  banner_on_home: boolean;
  banner_on_dashboard: boolean;
  banner_countdown: boolean;
}

/** Lo que se escribe en la parte «2 · El banner» (sin los archivos, que van aparte). */
export type BannerDraft = Omit<BannerForm, 'hasVideo' | 'hasImage'>;

/** El formulario de una oferta: su banner guardado o, si no tiene, el de la maqueta (decisión 10). */
export function bannerDraftFromOffer(fields: OfferBannerFields | null): BannerDraft {
  return {
    enabled: fields?.banner_enabled ?? false,
    titleEs: fields?.banner_title_es ?? '',
    textEs: fields?.banner_text_es ?? '',
    buttonEs: fields?.banner_button_es ?? '',
    titleEn: fields?.banner_title_en ?? '',
    textEn: fields?.banner_text_en ?? '',
    buttonEn: fields?.banner_button_en ?? '',
    target: fields?.banner_target ?? 'buy_tokens',
    onHome: fields?.banner_on_home ?? true,
    onDashboard: fields?.banner_on_dashboard ?? true,
    countdown: fields?.banner_countdown ?? true,
  };
}

const clean = (text: string) => text.trim() || null;

/** Lo que se guarda: textos sin espacios de más (vacíos, nulos) y la ubicación de los archivos. */
export function bannerFieldsFromDraft(draft: BannerDraft, paths: { video: string | null; image: string | null }): OfferBannerFields {
  return {
    banner_enabled: draft.enabled,
    banner_video_path: paths.video,
    banner_image_path: paths.image,
    banner_title_es: clean(draft.titleEs),
    banner_text_es: clean(draft.textEs),
    banner_button_es: clean(draft.buttonEs),
    banner_title_en: clean(draft.titleEn),
    banner_text_en: clean(draft.textEn),
    banner_button_en: clean(draft.buttonEn),
    banner_target: draft.target,
    banner_on_home: draft.onHome,
    banner_on_dashboard: draft.onDashboard,
    banner_countdown: draft.countdown,
  };
}

/** En la tarjeta de la oferta: «banner en Inicio y Mi cuenta», «banner en Inicio»… o «sin banner». */
export function bannerPlacesLabel(fields: Pick<OfferBannerFields, 'banner_enabled' | 'banner_on_home' | 'banner_on_dashboard'>): string {
  if (!fields.banner_enabled) return 'sin banner';
  if (fields.banner_on_home && fields.banner_on_dashboard) return 'banner en Inicio y Mi cuenta';
  return fields.banner_on_home ? 'banner en Inicio' : 'banner en Mi cuenta';
}

export type BannerPlacement = 'home' | 'dashboard';

/** Sale si está encendido y en una pantalla elegida (US A5). Cerrarlo ya no lo quita: lo minimiza (US A7). */
export function shouldShowBanner(
  offer: Pick<OfferBannerFields, 'banner_enabled' | 'banner_on_home' | 'banner_on_dashboard'> | null,
  placement: BannerPlacement,
): boolean {
  if (!offer?.banner_enabled) return false;
  return placement === 'home' ? offer.banner_on_home : offer.banner_on_dashboard;
}

interface SimpleStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const minimizedKey = (offerId: string) => `offer-banner-minimized:${offerId}`;

/** Si quien mira minimizó la promo de esta oferta. Sin almacenamiento del navegador, nunca la minimizó. */
export function isBannerMinimized(storage: SimpleStorage | null, offerId: string): boolean {
  try {
    return storage?.getItem(minimizedKey(offerId)) === '1';
  } catch {
    return false;
  }
}

/** Recuerda que se minimizó, solo para esta oferta (decisión 13). Si el navegador no deja, vale solo en esta visita. */
export function minimizeBanner(storage: SimpleStorage | null, offerId: string): void {
  try {
    storage?.setItem(minimizedKey(offerId), '1');
  } catch {
    // Modo privado o almacenamiento bloqueado: se minimiza en esta visita y nada más.
  }
}

/** Al reabrirla desde el indicador se borra la marca (US A7). */
export function restoreBanner(storage: SimpleStorage | null, offerId: string): void {
  try {
    storage?.removeItem(minimizedKey(offerId));
  } catch {
    // Igual que arriba: sin almacenamiento, solo cambia esta visita.
  }
}
