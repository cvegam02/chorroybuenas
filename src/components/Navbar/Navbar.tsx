import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUser, FaChevronDown, FaThList, FaCog } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import { SetRepository } from '../../repositories/SetRepository';
import logoImage from '../../img/logo.png';
import { LanguageSwitcher } from './LanguageSwitcher';
import { FaCoins } from 'react-icons/fa';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import './Navbar.css';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isLoading, isAdmin } = useAuth();
  const { sets, currentSetId, setCurrentSetId, setSets } = useSetContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { balance } = useTokenBalance();
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalMode, setEmailModalMode] = useState<'login' | 'signup'>('login');
  const [isLoteriasSectionOpen, setIsLoteriasSectionOpen] = useState(true);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { t } = useTranslation();
  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const getNextNewLoteriaName = () => {
    const baseName = (t('navbar.newLoteriaName') || 'Nueva lotería').trim();
    const numbers = sets
      .filter(s => s.name.startsWith(baseName))
      .map(s => {
        const rest = s.name.slice(baseName.length).trim();
        const n = parseInt(rest, 10);
        return Number.isInteger(n) && n >= 1 ? n : null;
      })
      .filter((n): n is number => n !== null);
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${baseName} ${nextNum}`;
  };

  const handleCreateNewLoteria = async () => {
    if (!user || isCreatingSet) return;
    setIsCreatingSet(true);
    try {
      const name = getNextNewLoteriaName();
      const newSet = await SetRepository.createSet(user.id, name);
      setSets(prev => [...prev, newSet]);
      setCurrentSetId(newSet.id);
      setUserMenuOpen(false);
      closeMenu();
      navigate('/cards');
    } catch (err) {
      console.error('Error creating set:', err);
    } finally {
      setIsCreatingSet(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__logo" onClick={closeMenu}>
          <img
            src={logoImage}
            alt="chorroybuenas.com.mx"
            className="navbar__logo-image"
          />
          <span className="navbar__logo-text">chorroybuenas.com.mx</span>
        </Link>

        <div className="navbar__actions">
          <LanguageSwitcher />

          {!isLoading && user && (
            <div className="navbar__auth" ref={userMenuRef}>
              <button
                type="button"
                className="navbar__user-trigger"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label={t('navbar.myAccount')}
              >
                <div className="navbar__user-container">
                  <div className="navbar__user-info" title={user.email}>
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="" className="navbar__user-avatar" />
                    ) : (
                      <FaUser className="navbar__user-icon" />
                    )}
                  </div>
                  <span className="navbar__user-name" title={user.email}>
                    {user.user_metadata?.full_name?.trim() || user.email || ''}
                  </span>
                  {balance !== null && (
                    <div className="navbar__tokens-badge" title={t('landing.benefits.feature3.title')}>
                      <FaCoins />
                      <span>{balance}</span>
                    </div>
                  )}
                  <FaChevronDown className={`navbar__user-chevron ${userMenuOpen ? 'navbar__user-chevron--open' : ''}`} />
                </div>
              </button>
              {userMenuOpen && (
                <div className="navbar__user-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__user-dropdown-item"
                    onClick={() => {
                      navigate('/dashboard');
                      setUserMenuOpen(false);
                      closeMenu();
                    }}
                  >
                    <FaUser />
                    <span>{t('navbar.myAccount')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__user-dropdown-item navbar__user-dropdown-item--create"
                    onClick={handleCreateNewLoteria}
                    disabled={isCreatingSet}
                  >
                    <span className="navbar__user-dropdown-item-icon">+</span>
                    <span>{t('navbar.createNewLoteria')}</span>
                  </button>
                  <div className="navbar__user-dropdown-section" role="group" aria-label={t('navbar.myLoterias')}>
                    <button
                      type="button"
                      className={`navbar__user-dropdown-section-title ${isLoteriasSectionOpen ? 'navbar__user-dropdown-section-title--open' : ''}`}
                      onClick={() => setIsLoteriasSectionOpen((v) => !v)}
                      aria-expanded={isLoteriasSectionOpen}
                      aria-controls="navbar-loterias-list"
                    >
                      <FaChevronDown className="navbar__user-dropdown-section-chevron" />
                      <FaThList className="navbar__user-dropdown-section-icon" />
                      <span>{t('navbar.myLoterias')}</span>
                    </button>
                    <div
                      id="navbar-loterias-list"
                      className="navbar__user-dropdown-section-list"
                      hidden={!isLoteriasSectionOpen}
                    >
                      {sets.length === 0 ? (
                        <div className="navbar__user-dropdown-empty">{t('common.loading')}</div>
                      ) : (
                        sets.map((set) => (
                          <button
                            key={set.id}
                            type="button"
                            role="menuitem"
                            className={`navbar__user-dropdown-item navbar__user-dropdown-item--set ${currentSetId === set.id ? 'navbar__user-dropdown-item--active' : ''}`}
                            onClick={() => {
                              setCurrentSetId(set.id);
                              navigate(`/loteria/${set.id}`);
                              setUserMenuOpen(false);
                              closeMenu();
                            }}
                          >
                            {set.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__user-dropdown-item"
                    onClick={() => {
                      navigate('/comprar-tokens');
                      setUserMenuOpen(false);
                      closeMenu();
                    }}
                  >
                    <FaCoins />
                    <span>{t('navbar.buyTokens')}</span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      className="navbar__user-dropdown-item navbar__user-dropdown-item--admin"
                      onClick={() => {
                        navigate('/admin');
                        setUserMenuOpen(false);
                        closeMenu();
                      }}
                    >
                      <FaCog />
                      <span>Admin</span>
                    </button>
                  )}
                  <div className="navbar__user-dropdown-divider" />
                  <button
                    type="button"
                    role="menuitem"
                    className="navbar__user-dropdown-item navbar__user-dropdown-item--logout"
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                      closeMenu();
                    }}
                  >
                    <FaSignOutAlt />
                    <span>{t('common.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!isLoading && !user && (
            <div className="navbar__auth-guest">
              <button
                className="navbar__auth-btn navbar__auth-btn--login-text"
                onClick={() => {
                  setEmailModalMode('login');
                  setIsEmailModalOpen(true);
                }}
              >
                {t('common.auth.titleLogin')}
              </button>
              <button
                type="button"
                className="navbar__auth-btn navbar__auth-btn--signup"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEmailModalMode('signup');
                  setIsEmailModalOpen(true);
                  closeMenu();
                }}
              >
                {t('common.auth.titleSignUp')}
              </button>
            </div>
          )}

          {!user && (
            <button
              className="navbar__toggle"
              onClick={toggleMenu}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <span className={`navbar__toggle-icon ${isMenuOpen ? 'navbar__toggle-icon--open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          )}
        </div>

        {!user && (
          <ul className={`navbar__menu ${isMenuOpen ? 'navbar__menu--open' : ''}`}>
            <li>
              <Link
                to="/cards"
                className={`navbar__link ${location.pathname === '/cards' ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                {t('navbar.create')}
              </Link>
            </li>
            <li>
              <Link
                to="/como-se-juega"
                className={`navbar__link ${isActive('/como-se-juega') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                {t('navbar.howToPlay')}
              </Link>
            </li>
            <li>
              <Link
                to="/que-es-la-loteria"
                className={`navbar__link ${isActive('/que-es-la-loteria') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                {t('navbar.whatIs')}
              </Link>
            </li>
          </ul>
        )}
      </div>
      {!user && isMenuOpen && (
        <div className="navbar__overlay" onClick={closeMenu}></div>
      )}
      <EmailAuthModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        initialMode={emailModalMode}
      />
    </nav>
  );
};
