import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Board } from '../../types';
import { BoardCell } from './BoardCell';
import './BoardModal.css';

interface BoardModalProps {
  boards: Board[];
  selectedIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
}

export const BoardModal = ({ boards, selectedIndex, isOpen, onClose, onChangeIndex }: BoardModalProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const total = boards.length;
  const board = boards[selectedIndex];
  const title = t('boardGenerator.boardTitle', { current: selectedIndex + 1, total });

  const clampIndex = (idx: number) => {
    if (total <= 0) return 0;
    return (idx + total) % total; // wrap-around carousel
  };

  const goPrev = () => onChangeIndex(clampIndex(selectedIndex - 1));
  const goNext = () => onChangeIndex(clampIndex(selectedIndex + 1));

  const canNavigate = total > 1;

  // Keyboard navigation (left/right/esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (!canNavigate) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, canNavigate, selectedIndex, total, onClose]);

  // Touch swipe navigation
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchMoved = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    touchMoved.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    // If mostly horizontal swipe, mark as moved (but don't block vertical scrolling)
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      touchMoved.current = true;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!canNavigate) return;
    if (touchStartX.current == null || touchStartY.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;

    // Only treat as swipe if it's mostly horizontal and passes threshold
    const SWIPE_THRESHOLD = 50;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchMoved.current = false;
  };

  // Organize cards in grid
  const gridSize = board.gridSize || 16;
  const cols = gridSize === 9 ? 3 : 4;
  const rows = gridSize === 9 ? 3 : 4;

  const grid: (typeof board.cards[0] | null)[][] = useMemo(() => {
    const next: (typeof board.cards[0] | null)[][] = [];
    for (let i = 0; i < rows; i++) {
      next[i] = [];
      for (let j = 0; j < cols; j++) {
        const cardIndex = i * cols + j;
        next[i][j] = board.cards[cardIndex] || null;
      }
    }
    return next;
  }, [board, rows, cols]);

  const modalContent = (
    <div
      className="board-modal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="board-modal__content"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="board-modal__header">
          <div className="board-modal__header-left">
            <h2 className="board-modal__title">{title}</h2>
          </div>
          <div className="board-modal__header-actions">
            <button
              type="button"
              className="board-modal__nav board-modal__nav--prev"
              onClick={goPrev}
              disabled={!canNavigate}
              aria-label={t('boardGenerator.actions.prevBoard')}
              title={t('common.back')}
            >
              ‹
            </button>
            <button
              type="button"
              className="board-modal__nav board-modal__nav--next"
              onClick={goNext}
              disabled={!canNavigate}
              aria-label={t('boardGenerator.actions.nextBoard')}
              title={t('common.next')}
            >
              ›
            </button>
            <button
              className="board-modal__close"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>
        </div>

        <div
          className="board-modal__grid"
          style={{
            '--cols': cols,
            '--rows': rows
          } as React.CSSProperties}
        >
          {grid.map((row, rowIndex) =>
            row.map((card, colIndex) => (
              <div key={`${selectedIndex}-${rowIndex}-${colIndex}-${card?.id ?? 'empty'}`} className="board-modal__cell">
                {card ? <BoardCell card={card} /> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Render modal using Portal to ensure it's on top of everything
  return createPortal(modalContent, document.body);
};

