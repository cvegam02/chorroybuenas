import { useEffect, useRef } from 'react';

/** Llama a `onEscape` al pulsar Escape mientras `enabled` sea verdadero: para cerrar ventanas con el teclado. */
export const useEscapeKey = (onEscape: () => void, enabled: boolean = true): void => {
  const handlerRef = useRef(onEscape);
  handlerRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handlerRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
};
