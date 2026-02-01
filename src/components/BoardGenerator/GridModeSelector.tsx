import { FaTh, FaChild } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { GridSize } from '../../types';
import './GridModeSelector.css';

interface GridModeSelectorProps {
    selectedSize: GridSize;
    onChange: (size: GridSize) => void;
    t?: any; // Allow passing t for consistency with other components or use internally
}

export const GridModeSelector = ({ selectedSize, onChange, t: propsT }: GridModeSelectorProps) => {
    const { t: localT } = useTranslation();
    const t = propsT || localT;

    return (
        <div className="grid-mode-selector">
            <div className="grid-mode-selector__label">{t('boardGenerator.gridMode.label')}</div>
            <div className="grid-mode-selector__options">
                <button
                    className={`grid-mode-option ${selectedSize === 16 ? 'grid-mode-option--active' : ''}`}
                    onClick={() => onChange(16)}
                    type="button"
                >
                    <div className="grid-mode-option__icon">
                        <FaTh />
                    </div>
                    <div className="grid-mode-option__content">
                        <span className="grid-mode-option__title">{t('boardGenerator.gridMode.classic')}</span>
                        <span className="grid-mode-option__desc">{t('boardGenerator.gridMode.classicDesc')}</span>
                    </div>
                </button>

                <button
                    className={`grid-mode-option ${selectedSize === 9 ? 'grid-mode-option--active' : ''}`}
                    onClick={() => onChange(9)}
                    type="button"
                >
                    <div className="grid-mode-option__icon">
                        <FaChild />
                    </div>
                    <div className="grid-mode-option__content">
                        <span className="grid-mode-option__title">{t('boardGenerator.gridMode.kids')}</span>
                        <span className="grid-mode-option__desc">{t('boardGenerator.gridMode.kidsDesc')}</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
