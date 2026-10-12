import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useWelcomeTokens } from '../../hooks/useWelcomeTokens';
import { AuthDialog } from './AuthDialog';
import { AuthTextField } from './AuthFields';
import { LoginForm, SignUpForm } from './AuthForms';
import { AuthDivider, AuthHeader, AuthTabs, GiftNotice, GoogleButton } from './AuthParts';
import { useEmailAuthForm } from './useEmailAuthForm';
import './EmailAuthModal.css';

interface EmailAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  /** Ruta del sitio a la que regresa quien entra con Google desde esta ventana; sin ella, Mi cuenta. */
  googleReturnPath?: string;
}

type EmailAuthDialogProps = Omit<EmailAuthModalProps, 'isOpen'>;

const EmailAuthDialog = ({ onClose, initialMode = 'login', googleReturnPath }: EmailAuthDialogProps) => {
  const { t } = useTranslation();
  const titleId = useId();
  const welcomeTokens = useWelcomeTokens();
  const form = useEmailAuthForm({ initialView: initialMode, googleReturnPath, onSignedIn: onClose });
  const { view, goTo, isLoading } = form;

  const errorAlert = form.error && (
    <div className="auth-alert" role="alert">
      {form.error}
    </div>
  );
  const tabs = <AuthTabs active={view === 'signup' ? 'signup' : 'login'} onChange={goTo} disabled={isLoading} />;
  const google = (
    <>
      <GoogleButton onClick={form.continueWithGoogle} disabled={isLoading} />
      <AuthDivider>{t('common.auth.orEmail')}</AuthDivider>
    </>
  );

  return (
    <AuthDialog titleId={titleId} onClose={onClose} focusKey={view} tall={view === 'signup'}>
      {view === 'login' && (
        <>
          <AuthHeader
            titleId={titleId}
            title={t('common.auth.loginTitle')}
            subtitle={t('common.auth.loginSubtitle')}
            showCards
          />
          {tabs}
          {errorAlert}
          {google}
          <LoginForm
            email={form.email}
            password={form.password}
            onEmailChange={form.setEmail}
            onPasswordChange={form.setPassword}
            onSubmit={form.submitLogin}
            onForgot={() => goTo('forgot')}
            isLoading={isLoading}
          />
          <p className="auth-footnote">
            {t('common.auth.noAccountLead')}{' '}
            <button type="button" className="auth-link" onClick={() => goTo('signup')}>
              {t('common.auth.createFree')}
            </button>
            {welcomeTokens !== null && (
              <span className="auth-footnote__gift"> {t('common.auth.noAccountGift', { count: welcomeTokens })}</span>
            )}
          </p>
        </>
      )}

      {view === 'signup' && (
        <>
          <AuthHeader
            titleId={titleId}
            title={t('common.auth.signUpTitle')}
            subtitle={
              <>
                <span className="auth-only-desktop">{t('common.auth.signUpSubtitle')}</span>
                <span className="auth-only-mobile">{t('common.auth.signUpSubtitleShort')}</span>
              </>
            }
          />
          {welcomeTokens !== null && <GiftNotice tokens={welcomeTokens} />}
          {tabs}
          {errorAlert}
          {google}
          <SignUpForm
            fullName={form.fullName}
            email={form.email}
            password={form.password}
            confirmPassword={form.confirmPassword}
            onFullNameChange={form.setFullName}
            onEmailChange={form.setEmail}
            onPasswordChange={form.setPassword}
            onConfirmPasswordChange={form.setConfirmPassword}
            onSubmit={form.submitSignUp}
            isLoading={isLoading}
          />
          <p className="auth-footnote auth-footnote--small">
            {t('common.auth.privacyLead')}{' '}
            <a className="auth-footnote__link" href="/privacidad" target="_blank" rel="noopener noreferrer">
              {t('common.auth.privacyLink')}
            </a>
            .
          </p>
        </>
      )}

      {/* Recuperar contraseña y los avisos de «revisa tu correo»: se rediseñan en la US A4 de FEAT-38. */}
      {view === 'forgot' && (
        <>
          <AuthHeader
            titleId={titleId}
            title={t('common.auth.forgotPasswordTitle')}
            subtitle={t('common.auth.forgotPasswordDescription')}
          />
          {errorAlert}
          <form className="auth-form" onSubmit={form.submitForgot}>
            <AuthTextField
              id="auth-forgot-email"
              label={t('common.auth.emailLabel')}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={form.setEmail}
              disabled={isLoading}
            />
            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('common.auth.sendResetLink')}
            </button>
          </form>
          <p className="auth-footnote">
            <button type="button" className="auth-link" onClick={() => goTo('login')}>
              {t('common.auth.backToLogin')}
            </button>
          </p>
        </>
      )}

      {view === 'forgotSent' && (
        <>
          <AuthHeader
            titleId={titleId}
            title={t('common.auth.forgotPasswordTitle')}
            subtitle={t('common.auth.forgotPasswordSent')}
          />
          <button type="button" className="auth-submit" onClick={() => goTo('login')}>
            {t('common.auth.backToLogin')}
          </button>
        </>
      )}

      {view === 'signupSent' && (
        <>
          <AuthHeader
            titleId={titleId}
            title={t('common.auth.signUpTitle')}
            subtitle={t('common.auth.signUpConfirmationMessage')}
          />
          <button type="button" className="auth-submit" onClick={onClose}>
            {t('common.auth.signUpConfirmationButton')}
          </button>
        </>
      )}
    </AuthDialog>
  );
};

/** Ventana de iniciar sesión y crear cuenta (FEAT-38). Cerrada no monta nada ni lee la configuración. */
export const EmailAuthModal = ({ isOpen, ...dialogProps }: EmailAuthModalProps) => {
  if (!isOpen) return null;
  return <EmailAuthDialog {...dialogProps} />;
};
