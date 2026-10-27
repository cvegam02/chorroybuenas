import { getErrorMessage } from '../../utils/errors';
import { DISPOSABLE_EMAIL_MESSAGE, EMAIL_ALREADY_REGISTERED_MESSAGE } from '../../utils/signUpResult';

/** Qué le pasó a un intento de entrar o de crear cuenta, para elegir el aviso de la ventana. */
export type AuthErrorKind = 'credentials' | 'emailTaken' | 'disposable' | 'other';

const codeOf = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : undefined;

/**
 * Supabase avisa de un correo o contraseña equivocados con el código `invalid_credentials` y el mensaje
 * «Invalid login credentials»; de un correo ya registrado, con `user_already_exists` o con el mensaje
 * que arma `signUpWithEmail`; de un correo desechable, con el mensaje que arma `signUpWithEmail` (FEAT-58).
 */
export const authErrorKind = (error: unknown): AuthErrorKind => {
  const code = codeOf(error);
  const message = getErrorMessage(error);
  if (code === 'user_already_exists' || message.includes(EMAIL_ALREADY_REGISTERED_MESSAGE)) return 'emailTaken';
  if (message.includes(DISPOSABLE_EMAIL_MESSAGE)) return 'disposable';
  if (code === 'invalid_credentials' || /invalid login credentials|invalid_credentials/i.test(message)) {
    return 'credentials';
  }
  return 'other';
};
