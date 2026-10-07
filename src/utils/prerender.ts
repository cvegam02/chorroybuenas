import { normalizePath, type PageMeta } from './pageMeta';

const EMPTY_ROOT = '<div id="root"></div>';

/** Copia de la página base sin texto: la reciben las direcciones que no se pre-generan. */
export const SHELL_FILE = 'shell.html';

const escapeAttribute = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Cambia el valor de `attribute` en la etiqueta que contiene `marker`. */
const setTagAttribute = (html: string, marker: string, attribute: string, value: string) => {
  const pattern = new RegExp(`(<[^>]*${marker}[^>]*\\s${attribute}=")[^"]*(")`);
  return html.replace(pattern, (_match, before: string, after: string) => `${before}${escapeAttribute(value)}${after}`);
};

/** Archivo donde se escribe una página pre-generada, relativo a la carpeta de salida. */
export function prerenderedFile(path: string): string {
  return path === '/' ? 'index.html' : `${path.slice(1)}/index.html`;
}

/** Página base con el texto de `path` ya escrito y sus propios datos para buscadores y redes. */
export function buildPrerenderedHtml(template: string, path: string, meta: PageMeta, appHtml: string): string {
  if (!template.includes(EMPTY_ROOT)) {
    throw new Error('La página base no trae el contenedor vacío donde va el texto.');
  }
  const head: Array<[marker: string, attribute: string, value: string]> = [
    ['rel="canonical"', 'href', meta.canonicalUrl],
    ['name="title"', 'content', meta.title],
    ['property="og:title"', 'content', meta.title],
    ['property="twitter:title"', 'content', meta.title],
    ['name="description"', 'content', meta.description],
    ['property="og:description"', 'content', meta.description],
    ['property="twitter:description"', 'content', meta.description],
    ['property="og:url"', 'content', meta.canonicalUrl],
    ['property="twitter:url"', 'content', meta.canonicalUrl],
    ['name="robots"', 'content', meta.indexable ? 'index, follow' : 'noindex, nofollow'],
  ];
  const withHead = head
    .reduce((html, [marker, attribute, value]) => setTagAttribute(html, marker, attribute, value), template)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeText(meta.title)}</title>`);

  return withHead.replace(EMPTY_ROOT, () => `<div id="root" data-prerendered="${escapeAttribute(path)}">${appHtml}</div>`);
}

/**
 * El texto pre-generado solo se reutiliza si es el de la dirección abierta y está en el idioma elegido;
 * si no, la página se dibuja desde cero.
 */
export function shouldHydrate(prerenderedPath: string | undefined, pathname: string, language: string): boolean {
  return prerenderedPath !== undefined && prerenderedPath === normalizePath(pathname) && !language.startsWith('en');
}
