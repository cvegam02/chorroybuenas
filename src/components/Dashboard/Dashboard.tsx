import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAvatarUrl } from '../../hooks/useAvatarUrl';
import { useProfileEditing } from './useProfileEditing';
import { useSetContext } from '../../contexts/SetContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import { SetRepository, LoteriaSet } from '../../repositories/SetRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { AppConfigRepository } from '../../repositories/AppConfigRepository';
import { PurchaseHistoryModal } from './PurchaseHistoryModal';
import { buildTokenHistory, sumGiftTokens, summarizeTokens, type TokenHistoryEntry } from '../../utils/tokenHistory';
import { ChangePasswordModal } from './ChangePasswordModal';
import { MyGuestLoterias } from './MyGuestLoterias';
import { MySeasonalLoterias } from './MySeasonalLoterias';
import { MyTraditionalGames } from './MyTraditionalGames';
import { TokenMovements } from './TokenMovements';
import { AccountHeader } from './AccountHeader';
import { AccountDetails } from './AccountDetails';
import { MyLoterias, LOTERIAS_SECTION_ID } from './MyLoterias';
import { LoteriaInviteRepository } from '../../repositories/LoteriaInviteRepository';
import { useSetSummaries } from '../../hooks/useSetSummaries';
import { useSetPdfDownload } from '../../hooks/useSetPdfDownload';
import { gridSizeOfSet, setStatusOf } from '../../utils/setSummary';
import { RenameLoteriaDialog, DeleteLoteriaDialog } from './LoteriaDialogs';
import { NewLoteriaDialog } from './NewLoteriaDialog';
import { SeasonalRepository } from '../../repositories/SeasonalRepository';
import './Dashboard.css';
import { logger } from '../../utils/logger';
import { OfferBannerSlot } from '../OfferBanner/OfferBannerSlot';

