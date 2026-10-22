import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GridSize } from '../types';
import { downloadPDF, generatePDF, pdfFileName } from '../services/PDFService';
import { logger } from '../utils/logger';
import { pdfErrorMessage } from '../utils/pdfErrorMessage';
import { traditionalPdfBoards, type TraditionalBoard } from '../utils/traditionalBoards';

/**
 * Arma y descarga el PDF de «Arma tus tableros» (FEAT-53, US A4): solo los tableros, sin la baraja para
 * recortar (decisión 9). Las cartas ya traen su nombre dibujado, así que van enteras.
 */
export function useTraditionalPdf() {
  const { t } = useTranslation();
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(
    async (boards: readonly TraditionalBoard[], gridSize: GridSize, name?: string) => {
      setIsBuilding(true);
      setError(null);
      try {
        const title = name?.trim() || t('traditional.pdfTitle');
        const pdfBoards = traditionalPdfBoards(boards, gridSize, window.location.origin);
        const blob = await generatePDF(pdfBoards, { allCards: [], finishedCards: true, includeDeck: false, title });
        downloadPDF(blob, pdfFileName(title));
      } catch (buildError) {
        logger.error('[useTraditionalPdf] No se pudo armar el PDF:', buildError);
        setError(pdfErrorMessage(buildError, t));
      } finally {
        setIsBuilding(false);
      }
    },
    [t],
  );

  return { download, isBuilding, error, clearError: () => setError(null) };
}
