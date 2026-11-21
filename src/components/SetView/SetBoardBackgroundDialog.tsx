import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaEyeDropper } from 'react-icons/fa';
import type { Board } from '../../types';
import { AuthDialog } from '../Auth/AuthDialog';
import { BoardBackgroundLayer } from '../BoardGenerator/BoardBackgroundLayer';
import {
  BOARD_BACKGROUNDS,
  boardBackgroundOrDefault,
  customColorId,
  isCustomColorId,
  isDarkBackground,
  BOARD_LOGO_POSITIONS,
  boardLogoPositionOrDefault,
  type BoardLogoPosition,
  type BoardTitlePosition,
  OWN_IMAGE_BACKGROUND_ID,
  boardImageFileError,
  ownImageBackground,
} from '../../utils/boardBackgrounds';
import { BoardSheetPreview } from './BoardSheetPreview';
import { OwnImagePicker } from './OwnImagePicker';
import './SetBoardBackgroundDialog.css';

interface SetBoardBackgroundDialogProps {
  /** El tablero 1 de la lotería: es el que se muestra en la vista previa. */
  board: Board;
  /** Fondo guardado ahora en la lotería. */
  current: string | undefined;
  /** Posición del logo guardada ahora en la lotería (US A4). */
  currentLogoPosition: string | undefined;
  /** Posición de «TABLERO N» guardada ahora en la lotería (US A4). */
  currentTitlePosition: string | undefined;
  /** Dirección de la imagen propia guardada (US A2); null si no hay. */
  savedImageUrl: string | null;
  /** Si la imagen propia guardada se aclara. */
  currentLighten: boolean;
  /** Guarda lo elegido; devuelve si se pudo. */
  onSave: (look: BoardLookChoice) => Promise<boolean>;
  onClose: () => void;
}

/** Pestañas de M22 (2026-11-21): se ve una a la vez, en computadora y en teléfono. */
type Tab = 'catalog' | 'color' | 'image' | 'header';
const TABS: readonly Tab[] = ['catalog', 'color', 'image', 'header'];

/** La ventana abre en la pestaña del fondo que ya está guardado. */
const tabOf = (background: string | undefined): Tab =>
  background === OWN_IMAGE_BACKGROUND_ID ? 'image' : isCustomColorId(background) ? 'color' : 'catalog';

/** Lo que se guarda al tocar «Guardar» en M22. */
export interface BoardLookChoice {
  /** Un id del catálogo, `color-rrggbb` o 'imagen'. */
  background: string;
  logoPosition: BoardLogoPosition;
  titlePosition: BoardTitlePosition;
  lighten: boolean;
  /** Imagen propia recién escogida, que hay que subir; null si no se escogió otra. */
  file: File | null;
}

interface PositionBarProps {
  label: string;
  value: BoardLogoPosition;
  onChange: (position: BoardLogoPosition) => void;
}

/** Izquierda, centro o derecha, en una sola barra: una para el logo y otra para «TABLERO N» (US A4). */
const PositionBar = ({ label, value, onChange }: PositionBarProps) => {
  const { t } = useTranslation();
  return (
    <div className="board-bg__position">
      <span className="board-bg__position-label">{label}</span>
      <div className="board-bg__segmented" role="radiogroup" aria-label={label}>
        {BOARD_LOGO_POSITIONS.map((position) => (
          <button
            key={position}
            type="button"
            role="radio"
            aria-checked={position === value}
            className={`board-bg__segment${position === value ? ' board-bg__segment--selected' : ''}`}
            onClick={() => onChange(position)}
          >
            {t(`setView.boardBackground.logoPositions.${position}`)}
          </button>
        ))}
      </div>
    </div>
  );
};

interface CustomColorSwatchProps {
  color: string | null;
  isSelected: boolean;
  label: string;
  pickLabel: string;
  onPick: (hex: string) => void;
}

/** «Tu color» (US A5): un cuadrito que abre el selector de color del navegador; cambia mientras se mueve. */
const CustomColorSwatch = ({ color, isSelected, label, pickLabel, onPick }: CustomColorSwatchProps) => (
  <label className={`board-bg__swatch board-bg__swatch--custom${isSelected ? ' board-bg__swatch--selected' : ''}`}>
    <input
      type="color"
      className="board-bg__color-input"
      value={color ?? '#f4ead4'}
      aria-label={pickLabel}
      onChange={(event) => onPick(event.target.value)}
      onClick={(event) => {
        // Sin color elegido todavía, tocar el cuadrito ya lo escoge con el valor de entrada.
        if (!color) onPick(event.currentTarget.value);
      }}
    />
    <span className={`board-bg__sample${color ? '' : ' board-bg__sample--rainbow'}`} style={color ? { background: color } : undefined}>
      {isSelected ? (
        <span className="board-bg__check" aria-hidden="true">
          <FaCheck />
        </span>
      ) : (
        <span className="board-bg__dropper" aria-hidden="true">
          <FaEyeDropper />
        </span>
      )}
    </span>
    <span className="board-bg__name">{label}</span>
  </label>
);

/**
 * «Fondo» de la sección Tableros de U2 (M22, FEAT-67): el tablero 1 tal cual se imprime, que cambia al
 * tocar cada fondo del catálogo. Nada se guarda hasta «Guardar»; cerrar deja el fondo de antes.
 */
