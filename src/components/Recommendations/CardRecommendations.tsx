import { useState } from 'react';
import './CardRecommendations.css';

interface CardRecommendationsProps {
  cardCount: number;
}

export const CardRecommendations = ({ cardCount }: CardRecommendationsProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const getRecommendation = () => {
    if (cardCount < 30) {
      return null; // No mostrar mensaje cuando hay menos de 30 cartas
    } else if (cardCount >= 30 && cardCount <= 40) {
      return {
        type: 'warning',
        message: '30-40 cartas: Buen término medio - Mantiene la variedad y duración del juego sin complicar demasiado la logística.',
      };
    } else if (cardCount === 54) {
      return {
        type: 'success',
        message: '54 cartas: Opción clásica y completa - Ideal para una experiencia tradicional y bien balanceada (recomendado).',
      };
    } else if (cardCount > 54) {
      return {
        type: 'info',
        message: `Tienes ${cardCount} cartas. La opción clásica es 54 cartas, pero puedes usar todas las que tengas.`,
      };
    } else {
      return {
        type: 'info',
        message: `Tienes ${cardCount} cartas. Considera agregar más cartas para una mejor experiencia (54 es la opción clásica).`,
      };
    }
  };

  const recommendation = getRecommendation();

  // No mostrar nada si hay menos de 30 cartas
  if (!recommendation) {
    return null;
  }

  return (
    <div className={`card-recommendations card-recommendations--${recommendation.type}`}>
      <button 
        className="card-recommendations__header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        type="button"
      >
        <div className="card-recommendations__header-content">
          <span className="card-recommendations__icon">
            {recommendation.type === 'error' && '⚠️'}
            {recommendation.type === 'warning' && '💡'}
            {recommendation.type === 'success' && '✅'}
            {recommendation.type === 'info' && 'ℹ️'}
          </span>
          <span className="card-recommendations__header-text">Recomendaciones</span>
        </div>
        <span className={`card-recommendations__chevron ${isCollapsed ? 'card-recommendations__chevron--collapsed' : ''}`}>
          ▼
        </span>
      </button>
      {!isCollapsed && (
        <div className="card-recommendations__content">
          <span className="card-recommendations__message">{recommendation.message}</span>
        </div>
      )}
    </div>
  );
};

