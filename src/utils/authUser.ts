import type { AuthChangeEvent, User } from '@supabase/supabase-js';

/**
 * El usuario que queda tras un aviso de sesión. Al solo renovarse el permiso (lo hace la IA antes de cada
 * transformación y Supabase cada hora) se conserva el mismo: si cambiara, las pantallas que dependen del
 * usuario volverían a cargar todo (FEAT-61, US A2).
 */
export const nextAuthUser = (prev: User | null, next: User | null, event: AuthChangeEvent): User | null =>
  event === 'TOKEN_REFRESHED' && prev !== null && next !== null && prev.id === next.id ? prev : next;
