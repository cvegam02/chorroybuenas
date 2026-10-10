import { useEffect, useState } from 'react';
import { AppConfigRepository } from '../repositories/AppConfigRepository';
import { logger } from '../utils/logger';

/**
 * Tokens de regalo que recibe una cuenta nueva, o null mientras no se sepan. Null también si son 0
 * o no se pudieron leer: en ese caso las páginas no prometen ningún regalo.
 */
export const useWelcomeTokens = (): number | null => {
  const [tokens, setTokens] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    AppConfigRepository.getInitialTokens()
      .then((amount) => {
        if (!cancelled && amount > 0) setTokens(amount);
      })
      .catch((error: unknown) => logger.warn('useWelcomeTokens:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  return tokens;
};
