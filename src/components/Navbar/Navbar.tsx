import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaChevronDown, FaCoins } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAvatarUrl } from '../../hooks/useAvatarUrl';
import { useSetContext } from '../../contexts/SetContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import { SetRepository } from '../../repositories/SetRepository';
import logoImage from '../../img/logo.png';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import { logger } from '../../utils/logger';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MOBILE_MENU_ID, MobileMenu } from './MobileMenu';
import { NAV_LINKS, displayFirstName, isNavLinkActive } from './navLinks';
import { UserAvatar } from './UserAvatar';
import { UserMenuPanel } from './UserMenuPanel';
import './Navbar.css';

type AuthMode = 'login' | 'signup';

/**
 * Barra superior (FEAT-33, opción A). En pantallas anchas muestra los enlaces y la cuenta; en las
 * angostas, el botón de menú. Cuál de las dos se ve lo decide Navbar.css, en 1200 px.
 */
export const Navbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signOut, signInWithGoogle, isLoading, isAdmin } = useAuth();
  const avatarUrl = useAvatarUrl(user);
  const { sets, currentSetId, setCurrentSetId, setSets } = useSetContext();
  const { balance } = useTokenBalance();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fullName: string = user?.user_metadata?.full_name?.trim() ?? '';
  const email = user?.email ?? '';

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  // Al cambiar de página se cierran los dos menús.
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const openAuth = (mode: AuthMode) => {
    setIsMobileMenuOpen(false);
    setAuthMode(mode);
  };

  const handleGoogle = async () => {
    try {
      // Si sale bien, el navegador se va a Google: no hay nada más que hacer aquí.
      await signInWithGoogle();
    } catch (error) {
      logger.error('Navbar: no se pudo entrar con Google', error);
      // La ventana de registro ofrece Google otra vez y el registro por correo.
      openAuth('signup');
    }
  };

  const getNextNewLoteriaName = () => {
    const baseName = (t('navbar.newLoteriaName') || 'Nueva lotería').trim();
    const numbers = sets
      .filter((set) => set.name.startsWith(baseName))
      .map((set) => {
        const number = parseInt(set.name.slice(baseName.length).trim(), 10);
        return Number.isInteger(number) && number >= 1 ? number : null;
      })
      .filter((number): number is number => number !== null);
    return `${baseName} ${numbers.length > 0 ? Math.max(...numbers) + 1 : 1}`;
  };

  const handleCreateNewLoteria = async () => {
    if (!user || isCreatingSet) return;
    setIsCreatingSet(true);
    try {
      const newSet = await SetRepository.createSet(user.id, getNextNewLoteriaName());
      setSets((previous) => [...previous, newSet]);
      setCurrentSetId(newSet.id);
      setIsUserMenuOpen(false);
      navigate('/cards');
    } catch (error) {
      logger.error('Error creating set:', error);
    } finally {
      setIsCreatingSet(false);
    }
  };

  const goTo = (path: string) => {
    navigate(path);
    setIsUserMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <nav className="navbar__container" aria-label={t('navbar.mainLabel')}>
        <Link to="/" className="navbar__logo">
          <img src={logoImage} alt="chorroybuenas.com.mx" className="navbar__logo-image" />
        </Link>

        <ul className="navbar__links navbar__wide-only">
          {NAV_LINKS.map((link) => {
            const isActive = isNavLinkActive(link, pathname);
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`navbar__link ${isActive ? 'navbar__link--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(link.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="navbar__actions">
          <span className="navbar__wide-only">
            <LanguageSwitcher />
          </span>

          {!isLoading && !user && (
            <>
              <button type="button" className="navbar__sign-in navbar__wide-only" onClick={() => openAuth('login')}>
                {t('navbar.signIn')}
              </button>
              <Link to="/cards" className="navbar__cta">
                <span className="navbar__wide-only">{t('navbar.createFree')}</span>
                <span className="navbar__narrow-only">{t('navbar.createShort')}</span>
              </Link>
            </>
          )}

          {!isLoading && user && (
            <>
              {balance !== null && (
                <Link
                  to="/comprar-tokens"
                  className="navbar__tokens"
                  aria-label={t('navbar.tokensBalance', { count: balance })}
                >
                  <FaCoins aria-hidden="true" />
                  <span className="navbar__wide-only">{t('navbar.tokensBalance', { count: balance })}</span>
                  <span className="navbar__narrow-only">{balance}</span>
                </Link>
              )}

              <div className="navbar__user navbar__wide-only" ref={userMenuRef}>
                <button
                  type="button"
                  className="navbar__user-trigger"
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  aria-label={t('navbar.myAccount')}
                >
                  <UserAvatar avatarUrl={avatarUrl} name={fullName} email={email} />
                  <span className="navbar__user-name" title={email}>
                    {displayFirstName(fullName, email)}
                  </span>
                  <FaChevronDown
                    className={`navbar__user-chevron ${isUserMenuOpen ? 'navbar__user-chevron--open' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {isUserMenuOpen && (
                  <UserMenuPanel
                    name={fullName}
                    email={email}
                    avatarUrl={avatarUrl}
                    balance={balance}
                    sets={sets}
                    currentSetId={currentSetId}
                    isAdmin={isAdmin}
                    isCreatingSet={isCreatingSet}
                    onGoTo={goTo}
                    onCreateSet={handleCreateNewLoteria}
                    onSelectSet={(setId) => {
                      setCurrentSetId(setId);
                      goTo(`/loteria/${setId}`);
                    }}
                    onSignOut={handleSignOut}
                  />
                )}
              </div>

              <Link to="/dashboard" className="navbar__account navbar__narrow-only" aria-label={t('navbar.myAccount')}>
                <UserAvatar avatarUrl={avatarUrl} name={fullName} email={email} />
              </Link>
            </>
          )}

          <button
            type="button"
            className="navbar__icon-button navbar__narrow-only"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label={t('navbar.openMenu')}
            aria-expanded={isMobileMenuOpen}
            aria-controls={MOBILE_MENU_ID}
          >
            <FaBars aria-hidden="true" />
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <MobileMenu
          pathname={pathname}
          user={user ? { name: fullName, email, avatarUrl, balance, isAdmin } : null}
          onClose={closeMobileMenu}
          onGoogle={handleGoogle}
          onSignUp={() => openAuth('signup')}
          onLogin={() => openAuth('login')}
          onSignOut={handleSignOut}
        />
      )}

      <EmailAuthModal isOpen={authMode !== null} onClose={() => setAuthMode(null)} initialMode={authMode ?? 'login'} />
    </header>
  );
};
