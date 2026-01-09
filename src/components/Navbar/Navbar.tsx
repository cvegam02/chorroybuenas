import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImage from '../../img/logo.png';
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
        
        <ul className={`navbar__menu ${isMenuOpen ? 'navbar__menu--open' : ''}`}>
          <li>
            <Link 
              to="/" 
              className={`navbar__link ${isActive('/') ? 'navbar__link--active' : ''}`}
              onClick={closeMenu}
            >
              Inicio
            </Link>
          </li>
          <li>
            <Link 
              to="/cards" 
              className={`navbar__link ${isActive('/cards') ? 'navbar__link--active' : ''}`}
              onClick={closeMenu}
            >
              Crear Loteria
            </Link>
          </li>
          <li>
            <Link 
              to="/como-se-juega" 
              className={`navbar__link ${isActive('/como-se-juega') ? 'navbar__link--active' : ''}`}
              onClick={closeMenu}
            >
              ¿Cómo se juega?
            </Link>
          </li>
          <li>
            <Link 
              to="/que-es-la-loteria" 
              className={`navbar__link ${isActive('/que-es-la-loteria') ? 'navbar__link--active' : ''}`}
              onClick={closeMenu}
            >
              ¿Qué es la Lotería?
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
