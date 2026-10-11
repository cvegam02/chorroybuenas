import type { ChangeEvent, RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCamera, FaCoins } from 'react-icons/fa';
import { displayFirstName, userInitial } from '../Navbar/navLinks';
import './AccountHeader.css';

interface AccountHeaderProps {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  /** Saldo de tokens; null mientras no ha cargado. */
  balance: number | null;
  isUploadingAvatar: boolean;
  avatarInputRef: RefObject<HTMLInputElement>;
  onAvatarClick: () => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** Encabezado de Mi cuenta: foto de perfil (se cambia al pulsarla), saludo y saldo de tokens. */
export const AccountHeader = ({
  fullName,
  email,
  avatarUrl,
  balance,
  isUploadingAvatar,
  avatarInputRef,
  onAvatarClick,
  onAvatarChange,
}: AccountHeaderProps) => {
  const { t } = useTranslation();

  const renderAvatar = () => {
    if (isUploadingAvatar) {
      return (
        <span className="account-header__avatar">
          <span className="dashboard__spinner dashboard__spinner--small" />
        </span>
      );
    }
    if (avatarUrl) {
      return <img src={avatarUrl} alt="" className="account-header__avatar" />;
    }
    return (
      <span className="account-header__avatar" aria-hidden="true">
        {userInitial(fullName, email)}
      </span>
    );
  };

  return (
    <header className="account-header">
      <div className="account-header__inner">
        <div className="account-header__profile">
          <button
            type="button"
            className="account-header__avatar-button"
            onClick={onAvatarClick}
            disabled={isUploadingAvatar}
            aria-label={t('dashboard.header.changePhoto')}
          >
            {renderAvatar()}
            <span className="account-header__camera" aria-hidden="true">
              <FaCamera />
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={onAvatarChange}
          />
          <div className="account-header__greeting">
            <h1 className="account-header__title">
              {t('dashboard.welcome', { name: displayFirstName(fullName, email) })}
            </h1>
            <p className="account-header__subtitle">
              <span className="account-header__wide">{t('dashboard.header.subtitle')}</span>
              <span className="account-header__narrow">{t('dashboard.header.subtitleShort')}</span>
            </p>
          </div>
        </div>

        <div className="account-header__balance">
          <span className="account-header__balance-icon" aria-hidden="true">
            <FaCoins />
          </span>
          <div className="account-header__balance-text">
            <span className="account-header__balance-label">{t('buyTokens.balanceLabel')}</span>
            <strong className="account-header__balance-amount">
              {balance !== null ? t('navbar.tokensBalance', { count: balance }) : '—'}
            </strong>
            {balance !== null && (
              <span className="account-header__balance-hint account-header__wide">
                {t('dashboard.header.photos', { count: balance })}
              </span>
            )}
          </div>
          <Link to="/comprar-tokens" className="account-header__buy">
            <span className="account-header__wide">{t('dashboard.buyTokens')}</span>
            <span className="account-header__narrow">{t('dashboard.header.buyShort')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
