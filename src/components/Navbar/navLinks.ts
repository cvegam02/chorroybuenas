/** Enlaces de la barra superior, en su orden. Los cinco de `NAV_LINKS` se ven siempre, con sesión o sin ella (FEAT-33). */
export interface NavLink {
  to: string;
  labelKey: string;
  /** Marca el enlace también en las direcciones que cuelgan de él, como la ficha de una temática. */
  matchChildren?: boolean;
}

/** «Inicio» solo se ofrece sin sesión: con sesión, la página principal lleva a Mi cuenta. */
const HOME_LINK: NavLink = { to: '/', labelKey: 'navbar.home' };

export const NAV_LINKS: readonly NavLink[] = [
  { to: '/cards', labelKey: 'navbar.create' },
  { to: '/tematicas', labelKey: 'navbar.seasonal', matchChildren: true },
  { to: '/beneficios', labelKey: 'navbar.benefits' },
  { to: '/como-se-juega', labelKey: 'navbar.howToPlay' },
  { to: '/que-es-la-loteria', labelKey: 'navbar.whatIs' },
];

/** Los enlaces que le tocan a quien mira: con «Inicio» por delante si no hay sesión. */
export function navLinksFor(isLoggedIn: boolean): readonly NavLink[] {
  return isLoggedIn ? NAV_LINKS : [HOME_LINK, ...NAV_LINKS];
}

/** Mismo ancla que la sección de loterías de Mi cuenta (Dashboard). */
export const ALL_SETS_PATH = '/dashboard#mis-loterias';

export function isNavLinkActive(link: NavLink, pathname: string): boolean {
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
