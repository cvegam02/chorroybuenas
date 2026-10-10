import { FaCheck, FaCog, FaCoins, FaPlus, FaSignOutAlt, FaThList, FaUser } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ALL_SETS_PATH } from './navLinks';
import { UserAvatar } from './UserAvatar';

interface MenuSet {
  id: string;
  name: string;
  created_at: string;
}

const MAX_VISIBLE_SETS = 5;

/** Las loterías más nuevas primero; la que está abierta siempre entra en la lista. */
const pickVisibleSets = (sets: MenuSet[], currentSetId: string | null | undefined): MenuSet[] => {
  const newestFirst = [...sets].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const visible = newestFirst.slice(0, MAX_VISIBLE_SETS);
  const current = newestFirst.find((set) => set.id === currentSetId);
  if (!current || visible.includes(current)) return visible;
  return [...visible.slice(0, MAX_VISIBLE_SETS - 1), current];
};

interface UserMenuPanelProps {
  name: string;
  email: string;
  avatarUrl: string | null | undefined;
  balance: number | null;
  sets: MenuSet[];
  currentSetId: string | null | undefined;
  isAdmin: boolean;
  isCreatingSet: boolean;
  onGoTo: (path: string) => void;
  onCreateSet: () => void;
  onSelectSet: (setId: string) => void;
  onSignOut: () => void;
}

/** Menú de usuario en escritorio: datos de la cuenta, saldo y sus opciones. */
export const UserMenuPanel = ({
  name,
  email,
  avatarUrl,
  balance,
  sets,
  currentSetId,
  isAdmin,
  isCreatingSet,
  onGoTo,
  onCreateSet,
  onSelectSet,
  onSignOut,
}: UserMenuPanelProps) => {
  const { t } = useTranslation();
  const visibleSets = pickVisibleSets(sets, currentSetId);

  return (
    <div className="user-menu" role="menu">
      <div className="user-menu__header">
        <UserAvatar avatarUrl={avatarUrl} name={name} email={email} size="large" />
        <div className="user-menu__names">
          <strong className="user-menu__name" title={name || email}>
            {name || email}
          </strong>
          {name && email && (
            <span className="user-menu__email" title={email}>
              {email}
            </span>
          )}
        </div>
      </div>

      <div className="user-menu__balance">
        {balance !== null && (
          <span className="user-menu__balance-amount">
            <FaCoins aria-hidden="true" />
            {t('navbar.tokensBalance', { count: balance })}
          </span>
        )}
        <button type="button" role="menuitem" className="user-menu__buy" onClick={() => onGoTo('/comprar-tokens')}>
          {t('navbar.buy')}
        </button>
      </div>

      <button type="button" role="menuitem" className="user-menu__item" onClick={onCreateSet} disabled={isCreatingSet}>
        <FaPlus aria-hidden="true" />
        <span>{t('navbar.createNewLoteria')}</span>
      </button>

      <button type="button" role="menuitem" className="user-menu__item" onClick={() => onGoTo(ALL_SETS_PATH)}>
        <FaThList aria-hidden="true" />
        <span>{t('navbar.myLoterias')}</span>
      </button>
      <div className="user-menu__sets" role="group" aria-label={t('navbar.myLoterias')}>
        {sets.length === 0 ? (
          <span className="user-menu__empty">{t('common.loading')}</span>
        ) : (
          visibleSets.map((set) => {
            const isCurrent = currentSetId === set.id;
            return (
              <button
                key={set.id}
                type="button"
                role="menuitem"
                aria-current={isCurrent ? 'true' : undefined}
                className={`user-menu__set ${isCurrent ? 'user-menu__set--current' : ''}`}
                onClick={() => onSelectSet(set.id)}
              >
                <span className="user-menu__set-name">{set.name}</span>
                {isCurrent && <FaCheck aria-hidden="true" />}
              </button>
            );
          })
        )}
        {sets.length > MAX_VISIBLE_SETS && (
          <button
            type="button"
            role="menuitem"
            className="user-menu__set user-menu__set--all"
            onClick={() => onGoTo(ALL_SETS_PATH)}
          >
            {t('navbar.viewAllLoterias', { count: sets.length })}
          </button>
        )}
      </div>

      <button type="button" role="menuitem" className="user-menu__item" onClick={() => onGoTo('/dashboard')}>
        <FaUser aria-hidden="true" />
        <span>{t('navbar.myAccount')}</span>
      </button>
      {isAdmin && (
        <button type="button" role="menuitem" className="user-menu__item" onClick={() => onGoTo('/admin')}>
          <FaCog aria-hidden="true" />
          <span>{t('navbar.admin')}</span>
        </button>
      )}

      <div className="user-menu__divider" />

      <button type="button" role="menuitem" className="user-menu__item" onClick={onSignOut}>
        <FaSignOutAlt aria-hidden="true" />
        <span>{t('common.logout')}</span>
      </button>
    </div>
  );
};
