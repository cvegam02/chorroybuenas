import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertIcon, GiftIcon, GoogleIcon } from './AuthIcons';

/** Cartas de muestra del sitio (las mismas de Mi cuenta y Temáticas). */
const HEADER_CARDS = ['/media/inicio/cartas/carta-05.jpg', '/media/inicio/cartas/carta-03.jpg'];

interface AuthHeaderProps {
  titleId: string;
  title: string;
  subtitle: ReactNode;
  /** Las dos cartas pequeñas; solo las lleva Iniciar sesión. */
  showCards?: boolean;
}

export const AuthHeader = ({ titleId, title, subtitle, showCards = false }: AuthHeaderProps) => (
  <div className={`auth-header${showCards ? ' auth-header--cards' : ''}`}>
    {showCards && (
      <div className="auth-header__cards" aria-hidden="true">
        {HEADER_CARDS.map((src) => (
          <img key={src} src={src} alt="" width={40} height={60} />
        ))}
      </div>
    )}
    <div className="auth-header__text">
      <h2 id={titleId}>{title}</h2>
      <p>{subtitle}</p>
    </div>
  </div>
);

export type AuthTab = 'login' | 'signup';

interface AuthTabsProps {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
  disabled: boolean;
}

export const AuthTabs = ({ active, onChange, disabled }: AuthTabsProps) => {
  const { t } = useTranslation();
  const tabs: readonly { id: AuthTab; label: string }[] = [
    { id: 'login', label: t('common.auth.tabLogin') },
    { id: 'signup', label: t('common.auth.tabSignUp') },
  ];

  return (
    <div className="auth-tabs" role="tablist" aria-label={t('common.auth.tabsLabel')}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className="auth-tabs__tab"
          aria-selected={tab.id === active}
          onClick={() => onChange(tab.id)}
          disabled={disabled}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

interface GoogleButtonProps {
  onClick: () => void;
  disabled: boolean;
}

export const GoogleButton = ({ onClick, disabled }: GoogleButtonProps) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="auth-google" onClick={onClick} disabled={disabled}>
      <GoogleIcon />
      {t('common.auth.continueGoogle')}
    </button>
  );
};

export const AuthDivider = ({ children }: { children: ReactNode }) => (
  <div className="auth-divider">
    <span aria-hidden="true" />
    {children}
    <span aria-hidden="true" />
  </div>
);

/** Recuadro turquesa del regalo de tokens; `small` es el del aviso de «revisa tu correo». */
export const GiftNotice = ({ children, small = false }: { children: ReactNode; small?: boolean }) => (
  <div className={`auth-gift${small ? ' auth-gift--small' : ''}`}>
    <GiftIcon />
    <span>{children}</span>
  </div>
);

/** Aviso de error. Se anuncia solo a lectores de pantalla (`role="alert"`). */
export const AuthAlert = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="auth-alert" role="alert">
    <AlertIcon />
    <div className="auth-alert__body">
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  </div>
);

interface AuthLeadProps {
  titleId: string;
  title: string;
  /** Ícono del cuadro naranja claro (llave, candado). */
  icon: ReactNode;
  /** En celular el texto va junto al ícono, no debajo (Nueva contraseña). */
  inline?: boolean;
  children: ReactNode;
}

/** Encabezado con ícono, alineado a la izquierda: Recuperar contraseña y Nueva contraseña. */
export const AuthLead = ({ titleId, title, icon, inline = false, children }: AuthLeadProps) => (
  <div className={`auth-lead${inline ? ' auth-lead--inline' : ''}`}>
    <span className="auth-lead__badge" aria-hidden="true">
      {icon}
    </span>
    <h2 id={titleId}>{title}</h2>
    <p>{children}</p>
  </div>
);

interface AuthNoticeProps {
  titleId: string;
  title: string;
  /** Ícono del círculo (sobre, palomita). */
  icon: ReactNode;
  /** `good` pinta el círculo en turquesa («¡Listo!»). */
  tone?: 'mail' | 'good';
  children: ReactNode;
}

/** Encabezado centrado de los avisos: «Revisa tu correo» y «¡Listo! Contraseña guardada». */
export const AuthNotice = ({ titleId, title, icon, tone = 'mail', children }: AuthNoticeProps) => (
  <>
    <span className={`auth-notice__badge auth-notice__badge--${tone}`} aria-hidden="true">
      {icon}
    </span>
    <div className="auth-notice__text">
      <h2 id={titleId}>{title}</h2>
      <p>{children}</p>
    </div>
  </>
);
