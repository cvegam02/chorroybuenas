import { useTranslation } from 'react-i18next';
import { FaSlidersH } from 'react-icons/fa';
import { AuthDialog } from '../Auth/AuthDialog';
import { GridModeSelector } from '../BoardGenerator/GridModeSelector';
import { CardLabelsSelector } from '../CardEditor/CardLabelsSelector';
import type { GridSize } from '../../types';
import type { CardLabels } from '../../utils/cardLabels';
import './SetCardSettingsDialog.css';

interface SetCardSettingsDialogProps {
  gridSize: GridSize;
  /** Con tableros armados, el tipo no se cambia: los tableros son de ese tipo. */
  hasBoards: boolean;
  cardLabels: CardLabels;
  /** No se pudo guardar «Qué se ve en las cartas». */
  labelsError: boolean;
  onGridSizeChange: (size: GridSize) => void;
  onCardLabelsChange: (labels: CardLabels) => void;
  onClose: () => void;
}

/** «Ajustes» de la sección Cartas de U2 (FEAT-57): el tipo de lotería y qué se ve en las cartas. */
export const SetCardSettingsDialog = ({
  gridSize,
  hasBoards,
  cardLabels,
  labelsError,
  onGridSizeChange,
  onCardLabelsChange,
  onClose,
}: SetCardSettingsDialogProps) => {
  const { t } = useTranslation();

  return (
    <AuthDialog titleId="card-settings-title" onClose={onClose} focusKey="settings" variant="even">
      <div className="card-settings__lead">
        <span className="card-settings__badge" aria-hidden="true">
          <FaSlidersH />
        </span>
        <h2 id="card-settings-title">{t('setView.settings.title')}</h2>
      </div>

      <GridModeSelector selectedSize={gridSize} onChange={onGridSizeChange} disabled={hasBoards} />
      {hasBoards && <p className="card-settings__note">{t('setView.settings.gridLocked')}</p>}

      <CardLabelsSelector selected={cardLabels} onChange={onCardLabelsChange} />
      {labelsError && (
        <p className="card-settings__error" role="alert">
          {t('cardEditor.labels.saveError')}
        </p>
      )}

      <button type="button" className="set-button set-button--primary card-settings__done" onClick={onClose}>
        {t('setView.settings.done')}
      </button>
    </AuthDialog>
  );
};
