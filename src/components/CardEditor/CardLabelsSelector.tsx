import { useTranslation } from 'react-i18next';
import { CARD_LABELS, type CardLabels } from '../../utils/cardLabels';
import './CardLabelsSelector.css';

interface CardLabelsSelectorProps {
  selected: CardLabels;
  onChange: (labels: CardLabels) => void;
}

const showsNumber = (labels: CardLabels) => labels === 'both' || labels === 'number';
const showsName = (labels: CardLabels) => labels === 'both' || labels === 'name';

/**
 * Qué se ve en las cartas (FEAT-51): cuatro botones, cada uno con una carta miniatura que marca dónde
 * va el número (arriba a la izquierda) y el nombre (abajo).
 */
export const CardLabelsSelector = ({ selected, onChange }: CardLabelsSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className="card-labels-selector" role="group" aria-labelledby="card-labels-label">
      <span id="card-labels-label" className="card-labels-selector__label">
        {t('cardEditor.labels.label')}
      </span>
      <div className="card-labels-selector__options">
        {CARD_LABELS.map((labels) => (
          <button
            key={labels}
            type="button"
            className={`card-labels-option ${selected === labels ? 'card-labels-option--active' : ''}`}
            onClick={() => onChange(labels)}
            aria-pressed={selected === labels}
          >
            <span className="card-labels-option__card" aria-hidden="true">
              {showsNumber(labels) && <span className="card-labels-option__number" />}
              {showsName(labels) && <span className="card-labels-option__name" />}
            </span>
            <span className="card-labels-option__title">{t(`cardEditor.labels.${labels}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
