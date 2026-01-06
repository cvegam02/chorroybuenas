import { useState } from 'react';
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
      <h2 className="board-preview__title">Vista Previa de Tableros</h2>
      <div className="board-preview__info">
        Se generaron {boards.length} tablero{boards.length !== 1 ? 's' : ''}. Haz clic en cualquier tablero para verlo completo.
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
        <button onClick={onConfirm} className="board-preview__confirm-button">
          📥 Descargar PDF de Todos los Tableros
        </button>
        <button onClick={onModify} className="board-preview__modify-button">
          ✏️ Modificar Cartas
        </button>
        <button onClick={onRegenerate} className="board-preview__regenerate-button">
          🔄 Generar Nuevos Tableros
        </button>
      </div>
    </div>
  );
};

