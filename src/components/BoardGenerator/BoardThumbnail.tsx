import { useState, useEffect } from 'react';
import { Board, Card } from '../../types';
import { getImage } from '../../utils/indexedDB';
import './BoardThumbnail.css';

interface BoardThumbnailProps {
  board: Board;
  index: number;
  onClick: () => void;
}

interface CardWithImage extends Card {
  freshImageUrl?: string | null;
}

export const BoardThumbnail = ({ board, index, onClick }: BoardThumbnailProps) => {
  // Initialize with null images, will be refreshed from IndexedDB
  const [cardsWithImages, setCardsWithImages] = useState<CardWithImage[]>(
    board.cards.map(card => ({ ...card, freshImageUrl: null }))
  );

  // Refresh all card images from IndexedDB to ensure blob URLs are valid
  useEffect(() => {
    let isMounted = true;
    
    const refreshImages = async () => {
      console.log(`Refreshing images for board ${board.id} (${board.cards.length} cards)...`);
      
      const refreshedCards = await Promise.all(
        board.cards.map(async (card) => {
          if (!card.id) {
            return { ...card, freshImageUrl: null };
          }
          
          try {
            const freshImageURL = await getImage(card.id);
            if (freshImageURL) {
              console.log(`✓ Refreshed image for card ${card.id}`);
            } else {
              console.warn(`⚠ No image found for card ${card.id}`);
            }
            return { ...card, freshImageUrl: freshImageURL || null };
          } catch (error) {
            console.error(`❌ Error refreshing image for card ${card.id}:`, error);
            return { ...card, freshImageUrl: null };
          }
        })
      );
      
      // Only update state if component is still mounted
      if (isMounted) {
        setCardsWithImages(refreshedCards);
        console.log(`✓ Finished refreshing images for board ${board.id}`);
      }
    };

    refreshImages();
    
    return () => {
      isMounted = false;
    };
    // Only refresh when board.id changes (board is replaced), not when cards array reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  // Create a small preview grid (4x4, but smaller)
  const grid: (CardWithImage | null)[][] = [];
  for (let i = 0; i < 4; i++) {
    grid[i] = [];
    for (let j = 0; j < 4; j++) {
      const cardIndex = i * 4 + j;
      grid[i][j] = cardsWithImages[cardIndex] || null;
    }
  }

  return (
    <div className="board-thumbnail">
      <div className="board-thumbnail__header" onClick={onClick}>
        <h3 className="board-thumbnail__title">Tablero {index + 1}</h3>
        <span className="board-thumbnail__click-hint">👆 Click para ver completo</span>
      </div>
      <div className="board-thumbnail__grid" onClick={onClick}>
        {grid.map((row, rowIndex) =>
          row.map((card, colIndex) => (
            <div 
              key={`${rowIndex}-${colIndex}`} 
              className="board-thumbnail__cell"
            >
              {card ? (
                <div className="board-thumbnail__card">
                  {card.freshImageUrl ? (
                    <img 
                      src={card.freshImageUrl} 
                      alt={card.title} 
                      className="board-thumbnail__card-image"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      draggable={false}
                      onError={() => {
                        console.warn(`Thumbnail image failed to load for card ${card.id}, attempting refresh...`);
                        // Try to refresh the image if it fails
                        if (card.id) {
                          getImage(card.id).then(url => {
                            if (url) {
                              setCardsWithImages(prev => 
                                prev.map(c => c.id === card.id ? { ...c, freshImageUrl: url } : c)
                              );
                            } else {
                              // If no image found, set to null to show placeholder
                              setCardsWithImages(prev => 
                                prev.map(c => c.id === card.id ? { ...c, freshImageUrl: null } : c)
                              );
                            }
                          }).catch(err => {
                            console.error(`Failed to refresh image for card ${card.id}:`, err);
                            // Set to null to show placeholder on error
                            setCardsWithImages(prev => 
                              prev.map(c => c.id === card.id ? { ...c, freshImageUrl: null } : c)
                            );
                          });
                        }
                      }}
                    />
                  ) : (
                    <div className="board-thumbnail__card-placeholder">
                      {card.id ? 'Cargando...' : 'Sin imagen'}
                    </div>
                  )}
                  <span className="board-thumbnail__card-title">{card.title}</span>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

