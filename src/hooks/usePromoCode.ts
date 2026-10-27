import { useCallback, useRef, useState } from 'react';
import { TokenPricingRepository } from '../repositories/TokenPricingRepository';
import type { PromoCheck } from '../utils/promoCheck';

export type PromoCodeState = { kind: 'idle' } | { kind: 'checking' } | PromoCheck;

/**
 * El código promocional de Comprar tokens. Se revisa solo al tocar «Aplicar» (o Enter): cada código sin bono cuenta
 * para el límite de 5 por hora (FEAT-58, decisión 3), así que no se revisa mientras se escribe.
 */
export function usePromoCode() {
  const [state, setState] = useState<PromoCodeState>({ kind: 'idle' });
  const requestRef = useRef(0);

  const apply = useCallback(async (code: string) => {
    if (!code.trim()) return;
    const request = ++requestRef.current;
    setState({ kind: 'checking' });
    const result = await TokenPricingRepository.checkPromoCode(code);
    if (request === requestRef.current) setState(result);
  }, []);

  /** Al cambiar el código se quita el bono del anterior hasta volver a aplicarlo. */
  const clear = useCallback(() => {
    requestRef.current += 1;
    setState({ kind: 'idle' });
  }, []);

  return { state, percent: state.kind === 'valid' ? state.percent : 0, apply, clear };
}
