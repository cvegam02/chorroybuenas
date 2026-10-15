-- Resumen del panel de administración (FEAT-43, US A1): el dinero de un periodo en una sola llamada.
-- Los días se cortan en hora de Hermosillo (UTC-7 todo el año), la de Carlos. Uso de IA pasa a
-- agrupar por día en la misma hora para que sus números coincidan con el Resumen.

-- Periodo en días locales, ambos incluidos. Devuelve centavos y número de imágenes de IA;
-- el costo en pesos lo calcula el panel con el mismo costo por imagen y tipo de cambio que Uso de IA.
create or replace function public.admin_get_dashboard_summary(
  p_from date,
  p_to date
)
returns table (
  tokens_revenue_cents bigint,
  seasonal_revenue_cents bigint,
  ai_images bigint
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
    (select coalesce(sum(tp.amount_cents), 0)::bigint
       from public.token_purchases tp
      where tp.payment_status = 'approved' and tp.created_at >= v_start and tp.created_at < v_end),
    (select coalesce(sum(sp.amount_cents), 0)::bigint
       from public.seasonal_purchases sp
      where sp.status = 'approved' and sp.created_at >= v_start and sp.created_at < v_end),
    (select coalesce(sum(tu.amount), 0)::bigint
       from public.token_usage tu
      where tu.created_at >= v_start and tu.created_at < v_end);
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_get_dashboard_summary(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_dashboard_summary(date, date) to authenticated, service_role;

-- Uso de IA: el mismo cuerpo que en 018, con el día en hora de Hermosillo en lugar de UTC.
create or replace function public.admin_get_usage_by_day(
  p_days int default 30,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
)
returns table (
  day date,
  tokens bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  return query
  select
    (tu.created_at at time zone 'America/Hermosillo')::date as day,
    sum(tu.amount)::bigint as tokens
  from public.token_usage tu
  where
    (p_date_from is null or tu.created_at >= p_date_from)
    and (p_date_to is null or tu.created_at <= p_date_to)
    and (p_date_from is not null or p_date_to is not null or tu.created_at >= (now() - (p_days || ' days')::interval))
  group by (tu.created_at at time zone 'America/Hermosillo')::date
  order by day asc;
end;
$$;
