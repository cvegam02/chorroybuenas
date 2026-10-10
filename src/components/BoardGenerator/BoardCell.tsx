import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../types';
import { getImage } from '../../utils/indexedDB';
import { useComposedCard } from '../../hooks/useComposedCard';
import './BoardCell.css';

interface BoardCellProps {
  card: Card;
}

export const BoardCell = ({ card }: BoardCellProps) => {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(card.image || null);
  // La carta como sale impresa, con el nombre dentro. Mientras no está lista se muestra la foto, con el nombre debajo.
  const composedUrl = useComposedCard(card);
  const shownUrl = composedUrl ?? imageUrl;

  // When card changes (e.g. navigating between boards), update image immediately.
  // card.image may be a Supabase URL (https:) or blob URL - use it directly.
  // Fallback to IndexedDB only when card.image is missing (local storage).
  useEffect(() => {
    if (card.image) {
      setImageUrl(card.image);
      return;
    }

    let cancelled = false;
    const loadFromIndexedDB = async () => {
      if (!card.id) return;
      try {
        const freshImageURL = await getImage(card.id);
        if (!cancelled) {
          setImageUrl(freshImageURL || null);
        }
      } catch (error) {
        if (!cancelled) {
          setImageUrl(null);
        }
      }
    };
    loadFromIndexedDB();
    return () => { cancelled = true; };
  }, [card.id, card.image]);

  const handleImageContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault(); // Prevent right-click context menu
  };

  const handleImageDragStart = (e: React.DragEvent<HTMLImageElement>) => {
    e.preventDefault(); // Prevent dragging images
  };

  return (
    <div className="board-cell">
      <div className="board-cell__image-container">
        {shownUrl ? (
          <img
            src={shownUrl}
            alt={card.title}
            className="board-cell__image"
            onContextMenu={handleImageContextMenu}
            onDragStart={handleImageDragStart}
            draggable={false}
            onError={() => {
              // If image fails to load, try to refresh again
              if (!composedUrl) setImageUrl(null);
            }}
          />
        ) : (
          <div className="board-cell__image-placeholder">{t('boardGenerator.noImage')}</div>
        )}
      </div>
      {!composedUrl && <div className="board-cell__title">{card.title}</div>}
    </div>
  );
};

