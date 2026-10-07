import { PRIVACY_INTRO } from '../components/PrivacyNotice/privacyNoticeContent';

export const SITE_URL = 'https://chorroybuenas.com.mx';
const SITE_NAME = 'chorroybuenas.com.mx';
const PRIVACY_TITLE = 'Aviso de privacidad';

type Translate = (key: string) => string;

/** Imagen que se muestra al compartir el enlace, con su tamaño real en pixeles. */
export interface ShareImage {
  url: string;
  width: number;
  height: number;
}

/** Lo que una página le dice a los buscadores y a las redes al compartirla. */
export interface PageMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  indexable: boolean;
  image: ShareImage;
}

interface PublicPage {
  title: (t: Translate) => string;
  description: (t: Translate) => string;
  /** Si falta, la página se comparte con la imagen general. */
  image?: ShareImage;
}

const shareImage = (file: string, width: number, height: number): ShareImage => ({
  url: `${SITE_URL}/${file}`,
  width,
  height,
});

export const DEFAULT_SHARE_IMAGE = shareImage('og-image.jpg', 1024, 682);

const withSiteName = (title: string) => `${title} | ${SITE_NAME}`;

/** Páginas públicas con dirección fija. Las que no están aquí piden no ser indexadas. */
const PUBLIC_PAGES: Record<string, PublicPage> = {
  '/': {
    title: (t) => t('landing.title'),
    description: (t) => t('landing.metaDescription'),
  },
  '/como-se-juega': {
    title: (t) => t('howToPlay.title'),
    description: (t) => t('howToPlay.metaDescription'),
    image: shareImage('comosejuega.png', 720, 459),
  },
  '/que-es-la-loteria': {
    title: (t) => t('about.title'),
    description: (t) => t('about.metaDescription'),
    image: shareImage('quees.jpg', 500, 500),
  },
  '/beneficios': {
    title: (t) => withSiteName(t('landing.benefitsPage.title')),
    description: (t) => t('landing.benefitsPage.subtitle'),
    image: shareImage('og-beneficios.jpg', 1200, 670),
  },
  '/temporada': {
    title: (t) => withSiteName(t('seasonal.catalog.title')),
    description: (t) => t('seasonal.catalog.subtitle'),
  },
  // El aviso solo existe en español.
  '/privacidad': {
    title: () => withSiteName(PRIVACY_TITLE),
    description: () => PRIVACY_INTRO,
  },
};

export const PUBLIC_PATHS = Object.keys(PUBLIC_PAGES);

const SEASONAL_DETAIL_PATH = /^\/temporada\/[^/]+$/;

export const normalizePath = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname) || '/';

const canonicalFor = (path: string) => `${SITE_URL}${path}`;

export function resolvePageMeta(pathname: string, t: Translate): PageMeta {
  const path = normalizePath(pathname);
  // La ficha de temporada arranca con los datos del catálogo; al cargar pone los suyos.
  const page = PUBLIC_PAGES[path] ?? (SEASONAL_DETAIL_PATH.test(path) ? PUBLIC_PAGES['/temporada'] : null);
  const source = page ?? PUBLIC_PAGES['/'];

  return {
    title: source.title(t),
    description: source.description(t),
    canonicalUrl: canonicalFor(path),
    indexable: page !== null,
    image: source.image ?? DEFAULT_SHARE_IMAGE,
  };
}

export function seasonalDetailMeta(id: string, name: string, description: string, t: Translate): PageMeta {
  return {
    title: withSiteName(name),
    description: description !== '' ? description : PUBLIC_PAGES['/temporada'].description(t),
    canonicalUrl: canonicalFor(`/temporada/${id}`),
    indexable: true,
    image: DEFAULT_SHARE_IMAGE,
  };
}

const setAttribute = (doc: Document, selector: string, attribute: string, value: string) => {
  doc.querySelector(selector)?.setAttribute(attribute, value);
};

/** Escribe los datos de la página en las etiquetas que ya trae `index.html`. */
export function applyPageMeta(doc: Document, meta: PageMeta): void {
  doc.title = meta.title;
  setAttribute(doc, 'link[rel="canonical"]', 'href', meta.canonicalUrl);
  setAttribute(doc, 'meta[name="robots"]', 'content', meta.indexable ? 'index, follow' : 'noindex, nofollow');

  for (const selector of ['meta[name="title"]', 'meta[property="og:title"]', 'meta[property="twitter:title"]']) {
    setAttribute(doc, selector, 'content', meta.title);
  }
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[property="twitter:description"]',
  ]) {
    setAttribute(doc, selector, 'content', meta.description);
  }
  for (const selector of ['meta[property="og:url"]', 'meta[property="twitter:url"]']) {
    setAttribute(doc, selector, 'content', meta.canonicalUrl);
  }
  for (const selector of ['meta[property="og:image"]', 'meta[property="twitter:image"]']) {
    setAttribute(doc, selector, 'content', meta.image.url);
  }
  setAttribute(doc, 'meta[property="og:image:width"]', 'content', String(meta.image.width));
  setAttribute(doc, 'meta[property="og:image:height"]', 'content', String(meta.image.height));
}
