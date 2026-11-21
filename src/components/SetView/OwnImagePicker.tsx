import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaImage } from 'react-icons/fa';
import { BOARD_IMAGE_TYPES } from '../../utils/boardBackgrounds';

interface OwnImagePickerProps {
  /** La imagen que se ve ahora: la recién elegida o la guardada; null si no hay ninguna. */
  imageUrl: string | null;
  isSelected: boolean;
  lighten: boolean;
  /** Por qué no se aceptó el último archivo. */
  error: 'type' | 'size' | null;
  onSelect: () => void;
  onFile: (file: File) => void;
  onLightenChange: (lighten: boolean) => void;
}

/**
 * «Tu imagen» de M22 (FEAT-67, US A2): subir una imagen propia, escogerla como fondo y, con «Aclarar la
 * imagen», ponerle el velo blanco. La imagen no se sube hasta «Guardar».
 */
export const OwnImagePicker = ({ imageUrl, isSelected, lighten, error, onSelect, onFile, onLightenChange }: OwnImagePickerProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="board-bg__own">
      <div className="board-bg__own-row">
        {imageUrl && (
          <button
            type="button"
            aria-pressed={isSelected}
            className={`board-bg__swatch board-bg__swatch--own${isSelected ? ' board-bg__swatch--selected' : ''}`}
            onClick={onSelect}
          >
            <span className="board-bg__sample" style={{ backgroundImage: `url("${imageUrl.replace(/"/g, '%22')}")` }}>
              {isSelected && (
                <span className="board-bg__check" aria-hidden="true">
                  <FaCheck />
                </span>
              )}
            </span>
            <span className="board-bg__name">{t('setView.boardBackground.ownImageUse')}</span>
          </button>
        )}
        <button
          type="button"
          className="set-button set-button--secondary set-button--small"
          onClick={() => inputRef.current?.click()}
        >
          <FaImage aria-hidden="true" />
          {imageUrl ? t('setView.boardBackground.ownImageChange') : t('setView.boardBackground.ownImageUpload')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={BOARD_IMAGE_TYPES.join(',')}
          className="board-bg__file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Se limpia para poder volver a escoger el mismo archivo.
            event.target.value = '';
            if (file) onFile(file);
          }}
        />
      </div>

      {error && (
        <p className="board-bg__error" role="alert">
          {t(error === 'size' ? 'setView.boardBackground.ownImageTooBig' : 'setView.boardBackground.ownImageWrongType')}
        </p>
      )}

      {imageUrl && isSelected && (
        <label className="board-bg__switch">
          <input type="checkbox" checked={lighten} onChange={(event) => onLightenChange(event.target.checked)} />
          <span className="board-bg__switch-track" aria-hidden="true" />
          {t('setView.boardBackground.lighten')}
        </label>
      )}
    </div>
  );
};
