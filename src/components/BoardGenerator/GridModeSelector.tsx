import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { GridSize } from '../../types';
import './GridModeSelector.css';

interface GridModeSelectorProps {
    selectedSize: GridSize;
    onChange: (size: GridSize) => void;
    t?: TFunction; // Allow passing t for consistency with other components or use internally
    /** Apagado: se ve el tipo elegido, pero no se puede cambiar (U2 con tableros, FEAT-57). */
    disabled?: boolean;
}

const MODES: readonly { size: GridSize; id: 'classic' | 'kids' }[] = [
    { size: 16, id: 'classic' },
    { size: 9, id: 'kids' },
];

/** Tipo de lotería: Clásico 4×4 o Kids 3×3, cada uno con su mini cuadrícula dibujada (FEAT-34). */
export const GridModeSelector = ({ selectedSize, onChange, t: propsT, disabled = false }: GridModeSelectorProps) => {
    const { t: localT } = useTranslation();
    const t = propsT || localT;

    return (
        <div className="grid-mode-selector" role="group" aria-labelledby="grid-mode-label">
            <span id="grid-mode-label" className="grid-mode-selector__label">
                {t('boardGenerator.gridMode.label')}
            </span>
            <div className="grid-mode-selector__options">
                {MODES.map(({ size, id }) => (
                    <button
                        key={id}
                        className={`grid-mode-option ${selectedSize === size ? 'grid-mode-option--active' : ''}`}
                        onClick={() => onChange(size)}
                        type="button"
                        disabled={disabled}
                        aria-pressed={selectedSize === size}
                    >
                        <span className={`grid-mode-option__grid grid-mode-option__grid--${id}`} aria-hidden="true">
                            {Array.from({ length: size }, (_, cell) => (
                                <span key={cell} />
                            ))}
                        </span>
                        <span className="grid-mode-option__content">
                            <span className="grid-mode-option__title">{t(`boardGenerator.gridMode.${id}`)}</span>
                            <span className="grid-mode-option__desc">{t(`boardGenerator.gridMode.${id}Desc`)}</span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
