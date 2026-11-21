import { memo, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { Board, Card } from '../../types';
import logoImage from '../../img/logo.png';
import { useComposedCard } from '../../hooks/useComposedCard';
import { boardPageTitle } from '../../services/pdf/layout';
import { boardSheetGeometry, type SheetBox } from '../../services/pdf/sheetGeometry';
import type { BoardBackground, BoardLogoPosition, BoardTitlePosition } from '../../utils/boardBackgrounds';
import { BoardBackgroundLayer } from '../BoardGenerator/BoardBackgroundLayer';
import '../../fonts/arvoCarta.css';
import './BoardSheetPreview.css';

interface BoardSheetPreviewProps {
  board: Board;
  /** Número del tablero, como sale en «TABLERO N». */
  boardNumber: number;
  background: BoardBackground;
  /** Dónde va el logo (US A4). Sin ella, al centro. */
  logoPosition?: BoardLogoPosition;
  /** Dónde va «TABLERO N» (US A4): a los lados lleva una sola línea, del lado libre. Sin ella, al centro. */
  titlePosition?: BoardTitlePosition;
}

/** Medida en puntos del PDF, en pantalla: `--pt` es lo que mide un punto en la vista previa. */
const pt = (value: number) => `calc(var(--pt) * ${value})`;

const boxStyle = (box: SheetBox): CSSProperties => ({
  left: pt(box.left),
  top: pt(box.top),
  width: pt(box.width),
  height: pt(box.height),
});

/** Una carta de la vista previa: no se vuelve a dibujar cuando solo cambia el fondo. */
const SheetCard = memo(function SheetCard({ card, box, border }: { card: Card; box: SheetBox; border: number }) {
  const composedUrl = useComposedCard(card);
  const imageUrl = composedUrl ?? card.image;
  return (
    <span className="board-sheet__card" style={{ ...boxStyle(box), '--card-border': pt(border) } as CSSProperties}>
      {imageUrl && <img src={imageUrl} alt="" draggable={false} />}
    </span>
  );
});

/**
 * Un tablero dibujado con las medidas de su página del PDF (FEAT-67): fondo, línea de corte, logo,
 * «TABLERO N» y cartas en su lugar, para ver en pantalla cómo va a salir impreso.
 */
export const BoardSheetPreview = ({
  board,
  boardNumber,
  background,
  logoPosition = 'center',
  titlePosition = 'center',
}: BoardSheetPreviewProps) => {
  const { t } = useTranslation();
  const geometry = useMemo(
    () => boardSheetGeometry(board.gridSize === 9 ? 9 : 16, logoPosition),
    [board.gridSize, logoPosition]
  );
  const { title } = geometry;

  return (
    <figure
      className="board-sheet"
      style={{ aspectRatio: `${geometry.width} / ${geometry.height}`, '--sheet-width': geometry.width } as CSSProperties}
      aria-label={t('setView.boardBackground.previewLabel')}
    >
      <div className="board-sheet__page">
        <BoardBackgroundLayer background={background} className="board-sheet__background" />
        <span className="board-sheet__cut" style={boxStyle(geometry.cutLine)} />
        <img className="board-sheet__logo" src={logoImage} alt="" style={boxStyle(geometry.logo)} draggable={false} />
        <span
          className="board-sheet__title"
          style={{
            left: pt(title.left),
            width: pt(title.width),
            top: pt(title.baseline - title.capHeight / 2),
            gap: pt(title.lineGap),
            fontSize: pt(title.size),
            '--line': pt(title.lineThickness),
          } as CSSProperties}
        >
          {titlePosition !== 'left' && <span className="board-sheet__rule" />}
          {boardPageTitle(boardNumber)}
          {titlePosition !== 'right' && <span className="board-sheet__rule" />}
        </span>
        {geometry.cards.map((box, index) => {
          const card = board.cards[index];
          return card ? <SheetCard key={`${index}-${card.id}`} card={card} box={box} border={geometry.cardBorder} /> : null;
        })}
      </div>
    </figure>
  );
};
