import { useEffect, useState } from 'react';
import { TokenPricingRepository } from '../repositories/TokenPricingRepository';

const DEBOUNCE_MS = 400;

/**
 * Porcentaje de bono del código que el usuario está escribiendo, validado en el servidor.
 * Devuelve 0 mientras no haya un código válido (o si `enabled` es false).
 */
export function usePromoCode(code: string, enabled: boolean): number {
  const [percent, setPercent] = useState(0);
  const trimmed = code.trim();

  useEffect(() => {
    if (!trimmed || !enabled) {
      setPercent(0);
      return;
    }
    // Mientras se valida el código nuevo no se muestra el bono del anterior.
    setPercent(0);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await TokenPricingRepository.checkPromoCode(trimmed);
      if (!cancelled) setPercent(result);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, enabled]);

  return percent;
}
