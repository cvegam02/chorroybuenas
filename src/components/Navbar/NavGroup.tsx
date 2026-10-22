import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { isNavLinkActive, type NavLink } from './navLinks';

interface NavGroupProps {
  group: NavLink;
  /**
   * Botón naranja «Crear mi lotería gratis» sin sesión (FEAT-53): el mismo menú con el aspecto del botón,
   * fuera de la lista de enlaces y abierto hacia la izquierda. Sin esto, es una entrada más de la barra.
   */
  cta?: { label: ReactNode; className?: string };
}

/**
 * Entrada de la barra que abre sus opciones (FEAT-53: «Crear» → «Tu lotería con fotos» y «Arma tus
 * tableros»). Se abre con clic o toque, no al pasar el mouse, para que funcione igual en pantallas táctiles.
 * Se cierra con Escape, al tocar fuera o al elegir una opción.
 */
export const NavGroup = ({ group, cta }: NavGroupProps) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement & HTMLLIElement>(null);
  const panelId = useId();
  const isActive = isNavLinkActive(group, pathname);

  useEscapeKey(() => setIsOpen(false), isOpen);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [isOpen]);

  const Root = cta ? 'div' : 'li';
  const toggleClass = cta
    ? `navbar__cta navbar__group-toggle ${cta.className ?? ''}`
    : `navbar__link navbar__group-toggle ${isActive ? 'navbar__link--active' : ''}`;

  return (
    <Root className={`navbar__group${cta ? ' navbar__group--cta' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={toggleClass}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {cta ? cta.label : t(group.labelKey)}
        <FaChevronDown
          className={`navbar__group-chevron${isOpen ? ' navbar__group-chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>
      <ul id={panelId} className="navbar__group-panel" hidden={!isOpen}>
        {group.children?.map((child) => {
          const childActive = isNavLinkActive(child, pathname);
          return (
            <li key={child.to}>
              <Link
                to={child.to}
                className={`navbar__group-item${childActive ? ' navbar__group-item--active' : ''}`}
                aria-current={childActive ? 'page' : undefined}
                onClick={() => setIsOpen(false)}
              >
                <span className="navbar__group-item-title">{t(child.labelKey)}</span>
                {child.descriptionKey && <span className="navbar__group-item-desc">{t(child.descriptionKey)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </Root>
  );
};
