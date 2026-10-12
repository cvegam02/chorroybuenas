import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useWelcomeTokens } from '../../hooks/useWelcomeTokens';
import { AuthDialog, type AuthDialogVariant } from './AuthDialog';
import { LoginForm, SignUpForm } from './AuthForms';
import { AuthAlert, AuthDivider, AuthHeader, AuthTabs, GiftNotice, GoogleButton } from './AuthParts';
import { CheckEmailView, ForgotView } from './AuthViews';
import { useEmailAuthForm, type AuthView } from './useEmailAuthForm';
import './EmailAuthModal.css';

interface EmailAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  /** Ruta del sitio a la que regresa quien entra con Google desde esta ventana; sin ella, Mi cuenta. */
  googleReturnPath?: string;
}

type EmailAuthDialogProps = Omit<EmailAuthModalProps, 'isOpen'>;

const VARIANT_BY_VIEW: Record<AuthView, AuthDialogVariant> = {
  login: 'default',
  signup: 'tall',
  forgot: 'back',
  forgotSent: 'notice',
  signupSent: 'notice',
};

const EmailAuthDialog = ({ onClose, initialMode = 'login', googleReturnPath }: EmailAuthDialogProps) => {
  const { t } = useTranslation();
  const titleId = useId();
  const welcomeTokens = useWelcomeTokens();
  const form = useEmailAuthForm({ initialView: initialMode, googleReturnPath, onSignedIn: onClose });
  const { view, goTo, isLoading, alert } = form;

  const wrongCredentials = alert?.kind === 'credentials';
  const emailTaken = alert?.kind === 'emailTaken';
  const messageAlert = alert?.kind === 'message' ? alert : null;
  const linkTo = (target: AuthView, label: string) => (
    <button type="button" className="auth-link auth-link--alert" onClick={() => goTo(target)}>
      {label}
    </button>
  );

  const tabs = <AuthTabs active={view === 'signup' ? 'signup' : 'login'} onChange={goTo} disabled={isLoading} />;
  const googleButton = <GoogleButton onClick={form.continueWithGoogle} disabled={isLoading} />;

  return (
    <AuthDialog
      titleId={titleId}
      onClose={onClose}
      focusKey={view}
      variant={VARIANT_BY_VIEW[view]}
      onBack={view === 'forgot' ? () => goTo('login') : undefined}
    >
      {view === 'login' && (
        <>
          <AuthHeader
            titleId={titleId}
            title={t('common.auth.loginTitle')}
            subtitle={t('common.auth.loginSubtitle')}
            showCards={!wrongCredentials}
          />
          {tabs}
          {wrongCredentials && (
            <AuthAlert title={t('common.auth.alerts.credentialsTitle')}>
              {t('common.auth.alerts.credentialsLead')}{' '}
              {linkTo('forgot', t('common.auth.alerts.credentialsRecover'))}.
            </AuthAlert>
          )}
          {messageAlert && <AuthAlert title={messageAlert.text} />}
          {!wrongCredentials && (
            <>
              {googleButton}
              <AuthDivider>{t('common.auth.orEmail')}</AuthDivider>
            </>
          )}
          <LoginForm
            email={form.email}
            password={form.password}
            onEmailChange={form.setEmail}
            onPasswordChange={form.setPassword}
            onSubmit={form.submitLogin}
            onForgot={() => goTo('forgot')}
            isLoading={isLoading}
            passwordInvalid={wrongCredentials}
          />
          {wrongCredentials ? (
            <>
              <AuthDivider>{t('common.or')}</AuthDivider>
              {googleButton}
            </>
          ) : (
            <p className="auth-footnote">
              {t('common.auth.noAccountLead')}{' '}
              <button type="button" className="auth-link" onClick={() => goTo('signup')}>
                {t('common.auth.createFree')}
              </button>
              {welcomeTokens !== null && (
                <span className="auth-footnote__gift"> {t('common.auth.noAccountGift', { count: welcomeTokens })}</span>
              )}
            </p>
          )}
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
          {welcomeTokens !== null && !emailTaken && (
            <GiftNotice>
              {t('common.auth.giftLead')} <strong>{t('common.auth.giftAmount', { count: welcomeTokens })}</strong>{' '}
              {t('common.auth.giftTail')}
            </GiftNotice>
          )}
          {tabs}
          {emailTaken && (
            <AuthAlert title={t('common.auth.alerts.emailTakenTitle')}>
              {linkTo('login', t('common.auth.alerts.emailTakenLogin'))} {t('common.or')}{' '}
              {linkTo('forgot', t('common.auth.alerts.emailTakenRecover'))}. {t('common.auth.alerts.emailTakenGoogle')}
            </AuthAlert>
          )}
          {messageAlert && <AuthAlert title={messageAlert.text} />}
          {googleButton}
          <AuthDivider>{t('common.auth.orEmail')}</AuthDivider>
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
            invalidField={emailTaken ? 'email' : messageAlert?.field}
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

      {view === 'forgot' && (
        <ForgotView
          titleId={titleId}
          email={form.email}
          onEmailChange={form.setEmail}
          onSubmit={form.submitForgot}
          isLoading={isLoading}
          errorText={messageAlert?.text ?? null}
          emailInvalid={messageAlert?.field === 'email'}
        />
      )}

      {view === 'forgotSent' && (
        <CheckEmailView
          titleId={titleId}
          email={form.email.trim()}
          instruction={t('common.auth.checkEmailReset')}
          actionLabel={t('common.auth.backToLoginButton')}
          onAction={() => goTo('login')}
          onFixEmail={() => goTo('forgot')}
        />
      )}

      {view === 'signupSent' && (
        <CheckEmailView
          titleId={titleId}
          email={form.email.trim()}
          instruction={t('common.auth.checkEmailConfirm')}
          gift={welcomeTokens !== null ? t('common.auth.checkEmailGift', { count: welcomeTokens }) : undefined}
          actionLabel={t('common.auth.understood')}
          onAction={onClose}
          onFixEmail={() => goTo('signup')}
        />
      )}
    </AuthDialog>
  );
};

/** Ventana de iniciar sesión y crear cuenta (FEAT-38). Cerrada no monta nada ni lee la configuración. */
export const EmailAuthModal = ({ isOpen, ...dialogProps }: EmailAuthModalProps) => {
  if (!isOpen) return null;
  return <EmailAuthDialog {...dialogProps} />;
};
