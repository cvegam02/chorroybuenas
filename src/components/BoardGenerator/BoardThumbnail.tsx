import { useState } from 'react';
import { Board, Card } from '../../types';
import { generateCardPDF, downloadPDF } from '../../services/PDFService';
import './BoardThumbnail.css';

interface BoardThumbnailProps {
  board: Board;
  index: number;
  onClick: () => void;
}

export const BoardThumbnail = ({ board, index, onClick }: BoardThumbnailProps) => {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Create a small preview grid (4x4, but smaller)
  const grid: (typeof board.cards[0] | null)[][] = [];
  for (let i = 0; i < 4; i++) {
    grid[i] = [];
    for (let j = 0; j < 4; j++) {
      const cardIndex = i * 4 + j;
      grid[i][j] = board.cards[cardIndex] || null;
    }
  }

  const handleCardDownload = async (e: React.MouseEvent, card: Card) => {
    e.stopPropagation(); // Prevent opening the modal
    setIsGeneratingPDF(true);
    try {
      const pdfBlob = await generateCardPDF(card);
      const sanitizedTitle = card.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      downloadPDF(pdfBlob, `carta_${sanitizedTitle}.pdf`);
    } catch (error) {
      console.error('Error generating card PDF:', error);
      alert('Error al generar el PDF de la carta. Por favor, intenta nuevamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="board-thumbnail">
      <div className="board-thumbnail__header" onClick={onClick}>
        <h3 className="board-thumbnail__title">Tablero {index + 1}</h3>
        <span className="board-thumbnail__click-hint">👆 Click para ver completo</span>
      </div>
      <div className="board-thumbnail__grid" onClick={onClick}>
        {grid.map((row, rowIndex) =>
          row.map((card, colIndex) => {
            const cardIndex = rowIndex * 4 + colIndex;
            const isHovered = hoveredCardIndex === cardIndex && card;
            
            return (
              <div 
                key={`${rowIndex}-${colIndex}`} 
                className="board-thumbnail__cell"
                onMouseEnter={() => card && setHoveredCardIndex(cardIndex)}
                onMouseLeave={() => setHoveredCardIndex(null)}
              >
                {card ? (
                  <div className="board-thumbnail__card">
                    <img 
                      src={card.image} 
                      alt={card.title} 
                      className="board-thumbnail__card-image" 
                    />
                    <span className="board-thumbnail__card-title">{card.title}</span>
                    {isHovered && (
                      <div 
                        className="board-thumbnail__card-overlay"
                        onClick={(e) => handleCardDownload(e, card)}
                      >
                        <button 
                          className="board-thumbnail__download-button"
                          disabled={isGeneratingPDF}
                          title="Descargar esta carta como PDF"
                        >
                          {isGeneratingPDF ? '⏳' : '📥'} Descargar Carta
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

