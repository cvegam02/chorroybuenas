-- Pestaña Ventas del panel (FEAT-44, US A2): totales que respetan los mismos filtros que la lista.
-- Usa la consulta interna de la 039, así que las repetidas tampoco cuentan aquí. Cobrado y tokens vendidos
-- solo cuentan lo aprobado, igual que los ingresos y los tokens vendidos del Resumen (035 y 036).

create or replace function public.admin_get_sales_totals(
  p_from date,
  p_to date,
  p_search text default null,
  p_kind text default null,
  p_status text default null
)
returns table (
  sales bigint,
  collected_cents bigint,
  pending_count bigint,
  pending_cents bigint,
  tokens_sold bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_check_sales_filters(p_from, p_to, p_kind, p_status);
  return query
  select
    count(*)::bigint,
    coalesce(sum(s.amount_cents) filter (where s.payment_status = 'approved'), 0)::bigint,
    count(*) filter (where s.payment_status = 'pending')::bigint,
    coalesce(sum(s.amount_cents) filter (where s.payment_status = 'pending'), 0)::bigint,
    coalesce(sum(s.total_tokens) filter (where s.payment_status = 'approved'), 0)::bigint
  from public.admin_sales_filtered(p_from, p_to, p_search, p_kind, p_status) s;
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_get_sales_totals(date, date, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_get_sales_totals(date, date, text, text, text)
  to authenticated, service_role;
