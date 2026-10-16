-- Pestaña Ventas del panel (FEAT-44, US A1): junta Compras y Transacciones MP.
-- Una sola consulta interna con los filtros (periodo en hora de Hermosillo, buscador por nombre o correo,
-- tipo y estado), que usan la lista y el conteo, y después los totales (US A2). Las ventas «repetidas»
-- (segundo aviso de Mercado Pago por la misma temática) nunca aparecen. Rechazadas y devueltas no se
-- filtran porque hoy no se guardan (decidido con Carlos el 2026-10-15).
-- Las funciones de la 034 se conservan para el sitio ya publicado.

create or replace function public.admin_sales_filtered(
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
  full_name text
)
language sql
stable
set search_path = public
as $$
  with all_sales as (
    select
      tp.id, tp.user_id, 'tokens'::text as kind, null::text as loteria_name,
      tp.pack_id, tp.base_tokens, tp.bonus_tokens, tp.total_tokens, tp.amount_cents,
      tp.payment_id, tp.payment_status, tp.created_at
    from public.token_purchases tp
    where coalesce(p_kind, '') in ('', 'tokens')
    union all
    select
      sp.id, sp.user_id, 'seasonal'::text, sl.name_es,
      null::uuid, null::integer, null::integer, null::integer, sp.amount_cents,
      sp.payment_id, sp.status, sp.created_at
    from public.seasonal_purchases sp
    join public.seasonal_loterias sl on sl.id = sp.loteria_id
    where coalesce(p_kind, '') in ('', 'seasonal')
  )
  select
    a.id, a.user_id, a.kind, a.loteria_name, a.pack_id, a.base_tokens, a.bonus_tokens, a.total_tokens,
    a.amount_cents, a.payment_id, a.payment_status, a.created_at, pr.email, pr.full_name
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

-- Comprueba quién llama y los filtros; lanza un error si algo no vale.
create or replace function public.admin_check_sales_filters(
  p_from date,
  p_to date,
  p_kind text,
  p_status text
)
returns void
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
  if coalesce(p_kind, '') not in ('', 'tokens', 'seasonal') then
    raise exception 'Invalid sale kind';
  end if;
  if coalesce(p_status, '') not in ('', 'approved', 'pending') then
    raise exception 'Invalid sale status';
  end if;
end;
$$;

create or replace function public.admin_get_sales(
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
  full_name text
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

create or replace function public.admin_get_sales_count(
  p_from date,
  p_to date,
  p_search text default null,
  p_kind text default null,
  p_status text default null
)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_check_sales_filters(p_from, p_to, p_kind, p_status);
  return (select count(*)::bigint from public.admin_sales_filtered(p_from, p_to, p_search, p_kind, p_status));
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
-- La consulta interna y la comprobación solo las usan las funciones de arriba (que corren como su dueño).
revoke all on function public.admin_sales_filtered(date, date, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_check_sales_filters(date, date, text, text)
  from public, anon, authenticated;

revoke all on function public.admin_get_sales(date, date, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_get_sales(date, date, text, text, text, integer, integer)
  to authenticated, service_role;

revoke all on function public.admin_get_sales_count(date, date, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_get_sales_count(date, date, text, text, text)
  to authenticated, service_role;
