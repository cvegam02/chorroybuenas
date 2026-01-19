import { useState } from 'react';
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
        <h1 className="board-preview__title">Vista Previa de Tableros</h1>
        <p className="board-preview__subtitle">
          Se generaron <strong>{boards.length} tablero{boards.length !== 1 ? 's' : ''}</strong>. 
          Haz clic en cualquier tablero para verlo completo.
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
          <span>Descargar PDF de Todos los Tableros</span>
          <FaArrowRight />
        </button>
        <button onClick={onModify} className="board-preview__button board-preview__button--secondary">
          <FaEdit />
          <span>Modificar Cartas</span>
        </button>
        <button onClick={onRegenerate} className="board-preview__button board-preview__button--tertiary">
          <FaSync />
          <span>Generar Nuevos Tableros</span>
        </button>
      </div>
    </div>
  );
};
