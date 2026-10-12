import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSetContext } from '../contexts/SetContext';
import { SyncService } from '../services/SyncService';
import { keepsOwnDestination } from '../services/visitorTransfer';
import { hasLocalCards, saveCurrentSetId } from '../utils/storage';
import { logger } from '../utils/logger';

/** En la misma pestaña no se reintenta solo un traspaso que falló: al recargar repetiría el aviso. */
const TRIED_PREFIX = 'loteria_transfer_tried_';

const wasTriedInThisTab = (userId: string): boolean => {
  try {
    return sessionStorage.getItem(`${TRIED_PREFIX}${userId}`) !== null;
  } catch {
    return false;
  }
};

const setTriedInThisTab = (userId: string, tried: boolean): void => {
  try {
    if (tried) sessionStorage.setItem(`${TRIED_PREFIX}${userId}`, '1');
    else sessionStorage.removeItem(`${TRIED_PREFIX}${userId}`);
  } catch (error) {
    logger.warn('Could not remember the transfer attempt:', error);
  }
};

interface VisitorTransferState {
  isSaving: boolean;
  /** 0 a 100. */
  progress: number;
}

/**
 * Al haber sesión, pasa a la cuenta la lotería hecha sin sesión en este navegador y lleva a su página (FEAT-41).
 * En las páginas con regreso propio (Comprar tokens, temáticas) la guarda por detrás, sin cambiar de página.
 */
export const useVisitorTransfer = (): VisitorTransferState => {
  const { user, isLoading, recoverySession } = useAuth();
  const { refreshSets } = useSetContext();
  const { t } = useTranslation();
  const [progress, setProgress] = useState<number | null>(null);
  const isRunningRef = useRef(false);
  const userId = user?.id;
  const isRecovering = recoverySession !== null;

  useEffect(() => {
    if (isLoading || !userId || isRecovering || isRunningRef.current) return;
    if (!hasLocalCards() || wasTriedInThisTab(userId)) return;

    isRunningRef.current = true;
    const quiet = keepsOwnDestination(window.location.pathname);
    let isLeaving = false;
    if (!quiet) setProgress(0);

    SyncService.syncLocalDataToCloud(userId, {
      newSetName: (existingSets) => `${t('navbar.newLoteriaName')} ${existingSets + 1}`,
      onProgress: (done, total) => {
        if (!quiet) setProgress((done / total) * 100);
      },
    })
      .then(async (result) => {
        if (!result) return;
        setTriedInThisTab(userId, result.cardsFailed > 0);
        if (result.cardsMigrated === 0) {
          if (!quiet) alert(t('visitorTransfer.failed'));
          return;
        }
        if (quiet) {
          await refreshSets();
          return;
        }
        if (result.cardsFailed > 0) alert(t('visitorTransfer.partial', { count: result.cardsFailed }));
        saveCurrentSetId(userId, result.setId);
        isLeaving = true;
        // Se recarga en la lotería, como «Terminar»: suelta lo que quedó en memoria del trabajo sin sesión.
        window.location.replace(`/loteria/${result.setId}`);
      })
      .catch((error: unknown) => {
        logger.error('Error passing the visitor work to the account:', error);
        setTriedInThisTab(userId, true);
        if (!quiet) alert(t('visitorTransfer.failed'));
      })
      .finally(() => {
        isRunningRef.current = false;
        if (!isLeaving) setProgress(null);
      });
  }, [isLoading, userId, isRecovering, refreshSets, t]);

  return { isSaving: progress !== null, progress: progress ?? 0 };
};
