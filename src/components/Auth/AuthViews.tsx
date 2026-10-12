import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthTextField } from './AuthFields';
import { GoogleIcon, KeyIcon, MailIcon } from './AuthIcons';
import { AuthAlert, AuthLead, AuthNotice, GiftNotice } from './AuthParts';

interface ForgotViewProps {
  titleId: string;
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  isLoading: boolean;
  /** Mensaje de error, si el envío falló o el correo está vacío. */
  errorText: string | null;
  emailInvalid: boolean;
}

/** Recuperar contraseña (estado 4 de la maqueta). «Volver» y cerrar los pone `AuthDialog`. */
export const ForgotView = (props: ForgotViewProps) => {
  const { t } = useTranslation();
  const { titleId, email, onEmailChange, onSubmit, isLoading, errorText, emailInvalid } = props;

  return (
    <>
      <AuthLead titleId={titleId} title={t('common.auth.forgotTitle')} icon={<KeyIcon />}>
        {t('common.auth.forgotText')}
      </AuthLead>
      {errorText && <AuthAlert title={errorText} />}
      <form className="auth-form" onSubmit={onSubmit}>
        <AuthTextField
          id="auth-forgot-email"
          label={t('common.auth.emailLabel')}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={onEmailChange}
          disabled={isLoading}
          invalid={emailInvalid}
        />
        <button type="submit" className="auth-submit" disabled={isLoading}>
          {isLoading ? t('common.loading') : t('common.auth.sendResetLink')}
        </button>
      </form>
      <div className="auth-tip">
        <GoogleIcon />
        <span>{t('common.auth.forgotGoogleTip')}</span>
      </div>
    </>
  );
};

interface CheckEmailViewProps {
  titleId: string;
  email: string;
  /** Qué hace el enlace: confirmar la cuenta nueva o crear la contraseña nueva. */
  instruction: string;
  /** Recuadro del regalo de tokens (solo en la cuenta nueva). */
  gift?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  /** «¿Escribiste mal tu correo? Corrígelo»: regresa al formulario con el correo escrito. */
  onFixEmail: () => void;
}

/** «Revisa tu correo» (estados 5 y 6 de la maqueta). */
export const CheckEmailView = (props: CheckEmailViewProps) => {
  const { t } = useTranslation();
  const { titleId, email, instruction, gift, actionLabel, onAction, onFixEmail } = props;

  return (
    <>
      <AuthNotice titleId={titleId} title={t('common.auth.checkEmailTitle')} icon={<MailIcon />}>
        {t('common.auth.checkEmailSentTo')}
        <br />
        <strong>{email}</strong>
        <br />
        {instruction}
      </AuthNotice>
      {gift && <GiftNotice small>{gift}</GiftNotice>}
      <p className="auth-footnote">{t('common.auth.checkEmailSpam')}</p>
      <button type="button" className="auth-submit" onClick={onAction}>
        {actionLabel}
      </button>
      <button type="button" className="auth-link auth-link--label" onClick={onFixEmail}>
        {t('common.auth.fixEmail')}
      </button>
    </>
  );
};
