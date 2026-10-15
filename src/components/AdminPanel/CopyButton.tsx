import { useEffect, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

const LABELS: Record<CopyState, string> = { idle: 'Copiar', copied: 'Copiado', failed: 'No se pudo' };

/** Cuánto tiempo se ve «Copiado» antes de volver a «Copiar». */
const RESET_MS = 2000;

interface CopyButtonProps {
  value: string;
  /** Lo que lee el lector de pantalla, p. ej. «Copiar el Payment ID». */
  label: string;
}

/** Botón «Copiar» que avisa si se copió (FEAT-44, US A3). */
export const CopyButton = ({ value, label }: CopyButtonProps) => {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), RESET_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <button type="button" className="admin-copy" onClick={copy} aria-label={label}>
      <span aria-live="polite">{LABELS[state]}</span>
    </button>
  );
};
