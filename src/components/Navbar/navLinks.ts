/**
 * Enlaces de la barra superior, en su orden (FEAT-33). Desde FEAT-53, «Crear» es un grupo que abre «Tu lotería con
 * fotos» y «Arma tus tableros»; sin sesión no va en la barra ancha (`barLinksFor`).
 */
export interface NavLink {
  to: string;
  labelKey: string;
  /** Marca el enlace también en las direcciones que cuelgan de él, como la ficha de una temática. */
  matchChildren?: boolean;
  /** Si lo tiene, la entrada es un grupo que abre estas opciones (FEAT-53: «Crear»). */
  children?: readonly NavLink[];
  /** Texto corto bajo la opción, dentro del grupo. */
  descriptionKey?: string;
}

/** «Inicio» solo se ofrece sin sesión: con sesión, la página principal lleva a Mi cuenta. */
const HOME_LINK: NavLink = { to: '/', labelKey: 'navbar.home' };

/** «Crear» y sus dos opciones (FEAT-53). Sin sesión, lo abre el botón naranja. */
export const CREATE_GROUP: NavLink = {
  to: '/cards',
  labelKey: 'navbar.create',
  children: [
    { to: '/cards', labelKey: 'navbar.createWithPhotos', descriptionKey: 'navbar.createWithPhotosDesc' },
    {
      to: '/arma-tus-tableros',
      labelKey: 'navbar.traditional',
      descriptionKey: 'navbar.traditionalDesc',
      matchChildren: true,
    },
  ],
};

export const NAV_LINKS: readonly NavLink[] = [
  CREATE_GROUP,
  { to: '/tematicas', labelKey: 'navbar.seasonal', matchChildren: true },
  { to: '/beneficios', labelKey: 'navbar.benefits' },
  { to: '/como-se-juega', labelKey: 'navbar.howToPlay' },
  { to: '/que-es-la-loteria', labelKey: 'navbar.whatIs' },
];

/** Los enlaces que le tocan a quien mira: con «Inicio» por delante si no hay sesión. */
export function navLinksFor(isLoggedIn: boolean): readonly NavLink[] {
  return isLoggedIn ? NAV_LINKS : [HOME_LINK, ...NAV_LINKS];
}

/**
 * Los enlaces de la barra ancha. Sin sesión no va «Crear»: sus opciones las abre el botón naranja «Crear
 * mi lotería gratis» (FEAT-53). El menú del celular sí la trae (`navLinksFor`).
 */
export function barLinksFor(isLoggedIn: boolean): readonly NavLink[] {
  return isLoggedIn ? NAV_LINKS : navLinksFor(false).filter((link) => !link.children);
}

/** Mismo ancla que la sección de loterías de Mi cuenta (Dashboard). */
export const ALL_SETS_PATH = '/dashboard#mis-loterias';

export function isNavLinkActive(link: NavLink, pathname: string): boolean {
  if (link.children) return link.children.some((child) => isNavLinkActive(child, pathname));
  if (pathname === link.to) return true;
  return link.matchChildren === true && pathname.startsWith(`${link.to}/`);
}

/** El primer nombre; si no hay nombre, lo que va antes de la arroba del correo. */
export function displayFirstName(fullName: string, email: string): string {
  const name = fullName.trim();
  return name !== '' ? name.split(/\s+/)[0] : email.split('@')[0];
}

/** Letra del avatar cuando la cuenta no tiene foto. */
export function userInitial(fullName: string, email: string): string {
  return displayFirstName(fullName, email).charAt(0).toUpperCase();
}
