import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

/** Si suben varias seguidas (en lote), se recarga una sola vez. */
const RELOAD_DELAY_MS = 800;

/**
 * Mientras `enabled`, avisa cuando un invitado agrega una carta a la lotería (FEAT-56, US B3; migración 065).
 * Las cartas del propio dueño no avisan: esas ya las pone en pantalla quien las sube.
 */
export const useGuestCardsLive = (setId: string | undefined, enabled: boolean, onGuestCard: () => void): void => {
  const onGuestCardRef = useRef(onGuestCard);
  onGuestCardRef.current = onGuestCard;

  useEffect(() => {
    if (!setId || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`guest-cards-${setId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cards', filter: `set_id=eq.${setId}` },
        (payload) => {
          if (!(payload.new as { uploaded_by?: string | null }).uploaded_by) return;
          clearTimeout(timer);
          timer = setTimeout(() => onGuestCardRef.current(), RELOAD_DELAY_MS);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [setId, enabled]);
};
