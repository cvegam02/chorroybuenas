import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaEdit, FaSync, FaArrowRight } from 'react-icons/fa';
import { Board } from '../../types';
import { BoardThumbnail } from './BoardThumbnail';
import { BoardModal } from './BoardModal';
import './BoardPreview.css';

interface BoardPreviewProps {
  boards: Board[];
  onModify: () => void;
  onConfirm: () => void;
  onRegenerate: () => void;
}

export const BoardPreview = ({ boards, onModify, onConfirm, onRegenerate }: BoardPreviewProps) => {
  const { t } = useTranslation();
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);

  const handleThumbnailClick = (index: number) => {
    setSelectedBoardIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedBoardIndex(null);
  };

  return (
    <div className="board-preview">
      <div className="board-preview__header">
        <h1 className="board-preview__title">{t('boardGenerator.preview.title')}</h1>
        <p className="board-preview__subtitle">
          {t('boardGenerator.preview.subtitleCount', { count: boards.length })}
          {' '}
          {t('boardGenerator.preview.subtitleInstructions')}
        </p>
      </div>

      <div className="board-preview__boards-container">
        {boards.map((board, index) => (
          <BoardThumbnail
            key={board.id}
            board={board}
            index={index}
            onClick={() => handleThumbnailClick(index)}
          />
        ))}
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

      <div className="board-preview__actions">
        <button onClick={onConfirm} className="board-preview__button board-preview__button--primary">
          <FaDownload />
          <span>{t('boardGenerator.preview.actions.downloadPDF')}</span>
          <FaArrowRight />
        </button>
        <button onClick={onModify} className="board-preview__button board-preview__button--secondary">
          <FaEdit />
          <span>{t('boardGenerator.preview.actions.modifyCards')}</span>
        </button>
        <button onClick={onRegenerate} className="board-preview__button board-preview__button--tertiary">
          <FaSync />
          <span>{t('boardGenerator.preview.actions.regenerateBoards')}</span>
        </button>
      </div>
    </div>
  );
};
