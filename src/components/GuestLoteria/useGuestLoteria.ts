import { useCallback, useEffect, useState } from 'react';
import {
  GuestLoteriaRepository,
  type GuestCard,
  type GuestLoteria,
} from '../../repositories/GuestLoteriaRepository';
import type { LoteriaMember } from '../../utils/guestCards';
import { logger } from '../../utils/logger';
import { supabase } from '../../utils/supabaseClient';

/** Si llegan varios avisos seguidos (una transformación, un lote), se recarga una sola vez. */
const RELOAD_DELAY_MS = 800;

export type GuestLoteriaState =
  | { kind: 'loading' }
  | { kind: 'error' }
  /** No existe o ya no es invitado (lo quitaron). */
  | { kind: 'notFound' }
  | {
      kind: 'ready';
      loteria: GuestLoteria;
      cards: GuestCard[];
      members: Map<string, LoteriaMember>;
      canUpload: boolean;
    };

/** Carga la lotería colectiva que ve un invitado (U5, FEAT-56 US B3). `reload` la vuelve a pedir. */
export const useGuestLoteria = (setId: string | undefined, userId: string | undefined) => {
  const [state, setState] = useState<GuestLoteriaState>({ kind: 'loading' });

  const load = useCallback(async (showLoading: boolean) => {
    if (!setId || !userId) return;
    if (showLoading) setState({ kind: 'loading' });
    try {
      const loteria = await GuestLoteriaRepository.getLoteria(setId);
      if (!loteria) {
        setState({ kind: 'notFound' });
        return;
      }
      const [cards, members, canUpload] = await Promise.all([
        GuestLoteriaRepository.getCards(setId),
        GuestLoteriaRepository.getMembers(setId),
        GuestLoteriaRepository.canUpload(setId),
      ]);
      setState({ kind: 'ready', loteria, cards, members, canUpload });
    } catch (err) {
      logger.error('Error loading guest loteria:', err);
      setState({ kind: 'error' });
    }
  }, [setId, userId]);

  useEffect(() => {
    load(true);
  }, [load]);


  // En vivo: lo que cambia el organizador u otro invitado (cartas nuevas, títulos, IA) se ve sin
  // recargar (FEAT-56, US B4, decisión 17; avisos de la migración 065, con las reglas de acceso de `cards`).
  useEffect(() => {
    if (!setId || !userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = () => {
      clearTimeout(timer);
      timer = setTimeout(() => load(false), RELOAD_DELAY_MS);
    };
    const filter = `set_id=eq.${setId}`;
    const channel = supabase
      .channel(`guest-loteria-${setId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cards', filter }, scheduleReload)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cards', filter }, scheduleReload)
      // Los borrados ya no se avisan (FEAT-58, H21): una carta borrada desaparece al recargar o con el siguiente cambio
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [setId, userId, load]);

  /** Vuelve a pedir la lotería sin mostrar la carga (después de subir fotos). */
  const reload = useCallback(() => load(false), [load]);
  const retry = useCallback(() => load(true), [load]);

  return { state, reload, retry };
};
