import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../types';
import { getImage } from '../../utils/indexedDB';
import './BoardCell.css';

interface BoardCellProps {
  card: Card;
}

export const BoardCell = ({ card }: BoardCellProps) => {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(card.image || null);

  // Refresh image from IndexedDB to ensure blob URL is valid
  useEffect(() => {
    const refreshImage = async () => {
      if (!card.id) return;

      try {
        const freshImageURL = await getImage(card.id);
        if (freshImageURL) {
          setImageUrl(freshImageURL);
        }
      } catch (error) {
        console.error(`Error refreshing image for card ${card.id}:`, error);
        // Keep existing image URL if refresh fails
      }
    };

    refreshImage();
  }, [card.id]);

  const handleImageContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault(); // Prevent right-click context menu
  };

  const handleImageDragStart = (e: React.DragEvent<HTMLImageElement>) => {
    e.preventDefault(); // Prevent dragging images
  };

  return (
    <div className="board-cell">
      <div className="board-cell__image-container">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.title}
            className="board-cell__image"
            onContextMenu={handleImageContextMenu}
            onDragStart={handleImageDragStart}
            draggable={false}
            onError={() => {
              // If image fails to load, try to refresh again
              console.warn(`Image failed to load for card ${card.id}, attempting refresh...`);
              setImageUrl(null);
            }}
          />
        ) : (
          <div className="board-cell__image-placeholder">{t('boardGenerator.noImage')}</div>
        )}
      </div>
      <div className="board-cell__title">{card.title}</div>
    </div>
  );
};