export const SetBoardBackgroundDialog = ({
  board,
  current,
  currentLogoPosition,
  currentTitlePosition,
  savedImageUrl,
  currentLighten,
  onSave,
  onClose,
}: SetBoardBackgroundDialogProps) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>(
    current === OWN_IMAGE_BACKGROUND_ID ? OWN_IMAGE_BACKGROUND_ID : boardBackgroundOrDefault(current).id
  );
  // Imagen propia (US A2): la recién escogida se ve desde el navegador y se sube hasta «Guardar».
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<'type' | 'size' | null>(null);
  const [lighten, setLighten] = useState(currentLighten);
  const imageUrl = pendingUrl ?? savedImageUrl;

  useEffect(() => {
    if (!pendingUrl) return;
    return () => URL.revokeObjectURL(pendingUrl);
  }, [pendingUrl]);

  const pickFile = (file: File) => {
    const error = boardImageFileError(file);
    setImageError(error);
    if (error) return;
    setPendingFile(file);
    setPendingUrl(URL.createObjectURL(file));
    setSelected(OWN_IMAGE_BACKGROUND_ID);
  };
  // El color propio (US A5): el guardado, o uno de entrada para cuando se abra el selector por primera vez.
  const [customColor, setCustomColor] = useState<string | null>(
    isCustomColorId(current) ? boardBackgroundOrDefault(current).base : null
  );
  const isCustomSelected = isCustomColorId(selected);
  const [logoPosition, setLogoPosition] = useState<BoardLogoPosition>(boardLogoPositionOrDefault(currentLogoPosition));
  const [titlePosition, setTitlePosition] = useState<BoardTitlePosition>(boardLogoPositionOrDefault(currentTitlePosition));
  const [activeTab, setActiveTab] = useState<Tab>(tabOf(current));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // El mismo objeto mientras no cambie el fondo, para no volver a dibujar la vista previa de más.
  const background = useMemo(
    () => (selected === OWN_IMAGE_BACKGROUND_ID ? ownImageBackground(imageUrl, lighten) : boardBackgroundOrDefault(selected)),
    [selected, imageUrl, lighten]
  );

  const pickCustomColor = (hex: string) => {
    setCustomColor(hex);
    setSelected(customColorId(hex));
  };

  const save = async () => {
    setIsSaving(true);
    setSaveError(false);
    const saved = await onSave({ background: selected, logoPosition, titlePosition, lighten, file: pendingFile });
    setIsSaving(false);
    if (saved) onClose();
    else setSaveError(true);
  };

  return (
    <AuthDialog titleId="board-background-title" onClose={onClose} focusKey="board-background" variant="wide">
      <div className="board-bg__lead">
        <h2 id="board-background-title">{t('setView.boardBackground.title')}</h2>
        <p>{t('setView.boardBackground.lead')}</p>
      </div>

      <div className="board-bg__layout">
        <div className="board-bg__preview">
          <BoardSheetPreview board={board} boardNumber={1} background={background} logoPosition={logoPosition} titlePosition={titlePosition} />
        </div>

        <div className="board-bg__options">
          <div className="board-bg__tabs" role="tablist" aria-label={t('setView.boardBackground.title')}>
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`board-bg-tab-${tab}`}
                aria-selected={tab === activeTab}
                aria-controls={`board-bg-panel-${tab}`}
                className={`board-bg__tab${tab === activeTab ? ' board-bg__tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {t(`setView.boardBackground.tabs.${tab}`)}
              </button>
            ))}
          </div>

          <div className="board-bg__panel" role="tabpanel" id={`board-bg-panel-${activeTab}`} aria-labelledby={`board-bg-tab-${activeTab}`}>
            {activeTab === 'catalog' && (
              <div className="board-bg__swatches" role="radiogroup" aria-label={t('setView.boardBackground.catalog')}>
                {BOARD_BACKGROUNDS.map((option) => {
                  const isSelected = option.id === selected;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`board-bg__swatch${isSelected ? ' board-bg__swatch--selected' : ''}`}
                      onClick={() => setSelected(option.id)}
                    >
                      <span className="board-bg__sample">
                        <BoardBackgroundLayer background={option} className="board-bg__sample-layer" />
                        {isSelected && (
                          <span className="board-bg__check" aria-hidden="true">
                            <FaCheck />
                          </span>
                        )}
                      </span>
                      <span className="board-bg__name">{t(`setView.boardBackground.names.${option.id}`)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'color' && (
              <>
                <CustomColorSwatch
                  color={customColor}
                  isSelected={isCustomSelected}
                  label={t('setView.boardBackground.customColor')}
                  pickLabel={t('setView.boardBackground.customColorPick')}
                  onPick={pickCustomColor}
                />
                <p className="board-bg__hint">{t('setView.boardBackground.customColorHint')}</p>
                {isCustomSelected && isDarkBackground(background) && (
                  <p className="board-bg__warning" role="status">
                    {t('setView.boardBackground.darkWarning')}
                  </p>
                )}
              </>
            )}

            {activeTab === 'image' && (
              <OwnImagePicker
                imageUrl={imageUrl}
                isSelected={selected === OWN_IMAGE_BACKGROUND_ID}
                lighten={lighten}
                error={imageError}
                onSelect={() => setSelected(OWN_IMAGE_BACKGROUND_ID)}
                onFile={pickFile}
                onLightenChange={setLighten}
              />
            )}

            {activeTab === 'header' && (
              <>
                <PositionBar
                  label={t('setView.boardBackground.logo')}
                  value={logoPosition}
                  onChange={setLogoPosition}
                />
                <PositionBar
                  label={t('setView.boardBackground.boardTitle')}
                  value={titlePosition}
                  onChange={setTitlePosition}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="board-bg__footer">
        {saveError && (
          <p className="board-bg__error" role="alert">
            {t('setView.boardBackground.saveError')}
          </p>
        )}
        <div className="board-bg__actions">
          <button type="button" className="set-button set-button--secondary" onClick={onClose} disabled={isSaving}>
            {t('common.cancel')}
          </button>
          <button type="button" className="set-button set-button--primary" onClick={save} disabled={isSaving}>
            {isSaving ? t('setView.boardBackground.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </AuthDialog>
  );
};
