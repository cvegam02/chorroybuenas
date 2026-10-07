-- Lista de compras del panel con los dos tipos de venta (FEAT-17, US C4): tokens y loterías de
-- temporada, mezcladas por fecha y con filtro por tipo. Son funciones nuevas: las anteriores
-- (admin_get_purchases_with_users y admin_get_purchases_count) se conservan para el sitio ya publicado.

create or replace function public.admin_get_all_purchases(
  p_limit int default 50,
  p_offset int default 0,
  p_email text default null,
  p_status text default null,
  p_provider text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  -- 'tokens', 'seasonal', o nulo para los dos.
  p_kind text default null
)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  -- Solo en las compras de temporada.
  loteria_name text,
  -- Solo en las compras de tokens.
  pack_id uuid,
  base_tokens integer,
  bonus_tokens integer,
  total_tokens integer,
  amount_cents integer,
  payment_provider text,
  payment_status text,
  created_at timestamptz,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_kind is not null and p_kind not in ('', 'tokens', 'seasonal') then
    raise exception 'Invalid purchase kind';
  end if;
  return query
  with all_purchases as (
    select
      tp.id, tp.user_id, 'tokens'::text as kind, null::text as loteria_name,
      tp.pack_id, tp.base_tokens, tp.bonus_tokens, tp.total_tokens, tp.amount_cents,
      tp.payment_provider, tp.payment_status, tp.created_at
    from public.token_purchases tp
    where p_kind is null or p_kind = '' or p_kind = 'tokens'
    union all
    select
      sp.id, sp.user_id, 'seasonal'::text, sl.name_es,
      null::uuid, null::integer, null::integer, null::integer, sp.amount_cents,
      sp.payment_provider, sp.status, sp.created_at
    from public.seasonal_purchases sp
    join public.seasonal_loterias sl on sl.id = sp.loteria_id
    where p_kind is null or p_kind = '' or p_kind = 'seasonal'
  )
  select
    a.id, a.user_id, a.kind, a.loteria_name, a.pack_id, a.base_tokens, a.bonus_tokens, a.total_tokens,
    a.amount_cents, a.payment_provider, a.payment_status, a.created_at, pr.email, pr.full_name
  from all_purchases a
  left join public.profiles pr on pr.id = a.user_id
  where
    (p_email is null or p_email = '' or pr.email ilike '%' || p_email || '%')
    and (p_status is null or p_status = '' or a.payment_status = p_status)
    and (p_provider is null or p_provider = '' or a.payment_provider = p_provider)
    and (p_date_from is null or a.created_at >= p_date_from)
    and (p_date_to is null or a.created_at <= p_date_to)
  order by a.created_at desc, a.id
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.admin_get_all_purchases_count(
  p_email text default null,
  p_status text default null,
  p_provider text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_kind text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_kind is not null and p_kind not in ('', 'tokens', 'seasonal') then
    raise exception 'Invalid purchase kind';
  end if;
  with all_purchases as (
    select
      tp.id, tp.user_id, 'tokens'::text as kind, null::text as loteria_name,
      tp.pack_id, tp.base_tokens, tp.bonus_tokens, tp.total_tokens, tp.amount_cents,
      tp.payment_provider, tp.payment_status, tp.created_at
    from public.token_purchases tp
    where p_kind is null or p_kind = '' or p_kind = 'tokens'
    union all
    select
      sp.id, sp.user_id, 'seasonal'::text, sl.name_es,
      null::uuid, null::integer, null::integer, null::integer, sp.amount_cents,
      sp.payment_provider, sp.status, sp.created_at
    from public.seasonal_purchases sp
    join public.seasonal_loterias sl on sl.id = sp.loteria_id
    where p_kind is null or p_kind = '' or p_kind = 'seasonal'
  )
  select count(*)::bigint into v_count
  from all_purchases a
  left join public.profiles pr on pr.id = a.user_id
  where
    (p_email is null or p_email = '' or pr.email ilike '%' || p_email || '%')
    and (p_status is null or p_status = '' or a.payment_status = p_status)
    and (p_provider is null or p_provider = '' or a.payment_provider = p_provider)
    and (p_date_from is null or a.created_at >= p_date_from)
    and (p_date_to is null or a.created_at <= p_date_to);
  return v_count;
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
-- La función comprueba además que quien llama sea administrador.
revoke all on function public.admin_get_all_purchases(integer, integer, text, text, text, timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.admin_get_all_purchases(integer, integer, text, text, text, timestamptz, timestamptz, text)
  to authenticated, service_role;

revoke all on function public.admin_get_all_purchases_count(text, text, text, timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.admin_get_all_purchases_count(text, text, text, timestamptz, timestamptz, text)
  to authenticated, service_role;
