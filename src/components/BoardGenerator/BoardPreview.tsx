import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaPen, FaRandom } from 'react-icons/fa';
import { Board, Card } from '../../types';
import { BoardThumbnail } from './BoardThumbnail';
import { BoardModal } from './BoardModal';
import { useDeckSnapshot } from '../../hooks/useDeckSnapshot';
import { useComposedCard } from '../../hooks/useComposedCard';
import { deckSheetCount, deckTileSample } from '../../utils/boardPreviewSummary';
import './BoardPreview.css';

interface BoardPreviewProps {
  boards: Board[];
  onModify: () => void;
  onConfirm: () => void;
  onRegenerate: () => void;
  /** Aviso cuando no se pudo crear el PDF. */
  error?: string | null;
}

/** Una carta del dibujo de la baraja: como sale impresa cuando ya está compuesta; si no, la foto. */
const DeckTileCard = ({ card }: { card: Card }) => {
  const composedUrl = useComposedCard(card);
  const imageUrl = composedUrl ?? card.image;

  return imageUrl ? (
    <img src={imageUrl} alt="" className="board-preview__deck-card" draggable={false} />
  ) : (
    <span className="board-preview__deck-card" />
  );
};

export const BoardPreview = ({ boards, onModify, onConfirm, onRegenerate, error }: BoardPreviewProps) => {
  const { t } = useTranslation();
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);
  const { cards: deckCards } = useDeckSnapshot();
  const deckCount = deckCards.length;
  const gridSize = boards[0]?.gridSize ?? 16;

  const handleThumbnailClick = (index: number) => {
    setSelectedBoardIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedBoardIndex(null);
  };

  return (
    <div className="board-preview">
      <div className="board-preview__inner">
        <div className="board-preview__header">
          <div>
            <h1 className="board-preview__title">{t('boardGenerator.preview.ready', { count: boards.length })}</h1>
            <ul className="board-preview__pills">
              <li className="board-preview__pill">
                {t('boardGenerator.preview.pillBoards', { count: boards.length })}
              </li>
              {deckCount > 0 && (
                <li className="board-preview__pill">{t('cardEditor.deck.barCards', { count: deckCount })}</li>
              )}
              <li className="board-preview__pill">
                {gridSize === 9 ? t('cardEditor.deck.modeKids') : t('cardEditor.deck.modeClassic')}
              </li>
              <li className="board-preview__pill board-preview__pill--plain">
                {t('boardGenerator.preview.pillPdf')}
              </li>
            </ul>
          </div>

          <div className="board-preview__actions">
            <button type="button" onClick={onConfirm} className="board-preview__button board-preview__button--primary">
              <FaDownload aria-hidden="true" />
              {t('boardGenerator.preview.actions.downloadPDF')}
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="board-preview__button board-preview__button--secondary"
            >
              <FaRandom aria-hidden="true" />
              {t('boardGenerator.preview.actions.regenerateBoards')}
            </button>
            <button type="button" onClick={onModify} className="board-preview__button board-preview__button--ghost">
              <FaPen aria-hidden="true" />
              {t('boardGenerator.preview.actions.modifyCards')}
            </button>
          </div>
        </div>

        {error && (
          <p className="board-preview__error" role="alert">
            {error}
          </p>
        )}

        <div className="board-preview__boards">
          {boards.map((board, index) => (
            <BoardThumbnail
              key={board.id}
              board={board}
              index={index}
              onClick={() => handleThumbnailClick(index)}
            />
          ))}

          {deckCount > 0 && (
            <div className="board-preview__deck">
              <div className="board-preview__deck-cards" aria-hidden="true">
                {deckTileSample(deckCards).map((card) => (
                  <DeckTileCard key={card.id} card={card} />
                ))}
              </div>
              <strong className="board-preview__deck-title">{t('boardGenerator.preview.deckTileTitle')}</strong>
              <span className="board-preview__deck-text">
                {t('boardGenerator.preview.deckTileText', { cards: deckCount, count: deckSheetCount(deckCount) })}
              </span>
            </div>
          )}
        </div>

        <p className="board-preview__hint">{t('boardGenerator.preview.hint')}</p>
      </div>

      {selectedBoardIndex !== null && (
        <BoardModal
          boards={boards}
          selectedIndex={selectedBoardIndex}
          isOpen={selectedBoardIndex !== null}
          onClose={handleCloseModal}
          onChangeIndex={setSelectedBoardIndex}
        />
      )}
    </div>
  );
};
