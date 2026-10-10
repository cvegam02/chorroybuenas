import { useState, useEffect } from 'react';
import { Board, Card } from '../../types';
import { getImage } from '../../utils/indexedDB';
import './BoardThumbnail.css';
import { logger } from '../../utils/logger';
import { useComposedCard } from '../../hooks/useComposedCard';

interface BoardThumbnailProps {
  board: Board;
  index: number;
  onClick: () => void;
}

interface CardWithImage extends Card {
  freshImageUrl?: string | null;
}

interface ThumbnailCardProps {
  card: CardWithImage;
  onImageError: (card: CardWithImage) => void;
}

/** Una carta de la miniatura: como sale impresa cuando ya está compuesta; si no, la foto con su nombre. */
const ThumbnailCard = ({ card, onImageError }: ThumbnailCardProps) => {
  const composedUrl = useComposedCard(card);
  const imageUrl = composedUrl ?? card.freshImageUrl;

  return (
    <div className="board-thumbnail__card">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={card.title}
          className="board-thumbnail__card-image"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
          onError={() => {
            if (!composedUrl) onImageError(card);
          }}
        />
      ) : (
        <div className="board-thumbnail__card-placeholder">
          {card.id ? 'Cargando...' : 'Sin imagen'}
        </div>
      )}
      {!composedUrl && <span className="board-thumbnail__card-title">{card.title}</span>}
    </div>
  );
};

export const BoardThumbnail = ({ board, index, onClick }: BoardThumbnailProps) => {
  // Initialize with null images, will be refreshed from IndexedDB
  const [cardsWithImages, setCardsWithImages] = useState<CardWithImage[]>(
    board.cards.map(card => ({ ...card, freshImageUrl: null }))
  );

  // Refresh all card images from IndexedDB to ensure blob URLs are valid
  useEffect(() => {
    let isMounted = true;

    const refreshImages = async () => {
      const refreshedCards = await Promise.all(
        board.cards.map(async (card) => {
          const hasRemoteImage = card.image && (card.image.startsWith('http') || card.image.startsWith('blob:'));
          if (hasRemoteImage) {
            return { ...card, freshImageUrl: card.image };
          }
          if (!card.id) {
            return { ...card, freshImageUrl: null };
          }

          try {
            const freshImageURL = await getImage(card.id);
            return { ...card, freshImageUrl: freshImageURL || null };
          } catch (error) {
            logger.error(`[BoardThumbnail] ❌ Error getting image for card ${card.id} (${card.title}):`, error);
            return { ...card, freshImageUrl: null };
          }
        })
      );

      // Only update state if component is still mounted
      if (isMounted) {
        setCardsWithImages(refreshedCards);
      }
    };

    refreshImages();

    return () => {
      isMounted = false;
    };
    // Only refresh when board.id changes (board is replaced), not when cards array reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  // Try to refresh the image once if it fails; if there is none, show the placeholder
  const refreshFailedImage = (card: CardWithImage) => {
    const showPlaceholder = () =>
      setCardsWithImages(prev => prev.map(c => c.id === card.id ? { ...c, freshImageUrl: null } : c));

    if (!card.id) {
      showPlaceholder();
      return;
    }
    getImage(card.id).then(url => {
      if (url && url !== card.freshImageUrl) {
        setCardsWithImages(prev => prev.map(c => c.id === card.id ? { ...c, freshImageUrl: url } : c));
      } else {
        showPlaceholder();
      }
    }).catch(err => {
      logger.error(`[BoardThumbnail] ❌ Error refreshing image for card ${card.id}:`, err);
      showPlaceholder();
    });
  };

  // Determine grid size
  const gridSize = board.gridSize || 16;
  const cols = gridSize === 9 ? 3 : 4;
  const rows = gridSize === 9 ? 3 : 4;

  // Create preview grid
  const grid: (CardWithImage | null)[][] = [];
  for (let i = 0; i < rows; i++) {
    grid[i] = [];
    for (let j = 0; j < cols; j++) {
      const cardIndex = i * cols + j;
      grid[i][j] = cardsWithImages[cardIndex] || null;
    }
  }

  return (
    <div className="board-thumbnail">
      <div className="board-thumbnail__header" onClick={onClick}>
        <h3 className="board-thumbnail__title">Tablero {index + 1}</h3>
        <span className="board-thumbnail__click-hint">👆 Click para ver completo</span>
      </div>
      <div
        className="board-thumbnail__grid"
        onClick={onClick}
        style={{ '--cols': cols } as React.CSSProperties}
      >
        {grid.map((row, rowIndex) =>
          row.map((card, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="board-thumbnail__cell"
            >
              {card ? (
                <ThumbnailCard card={card} onImageError={refreshFailedImage} />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

