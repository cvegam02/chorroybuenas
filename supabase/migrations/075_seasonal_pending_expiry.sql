-- Pagos pendientes de temáticas que caducan (FEAT-58, US A11; H9), decisión 5: un pago en efectivo o transferencia
-- que sigue «pendiente» sin aviso de Mercado Pago deja de bloquear una nueva compra a los 3 días (lo que suele
-- durar una ficha en efectivo). Si después se aprueba, se entrega como cualquier aviso; si la cuenta ya tenía la
-- lotería, ese pago queda para devolverse a mano (§18).

-- Lo llama create-seasonal-preference antes de revisar si hay un pago en proceso. Devuelve cuántos liberó.
create or replace function public.release_stale_seasonal_pending(p_user_id uuid, p_loteria_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released integer;
begin
  delete from public.seasonal_purchases
  where user_id = p_user_id and loteria_id = p_loteria_id and status = 'pending'
    and created_at < now() - interval '3 days';
  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

comment on function public.release_stale_seasonal_pending is
  'FEAT-58: libera los pagos pendientes de una temática con más de 3 días sin aviso. Solo service_role.';

revoke all on function public.release_stale_seasonal_pending(uuid, uuid) from public, anon, authenticated;
grant execute on function public.release_stale_seasonal_pending(uuid, uuid) to service_role;
