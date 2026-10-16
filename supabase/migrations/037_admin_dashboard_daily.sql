-- Resumen del panel (FEAT-43, US A4): ingresos aprobados e imágenes de IA por día, para la gráfica.
-- Un renglón por cada día del periodo (también los días en cero), en hora de Hermosillo como la 035.
-- El periodo se limita a 367 días para no generar series sin fin.

create or replace function public.admin_get_dashboard_daily(
  p_from date,
  p_to date
)
returns table (
  day date,
  revenue_cents bigint,
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
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 366 then
    raise exception 'Invalid period';
  end if;

  v_start := p_from::timestamp at time zone 'America/Hermosillo';
  v_end := (p_to + 1)::timestamp at time zone 'America/Hermosillo';

  return query
  with
  revenue as (
    select (tp.created_at at time zone 'America/Hermosillo')::date as d, tp.amount_cents as cents
      from public.token_purchases tp
     where tp.payment_status = 'approved' and tp.created_at >= v_start and tp.created_at < v_end
    union all
    select (sp.created_at at time zone 'America/Hermosillo')::date, sp.amount_cents
      from public.seasonal_purchases sp
     where sp.status = 'approved' and sp.created_at >= v_start and sp.created_at < v_end
  ),
  usage as (
    select (tu.created_at at time zone 'America/Hermosillo')::date as d, tu.amount
      from public.token_usage tu
     where tu.created_at >= v_start and tu.created_at < v_end
  )
  select
    days.d::date,
    coalesce((select sum(r.cents) from revenue r where r.d = days.d::date), 0)::bigint,
    coalesce((select sum(u.amount) from usage u where u.d = days.d::date), 0)::bigint
  from generate_series(p_from, p_to, interval '1 day') as days(d)
  order by 1;
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_get_dashboard_daily(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_dashboard_daily(date, date) to authenticated, service_role;
