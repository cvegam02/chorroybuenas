import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthPasswordField, AuthTextField } from './AuthFields';

/** Largo mínimo de contraseña que pide Supabase. */
export const MIN_PASSWORD_LENGTH = 6;

interface LoginFormProps {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onForgot: () => void;
  isLoading: boolean;
}

export const LoginForm = (props: LoginFormProps) => {
  const { t } = useTranslation();
  const { email, password, onEmailChange, onPasswordChange, onSubmit, onForgot, isLoading } = props;

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <AuthTextField
        id="auth-login-email"
        label={t('common.auth.emailLabel')}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={onEmailChange}
        disabled={isLoading}
      />
      <AuthPasswordField
        id="auth-login-password"
        label={t('common.password')}
        autoComplete="current-password"
        required
        value={password}
        onChange={onPasswordChange}
        disabled={isLoading}
        labelAction={
          <button type="button" className="auth-link auth-link--label" onClick={onForgot}>
            {t('common.auth.forgotShort')}
          </button>
        }
      />
      <button type="submit" className="auth-submit" disabled={isLoading}>
        {isLoading ? t('common.loading') : t('common.auth.tabLogin')}
      </button>
    </form>
  );
};

interface SignUpFormProps {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  isLoading: boolean;
}

export const SignUpForm = (props: SignUpFormProps) => {
  const { t } = useTranslation();
  const { fullName, email, password, confirmPassword, onSubmit, isLoading } = props;

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <AuthTextField
        id="auth-signup-name"
        label={
          <>
            {t('common.auth.nameLabel')} <span className="auth-field__optional">{t('common.auth.optional')}</span>
          </>
        }
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={props.onFullNameChange}
        disabled={isLoading}
      />
      <AuthTextField
        id="auth-signup-email"
        label={t('common.auth.emailLabel')}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={props.onEmailChange}
        disabled={isLoading}
      />
      <AuthPasswordField
        id="auth-signup-password"
        label={t('common.password')}
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint={t('common.auth.passwordHint', { min: MIN_PASSWORD_LENGTH })}
        value={password}
        onChange={props.onPasswordChange}
        disabled={isLoading}
      />
      <AuthPasswordField
        id="auth-signup-password-repeat"
        label={t('common.auth.repeatPassword')}
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={confirmPassword}
        onChange={props.onConfirmPasswordChange}
        disabled={isLoading}
      />
      <button type="submit" className="auth-submit" disabled={isLoading}>
        {isLoading ? t('common.loading') : t('common.auth.submitSignUp')}
      </button>
    </form>
  );
};
