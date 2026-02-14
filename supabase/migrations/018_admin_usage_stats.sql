-- RPC: Resumen de uso de IA (total tokens, usuarios únicos, sets únicos).
-- Filtros opcionales por fechas.
create or replace function public.admin_get_usage_summary(
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
)
returns table (
  total_tokens bigint,
  unique_users bigint,
  unique_sets bigint
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
    coalesce(sum(tu.amount), 0)::bigint as total_tokens,
    count(distinct tu.user_id)::bigint as unique_users,
    count(distinct tu.set_id) filter (where tu.set_id is not null)::bigint as unique_sets
  from public.token_usage tu
  where
    (p_date_from is null or tu.created_at >= p_date_from)
    and (p_date_to is null or tu.created_at <= p_date_to);
end;
$$;

-- RPC: Tokens por día (últimos N días) para gráfica.
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
    (tu.created_at at time zone 'UTC')::date as day,
    sum(tu.amount)::bigint as tokens
  from public.token_usage tu
  where
    (p_date_from is null or tu.created_at >= p_date_from)
    and (p_date_to is null or tu.created_at <= p_date_to)
    and (p_date_from is not null or p_date_to is not null or tu.created_at >= (now() - (p_days || ' days')::interval))
  group by (tu.created_at at time zone 'UTC')::date
  order by day asc;
end;
$$;

-- RPC: Top usuarios por tokens gastados.
create or replace function public.admin_get_usage_by_user(
  p_limit int default 10,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
)
returns table (
  user_id uuid,
  email text,
  total_tokens bigint
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
    tu.user_id,
    p.email,
    sum(tu.amount)::bigint as total_tokens
  from public.token_usage tu
  left join public.profiles p on p.id = tu.user_id
  where
    (p_date_from is null or tu.created_at >= p_date_from)
    and (p_date_to is null or tu.created_at <= p_date_to)
  group by tu.user_id, p.email
  order by total_tokens desc
  limit p_limit;
end;
$$;

-- RPC: Top loterías (sets) por tokens gastados.
create or replace function public.admin_get_usage_by_set(
  p_limit int default 10,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
)
returns table (
  set_id uuid,
  set_name text,
  total_tokens bigint
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
    tu.set_id,
    ls.name::text as set_name,
    sum(tu.amount)::bigint as total_tokens
  from public.token_usage tu
  inner join public.loteria_sets ls on ls.id = tu.set_id
  where
    tu.set_id is not null
    and (p_date_from is null or tu.created_at >= p_date_from)
    and (p_date_to is null or tu.created_at <= p_date_to)
  group by tu.set_id, ls.name
  order by total_tokens desc
  limit p_limit;
end;
$$;

grant execute on function public.admin_get_usage_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_get_usage_by_day(integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_get_usage_by_user(integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_get_usage_by_set(integer, timestamptz, timestamptz) to authenticated;
