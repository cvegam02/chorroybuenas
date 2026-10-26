import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaImage, FaLock, FaUpload, FaUsers } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { CardLabelsProvider } from '../../contexts/CardLabelsContext';
import { GuestCardRejected, GuestLoteriaRepository } from '../../repositories/GuestLoteriaRepository';
import { cardLabelsOrDefault } from '../../utils/cardLabels';
import type { GuestCardError } from '../../utils/guestCards';
import { logger } from '../../utils/logger';
import { CardUploadModal } from '../CardEditor/CardUploadModal';
import { BatchUploadModal } from '../CardEditor/BatchUploadModal';
import { UploadProgressModal } from '../CardEditor/UploadProgressModal';
import { CardPreviewModal } from '../SetView/CardPreviewModal';
import { GuestCardGrid } from './GuestCardGrid';
import { useGuestLoteria } from './useGuestLoteria';
import '../SetView/SetView.css';
import '../SetView/SetHeader.css';
import '../SetView/SetCardsSection.css';
import './GuestLoteriaPage.css';

/** U5 — «Lotería donde participo» (`/participo/:setId`, FEAT-56 US B3): la vista de invitado de una lotería. */
export const GuestLoteriaPage = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { state, reload, retry } = useGuestLoteria(setId, user?.id);
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<GuestCardError | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/', { replace: true });
  }, [authLoading, user, navigate]);

  if (state.kind === 'loading' || !user) {
    return (
      <div className="set-view">
        <div className="set-view__loading">
          <div className="set-view__spinner" />
          <p>{t('setView.loadingCards')}</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'error' || state.kind === 'notFound') {
    const isMissing = state.kind === 'notFound';
    return (
      <div className="set-view">
        <div className="guest-loteria__message">
          <h1>{t(isMissing ? 'guest.notFoundTitle' : 'guest.errorTitle')}</h1>
          <p>{t(isMissing ? 'guest.notFoundText' : 'guest.errorText')}</p>
          {isMissing ? (
            <Link to="/dashboard" className="set-button set-button--primary">
              {t('guest.backToAccount')}
            </Link>
          ) : (
            <button type="button" className="set-button set-button--primary" onClick={retry}>
              {t('guest.retry')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const { loteria, cards, members, canUpload } = state;
  const organizer = [...members.values()].find((m) => m.isOwner)?.name ?? null;
  const existingTitles = cards.map((card) => card.title);
  const selectedCard = selectedIndex !== null ? cards[selectedIndex] ?? null : null;

  /** Sube las cartas una por una; se detiene si el enlace se cerró. Devuelve cuántas entraron. */
  const addCards = async (toAdd: Array<{ image: string; title: string }>): Promise<number> => {
    setUploadError(null);
    setProgress(0);
    let added = 0;
    try {
      for (const [index, card] of toAdd.entries()) {
        try {
          await GuestLoteriaRepository.addCard(loteria, user.id, card.image, card.title);
          added += 1;
        } catch (err) {
          logger.error('Error adding guest card:', err);
          const reason = err instanceof GuestCardRejected ? err.reason : 'unknown';
          setUploadError(reason);
          if (reason === 'closed') break;
        }
        setProgress(Math.round(((index + 1) / toAdd.length) * 100));
      }
    } finally {
      setProgress(null);
      await reload();
    }
    return added;
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) setBatchFiles(files);
  };

  return (
    <CardLabelsProvider value={cardLabelsOrDefault(loteria.cardLabels)}>
      <div className="set-view">
        <header className="set-header">
          <div className="set-header__inner">
            <div className="set-header__top">
              <Link to="/dashboard" className="set-header__back">
                <FaArrowLeft aria-hidden="true" />
                {t('guest.backToAccount')}
              </Link>
            </div>
            <div className="set-header__main">
              <div className="set-header__info">
                <h1 className="set-header__title">{loteria.name}</h1>
                <ul className="set-header__tags">
                  <li className="set-header__tag set-header__tag--collective">
                    <FaUsers aria-hidden="true" />
                    {t('invite.collective')}
                  </li>
                  {organizer && <li className="set-header__tag">{t('join.organizer', { name: organizer })}</li>}
                  <li className="set-header__tag">{t('dashboard.loterias.cards', { count: cards.length })}</li>
                </ul>
              </div>
              {canUpload && (
                <div className="set-header__actions">
                  <button
                    type="button"
                    className="set-button set-button--primary set-button--large"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload aria-hidden="true" />
                    {t('guest.uploadPhotos')}
                  </button>
                  <button type="button" className="set-button set-button--secondary" onClick={() => setIsSingleOpen(true)}>
                    <FaImage aria-hidden="true" />
                    {t('guest.addOne')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="set-view__body">
          {canUpload ? (
            <p className="guest-loteria__notice">{t('guest.uploadNotice')}</p>
          ) : (
            <p className="guest-loteria__notice guest-loteria__notice--closed">
              <FaLock aria-hidden="true" />
              {t('guest.closedNotice')}
            </p>
          )}
          {uploadError && (
            <p className="set-view__error" role="alert">
              {t(`guest.errors.${uploadError}`)}
            </p>
          )}
          <GuestCardGrid cards={cards} members={members} onOpenCard={setSelectedIndex} />
        </div>

        {selectedCard && selectedIndex !== null && (
          <CardPreviewModal
            card={selectedCard}
            isOpen={true}
            onClose={() => setSelectedIndex(null)}
            navigation={{ index: selectedIndex, total: cards.length, onChange: setSelectedIndex }}
          />
        )}

        <CardUploadModal
          isOpen={isSingleOpen}
          onClose={() => setIsSingleOpen(false)}
          onCardAdd={async (image, title) => (await addCards([{ image, title }])) === 1}
          existingTitles={existingTitles}
        />
        <BatchUploadModal
          isOpen={batchFiles.length > 0}
          onClose={() => setBatchFiles([])}
          onCardsAdd={(toAdd) => {
            setBatchFiles([]);
            addCards(toAdd);
          }}
          files={batchFiles}
          existingTitles={existingTitles}
        />
        <UploadProgressModal isOpen={progress !== null} progress={progress ?? 0} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFiles}
          style={{ display: 'none' }}
        />
      </div>
    </CardLabelsProvider>
  );
};
