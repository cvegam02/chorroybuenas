import { useState } from 'react';
import {
  FaExclamationTriangle,
  FaLightbulb,
  FaCheckCircle,
  FaInfoCircle
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './CardRecommendations.css';

interface CardRecommendationsProps {
  cardCount: number;
}

export const CardRecommendations = ({ cardCount }: CardRecommendationsProps) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const getRecommendation = () => {
    if (cardCount < 20) {
      return null; // No mostrar mensaje cuando hay menos de 20 cartas
    } else if (cardCount >= 20 && cardCount <= 40) {
      return {
        type: 'warning',
        message: t('recommendations.warningRange'),
      };
    } else if (cardCount === 54) {
      return {
        type: 'success',
        message: t('recommendations.successClassical'),
      };
    } else if (cardCount > 54) {
      return {
        type: 'info',
        message: t('recommendations.infoMessage', { count: cardCount }),
      };
    } else {
      return {
        type: 'info',
        message: t('recommendations.infoMessageAddMore', { count: cardCount }),
      };
    }
  };

  const recommendation = getRecommendation();

  // No mostrar nada si hay menos de 20 cartas
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
            {recommendation.type === 'error' && <FaExclamationTriangle />}
            {recommendation.type === 'warning' && <FaLightbulb />}
            {recommendation.type === 'success' && <FaCheckCircle />}
            {recommendation.type === 'info' && <FaInfoCircle />}
          </span>
          <span className="card-recommendations__header-text">{t('recommendations.header')}</span>
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