export const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const loteriasSectionRef = useRef<HTMLElement>(null);
  const { user, isLoading: authLoading, updateProfile, uploadAvatar } = useAuth();
  const { sets, refreshSets } = useSetContext();
  const { balance, refreshBalance } = useTokenBalance();
  const [initialTokens, setInitialTokens] = useState<number>(0);
  const [totalReceived, setTotalReceived] = useState<number | null>(null);
  const [totalSpent, setTotalSpent] = useState<number | null>(null);
  const [totalGifted, setTotalGifted] = useState<number>(0);
  const [tokensSpentBySet, setTokensSpentBySet] = useState<Record<string, number>>({});
  const [collectiveSetIds, setCollectiveSetIds] = useState<ReadonlySet<string>>(new Set());
  const [newGuestCardCounts, setNewGuestCardCounts] = useState<ReadonlyMap<string, number>>(new Map());
  const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<TokenHistoryEntry[]>([]);
  const [purchaseHistoryLoading, setPurchaseHistoryLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [setToDelete, setSetToDelete] = useState<LoteriaSet | null>(null);
  const [setToRename, setSetToRename] = useState<LoteriaSet | null>(null);
  // «Crear nueva lotería» pide el nombre antes de crearla (FEAT-57)
  const [isNewLoteriaOpen, setIsNewLoteriaOpen] = useState(false);
  const profileEditing = useProfileEditing({ updateProfile, uploadAvatar, t });
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // «Ver todas mis loterías» del menú de usuario llega con este ancla
  const hasUser = Boolean(user);
  useEffect(() => {
    if (hasUser && location.hash === `#${LOTERIAS_SECTION_ID}`) {
      loteriasSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasUser, location.hash, location.key]);

  useEffect(() => {
    document.title = t('dashboard.title');
  }, [t]);

  const userId = user?.id;
  const avatarUrl = useAvatarUrl(user);
  const setSummaries = useSetSummaries(userId, sets.map((set) => set.id));
  const pdfDownload = useSetPdfDownload(userId);

  useEffect(() => {
    if (!userId) return;

    // Compras y regalos se piden una sola vez: de ahí salen los últimos movimientos y el historial completo
    const loadHistory = async () => {
      setPurchaseHistoryLoading(true);
      try {
        const [purchases, gifts, seasonalPurchases] = await Promise.all([
          TokenPricingRepository.getPurchaseHistory(userId),
          TokenPricingRepository.getMyTokenGifts(),
          SeasonalRepository.getPurchaseHistory(),
        ]);
        setTotalGifted(sumGiftTokens(gifts));
        setPurchaseHistory(buildTokenHistory(purchases, gifts, seasonalPurchases));
      } finally {
        setPurchaseHistoryLoading(false);
      }
    };

    const load = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          refreshSets(),
          refreshBalance(),
          AppConfigRepository.getInitialTokens().then(setInitialTokens),
          TokenPricingRepository.getTotalTokensReceived(userId).then(setTotalReceived),
          TokenPricingRepository.getTotalTokensSpent(userId).then(setTotalSpent),
          TokenPricingRepository.getTokensSpentBySet(userId).then(setTokensSpentBySet),
          // Si no carga, las loterías salen sin la etiqueta «Colectiva» (FEAT-56)
          LoteriaInviteRepository.listCollectiveSetIds()
            .then(setCollectiveSetIds)
            .catch((e) => logger.error('Error loading loteria invites:', e)),
          // Si no carga, no sale «N fotos nuevas» (FEAT-56)
          LoteriaInviteRepository.listNewGuestCardCounts()
            .then(setNewGuestCardCounts)
            .catch((e) => logger.error('Error loading new guest cards:', e)),
          loadHistory(),
        ]);
      } catch (e) {
        logger.error('Error loading dashboard:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId, refreshSets, refreshBalance]);

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

  const { received: totalEverReceived, spent: tokensSpent } = summarizeTokens({
    initial: initialTokens,
    purchased: totalReceived ?? 0,
    gifted: totalGifted,
    spentRecorded: totalSpent ?? 0,
    balance: balance ?? null,
  });
  const fullName: string = user.user_metadata?.full_name?.trim() ?? '';
  const email = user.email ?? '';
  const displayName = fullName || email.split('@')[0] || t('dashboard.user');

  /** Abre la lotería (U2); para armar tableros, con su ventana ya abierta (FEAT-57). */
  const goToSetStep = (set: LoteriaSet, step: 'cards' | 'boards') => {
    navigate(`/loteria/${set.id}`, step === 'boards' ? { state: { openBoards: true } } : undefined);
  };

  const handleRenameSave = async (name: string) => {
    if (!setToRename) return;
    await SetRepository.updateSet(setToRename.id, user.id, { name });
    await refreshSets();
    setSetToRename(null);
  };

  const handleDeleteConfirm = async () => {
    if (!setToDelete) return;
    await SetRepository.deleteSetWithImages(setToDelete.id, user.id);
    await refreshSets();
    setSetToDelete(null);
  };

  /** Una lotería está lista cuando ya se puede imprimir: de ahí sale si se ofrece su PDF. */
  const isSetReady = (set: LoteriaSet): boolean => {
    const summary = setSummaries.summaries?.get(set.id);
    return (
      summary !== undefined &&
      setStatusOf({ cardCount: summary.cardCount, boardCount: summary.boardCount, gridSize: gridSizeOfSet(set) }).kind === 'ready'
    );
  };

  return (
    <div className="dashboard">
      <OfferBannerSlot placement="dashboard" />
      <AccountHeader
        fullName={fullName}
        email={email}
        avatarUrl={avatarUrl}
        balance={balance ?? null}
        isUploadingAvatar={profileEditing.isUploadingAvatar}
        avatarInputRef={profileEditing.avatarInputRef}
        onAvatarClick={profileEditing.handleAvatarClick}
        onAvatarChange={profileEditing.handleAvatarChange}
      />

      <main className="dashboard__main">
        <div className="dashboard__container">
          <MyLoterias
            sectionRef={loteriasSectionRef}
            sets={sets}
            summaries={setSummaries.summaries}
            isLoading={sets.length === 0 ? isLoading : setSummaries.isLoading && setSummaries.summaries === null}
            hasError={setSummaries.hasError}
            onRetry={setSummaries.retry}
            tokensSpentBySet={tokensSpentBySet}
            collectiveSetIds={collectiveSetIds}
            newGuestCardCounts={newGuestCardCounts}
            giftTokens={initialTokens}
            isCreating={false}
            onCreate={() => setIsNewLoteriaOpen(true)}
            onEditCards={(set) => goToSetStep(set, 'cards')}
            onMakeBoards={(set) => goToSetStep(set, 'boards')}
            downloadingSet={pdfDownload.downloadingSet}
            pdfError={pdfDownload.error}
            onDismissPdfError={pdfDownload.dismissError}
            onDownload={pdfDownload.download}
            onRename={setSetToRename}
            onDelete={setSetToDelete}
          />

          <div className="dashboard__columns">
            <MyGuestLoterias />
            <MySeasonalLoterias />
            <MyTraditionalGames />
            <TokenMovements
              received={isLoading ? null : totalEverReceived}
              spent={isLoading ? null : tokensSpent}
              history={purchaseHistory}
              isHistoryLoading={purchaseHistoryLoading}
              onViewAll={() => setIsPurchaseHistoryOpen(true)}
            />
          </div>

          <AccountDetails
            name={displayName}
            email={email}
            hasPassword={user.app_metadata?.provider === 'email'}
            nameEditing={profileEditing}
            onChangePassword={() => setIsChangePasswordOpen(true)}
          />
        </div>
      </main>

      {isNewLoteriaOpen && <NewLoteriaDialog onClose={() => setIsNewLoteriaOpen(false)} />}

      {setToRename && (
        <RenameLoteriaDialog
          key={setToRename.id}
          currentName={setToRename.name}
          onSave={handleRenameSave}
          onClose={() => setSetToRename(null)}
        />
      )}

      {setToDelete && (
        <DeleteLoteriaDialog
          key={setToDelete.id}
          name={setToDelete.name}
          cardCount={setSummaries.summaries?.get(setToDelete.id)?.cardCount ?? null}
          canDownload={isSetReady(setToDelete)}
          isDownloading={pdfDownload.downloadingSet?.id === setToDelete.id}
          onDownload={() => pdfDownload.download(setToDelete)}
          onConfirm={handleDeleteConfirm}
          onClose={() => setSetToDelete(null)}
        />
      )}

      <PurchaseHistoryModal
        isOpen={isPurchaseHistoryOpen}
        onClose={() => setIsPurchaseHistoryOpen(false)}
        entries={purchaseHistory}
        isLoading={purchaseHistoryLoading}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};
