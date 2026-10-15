-- Resumen del panel (FEAT-43, US A5): lo que requiere atención del administrador.
-- Pagos pendientes: los que siguen esperando a Mercado Pago, sin importar el periodo. Solo los de loterías
-- temáticas se guardan mientras esperan; los de tokens no existen en la base hasta confirmarse (decidido
-- con Carlos el 2026-10-15). Tokens regalados: los del periodo, en hora de Hermosillo como la 035.

create or replace function public.admin_get_dashboard_pending(
  p_from date,
  p_to date
)
returns table (
  pending_payments bigint,
  oldest_pending_at timestamptz,
  gifted_tokens bigint,
  gift_recipients bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid period';
  end if;

  v_start := p_from::timestamp at time zone 'America/Hermosillo';
  v_end := (p_to + 1)::timestamp at time zone 'America/Hermosillo';

  return query
  select
    (select count(*)::bigint from public.seasonal_purchases sp where sp.status = 'pending'),
    (select min(sp.created_at) from public.seasonal_purchases sp where sp.status = 'pending'),
    (select coalesce(sum(g.amount), 0)::bigint from public.token_gifts g
      where g.created_at >= v_start and g.created_at < v_end),
    (select count(distinct g.recipient_id)::bigint from public.token_gifts g
      where g.created_at >= v_start and g.created_at < v_end);
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_get_dashboard_pending(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_dashboard_pending(date, date) to authenticated, service_role;
