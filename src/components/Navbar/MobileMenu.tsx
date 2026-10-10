import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCoins, FaGoogle, FaTimes } from 'react-icons/fa';
import logoImage from '../../img/logo.png';
import { ALL_SETS_PATH, NAV_LINKS, isNavLinkActive } from './navLinks';
import { UserAvatar } from './UserAvatar';

export const MOBILE_MENU_ID = 'navbar-mobile-menu';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const;

const FOCUSABLE = 'a[href], button:not([disabled])';

interface MobileMenuUser {
  name: string;
  email: string;
  avatarUrl: string | null | undefined;
  balance: number | null;
  isAdmin: boolean;
}

interface MobileMenuProps {
  pathname: string;
  /** La cuenta abierta, o null sin sesión. */
  user: MobileMenuUser | null;
  onClose: () => void;
  onGoogle: () => void;
  onSignUp: () => void;
  onLogin: () => void;
  onSignOut: () => void;
}

/** Menú de la barra en celular y tableta: ocupa toda la pantalla. */
export const MobileMenu = ({ pathname, user, onClose, onGoogle, onSignUp, onLogin, onSignOut }: MobileMenuProps) => {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLanguage = i18n.language?.startsWith('en') ? 'en' : 'es';

  // Mientras está abierto la página de atrás no se mueve, Escape lo cierra y el tabulador no se sale.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      id={MOBILE_MENU_ID}
      ref={containerRef}
      className="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={t('navbar.menuLabel')}
    >
      <div className="mobile-menu__bar">
        <img src={logoImage} alt="" className="mobile-menu__logo" />
        <button type="button" className="navbar__icon-button" onClick={onClose} aria-label={t('navbar.closeMenu')} autoFocus>
          <FaTimes aria-hidden="true" />
        </button>
      </div>

      <div className="mobile-menu__body">
        {user && (
          <>
            <div className="mobile-menu__user">
              <UserAvatar avatarUrl={user.avatarUrl} name={user.name} email={user.email} size="large" />
              <div className="mobile-menu__user-names">
                <strong className="mobile-menu__user-name">{user.name || user.email}</strong>
                {user.balance !== null && (
                  <span className="mobile-menu__user-balance">
                    <FaCoins aria-hidden="true" />
                    {t('navbar.tokensBalance', { count: user.balance })}
                  </span>
                )}
              </div>
              <Link to="/comprar-tokens" className="mobile-menu__buy" onClick={onClose}>
                {t('navbar.buy')}
              </Link>
            </div>
            <div className="mobile-menu__shortcuts">
              <Link to={ALL_SETS_PATH} className="mobile-menu__shortcut" onClick={onClose}>
                {t('navbar.myLoterias')}
              </Link>
              <Link to="/dashboard" className="mobile-menu__shortcut" onClick={onClose}>
                {t('navbar.myAccount')}
              </Link>
              {user.isAdmin && (
                <Link to="/admin" className="mobile-menu__shortcut mobile-menu__shortcut--wide" onClick={onClose}>
                  {t('navbar.admin')}
                </Link>
              )}
            </div>
          </>
        )}

        <ul className="mobile-menu__links">
          {NAV_LINKS.map((link) => {
            const isActive = isNavLinkActive(link, pathname);
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`mobile-menu__link ${isActive ? 'mobile-menu__link--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onClose}
                >
                  {t(link.labelKey)}
                  <span className="mobile-menu__link-arrow" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <span className="mobile-menu__spacer" />

        {user ? (
          <button type="button" className="mobile-menu__signout" onClick={onSignOut}>
            {t('common.logout')}
          </button>
        ) : (
          <div className="mobile-menu__auth">
            <button type="button" className="mobile-menu__auth-button mobile-menu__auth-button--google" onClick={onGoogle}>
              <FaGoogle aria-hidden="true" />
              {t('navbar.loginWithGoogle')}
            </button>
            <button type="button" className="mobile-menu__auth-button mobile-menu__auth-button--signup" onClick={onSignUp}>
              {t('navbar.createAccount')}
            </button>
            <span className="mobile-menu__have-account">
              {t('navbar.haveAccount')}{' '}
              <button type="button" className="mobile-menu__login" onClick={onLogin}>
                {t('navbar.login')}
              </button>
            </span>
          </div>
        )}

        <div className="mobile-menu__languages" role="group" aria-label={t('navbar.language')}>
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              lang={code}
              className={`mobile-menu__language ${currentLanguage === code ? 'mobile-menu__language--current' : ''}`}
              aria-pressed={currentLanguage === code}
              onClick={() => i18n.changeLanguage(code)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
