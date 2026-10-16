-- Resumen del panel (FEAT-43, US A2): a la función de la 035 se suman gente y ventas del periodo.
-- Cambia lo que devuelve, así que se borra y se crea de nuevo. Todo en hora de Hermosillo, como en la 035.

drop function if exists public.admin_get_dashboard_summary(date, date);

create function public.admin_get_dashboard_summary(
  p_from date,
  p_to date
)
returns table (
  tokens_revenue_cents bigint,
  seasonal_revenue_cents bigint,
  ai_images bigint,
  -- Cuentas creadas en el periodo (fecha de alta de auth.users; profiles no la tiene).
  new_users bigint,
  -- Personas con al menos una compra aprobada; por primera vez: sin compras aprobadas antes del periodo.
  buyers bigint,
  first_time_buyers bigint,
  ai_users bigint,
  token_purchases bigint,
  tokens_sold bigint,
  seasonal_sales bigint,
  -- Lo más vendido; nulo si no hubo ventas. Los packs no tienen nombre: se identifican por sus tokens base.
  top_pack_tokens integer,
  top_pack_sales bigint,
  top_loteria_name text,
  top_loteria_sales bigint
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
  with
  approved as (
    select tp.user_id, tp.created_at from public.token_purchases tp where tp.payment_status = 'approved'
    union all
    select sp.user_id, sp.created_at from public.seasonal_purchases sp where sp.status = 'approved'
  ),
  period_buyers as (
    select distinct a.user_id from approved a
     where a.user_id is not null and a.created_at >= v_start and a.created_at < v_end
  ),
  period_tokens as (
    select tp.base_tokens, tp.total_tokens, tp.amount_cents from public.token_purchases tp
     where tp.payment_status = 'approved' and tp.created_at >= v_start and tp.created_at < v_end
  ),
  period_seasonal as (
    select sp.loteria_id, sp.amount_cents from public.seasonal_purchases sp
     where sp.status = 'approved' and sp.created_at >= v_start and sp.created_at < v_end
  ),
  top_pack as (
    select pt.base_tokens, count(*)::bigint as sales from period_tokens pt
     group by pt.base_tokens order by sales desc, pt.base_tokens limit 1
  ),
  top_loteria as (
    select sl.name_es::text as name, count(*)::bigint as sales
      from period_seasonal ps join public.seasonal_loterias sl on sl.id = ps.loteria_id
     group by sl.id, sl.name_es order by sales desc, sl.name_es limit 1
  )
  select
    (select coalesce(sum(pt.amount_cents), 0)::bigint from period_tokens pt),
    (select coalesce(sum(ps.amount_cents), 0)::bigint from period_seasonal ps),
    (select coalesce(sum(tu.amount), 0)::bigint from public.token_usage tu
      where tu.created_at >= v_start and tu.created_at < v_end),
    (select count(*)::bigint from auth.users u where u.created_at >= v_start and u.created_at < v_end),
    (select count(*)::bigint from period_buyers),
    (select count(*)::bigint from period_buyers pb
      where not exists (select 1 from approved a where a.user_id = pb.user_id and a.created_at < v_start)),
    (select count(distinct tu.user_id)::bigint from public.token_usage tu
      where tu.created_at >= v_start and tu.created_at < v_end),
    (select count(*)::bigint from period_tokens),
    (select coalesce(sum(pt.total_tokens), 0)::bigint from period_tokens pt),
    (select count(*)::bigint from period_seasonal),
    (select tpk.base_tokens from top_pack tpk),
    (select coalesce((select tpk.sales from top_pack tpk), 0)),
    (select tl.name from top_loteria tl),
    (select coalesce((select tl.sales from top_loteria tl), 0));
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_get_dashboard_summary(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_dashboard_summary(date, date) to authenticated, service_role;
