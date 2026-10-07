import { FaArrowRight, FaCalendarAlt, FaCheck, FaCog, FaCoins, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface MenuSet {
  id: string;
  name: string;
  created_at: string;
}

const MAX_VISIBLE_SETS = 5;
// Mismo ancla que la sección de loterías de Mi cuenta (Dashboard)
const ALL_SETS_PATH = '/dashboard#mis-loterias';

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

/** Menú de usuario en escritorio: encabezado con datos y saldo, y opciones agrupadas. */
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
    <div className="navbar__user-dropdown navbar__user-dropdown--panel" role="menu">
      <div className="navbar__user-panel-header">
        <div className="navbar__user-panel-identity">
          <div className="navbar__user-info navbar__user-info--large">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="navbar__user-avatar" />
            ) : (
              <FaUser className="navbar__user-icon" />
            )}
          </div>
          <div className="navbar__user-panel-names">
            <span className="navbar__user-panel-name" title={name || email}>{name || email}</span>
            {name && email && (
              <span className="navbar__user-panel-email" title={email}>{email}</span>
            )}
          </div>
        </div>
        <div className="navbar__user-panel-tokens">
          {balance !== null && (
            <span className="navbar__user-panel-balance">
              <FaCoins aria-hidden="true" />
              {t('navbar.tokensBalance', { count: balance })}
            </span>
          )}
          <button
            type="button"
            role="menuitem"
            className="navbar__user-panel-buy"
            onClick={() => onGoTo('/comprar-tokens')}
          >
            {t('navbar.buy')}
          </button>
        </div>
      </div>

      <div className="navbar__user-panel-group" role="group" aria-labelledby="navbar-panel-loterias">
        <div id="navbar-panel-loterias" className="navbar__user-panel-group-title">
          {t('navbar.myLoterias')}
        </div>
        <button
          type="button"
          role="menuitem"
          className="navbar__user-dropdown-item navbar__user-dropdown-item--create"
          onClick={onCreateSet}
          disabled={isCreatingSet}
        >
          <span className="navbar__user-dropdown-item-icon">+</span>
          <span>{t('navbar.createNewLoteria')}</span>
        </button>
        <div className="navbar__user-panel-sets">
          {sets.length === 0 ? (
            <div className="navbar__user-dropdown-empty">{t('common.loading')}</div>
          ) : (
            visibleSets.map((set) => {
              const isCurrent = currentSetId === set.id;
              return (
                <button
                  key={set.id}
                  type="button"
                  role="menuitem"
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`navbar__user-dropdown-item navbar__user-panel-set ${isCurrent ? 'navbar__user-dropdown-item--active' : ''}`}
                  onClick={() => onSelectSet(set.id)}
                >
                  <span className="navbar__user-panel-set-name">{set.name}</span>
                  {isCurrent && <FaCheck className="navbar__user-panel-set-check" aria-hidden="true" />}
                </button>
              );
            })
          )}
        </div>
        {sets.length > MAX_VISIBLE_SETS && (
          <button
            type="button"
            role="menuitem"
            className="navbar__user-dropdown-item navbar__user-panel-all"
            onClick={() => onGoTo(ALL_SETS_PATH)}
          >
            <span>{t('navbar.viewAllLoterias', { count: sets.length })}</span>
            <FaArrowRight aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="navbar__user-panel-group">
        <button
          type="button"
          role="menuitem"
          className="navbar__user-dropdown-item"
          onClick={() => onGoTo('/dashboard')}
        >
          <FaUser />
          <span>{t('navbar.myAccount')}</span>
        </button>
        <button
          type="button"
          role="menuitem"
          className="navbar__user-dropdown-item"
          onClick={() => onGoTo('/temporada')}
        >
          <FaCalendarAlt />
          <span>{t('navbar.seasonal')}</span>
        </button>
        {isAdmin && (
          <button
            type="button"
            role="menuitem"
            className="navbar__user-dropdown-item"
            onClick={() => onGoTo('/admin')}
          >
            <FaCog />
            <span>{t('navbar.admin')}</span>
          </button>
        )}
      </div>

      <div className="navbar__user-panel-group">
        <button
          type="button"
          role="menuitem"
          className="navbar__user-dropdown-item navbar__user-dropdown-item--logout"
          onClick={onSignOut}
        >
          <FaSignOutAlt />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </div>
  );
};
