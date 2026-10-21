import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadSetPdf } from '../services/setPdf';
import { logger } from '../utils/logger';
import { pdfErrorMessage } from '../utils/pdfErrorMessage';
import type { CardLabels } from '../utils/cardLabels';

/** La lotería a descargar, con lo que se ve en sus cartas (FEAT-51). */
type DownloadableSet = { id: string; name: string; card_labels?: CardLabels };

interface SetPdfDownload {
  /** La lotería cuyo PDF se está armando; null si no hay ninguno en curso. */
  downloadingSet: { id: string; name: string } | null;
  /** Aviso para el usuario si el último PDF no se pudo armar. */
  error: string | null;
  download: (set: DownloadableSet) => Promise<void>;
  dismissError: () => void;
}

/** Descarga del PDF de una lotería desde Mi cuenta, de una en una. */
export const useSetPdfDownload = (userId: string | undefined): SetPdfDownload => {
  const { t } = useTranslation();
  const [downloadingSet, setDownloadingSet] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isBusy = useRef(false);

  const download = useCallback(
    async (set: DownloadableSet) => {
      if (!userId || isBusy.current) return;
      isBusy.current = true;
      setError(null);
      setDownloadingSet({ id: set.id, name: set.name });
      try {
        await downloadSetPdf(userId, set);
      } catch (err) {
        logger.error('Error generating PDF from dashboard:', err);
        setError(pdfErrorMessage(err, t));
      } finally {
        isBusy.current = false;
        setDownloadingSet(null);
      }
    },
    [userId, t],
  );

  const dismissError = useCallback(() => setError(null), []);

  return { downloadingSet, error, download, dismissError };
};
