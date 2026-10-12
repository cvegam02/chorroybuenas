import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GiftIcon, GoogleIcon } from './AuthIcons';

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

/** «Te regalamos N tokens al crear tu cuenta», con la cantidad que configura el administrador. */
export const GiftNotice = ({ tokens }: { tokens: number }) => {
  const { t } = useTranslation();
  return (
    <div className="auth-gift">
      <GiftIcon />
      <span>
        {t('common.auth.giftLead')} <strong>{t('common.auth.giftAmount', { count: tokens })}</strong>{' '}
        {t('common.auth.giftTail')}
      </span>
    </div>
  );
};
