import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaRandom, FaRegSquare } from 'react-icons/fa';
import type { GridSize } from '../../types';
import { GridModeSelector } from '../BoardGenerator/GridModeSelector';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { TraditionalBoardSheet } from './TraditionalBoardSheet';
import { TraditionalCardPicker } from './TraditionalCardPicker';
import { TraditionalDeckPanel } from './TraditionalDeckPanel';
import { TraditionalDownload } from './TraditionalDownload';
import { TraditionalGameBar } from './TraditionalGameBar';
import { TraditionalHeroArt } from './TraditionalHeroArt';
import { TraditionalSeoContent } from './TraditionalSeoContent';
import { TraditionalTransferBanner } from './TraditionalTransferBanner';
import { TRADITIONAL_PATH } from '../../hooks/useTraditionalStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTraditionalBoards } from '../../hooks/useTraditionalBoards';
import { TRADITIONAL_MAX_BOARDS, duplicateBoardNumbers, hasPlacedCards } from '../../utils/traditionalBoards';
import '../LandingPage/PageHero.css';
import './TraditionalBoardsPage.css';

/**
 * P8 «Arma tus tableros» (FEAT-53): tableros personalizados con las 54 cartas tradicionales, eligiendo las cartas de
 * la suerte, para jugar con la baraja de siempre. Empieza con un tablero vacío. Con sesión,
 * `/arma-tus-tableros/:gameId` abre un juego guardado en la cuenta.
 */
export const TraditionalBoardsPage = () => {
  const { t } = useTranslation();
  const {
    gridSize,
    boards,
    addBoards,
    shuffleBoard,
    shuffleAll,
    deleteBoard,
    changeMode,
    putCard,
    swap,
    addEmpty,
    toggleFix,
    fillEmpty,
    fillBoard,
    status,
    isLoggedIn,
    game,
    renameGame,
    saveFailed,
    pendingTransfer,
    acceptTransfer,
    discardTransfer,
  } = useTraditionalBoards(useParams().gameId);
  const [pendingMode, setPendingMode] = useState<GridSize | null>(null);
  const [picking, setPicking] = useState<{
    boardId: string;
    cell: number;
  } | null>(null);
  // Arrastrar solo en computadora: con el dedo se toca la casilla (decisión 6).
  const canDrag = useMediaQuery('(min-width: 1024px) and (pointer: fine)');
  const duplicates = useMemo(() => duplicateBoardNumbers(boards), [boards]);
  const pickingIndex = picking ? boards.findIndex((board) => board.id === picking.boardId) : -1;
  const room = TRADITIONAL_MAX_BOARDS - boards.length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const requestMode = (size: GridSize) => {
    if (size === gridSize) return;
    // Sin cartas puestas no hay nada que perder: se cambia sin preguntar.
    if (!hasPlacedCards(boards)) changeMode(size);
    else setPendingMode(size);
  };

  const confirmMode = () => {
    if (pendingMode !== null) changeMode(pendingMode);
    setPendingMode(null);
  };

  return (
    <main className="landing-page traditional-boards">
      <section className="page-hero">
        <div className="page-hero__inner">
          <div className="page-hero__content">
            <h1 className="page-hero__title">{t('traditional.hero.title')}</h1>
            <p className="page-hero__description">{t('traditional.hero.description')}</p>
          </div>
          <div className="page-hero__media">
            <TraditionalHeroArt />
          </div>
        </div>
      </section>

      <section className="traditional-boards__body">
        {status !== 'ready' ? (
          <div className="traditional-boards__empty" role={status === 'loading' ? 'status' : 'alert'}>
            <p className="traditional-boards__empty-title">{t(`traditional.status.${status}`)}</p>
            {status !== 'loading' && (
              <Link to={TRADITIONAL_PATH} className="traditional-boards__primary">
                {t('traditional.game.new')}
              </Link>
            )}
          </div>
        ) : (
          <>
            {isLoggedIn && pendingTransfer && (
              <TraditionalTransferBanner
                boardCount={pendingTransfer.boards.length}
                onSave={acceptTransfer}
                onDiscard={discardTransfer}
              />
            )}
            {isLoggedIn && <TraditionalGameBar game={game} saveFailed={saveFailed} onRename={renameGame} />}
            <div className="traditional-boards__toolbar">
              <GridModeSelector selectedSize={gridSize} onChange={requestMode} />

              <div className="traditional-boards__actions">
                <TraditionalDownload boards={boards} gridSize={gridSize} name={game?.name} onFillEmpty={fillEmpty} />
                <button
                  type="button"
                  className="traditional-boards__secondary"
                  onClick={addEmpty}
                  disabled={room === 0}
                >
                  <FaRegSquare aria-hidden="true" /> {t('traditional.add.empty')}
                </button>
                <button
                  type="button"
                  className="traditional-boards__secondary"
                  onClick={() => addBoards(1)}
                  disabled={room === 0}
                >
                  <FaPlus aria-hidden="true" /> {t('traditional.add.one')}
                </button>
                <button
                  type="button"
                  className="traditional-boards__secondary"
                  onClick={shuffleAll}
                  disabled={boards.length === 0}
                >
                  <FaRandom aria-hidden="true" /> {t('traditional.shuffleAll')}
                </button>
              </div>

              <p className="traditional-boards__count" aria-live="polite">
                {room === 0
                  ? t('traditional.limitReached', {
                      max: TRADITIONAL_MAX_BOARDS,
                    })
                  : t('traditional.count', {
                      count: boards.length,
                      max: TRADITIONAL_MAX_BOARDS,
                    })}
              </p>
            </div>

            <div className={`traditional-boards__workspace${canDrag ? ' traditional-boards__workspace--deck' : ''}`}>
              {boards.length === 0 ? (
                <div className="traditional-boards__empty">
                  <p className="traditional-boards__empty-title">{t('traditional.empty.title')}</p>
                  <p className="traditional-boards__empty-text">{t('traditional.empty.text')}</p>
                </div>
              ) : (
                <div>
                  <p className="traditional-boards__how">{t(canDrag ? 'traditional.howDrag' : 'traditional.howTap')}</p>
                  <ol className="traditional-boards__list">
                    {boards.map((board, index) => (
                      <TraditionalBoardSheet
                        key={board.id}
                        board={board}
                        index={index}
                        sameAs={duplicates.get(board.id) ?? []}
                        onShuffle={shuffleBoard}
                        onFill={fillBoard}
                        onDelete={deleteBoard}
                        onPlace={putCard}
                        onSwap={swap}
                        onPick={(boardId, cell) => setPicking({ boardId, cell })}
                      />
                    ))}
                  </ol>
                </div>
              )}
              {canDrag && boards.length > 0 && <TraditionalDeckPanel />}
            </div>
          </>
        )}
      </section>

      <TraditionalSeoContent />

      {picking && pickingIndex !== -1 && (
        <TraditionalCardPicker
          boardNumber={pickingIndex + 1}
          cell={picking.cell}
          boardCards={boards[pickingIndex].cards}
          isFixed={(() => {
            const card = boards[pickingIndex].cards[picking.cell];
            return card !== null && boards[pickingIndex].fixed.includes(card);
          })()}
          onToggleFixed={() => toggleFix(picking.boardId, picking.cell)}
          onChoose={(card) => {
            putCard(picking.boardId, picking.cell, card);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}

      <WarningModal
        isOpen={pendingMode !== null}
        title={t('traditional.modeChange.title')}
        message={t('traditional.modeChange.message', { count: boards.length })}
        confirmText={t('traditional.modeChange.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmMode}
        onCancel={() => setPendingMode(null)}
      />
    </main>
  );
};
