import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaBullhorn, FaDownload, FaPencilAlt, FaPlus, FaUsers } from 'react-icons/fa';
import type { Card, GridSize } from '../../types';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { logger } from '../../utils/logger';
import { canSing } from '../../utils/callerGame';
import { minCardsForGrid } from '../../utils/gridRules';
import { SetMenu } from './SetMenu';
import type { SetViewState } from './setViewState';
import './SetHeader.css';

export interface SetHeaderDetails {
  gridSize: GridSize;
  cardCount: number;
  boardCount: number;
  /** Tokens gastados en esta lotería; null si no se sabe. */
  tokensSpent: number | null;
  state: SetViewState;
  /** Tiene enlace para invitar a subir fotos (FEAT-56). */
  isCollective: boolean;
  /** Fotos de invitados que llegaron desde la última visita (FEAT-56). */
  newPhotoCount: number;
}

interface SetHeaderProps {
  /** El nombre que se muestra. */
  name: string;
  /** El nombre guardado, con el que empieza el campo de renombrar. */
  savedName: string;
  /** Etiquetas y botones: null mientras cargan las cartas y los tableros. */
  details: SetHeaderDetails | null;
  /** La carta que ilustra la hoja del menú en celular. */
  thumbnailCard: Card | undefined;
  isDownloading: boolean;
  /** Guarda el nombre nuevo; si lanza, el campo se queda abierto y avisa. */
  onRename: (name: string) => Promise<void>;
  onDownload: () => void;
  /** Abre el cantador (FEAT-55). */
  onSing: () => void;
  /** Abre «Invitar a subir fotos» (FEAT-56, M18). */
  onInvite: () => void;
  onShuffleBoards: () => void;
  onClearBoards: () => void;
  onDelete: () => void;
}

