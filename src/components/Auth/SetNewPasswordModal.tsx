import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../utils/errors';
import { AuthDialog } from './AuthDialog';
import { AuthPasswordField } from './AuthFields';
import { MIN_PASSWORD_LENGTH } from './AuthForms';
import { CheckIcon, LockIcon } from './AuthIcons';
import { AuthAlert, AuthLead, AuthNotice } from './AuthParts';

type PasswordError = { text: string; field: 'password' | 'confirm' | null };

interface SetNewPasswordDialogProps {
  email: string;
  onSave: (newPassword: string) => Promise<void>;
  onClose: () => void;
}

const SetNewPasswordDialog = ({ email, onSave, onClose }: SetNewPasswordDialogProps) => {
  const { t } = useTranslation();
  const titleId = useId();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PasswordError | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const passwordsMatch = confirmPassword.length >= MIN_PASSWORD_LENGTH && confirmPassword === password;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError({ text: t('common.auth.errors.weakPassword'), field: 'password' });
      return;
    }
    if (password !== confirmPassword) {
      setError({ text: t('common.auth.errors.passwordMismatch'), field: 'confirm' });
      return;
    }
    setIsLoading(true);
    try {
      await onSave(password);
      setIsSaved(true);
    } catch (err: unknown) {
      setError({ text: getErrorMessage(err) || t('common.auth.errors.authFailed'), field: null });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSaved) {
    return (
      <AuthDialog titleId={titleId} onClose={onClose} focusKey="saved" variant="done" hideClose>
        <AuthNotice titleId={titleId} title={t('common.auth.passwordSavedTitle')} icon={<CheckIcon size={34} />} tone="good">
          {t('common.auth.passwordSavedText')}
        </AuthNotice>
        <button type="button" className="auth-submit" onClick={onClose}>
          {t('common.auth.continue')}
        </button>
      </AuthDialog>
    );
  }

  return (
    <AuthDialog titleId={titleId} onClose={onClose} focusKey="form" variant="even">
      <AuthLead titleId={titleId} title={t('common.auth.newPasswordTitle')} icon={<LockIcon />} inline>
        {t('common.auth.newPasswordFor')} <strong>{email}</strong>
      </AuthLead>
      {error && <AuthAlert title={error.text} />}
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthPasswordField
          id="auth-new-password"
          label={t('common.auth.newPasswordLabel')}
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          hint={t('common.auth.passwordHint', { min: MIN_PASSWORD_LENGTH })}
          value={password}
          onChange={setPassword}
          disabled={isLoading}
          invalid={error?.field === 'password'}
        />
        <AuthPasswordField
          id="auth-new-password-repeat"
          label={t('common.auth.repeatPassword')}
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          hint={passwordsMatch ? t('common.auth.passwordsMatch') : undefined}
          hintIsGood
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={isLoading}
          invalid={error?.field === 'confirm'}
        />
        <button type="submit" className="auth-submit" disabled={isLoading}>
          {isLoading ? t('common.loading') : t('common.auth.saveNewPassword')}
        </button>
      </form>
    </AuthDialog>
  );
};

/**
 * Ventana de contraseña nueva (FEAT-38): aparece al abrir el enlace de recuperación del correo.
 * Cerrarla quita el aviso de recuperación; la sesión que abrió el enlace sigue iniciada.
 */
export const SetNewPasswordModal = () => {
  const { recoverySession, updatePassword, clearRecovery } = useAuth();
  if (!recoverySession) return null;

  return (
    <SetNewPasswordDialog
      email={recoverySession.user.email ?? ''}
      onSave={updatePassword}
      onClose={clearRecovery}
    />
  );
};
