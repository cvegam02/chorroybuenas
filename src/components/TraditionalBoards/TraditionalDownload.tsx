import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFilePdf } from 'react-icons/fa';
import type { GridSize } from '../../types';
import { UploadProgressModal } from '../CardEditor/UploadProgressModal';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { useTraditionalPdf } from '../../hooks/useTraditionalPdf';
import { incompleteBoardNumbers, type TraditionalBoard } from '../../utils/traditionalBoards';

interface TraditionalDownloadProps {
  boards: readonly TraditionalBoard[];
  gridSize: GridSize;
  /** Nombre del juego guardado: título y nombre del archivo. Sin él, «Mis tableros». */
  name?: string;
  /** «Llenar al azar las vacías»: llena las casillas vacías sin mover lo ya puesto. */
  onFillEmpty: () => void;
}

/**
 * «Descargar PDF» de «Arma tus tableros» (FEAT-53, US A4). Con casillas vacías no se descarga: se avisa en qué
 * tableros y se ofrece llenarlas al azar (decisión 8). Después de llenarlas, la persona las ve y vuelve a pulsar.
 */
export const TraditionalDownload = ({ boards, gridSize, name, onFillEmpty }: TraditionalDownloadProps) => {
  const { t } = useTranslation();
  const { download, isBuilding, error, clearError } = useTraditionalPdf();
  const [incomplete, setIncomplete] = useState<number[]>([]);

  const handleClick = () => {
    const missing = incompleteBoardNumbers(boards);
    if (missing.length > 0) setIncomplete(missing);
    else void download(boards, gridSize, name);
  };

  return (
    <>
      <button
        type="button"
        className="traditional-boards__primary"
        onClick={handleClick}
        disabled={boards.length === 0 || isBuilding}
      >
        <FaFilePdf aria-hidden="true" /> {t('traditional.download.button')}
      </button>

      <WarningModal
        isOpen={incomplete.length > 0}
        title={t('traditional.download.incompleteTitle', { count: incomplete.length })}
        message={t('traditional.download.incompleteMessage', { count: incomplete.length, boards: incomplete.join(', ') })}
        confirmText={t('traditional.download.fill')}
        cancelText={t('traditional.download.fillMyself')}
        onConfirm={() => {
          onFillEmpty();
          setIncomplete([]);
        }}
        onCancel={() => setIncomplete([])}
      />

      <UploadProgressModal isOpen={isBuilding} progress={-1} title={t('traditional.download.preparing')} />

      <WarningModal
        isOpen={error !== null}
        title={t('traditional.download.errorTitle')}
        message={error ?? ''}
        confirmText={t('common.close')}
        onConfirm={clearError}
        onCancel={clearError}
        type="danger"
        singleButton
      />
    </>
  );
};