/** Encabezado de una lotería guardada: regreso a Mi cuenta, nombre, etiquetas y los botones de su estado. */
export const SetHeader = ({
  name,
  savedName,
  details,
  thumbnailCard,
  isDownloading,
  onRename,
  onDownload,
  onSing,
  onInvite,
  onShuffleBoards,
  onClearBoards,
  onDelete,
}: SetHeaderProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const startRename = () => {
    setRenameValue(savedName);
    setIsRenaming(true);
  };

  const cancelRename = () => setIsRenaming(false);

  const saveRename = async () => {
    const nextName = renameValue.trim();
    if (!nextName || isSavingName) return;
    if (nextName === savedName) {
      setIsRenaming(false);
      return;
    }
    setIsSavingName(true);
    try {
      await onRename(nextName);
      setIsRenaming(false);
    } catch (err) {
      logger.error('Error renaming set:', err);
      alert(t('common.error'));
    } finally {
      setIsSavingName(false);
    }
  };

  // «Cantar» sale con el mínimo de cartas, tenga tableros o no; sin él, apagado con el motivo (FEAT-55)
  const singReady = details ? canSing(details.cardCount, details.gridSize) : false;
  const singButton = details && (
    <span className="set-header__sing">
      <button
        type="button"
        className="set-button set-button--secondary"
        onClick={onSing}
        disabled={!singReady}
        aria-describedby={singReady ? undefined : 'set-header-sing-reason'}
      >
        <FaBullhorn aria-hidden="true" />
        {t('setView.sing')}
      </button>
      {!singReady && (
        <span id="set-header-sing-reason" className="set-header__sing-reason">
          {t('setView.singNeedsCards', { count: minCardsForGrid(details.gridSize) - details.cardCount })}
        </span>
      )}
    </span>
  );

  const cardsLink = details ? { to: '/cards', state: { gridSize: details.gridSize } } : null;
  const tokensSpent = details?.tokensSpent ?? 0;

  // El «⋮» va junto a los botones en computadora y arriba, frente al regreso, en celular
  const menu = details && (
    <SetMenu
      name={name}
      details={[
        t('dashboard.loterias.cards', { count: details.cardCount }),
        ...(tokensSpent > 0 ? [t('dashboard.loterias.tokensUsed', { count: tokensSpent })] : []),
      ].join(' · ')}
      thumbnailCard={thumbnailCard}
      hasBoards={details.boardCount > 0}
      onRename={startRename}
      onShuffle={onShuffleBoards}
      onClearBoards={onClearBoards}
      onDelete={onDelete}
    />
  );

  return (
    <header className="set-header">
      <div className="set-header__inner">
        <div className="set-header__top">
          <Link to="/dashboard#mis-loterias" className="set-header__back">
            <FaArrowLeft aria-hidden="true" />
            {t('setView.backToLoterias')}
          </Link>
          {isMobile && menu}
        </div>

        <div className="set-header__main">
          <div className="set-header__info">
            {isRenaming ? (
              <div className="set-header__rename">
                <input
                  type="text"
                  className="set-header__rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                  placeholder={t('setView.renamePlaceholder')}
                  autoFocus
                  disabled={isSavingName}
                  aria-label={t('setView.renameSet')}
                />
                <div className="set-header__rename-actions">
                  <button
                    type="button"
                    className="set-button set-button--secondary"
                    onClick={cancelRename}
                    disabled={isSavingName}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="set-button set-button--primary"
                    onClick={saveRename}
                    disabled={isSavingName || !renameValue.trim()}
                  >
                    {isSavingName ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="set-header__title-row">
                <h1 className="set-header__title">{name}</h1>
                <button
                  type="button"
                  className="set-header__rename-trigger"
                  onClick={startRename}
                  aria-label={t('setView.renameSet')}
                  title={t('setView.renameSet')}
                >
                  <FaPencilAlt aria-hidden="true" />
                </button>
              </div>
            )}

            {details && (
              <ul className="set-header__tags">
                <li className={`set-header__tag ${details.gridSize === 9 ? 'set-header__tag--kids' : ''}`}>
                  {t(details.gridSize === 9 ? 'dashboard.loterias.typeKids' : 'dashboard.loterias.typeClassic')}
                </li>
                <li className="set-header__tag">{t('dashboard.loterias.cards', { count: details.cardCount })}</li>
                {details.boardCount > 0 && (
                  <li className="set-header__tag">{t('setView.boards', { count: details.boardCount })}</li>
                )}
                {details.isCollective && (
                  <li className="set-header__tag set-header__tag--collective">
                    <FaUsers aria-hidden="true" />
                    {t('invite.collective')}
                  </li>
                )}
                {details.newPhotoCount > 0 && (
                  <li className="set-header__tag set-header__tag--new">
                    {t('invite.newPhotos', { count: details.newPhotoCount })}
                  </li>
                )}
                {tokensSpent > 0 && (
                  <li className="set-header__tag set-header__tag--tokens">
                    {t('dashboard.loterias.tokensUsed', { count: tokensSpent })}
                  </li>
                )}
              </ul>
            )}
          </div>

          {details && cardsLink && (
            <div className="set-header__actions">
              {details.state.kind === 'ready' && (
                <button
                  type="button"
                  className="set-button set-button--primary set-button--large"
                  onClick={onDownload}
                  disabled={isDownloading}
                >
                  <FaDownload aria-hidden="true" />
                  {t('setView.downloadPDF')}
                </button>
              )}
              {singButton}
              <button type="button" className="set-button set-button--secondary" onClick={onInvite}>
                <FaUsers aria-hidden="true" />
                {t('invite.open')}
              </button>
              {details.state.kind === 'missingCards' ? (
                <Link {...cardsLink} className="set-button set-button--primary set-button--large">
                  <FaPlus aria-hidden="true" />
                  {t('setView.addPhotos')}
                </Link>
              ) : (
                <Link {...cardsLink} className="set-button set-button--secondary">
                  <FaPencilAlt aria-hidden="true" />
                  {t('setView.editCards')}
                </Link>
              )}
              {!isMobile && menu}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
