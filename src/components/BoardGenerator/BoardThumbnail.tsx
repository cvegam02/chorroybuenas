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
      console.log(`[BoardThumbnail] Refreshing images for board ${board.id} (${board.cards.length} cards)...`);

      const refreshedCards = await Promise.all(
        board.cards.map(async (card) => {
          if (!card.id) {
            console.warn(`[BoardThumbnail] Card has no ID:`, card.title);
            return { ...card, freshImageUrl: null };
          }

          try {
            const freshImageURL = await getImage(card.id);
            if (freshImageURL) {
              console.log(`[BoardThumbnail] ✓ Got image URL for card ${card.id} (${card.title})`);
            } else {
              console.warn(`[BoardThumbnail] ⚠ No image found in IndexedDB for card ${card.id} (${card.title})`);
            }
            return { ...card, freshImageUrl: freshImageURL || null };
          } catch (error) {
            console.error(`[BoardThumbnail] ❌ Error getting image for card ${card.id} (${card.title}):`, error);
            return { ...card, freshImageUrl: null };
          }
        })
      );

      // Only update state if component is still mounted
      if (isMounted) {
        const loadedCount = refreshedCards.filter(c => c.freshImageUrl !== null).length;
        console.log(`[BoardThumbnail] ✓ Finished refreshing images for board ${board.id}: ${loadedCount}/${refreshedCards.length} loaded`);
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
                        console.warn(`[BoardThumbnail] Image failed to load for card ${card.id} (${card.title}), blob URL may be invalid: ${card.freshImageUrl?.substring(0, 50)}...`);
                        // Try to refresh the image once if it fails
                        if (card.id) {
                          getImage(card.id).then(url => {
                            if (url && url !== card.freshImageUrl) {
                              console.log(`[BoardThumbnail] ✓ Successfully refreshed image for card ${card.id}`);
                              setCardsWithImages(prev =>
                                prev.map(c => c.id === card.id ? { ...c, freshImageUrl: url } : c)
                              );
                            } else {
                              console.warn(`[BoardThumbnail] ⚠ Could not get new image for card ${card.id}, showing placeholder`);
                              // If no image found, set to null to show placeholder
                              setCardsWithImages(prev =>
                                prev.map(c => c.id === card.id ? { ...c, freshImageUrl: null } : c)
                              );
                            }
                          }).catch(err => {
                            console.error(`[BoardThumbnail] ❌ Error refreshing image for card ${card.id}:`, err);
                            // Set to null to show placeholder on error
                            setCardsWithImages(prev =>
                              prev.map(c => c.id === card.id ? { ...c, freshImageUrl: null } : c)
                            );
                          });
                        } else {
                          // No card ID, just show placeholder
                          setCardsWithImages(prev =>
                            prev.map(c => c.id === card.id ? { ...c, freshImageUrl: null } : c)
                          );
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

