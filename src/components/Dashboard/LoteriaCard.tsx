import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaDownload, FaPencilAlt } from 'react-icons/fa';
import type { LoteriaSet } from '../../repositories/SetRepository';
import type { SetSummary } from '../../services/setSummaries';
import { gridSizeOfSet, setStatusOf } from '../../utils/setSummary';
import { CardFan } from './CardFan';
import { LoteriaMenu } from './LoteriaMenu';

interface LoteriaCardProps {
  set: LoteriaSet;
  /** Sin resumen (aún no llega o no se pudo cargar) la tarjeta solo ofrece abrir la lotería. */
  summary: SetSummary | undefined;
  tokensSpent: number;
  onEditCards: () => void;
  onMakeBoards: () => void;
  /** Se está armando el PDF de esta lotería. */
  isDownloading: boolean;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
}

/** Una lotería guardada en Mi cuenta: sus primeras cartas, en qué va y qué sigue. */
export const LoteriaCard = ({
  set,
  summary,
  tokensSpent,
  onEditCards,
  onMakeBoards,
  isDownloading,
  onDownload,
  onRename,
  onDelete,
}: LoteriaCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gridSize = gridSizeOfSet(set);
  const isKids = gridSize === 9;
  const status = summary ? setStatusOf({ cardCount: summary.cardCount, boardCount: summary.boardCount, gridSize }) : null;
  const openPath = `/loteria/${set.id}`;
  const isReady = status?.kind === 'ready';
  const cardsText = summary ? t('dashboard.loterias.cards', { count: summary.cardCount }) : null;
  const tokensText = tokensSpent > 0 ? t('dashboard.loterias.tokensUsed', { count: tokensSpent }) : null;

  const renderStatus = () => {
    if (status?.kind === 'ready') {
      return (
        <span className="loteria-card__status loteria-card__status--ready">
          <FaCheck aria-hidden="true" />
          {t('dashboard.loterias.statusReady')}
        </span>
      );
    }
    if (status?.kind === 'missingCards' || status?.kind === 'missingBoards') {
      return (
        <span className="loteria-card__status loteria-card__status--pending">
          <FaPencilAlt aria-hidden="true" />
          {status.kind === 'missingCards'
            ? t('dashboard.loterias.statusMissingCards', { count: status.missing })
            : t('dashboard.loterias.statusMissingBoards')}
        </span>
      );
    }
    return null;
  };

  const renderMainAction = () => {
    if (status === null || status.kind === 'ready') {
      return (
        <>
          <Link to={openPath} className="loteria-card__button">
            {t('dashboard.loterias.open')}
          </Link>
          {isReady && (
            <button
              type="button"
              className="loteria-card__download"
              onClick={onDownload}
              disabled={isDownloading}
              aria-label={t('dashboard.loterias.downloadLabel', { name: set.name })}
            >
              {isDownloading ? (
                <span className="my-loterias__spinner" aria-hidden="true" />
              ) : (
                <FaDownload aria-hidden="true" />
              )}
              <span className="my-loterias__narrow">{t('dashboard.loterias.pdfShort')}</span>
            </button>
          )}
        </>
      );
    }
    if (status.kind === 'missingBoards') {
      return (
        <button type="button" className="loteria-card__button loteria-card__button--primary" onClick={onMakeBoards}>
          {t('dashboard.loterias.makeBoards')}
        </button>
      );
    }
    return (
      <button type="button" className="loteria-card__button loteria-card__button--primary" onClick={onEditCards}>
        {t(status.kind === 'empty' ? 'dashboard.loterias.uploadPhotos' : 'dashboard.loterias.keepEditing')}
      </button>
    );
  };

  return (
    <article className="loteria-card">
      <Link
        to={openPath}
        className="loteria-card__fan"
        aria-label={t('dashboard.loterias.openLabel', { name: set.name })}
      >
        {summary && <CardFan cards={summary.previewCards} emptyLabel={t('dashboard.loterias.noPhotos')} />}
        <span className={`loteria-card__type ${isKids ? 'loteria-card__type--kids' : ''}`}>
          {t(isKids ? 'dashboard.loterias.typeKids' : 'dashboard.loterias.typeClassic')}
        </span>
      </Link>
      <div className="loteria-card__body">
        <h3 className="loteria-card__name">{set.name}</h3>
        {summary && (
          <p className="loteria-card__meta">
            {cardsText}
            <span className="my-loterias__narrow">
              {' · '}
              {t(isKids ? 'dashboard.loterias.typeKids' : 'dashboard.loterias.typeClassicShort')}
            </span>
            {tokensText && (
              <>
                {' · '}
                <span className="my-loterias__wide">{tokensText}</span>
                <span className="my-loterias__narrow">{t('navbar.tokensBalance', { count: tokensSpent })}</span>
              </>
            )}
          </p>
        )}
        {renderStatus()}
        <div className="loteria-card__actions">
          {renderMainAction()}
          <LoteriaMenu
            name={set.name}
            details={cardsText && [cardsText, tokensText].filter(Boolean).join(' · ')}
            thumbnailCard={summary?.previewCards[1] ?? summary?.previewCards[0]}
            canDownload={isReady}
            isDownloading={isDownloading}
            onOpen={() => navigate(openPath)}
            onDownload={onDownload}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </div>
    </article>
  );
};
