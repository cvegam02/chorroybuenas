import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaUser,
  FaCoins,
  FaThList,
  FaPlus,
  FaArrowRight,
  FaChartLine,
  FaPalette,
  FaStar,
  FaTrash,
  FaEllipsisV,
  FaPencilAlt
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import { SetRepository, LoteriaSet } from '../../repositories/SetRepository';
import { TokenPricingRepository, type TokenPurchase } from '../../repositories/TokenPricingRepository';
import { AppConfigRepository } from '../../repositories/AppConfigRepository';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { PurchaseHistoryModal } from './PurchaseHistoryModal';
import './Dashboard.css';

export const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { sets, setSets, setCurrentSetId, refreshSets } = useSetContext();
  const { balance, refreshBalance } = useTokenBalance();
  const [initialTokens, setInitialTokens] = useState<number>(0);
  const [totalReceived, setTotalReceived] = useState<number | null>(null);
  const [totalSpent, setTotalSpent] = useState<number | null>(null);
  const [tokensSpentBySet, setTokensSpentBySet] = useState<Record<string, number>>({});
  const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<TokenPurchase[]>([]);
  const [purchaseHistoryLoading, setPurchaseHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setToDelete, setSetToDelete] = useState<LoteriaSet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [setToRename, setSetToRename] = useState<LoteriaSet | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenameSaving, setIsRenameSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sheetOpenedAtRef = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    document.title = t('dashboard.title');
  }, [t]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          refreshSets(),
          refreshBalance(),
          AppConfigRepository.getInitialTokens().then(setInitialTokens),
          TokenPricingRepository.getTotalTokensReceived(user.id).then(setTotalReceived),
          TokenPricingRepository.getTotalTokensSpent(user.id).then(setTotalSpent),
          TokenPricingRepository.getTokensSpentBySet(user.id).then(setTokensSpentBySet)
        ]);
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.id, refreshSets, refreshBalance]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="dashboard dashboard--loading">
        <div className="dashboard__spinner" />
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const tokensFromPurchases = totalReceived ?? 0;
  const totalEverReceived = initialTokens + tokensFromPurchases;
  const spentFromDb = totalSpent ?? 0;
  const spentFromFormula = Math.max(0, totalEverReceived - (balance ?? 0));
  const tokensSpent = Math.max(spentFromDb, spentFromFormula);
  const displayName = user.user_metadata?.full_name?.trim() || user.email?.split('@')[0] || t('dashboard.user');

  const handleRenameSave = async () => {
    if (!user || !setToRename || !renameValue.trim()) return;
    setIsRenameSaving(true);
    try {
      await SetRepository.updateSet(setToRename.id, user.id, { name: renameValue.trim() });
      await refreshSets();
      setSetToRename(null);
    } catch (err) {
      console.error('Error renaming set:', err);
    } finally {
      setIsRenameSaving(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Hero / Welcome Section */}
      <header className="dashboard__hero">
        <div className="dashboard__hero-overlay" />
        <div className="dashboard__hero-shapes">
          <div className="dashboard__hero-shape dashboard__hero-shape--1" />
          <div className="dashboard__hero-shape dashboard__hero-shape--2" />
          <div className="dashboard__hero-shape dashboard__hero-shape--3" />
        </div>
        <div className="dashboard__hero-content">
          <div className="dashboard__hero-profile">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="dashboard__hero-avatar"
              />
            ) : (
              <div className="dashboard__hero-avatar-placeholder">
                <FaUser />
              </div>
            )}
            <div className="dashboard__hero-greeting">
              <span className="dashboard__hero-badge">
                <FaStar />
                {t('dashboard.welcomeBack')}
              </span>
              <h1 className="dashboard__hero-title">
                {t('dashboard.welcome', { name: displayName })}
              </h1>
              <p className="dashboard__hero-email">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard__main">
        <div className="dashboard__container">
          {/* Quick Actions */}
          <section className="dashboard__quick-actions">
            <button
              type="button"
              className="dashboard__action-card dashboard__action-card--primary"
              onClick={async () => {
                if (!user || isCreatingSet) return;
                setIsCreatingSet(true);
                try {
                  const name = sets.length === 0
                    ? t('navbar.newLoteriaName')
                    : `${t('navbar.newLoteriaName')} ${sets.length + 1}`;
                  const newSet = await SetRepository.createSet(user.id, name);
                  setSets(prev => [...prev, newSet]);
                  setCurrentSetId(newSet.id);
                  await refreshSets();
                  navigate('/cards');
                } catch (e) {
                  console.error('Error creating set:', e);
                  alert(t('common.error'));
                } finally {
                  setIsCreatingSet(false);
                }
              }}
              disabled={isCreatingSet}
            >
              <span className="dashboard__action-icon">
                <FaPalette />
              </span>
              <div className="dashboard__action-text">
                <strong>{isCreatingSet ? t('common.loading') : t('dashboard.createNew')}</strong>
                <span>{t('landing.hero.description')}</span>
              </div>
              <FaArrowRight className="dashboard__action-arrow" />
            </button>
            <button
              type="button"
              className="dashboard__action-card dashboard__action-card--secondary"
              onClick={() => navigate('/comprar-tokens')}
            >
              <span className="dashboard__action-icon">
                <FaCoins />
              </span>
              <div className="dashboard__action-text">
                <strong>{t('dashboard.buyTokens')}</strong>
                <span>{t('landing.benefits.feature3.description')}</span>
              </div>
              <FaArrowRight className="dashboard__action-arrow" />
            </button>
          </section>

          {/* Stats Cards */}
          <section className="dashboard__stats">
            <h2 className="dashboard__section-title">
              <FaChartLine />
              {t('dashboard.tokensTitle')}
            </h2>
            <div className="dashboard__stats-grid">
              <div className="dashboard__stat-card dashboard__stat-card--balance">
                <div className="dashboard__stat-icon">
                  <FaCoins />
                </div>
                <div className="dashboard__stat-value">{balance ?? 0}</div>
                <div className="dashboard__stat-label">{t('dashboard.tokensBalance')}</div>
              </div>
              <div className="dashboard__stat-card dashboard__stat-card--spent">
                <div className="dashboard__stat-icon">
                  <FaChartLine />
                </div>
                <div className="dashboard__stat-value">{tokensSpent}</div>
                <div className="dashboard__stat-label">{t('dashboard.tokensSpent')}</div>
              </div>
              <div className="dashboard__stat-card dashboard__stat-card--received">
                <div className="dashboard__stat-icon">
                  <FaStar />
                </div>
                <div className="dashboard__stat-value">{totalEverReceived}</div>
                <div className="dashboard__stat-label">{t('dashboard.tokensReceived')}</div>
              </div>
            </div>
            <button
              type="button"
              className="dashboard__link-button"
              onClick={async () => {
                if (!user) return;
                setIsPurchaseHistoryOpen(true);
                setPurchaseHistoryLoading(true);
                try {
                  const history = await TokenPricingRepository.getPurchaseHistory(user.id);
                  setPurchaseHistory(history);
                } finally {
                  setPurchaseHistoryLoading(false);
                }
              }}
            >
              {t('dashboard.purchaseHistory.viewHistory')}
            </button>
          </section>

          {/* Loterias Section */}
          <section className="dashboard__loterias">
            <h2 className="dashboard__section-title">
              <FaThList />
              {t('dashboard.myLoteriasTitle')}
            </h2>
            <div className="dashboard__loterias-card">
              {isLoading ? (
                <div className="dashboard__loading-inline">
                  <div className="dashboard__spinner dashboard__spinner--small" />
                  <span>{t('common.loading')}</span>
                </div>
              ) : sets.length === 0 ? (
                <div className="dashboard__empty-state">
                  <div className="dashboard__empty-icon">
                    <FaThList />
                  </div>
                  <p className="dashboard__empty-text">{t('dashboard.noLoterias')}</p>
                  <button
                    type="button"
                    className="dashboard__btn dashboard__btn--primary"
                    onClick={async () => {
                      if (!user || isCreatingSet) return;
                      setIsCreatingSet(true);
                      try {
                        const newSet = await SetRepository.createSet(user.id, t('navbar.newLoteriaName'));
                        setSets(prev => [...prev, newSet]);
                        setCurrentSetId(newSet.id);
                        await refreshSets();
                        navigate('/cards');
                      } catch (e) {
                        console.error('Error creating set:', e);
                        alert(t('common.error'));
                      } finally {
                        setIsCreatingSet(false);
                      }
                    }}
                    disabled={isCreatingSet}
                  >
                    <FaPlus />
                    {isCreatingSet ? t('common.loading') : t('dashboard.createNew')}
                  </button>
                </div>
              ) : (
                <>
                  <ul className="dashboard__loterias-list">
                    {sets.map((set) => (
                      <li key={set.id} className="dashboard__loteria-row">
                        <button
                          type="button"
                          className="dashboard__loteria-main"
                          onClick={() => navigate(`/loteria/${set.id}`)}
                        >
                          <div className="dashboard__loteria-info">
                            <span className="dashboard__loteria-name">{set.name}</span>
                            {tokensSpentBySet[set.id] != null && tokensSpentBySet[set.id] > 0 && (
                              <span className="dashboard__loteria-tokens">
                                {t('dashboard.tokensSpentInLoteria', { count: tokensSpentBySet[set.id] })}
                              </span>
                            )}
                          </div>
                          <FaArrowRight className="dashboard__loteria-arrow" />
                        </button>
                        <div className="dashboard__loteria-menu-wrapper" ref={!isMobile && openMenuId === set.id ? menuRef : undefined}>
                          <button
                            type="button"
                            className="dashboard__loteria-menu-trigger"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const isOpening = openMenuId !== set.id;
                              if (isOpening) sheetOpenedAtRef.current = Date.now();
                              setOpenMenuId((p) => (p === set.id ? null : set.id));
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              const prev = openMenuId === set.id ? null : set.id;
                              if (prev) sheetOpenedAtRef.current = Date.now();
                              setOpenMenuId((p) => (p === set.id ? null : set.id));
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            aria-expanded={openMenuId === set.id}
                            aria-haspopup="true"
                            aria-label={t('dashboard.actions')}
                          >
                            <FaEllipsisV />
                          </button>
                          {!isMobile && openMenuId === set.id && (
                            <div className="dashboard__loteria-dropdown" role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                className="dashboard__loteria-dropdown-item"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(`/loteria/${set.id}`);
                                }}
                              >
                                <FaArrowRight />
                                <span>{t('dashboard.openLoteria')}</span>
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className="dashboard__loteria-dropdown-item"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setSetToRename(set);
                                  setRenameValue(set.name);
                                }}
                              >
                                <FaPencilAlt />
                                <span>{t('dashboard.renameLoteria')}</span>
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className="dashboard__loteria-dropdown-item dashboard__loteria-dropdown-item--danger"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setSetToDelete(set);
                                }}
                              >
                                <FaTrash />
                                <span>{t('common.delete')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="dashboard__btn dashboard__btn--secondary"
                    onClick={async () => {
                      if (!user || isCreatingSet) return;
                      setIsCreatingSet(true);
                      try {
                        const name = `${t('navbar.newLoteriaName')} ${sets.length + 1}`;
                        const newSet = await SetRepository.createSet(user.id, name);
                        setSets(prev => [...prev, newSet]);
                        setCurrentSetId(newSet.id);
                        await refreshSets();
                        navigate('/cards');
                      } catch (e) {
                        console.error('Error creating set:', e);
                        alert(t('common.error'));
                      } finally {
                        setIsCreatingSet(false);
                      }
                    }}
                    disabled={isCreatingSet}
                  >
                    <FaPlus />
                    {isCreatingSet ? t('common.loading') : t('dashboard.createNew')}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      {isMobile && openMenuId && (() => {
        const selectedSet = sets.find((s) => s.id === openMenuId);
        if (!selectedSet) return null;
        return createPortal(
          <div
            className="dashboard__loteria-sheet-overlay"
            onClick={() => {
              if (Date.now() - sheetOpenedAtRef.current < 350) return;
              setOpenMenuId(null);
            }}
            role="presentation"
          >
            <div
              className="dashboard__loteria-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={t('dashboard.actions')}
            >
              <div className="dashboard__loteria-sheet-header">
                <div className="dashboard__loteria-sheet-title">{selectedSet.name}</div>
                {tokensSpentBySet[selectedSet.id] != null && tokensSpentBySet[selectedSet.id] > 0 && (
                  <div className="dashboard__loteria-sheet-tokens">
                    {t('dashboard.tokensSpentInLoteria', { count: tokensSpentBySet[selectedSet.id] })}
                  </div>
                )}
              </div>
              <div className="dashboard__loteria-sheet-actions">
                <button
                  type="button"
                  className="dashboard__loteria-sheet-item"
                  onClick={() => {
                    setOpenMenuId(null);
                    navigate(`/loteria/${selectedSet.id}`);
                  }}
                >
                  <FaArrowRight />
                  <span>{t('dashboard.openLoteria')}</span>
                </button>
                <button
                  type="button"
                  className="dashboard__loteria-sheet-item"
                  onClick={() => {
                    setOpenMenuId(null);
                    setSetToRename(selectedSet);
                    setRenameValue(selectedSet.name);
                  }}
                >
                  <FaPencilAlt />
                  <span>{t('dashboard.renameLoteria')}</span>
                </button>
                <button
                  type="button"
                  className="dashboard__loteria-sheet-item dashboard__loteria-sheet-item--danger"
                  onClick={() => {
                    setOpenMenuId(null);
                    setSetToDelete(selectedSet);
                  }}
                >
                  <FaTrash />
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {setToRename && (
        <div
          className="dashboard__rename-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRenameSaving) {
              setSetToRename(null);
            }
          }}
          role="presentation"
        >
          <div className="dashboard__rename-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dashboard__rename-title">{t('dashboard.renameLoteria')}</h2>
            <input
              type="text"
              className="dashboard__rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRenameSave();
                }
                if (e.key === 'Escape') {
                  if (!isRenameSaving) setSetToRename(null);
                }
              }}
              placeholder={t('setView.renamePlaceholder')}
              disabled={isRenameSaving}
              autoFocus
              aria-label={t('setView.renamePlaceholder')}
            />
            <div className="dashboard__rename-actions">
              <button
                type="button"
                className="dashboard__rename-cancel"
                onClick={() => !isRenameSaving && setSetToRename(null)}
                disabled={isRenameSaving}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="dashboard__rename-save"
                disabled={isRenameSaving || !renameValue.trim()}
                onClick={handleRenameSave}
              >
                {isRenameSaving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <PurchaseHistoryModal
        isOpen={isPurchaseHistoryOpen}
        onClose={() => setIsPurchaseHistoryOpen(false)}
        purchases={purchaseHistory}
        isLoading={purchaseHistoryLoading}
      />

      <WarningModal
        isOpen={setToDelete !== null}
        title={t('modals.deleteLoteria.title')}
        message={t('modals.deleteLoteria.message')}
        confirmText={t('modals.deleteLoteria.confirm')}
        cancelText={t('modals.deleteLoteria.cancel')}
        type="danger"
        onConfirm={async () => {
          if (!user || !setToDelete) return;
          setIsDeleting(true);
          try {
            await SetRepository.deleteSetWithImages(setToDelete.id, user.id);
            await refreshSets();
            setSetToDelete(null);
          } catch (e) {
            console.error('Error deleting set:', e);
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => !isDeleting && setSetToDelete(null)}
      />
    </div>
  );
};
