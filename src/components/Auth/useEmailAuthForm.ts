import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { EMAIL_ALREADY_REGISTERED_MESSAGE } from '../../utils/signUpResult';
import type { AuthTab } from './AuthParts';

/** Vistas de la ventana: las dos pestañas, recuperar contraseña y los dos avisos de «revisa tu correo». */
export type AuthView = AuthTab | 'forgot' | 'forgotSent' | 'signupSent';

interface EmailAuthFormOptions {
  initialView: AuthTab;
  googleReturnPath?: string;
  /** Se llama cuando la persona ya entró con correo y contraseña. */
  onSignedIn: () => void;
}

/** Estado y envíos de la ventana de cuenta. El flujo con Supabase es el de `AuthContext`, sin cambios. */
export const useEmailAuthForm = ({ initialView, googleReturnPath, onSignedIn }: EmailAuthFormOptions) => {
  const { t } = useTranslation();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPasswordForEmail } = useAuth();
  const [view, setView] = useState<AuthView>(initialView);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (next: AuthView) => {
    setView(next);
    setError(null);
  };

  const describeError = (err: unknown): string => {
    const message = getErrorMessage(err);
    if (message.includes('invalid_credentials')) return t('common.auth.errors.authFailed');
    if (message.includes(EMAIL_ALREADY_REGISTERED_MESSAGE)) return t('common.auth.errors.emailTaken');
    return message || t('common.auth.errors.authFailed');
  };

  /** Corre una llamada de cuenta con los botones en espera; devuelve si salió bien. */
  const attempt = async (action: () => Promise<void>): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      await action();
      return true;
    } catch (err: unknown) {
      logger.error('Auth error:', err);
      setError(describeError(err));
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
      setError(t('common.auth.errors.passwordMismatch'));
      return;
    }
    const signedUp = await attempt(() => signUpWithEmail(email, password, { full_name: fullName.trim() || undefined }));
    if (signedUp) setView('signupSent');
  };

  const submitForgot = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError(t('common.auth.errors.invalidEmail'));
      return;
    }
    if (await attempt(() => resetPasswordForEmail(email.trim()))) setView('forgotSent');
  };

  const continueWithGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Si sale bien, el navegador se va a Google: no hay nada más que hacer aquí.
      await signInWithGoogle(googleReturnPath);
    } catch (err: unknown) {
      logger.error('Google auth error:', err);
      setError(t('common.auth.errors.googleFailed'));
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
    error,
    submitLogin,
    submitSignUp,
    submitForgot,
    continueWithGoogle,
  };
};
