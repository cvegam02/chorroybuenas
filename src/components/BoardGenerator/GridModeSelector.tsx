import { FaTh, FaChild } from 'react-icons/fa';
import { GridSize } from '../../types';
import './GridModeSelector.css';

interface GridModeSelectorProps {
    selectedSize: GridSize;
    onChange: (size: GridSize) => void;
}

export const GridModeSelector = ({ selectedSize, onChange }: GridModeSelectorProps) => {
    return (
        <div className="grid-mode-selector">
            <div className="grid-mode-selector__label">Elige tu estilo</div>
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
                        <span className="grid-mode-option__title">Clásica</span>
                        <span className="grid-mode-option__desc">4x4 (16 cartas)</span>
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
                        <span className="grid-mode-option__title">Kids</span>
                        <span className="grid-mode-option__desc">3x3 (9 cartas)</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
