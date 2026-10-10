import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import { EmailAuthModal } from './EmailAuthModal';
import './AuthChoice.css';

interface AuthChoiceProps {
  /** Sobre qué fondo van los botones: naranja (héroes) o claro. */
  tone: 'onPrimary' | 'onLight';
  /** Agrega debajo «¿Ya tienes cuenta? Inicia sesión». */
  showLogin?: boolean;
  /** Ruta del sitio a la que regresa quien entra con Google; sin ella, Mi cuenta. */
  returnPath?: string;
  /** Botones más chicos, para recuadros angostos. */
  compact?: boolean;
}

/**
 * «Entrar con Google» y «Crear tu cuenta», con el mismo peso (FEAT-33): Google no es la opción por
 * defecto. La segunda abre el registro por correo.
 */
export const AuthChoice = ({ tone, showLogin = false, returnPath, compact = false }: AuthChoiceProps) => {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const [modalMode, setModalMode] = useState<'login' | 'signup' | null>(null);

  const handleGoogle = async () => {
    try {
      // Si sale bien, el navegador se va a Google: no hay nada más que hacer aquí.
      await signInWithGoogle(returnPath);
    } catch (error) {
      logger.error('AuthChoice: no se pudo entrar con Google', error);
      setModalMode('signup');
    }
  };

  return (
    <div className={`auth-choice auth-choice--${tone} ${compact ? 'auth-choice--compact' : ''}`}>
      <div className="auth-choice__buttons">
        <button type="button" className="auth-choice__button auth-choice__button--google" onClick={handleGoogle}>
          <FaGoogle aria-hidden="true" />
          {t('navbar.loginWithGoogle')}
        </button>
        <button type="button" className="auth-choice__button auth-choice__button--signup" onClick={() => setModalMode('signup')}>
          {t('navbar.createAccount')}
        </button>
      </div>
      {showLogin && (
        <span className="auth-choice__login">
          {t('navbar.haveAccount')}{' '}
          <button type="button" className="auth-choice__login-button" onClick={() => setModalMode('login')}>
            {t('navbar.login')}
          </button>
        </span>
      )}
      <EmailAuthModal isOpen={modalMode !== null} onClose={() => setModalMode(null)} initialMode={modalMode ?? 'signup'}
        googleReturnPath={returnPath}
      />
    </div>
  );
};
