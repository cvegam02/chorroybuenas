import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { authErrorKind } from './authErrors';
import type { AuthTab } from './AuthParts';

/** Vistas de la ventana: las dos pestañas, recuperar contraseña y los dos avisos de «revisa tu correo». */
export type AuthView = AuthTab | 'forgot' | 'forgotSent' | 'signupSent';

/**
 * Aviso de error de la ventana. Los dos primeros tienen texto y enlaces propios (estados 2 y 3 de la
 * maqueta); el resto es un mensaje suelto, que puede señalar el campo equivocado.
 */
export type AuthAlertState =
  | { kind: 'credentials' }
  | { kind: 'emailTaken' }
  | { kind: 'message'; text: string; field?: 'email' | 'confirm' };

interface EmailAuthFormOptions {
  initialView: AuthTab;
  googleReturnPath?: string;
  /** Ruta a la que regresa el correo de confirmación de una cuenta nueva; sin ella, la de Supabase. */
  confirmReturnPath?: string;
  /** Se llama cuando la persona ya entró con correo y contraseña. */
  onSignedIn: () => void;
}

/** Estado y envíos de la ventana de cuenta. El flujo con Supabase es el de `AuthContext`, sin cambios. */
export const useEmailAuthForm = ({ initialView, googleReturnPath, confirmReturnPath, onSignedIn }: EmailAuthFormOptions) => {
  const { t } = useTranslation();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPasswordForEmail } = useAuth();
  const [view, setView] = useState<AuthView>(initialView);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<AuthAlertState | null>(null);

  const goTo = (next: AuthView) => {
    setView(next);
    setAlert(null);
  };

  const alertFor = (err: unknown): AuthAlertState => {
    const kind = authErrorKind(err);
    if (kind === 'disposable') return { kind: 'message', text: t('common.auth.errors.disposableEmail'), field: 'email' };
    if (kind !== 'other') return { kind };
    return { kind: 'message', text: getErrorMessage(err) || t('common.auth.errors.authFailed') };
  };

  /** Corre una llamada de cuenta con los botones en espera; devuelve si salió bien. */
  const attempt = async (action: () => Promise<void>): Promise<boolean> => {
    setAlert(null);
    setIsLoading(true);
    try {
      await action();
      return true;
    } catch (err: unknown) {
      logger.error('Auth error:', err);
      setAlert(alertFor(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (await attempt(() => signInWithEmail(email, password))) onSignedIn();
  };

  const submitSignUp = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setAlert({ kind: 'message', text: t('common.auth.errors.passwordMismatch'), field: 'confirm' });
      return;
    }
    const signedUp = await attempt(() => signUpWithEmail(email, password, { full_name: fullName.trim() || undefined }, confirmReturnPath));
    if (signedUp) setView('signupSent');
  };

  const submitForgot = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setAlert({ kind: 'message', text: t('common.auth.errors.invalidEmail'), field: 'email' });
      return;
    }
    if (await attempt(() => resetPasswordForEmail(email.trim()))) setView('forgotSent');
  };

  const continueWithGoogle = async () => {
    setAlert(null);
    setIsLoading(true);
    try {
      // Si sale bien, el navegador se va a Google: no hay nada más que hacer aquí.
      await signInWithGoogle(googleReturnPath);
    } catch (err: unknown) {
      logger.error('Google auth error:', err);
      setAlert({ kind: 'message', text: t('common.auth.errors.googleFailed') });
      setIsLoading(false);
    }
  };

  return {
    view,
    goTo,
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    alert,
    submitLogin,
    submitSignUp,
    submitForgot,
    continueWithGoogle,
  };
};
