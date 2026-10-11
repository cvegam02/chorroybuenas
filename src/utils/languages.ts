/** Idiomas del sitio. El nombre va en su propio idioma, por eso no se traduce. */
export const LANGUAGES = [
  { code: 'es', label: 'Español', shortLabel: 'ES' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** El idioma en uso, reducido a los que ofrece el sitio. */
export const currentLanguageCode = (language: string | undefined): LanguageCode =>
  language?.startsWith('en') ? 'en' : 'es';
