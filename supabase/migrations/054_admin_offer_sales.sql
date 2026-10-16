-- La oferta en Ventas y en el Resumen (FEAT-49, US A2, decisión 16; contexto-negocio.md §9).
-- Ventas trae el nombre de la oferta de cada compra de tokens y el descuento guardado en la compra (el de
-- ese momento, aunque después se edite la oferta). El Resumen suma lo cobrado con oferta en el periodo.
-- admin_get_sales cambia de columnas: se borra y se vuelve a crear junto con su consulta interna;
-- admin_get_sales_count y admin_get_sales_totals la llaman al correr y no cambian.

drop function if exists public.admin_get_sales(date, date, text, text, text, integer, integer);
drop function if exists public.admin_sales_filtered(date, date, text, text, text);

create function public.admin_sales_filtered(
  p_from date,
  p_to date,
  p_search text,
  p_kind text,
  p_status text
)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  loteria_name text,
  -- Nulo en las temáticas y en las compras de tokens sin pack (cantidad libre).
  pack_id uuid,
  base_tokens integer,
  bonus_tokens integer,
  total_tokens integer,
  amount_cents integer,
  payment_id text,
  payment_status text,
  created_at timestamptz,
  email text,
  full_name text,
  -- La oferta que tuvo una compra de tokens (FEAT-49); nulo sin oferta y en las temáticas.
  offer_name text,
  offer_percent integer
)
language sql
stable
set search_path = public
as $$
  with all_sales as (
    select
      tp.id, tp.user_id, 'tokens'::text as kind, null::text as loteria_name,
      tp.pack_id, tp.base_tokens, tp.bonus_tokens, tp.total_tokens, tp.amount_cents,
      tp.payment_id, tp.payment_status, tp.created_at, o.name as offer_name, tp.offer_percent
    from public.token_purchases tp
    left join public.offers o on o.id = tp.offer_id
    where coalesce(p_kind, '') in ('', 'tokens')
    union all
    select
      sp.id, sp.user_id, 'seasonal'::text, sl.name_es,
      null::uuid, null::integer, null::integer, null::integer, sp.amount_cents,
      sp.payment_id, sp.status, sp.created_at, null::text, null::integer
    from public.seasonal_purchases sp
    join public.seasonal_loterias sl on sl.id = sp.loteria_id
    where coalesce(p_kind, '') in ('', 'seasonal')
  )
  select
    a.id, a.user_id, a.kind, a.loteria_name, a.pack_id, a.base_tokens, a.bonus_tokens, a.total_tokens,
    a.amount_cents, a.payment_id, a.payment_status, a.created_at, pr.email, pr.full_name,
    a.offer_name, a.offer_percent
  from all_sales a
  left join public.profiles pr on pr.id = a.user_id
  where
    a.payment_status is distinct from 'repeated'
    and a.created_at >= p_from::timestamp at time zone 'America/Hermosillo'
    and a.created_at < (p_to + 1)::timestamp at time zone 'America/Hermosillo'
    and (coalesce(p_status, '') = '' or a.payment_status = p_status)
    and (
      coalesce(btrim(p_search), '') = ''
      or pr.email ilike '%' || btrim(p_search) || '%'
      or pr.full_name ilike '%' || btrim(p_search) || '%'
    )
$$;

comment on function public.admin_sales_filtered is
  'Consulta interna de la pestaña Ventas. Solo la llaman las funciones admin_get_sales*, que comprueban permisos.';

create function public.admin_get_sales(
  p_from date,
  p_to date,
  p_search text default null,
  -- 'tokens', 'seasonal', o nulo para las dos.
  p_kind text default null,
  -- 'approved', 'pending', o nulo para todas.
  p_status text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  loteria_name text,
  -- Nulo en las temáticas y en las compras de tokens sin pack (cantidad libre).
  pack_id uuid,
  base_tokens integer,
  bonus_tokens integer,
  total_tokens integer,
  amount_cents integer,
  payment_id text,
  payment_status text,
  created_at timestamptz,
  email text,
  full_name text,
  -- La oferta que tuvo una compra de tokens (FEAT-49); nulo sin oferta y en las temáticas.
  offer_name text,
  offer_percent integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_check_sales_filters(p_from, p_to, p_kind, p_status);
  return query
  select s.*
  from public.admin_sales_filtered(p_from, p_to, p_search, p_kind, p_status) s
  order by s.created_at desc, s.id
  limit least(greatest(coalesce(p_limit, 20), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Lo cobrado con oferta en el periodo (días de Hermosillo): compras de tokens aprobadas con oferta.
create or replace function public.admin_get_offer_sales_total(p_from date, p_to date)
returns table (sales bigint, collected_cents bigint)
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
  select count(*)::bigint, coalesce(sum(tp.amount_cents), 0)::bigint
  from public.token_purchases tp
  where tp.offer_id is not null
    and tp.payment_status = 'approved'
    and tp.created_at >= p_from::timestamp at time zone 'America/Hermosillo'
    and tp.created_at < (p_to + 1)::timestamp at time zone 'America/Hermosillo';
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_sales_filtered(date, date, text, text, text)
  from public, anon, authenticated;

revoke all on function public.admin_get_sales(date, date, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_get_sales(date, date, text, text, text, integer, integer)
  to authenticated, service_role;

revoke all on function public.admin_get_offer_sales_total(date, date)
  from public, anon, authenticated;
grant execute on function public.admin_get_offer_sales_total(date, date)
  to authenticated, service_role;
