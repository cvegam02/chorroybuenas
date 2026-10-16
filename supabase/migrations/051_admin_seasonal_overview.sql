-- Pantalla Temáticas (FEAT-48, US A1).
-- 1. Ventas e ingresos de cada lotería temática, para sus tarjetas, y lo vendido en un periodo (en hora de
--    Hermosillo, como el Resumen) para el encabezado. Solo las compras aprobadas son ventas e ingresos;
--    has_purchases dice si tiene cualquier compra registrada, que es lo que impide borrarla (migración 031).
-- 2. Cambiar el orden de todas las temáticas de una vez, al arrastrarlas.

create or replace function public.admin_get_seasonal_sales(p_from date, p_to date)
returns table (
  loteria_id uuid,
  approved_sales bigint,
  revenue_cents bigint,
  period_revenue_cents bigint,
  has_purchases boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid period';
  end if;

  return query
  select
    l.id,
    count(sp.id) filter (where sp.status = 'approved'),
    coalesce(sum(sp.amount_cents) filter (where sp.status = 'approved'), 0)::bigint,
    coalesce(sum(sp.amount_cents) filter (
      where sp.status = 'approved'
        and sp.created_at >= p_from::timestamp at time zone 'America/Hermosillo'
        and sp.created_at < (p_to + 1)::timestamp at time zone 'America/Hermosillo'
    ), 0)::bigint,
    count(sp.id) > 0
  from public.seasonal_loterias l
  left join public.seasonal_purchases sp on sp.loteria_id = l.id
  group by l.id;
end;
$$;

comment on function public.admin_get_seasonal_sales(date, date) is
  'FEAT-48: por lotería temática, ventas e ingresos aprobados de siempre, ingresos del periodo (hora de Hermosillo) y si tiene compras.';

revoke all on function public.admin_get_seasonal_sales(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_seasonal_sales(date, date) to authenticated, service_role;

-- Recibe todas las temáticas, cada una una vez, en el orden nuevo; si no, no cambia nada.
create or replace function public.admin_set_season_order(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_ids is null
     or cardinality(p_ids) <> (select count(*) from public.seasons)
     or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) as t(id))
     or exists (select 1 from unnest(p_ids) as t(id) where not exists (select 1 from public.seasons s where s.id = t.id))
  then
    raise exception 'Invalid order';
  end if;

  update public.seasons s
  set sort_order = o.position - 1
  from unnest(p_ids) with ordinality as o(id, position)
  where s.id = o.id;
end;
$$;

comment on function public.admin_set_season_order(uuid[]) is
  'FEAT-48: pone el orden del catálogo a todas las temáticas de una vez; exige todas, sin repetir.';

revoke all on function public.admin_set_season_order(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_set_season_order(uuid[]) to authenticated, service_role;
