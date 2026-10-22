import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaFilePdf, FaPen, FaTrashAlt } from 'react-icons/fa';
import { TraditionalGameRepository } from '../../repositories/TraditionalGameRepository';
import { useTraditionalPdf } from '../../hooks/useTraditionalPdf';
import { TRADITIONAL_PATH } from '../../hooks/useTraditionalStore';
import { logger } from '../../utils/logger';
import { incompleteBoardNumbers } from '../../utils/traditionalBoards';
import type { TraditionalGame } from '../../utils/traditionalGames';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { UploadProgressModal } from '../CardEditor/UploadProgressModal';
import { RenameLoteriaDialog } from './LoteriaDialogs';
import '../Seasonal/SeasonalCatalog.css';
import './MySeasonalLoterias.css';
import './MyTraditionalGames.css';

/** «Mis tableros de la suerte» de Mi cuenta (FEAT-53, US A5): los juegos guardados desde P8. */
export const MyTraditionalGames = () => {
  const { t, i18n } = useTranslation();
  const [games, setGames] = useState<TraditionalGame[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renaming, setRenaming] = useState<TraditionalGame | null>(null);
  const [deleting, setDeleting] = useState<TraditionalGame | null>(null);
  const [actionFailed, setActionFailed] = useState(false);
  const pdf = useTraditionalPdf();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setGames(await TraditionalGameRepository.list());
    } catch (error) {
      logger.error('[MyTraditionalGames] No se pudieron leer los juegos:', error);
      setGames(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dateFormat = new Intl.DateTimeFormat(i18n.language?.startsWith('en') ? 'en-US' : 'es-MX', { dateStyle: 'medium' });

  const remove = async (game: TraditionalGame) => {
    setDeleting(null);
    try {
      await TraditionalGameRepository.remove(game.id);
      setGames((current) => current?.filter((item) => item.id !== game.id) ?? null);
    } catch (error) {
      logger.error('[MyTraditionalGames] No se pudo eliminar el juego:', error);
      setActionFailed(true);
    }
  };

  const renderRow = (game: TraditionalGame) => {
    const isComplete = game.boards.length > 0 && incompleteBoardNumbers(game.boards).length === 0;
    return (
      <li key={game.id} className="my-seasonal__row">
        <div className="my-seasonal__info">
          <Link to={`${TRADITIONAL_PATH}/${game.id}`} className="my-seasonal__name">
            {game.name}
          </Link>
          <span className="my-seasonal__meta">
            {t('dashboard.traditional.meta', {
              mode: t(`boardGenerator.gridMode.${game.gridSize === 9 ? 'kids' : 'classic'}`),
              count: game.boards.length,
              date: dateFormat.format(new Date(game.updatedAt)),
            })}
          </span>
        </div>
        <div className="my-traditional__actions">
          {isComplete ? (
            <button
              type="button"
              className="my-traditional__icon"
              onClick={() => void pdf.download(game.boards, game.gridSize, game.name)}
              disabled={pdf.isBuilding}
              aria-label={t('dashboard.traditional.download', { name: game.name })}
            >
              <FaFilePdf aria-hidden="true" />
            </button>
          ) : (
            <Link to={`${TRADITIONAL_PATH}/${game.id}`} className="my-traditional__pill">
              {t('dashboard.traditional.finish')}
            </Link>
          )}
          <button
            type="button"
            className="my-traditional__icon"
            onClick={() => setRenaming(game)}
            aria-label={t('dashboard.traditional.rename', { name: game.name })}
          >
            <FaPen aria-hidden="true" />
          </button>
          <button
            type="button"
            className="my-traditional__icon my-traditional__icon--danger"
            onClick={() => setDeleting(game)}
            aria-label={t('dashboard.traditional.delete', { name: game.name })}
          >
            <FaTrashAlt aria-hidden="true" />
          </button>
        </div>
      </li>
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="dashboard__loading-inline my-seasonal__state" role="status">
          <div className="dashboard__spinner dashboard__spinner--small" />
          <span>{t('common.loading')}</span>
        </div>
      );
    }
    if (games === null) {
      return (
        <div className="my-seasonal__state" role="alert">
          <p className="my-seasonal__state-text">{t('dashboard.traditional.error')}</p>
          <button type="button" className="seasonal-catalog__button" onClick={load}>
            {t('seasonal.retry')}
          </button>
        </div>
      );
    }
    if (games.length === 0) {
      return (
        <div className="my-seasonal__state">
          <p className="my-seasonal__state-text">{t('dashboard.traditional.empty')}</p>
          <Link to={TRADITIONAL_PATH} className="seasonal-catalog__button">
            {t('dashboard.traditional.start')}
          </Link>
        </div>
      );
    }
    return <ul className="my-seasonal__list">{games.map(renderRow)}</ul>;
  };

  return (
    <section className="my-seasonal" id="mis-tableros-de-la-suerte" aria-labelledby="my-traditional-title">
      <div className="dashboard__column-header">
        <h2 className="dashboard__column-title" id="my-traditional-title">
          {t('dashboard.traditional.title')}
        </h2>
        <Link to={TRADITIONAL_PATH} className="dashboard__column-link">
          {t('dashboard.traditional.newLink')} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="my-seasonal__card">{renderBody()}</div>

      {renaming && (
        <RenameLoteriaDialog
          currentName={renaming.name}
          onSave={async (name) => {
            await TraditionalGameRepository.update(renaming.id, { name });
            setGames((current) => current?.map((item) => (item.id === renaming.id ? { ...item, name: name.trim() } : item)) ?? null);
            setRenaming(null);
          }}
          onClose={() => setRenaming(null)}
        />
      )}
      <WarningModal
        isOpen={deleting !== null}
        title={t('dashboard.traditional.deleteTitle')}
        message={t('dashboard.traditional.deleteMessage', { name: deleting?.name ?? '' })}
        confirmText={t('dashboard.traditional.deleteConfirm')}
        cancelText={t('common.cancel')}
        type="danger"
        onConfirm={() => deleting && void remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
      <WarningModal
        isOpen={actionFailed || pdf.error !== null}
        title={t('common.error')}
        message={pdf.error ?? t('dashboard.traditional.actionError')}
        confirmText={t('common.close')}
        type="danger"
        singleButton
        onConfirm={() => {
          setActionFailed(false);
          pdf.clearError();
        }}
        onCancel={() => {
          setActionFailed(false);
          pdf.clearError();
        }}
      />
      <UploadProgressModal isOpen={pdf.isBuilding} progress={-1} title={t('traditional.download.preparing')} />
    </section>
  );
};
