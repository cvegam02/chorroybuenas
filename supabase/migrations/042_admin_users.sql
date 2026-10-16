-- Pestaña Usuarios del panel (FEAT-45, US A1): reemplaza la tabla de Balances (tope de 200 cuentas).
-- Una consulta interna sobre todas las cuentas de auth.users (profiles no tiene fecha de alta), con buscador
-- por nombre o correo y filtros rápidos, que usan la lista y el conteo. Por cada cuenta: saldo, lo pagado en
-- compras aprobadas (tokens y temáticas) y la última actividad (compra, uso de IA, regalo o registro).
-- Los avisos repetidos de Mercado Pago no cuentan ni como compra ni como actividad.
-- Las funciones de Balances (012 a 014) se conservan para el sitio ya publicado.

create or replace function public.admin_users_filtered(
  p_search text,
  p_filter text
)
returns table (
  user_id uuid,
  email text,
  -- Nulo si la cuenta no tiene nombre.
  full_name text,
  created_at timestamptz,
  balance integer,
  paid_cents bigint,
  last_activity_at timestamptz
)
language sql
stable
set search_path = public
as $$
  with accounts as (
    select
      u.id as user_id,
      coalesce(nullif(btrim(pr.email), ''), u.email) as email,
      nullif(btrim(pr.full_name), '') as full_name,
      u.created_at,
      coalesce(ut.balance, 0) as balance,
      coalesce(tp.paid, 0) + coalesce(sp.paid, 0) as paid_cents,
      greatest(u.created_at, tp.last_at, sp.last_at, tu.last_at, tg.last_at) as last_activity_at
    from auth.users u
    left join public.profiles pr on pr.id = u.id
    left join public.user_tokens ut on ut.user_id = u.id
    left join lateral (
      select
        sum(t.amount_cents) filter (where t.payment_status = 'approved')::bigint as paid,
        max(t.created_at) as last_at
      from public.token_purchases t
      where t.user_id = u.id
    ) tp on true
    left join lateral (
      select
        sum(s.amount_cents) filter (where s.status = 'approved')::bigint as paid,
        max(s.created_at) as last_at
      from public.seasonal_purchases s
      where s.user_id = u.id and s.status <> 'repeated'
    ) sp on true
    left join lateral (
      select max(x.created_at) as last_at from public.token_usage x where x.user_id = u.id
    ) tu on true
    left join lateral (
      select max(g.created_at) as last_at from public.token_gifts g where g.recipient_id = u.id
    ) tg on true
  )
  select a.user_id, a.email, a.full_name, a.created_at, a.balance, a.paid_cents, a.last_activity_at
  from accounts a
  where
    (
      coalesce(btrim(p_search), '') = ''
      or a.email ilike '%' || btrim(p_search) || '%'
      or a.full_name ilike '%' || btrim(p_search) || '%'
    )
    and case coalesce(p_filter, '')
      when 'new_this_month' then
        a.created_at >= date_trunc('month', now() at time zone 'America/Hermosillo') at time zone 'America/Hermosillo'
      when 'buyers' then a.paid_cents > 0
      when 'never_bought' then a.paid_cents = 0
      else true
    end
$$;

comment on function public.admin_users_filtered is
  'Consulta interna de la pestaña Usuarios. Solo la llaman las funciones admin_get_users*, que comprueban permisos.';

-- Comprueba quién llama y los filtros; lanza un error si algo no vale.
create or replace function public.admin_check_users_filters(
  p_filter text,
  p_sort text
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
  if coalesce(p_filter, '') not in ('', 'new_this_month', 'buyers', 'never_bought') then
    raise exception 'Invalid user filter';
  end if;
  if coalesce(p_sort, '') not in ('', 'recent', 'activity', 'paid', 'balance') then
    raise exception 'Invalid user sort';
  end if;
end;
$$;

create or replace function public.admin_get_users(
  p_search text default null,
  -- 'new_this_month', 'buyers', 'never_bought', o nulo para todas.
  p_filter text default null,
  -- 'recent' (alta), 'activity', 'paid', 'balance'; nulo es 'recent'.
  p_sort text default 'recent',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  user_id uuid,
  email text,
  -- Nulo si la cuenta no tiene nombre.
  full_name text,
  created_at timestamptz,
  balance integer,
  paid_cents bigint,
  last_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_check_users_filters(p_filter, p_sort);
  return query
  select f.*
  from public.admin_users_filtered(p_search, p_filter) f
  order by
    case p_sort when 'activity' then f.last_activity_at end desc nulls last,
    case p_sort when 'paid' then f.paid_cents end desc nulls last,
    case p_sort when 'balance' then f.balance end desc nulls last,
    f.created_at desc,
    f.user_id
  limit least(greatest(coalesce(p_limit, 20), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_get_users_count(
  p_search text default null,
  p_filter text default null
)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_check_users_filters(p_filter, null);
  return (select count(*)::bigint from public.admin_users_filtered(p_search, p_filter));
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
-- La consulta interna y la comprobación solo las usan las funciones de arriba (que corren como su dueño).
revoke all on function public.admin_users_filtered(text, text)
  from public, anon, authenticated;
revoke all on function public.admin_check_users_filters(text, text)
  from public, anon, authenticated;

revoke all on function public.admin_get_users(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_get_users(text, text, text, integer, integer)
  to authenticated, service_role;

revoke all on function public.admin_get_users_count(text, text)
  from public, anon, authenticated;
grant execute on function public.admin_get_users_count(text, text)
  to authenticated, service_role;
