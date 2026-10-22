import { useTranslation } from 'react-i18next';
import { traditionalCardImage } from '../../utils/traditionalBoards';
import './TraditionalHeroArt.css';

/**
 * Imagen del héroe de P8 «Arma tus tableros» (FEAT-53), a partir del diseño de Carlos `hero-tableros.html`: tres
 * tableros encimados con las cartas de la sección, el del frente con dos casillas vacías y una carta que llega a
 * una de ellas. Las cartas son fijas (no al azar) para que la página prerenderizada y la del navegador coincidan.
 */
const BACK = [3, 10, 22, 35, 7, 41, 14, 30, 46, 2, 19, 52, 8, 28, 37, 24];
const MIDDLE = [6, 13, 26, 44, 9, 33, 21, 50, 4, 40, 16, 47, 12, 31, 53, 18];
const FRONT = [1, 23, 45, 15, 38, null, 5, 29, 36, 11, 49, null, 20, 42, 25, 34];
const FLOATING = 27;
// Del borde izquierdo de la carta flotante (x 77) a la parte de arriba de la casilla vacía 12 (centro x 70.5, y 64.5).
const ARROW_PATH = 'M77 55 C71 55 69 58 70.5 62.5';
const ARROW_HEAD = 'M68 60 L70.5 63.2 L73 60';

const Cell = ({ card }: { card: number | null }) =>
  card === null ? (
    <div className="lh-slot">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </div>
  ) : (
    <div className="lh-card">
      <img src={traditionalCardImage(card, 'screen')} alt="" loading="lazy" draggable={false} />
    </div>
  );

const Board = ({ cards, title, variant }: { cards: readonly (number | null)[]; title: string; variant: string }) => (
  <div className={`lh-board lh-board--${variant}`}>
    <div className="lh-title">{title}</div>
    <div className="lh-grid">
      {cards.map((card, index) => (
        <Cell key={index} card={card} />
      ))}
    </div>
  </div>
);

export const TraditionalHeroArt = () => {
  const { t } = useTranslation();

  return (
    <div className="lh-art" role="img" aria-label={t('traditional.heroArt.label')}>
      <div className="lh-stage">
        <Board cards={BACK} title={t('traditional.heroArt.board')} variant="back" />
        <Board cards={MIDDLE} title={t('traditional.heroArt.board')} variant="mid" />
        <Board cards={FRONT} title={t('traditional.heroArt.myBoard')} variant="front" />

        {/* Línea de la carta flotante a la casilla vacía de la tercera fila. Coordenadas del escenario: 100 de ancho
            por 108 de alto, las mismas unidades (cqw) con que se acomodan tableros y cartas. */}
        <svg className="lh-arrow" viewBox="0 0 100 108" aria-hidden="true">
          <path className="lh-arrow__halo" d={ARROW_PATH} />
          <path className="lh-arrow__halo" d={ARROW_HEAD} />
          <path className="lh-arrow__line" d={ARROW_PATH} />
          <path className="lh-arrow__head" d={ARROW_HEAD} />
        </svg>
        <div className="lh-card lh-float">
          <img src={traditionalCardImage(FLOATING, 'screen')} alt="" draggable={false} />
        </div>
        <svg className="lh-cursor" viewBox="0 0 24 26" aria-hidden="true">
          <path d="M3 2L3 21L8 16.5L11.5 24L15 22.5L11.5 15L18 15Z" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};
