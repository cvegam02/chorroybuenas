import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaPaypal } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import logoImage from '../../img/logo.png';
import { LanguageSwitcher } from './LanguageSwitcher';
import './Navbar.css';

export const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const { t } = useTranslation();

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
          <a
            href="https://paypal.me/cavegam"
            target="_blank"
            rel="noopener noreferrer"
            className="navbar__paypal-pill"
            title={t('navbar.support')}
          >
            <FaPaypal className="navbar__paypal-icon" />
            <span className="navbar__paypal-text">{t('navbar.support')}</span>
          </a>

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
        </div>

        <ul className={`navbar__menu ${isMenuOpen ? 'navbar__menu--open' : ''}`}>
          <li>
            <Link
              to="/"
              className={`navbar__link ${isActive('/') ? 'navbar__link--active' : ''}`}
              onClick={closeMenu}
            >
              {t('navbar.home')}
            </Link>
          </li>
          <li>
            <Link
              to="/cards"
              className={`navbar__link ${isActive('/cards') ? 'navbar__link--active' : ''}`}
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
      </div>
      {isMenuOpen && (
        <div className="navbar__overlay" onClick={closeMenu}></div>
      )}
    </nav>
  );
};
