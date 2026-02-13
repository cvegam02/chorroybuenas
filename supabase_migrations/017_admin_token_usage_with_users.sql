-- RPC: Uso de tokens (IA) con email, nombre de lotería y filtros.
-- Solo admins. Join con profiles y loteria_sets.
create or replace function public.admin_get_token_usage_with_users(
  p_limit int default 50,
  p_offset int default 0,
  p_email text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_set_name text default null
)
returns table (
  id uuid,
  user_id uuid,
  amount integer,
  reason text,
  set_id uuid,
  created_at timestamptz,
  email text,
  set_name text
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
    tu.id,
    tu.user_id,
    tu.amount,
    tu.reason,
    tu.set_id,
    tu.created_at,
    p.email,
    ls.name::text as set_name
  from public.token_usage tu
  left join public.profiles p on p.id = tu.user_id
  left join public.loteria_sets ls on ls.id = tu.set_id
  where
    (p_email is null or p_email = '' or p.email ilike '%' || p_email || '%')
    and (p_date_from is null or tu.created_at >= p_date_from)
    and (p_date_to is null or tu.created_at <= p_date_to)
    and (p_set_name is null or p_set_name = '' or ls.name ilike '%' || p_set_name || '%')
  order by tu.created_at desc
  limit p_limit offset p_offset;
end;
$$;

-- RPC: Conteo de registros de uso con los mismos filtros.
create or replace function public.admin_get_token_usage_count(
  p_email text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_set_name text default null
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
  select count(*)::bigint into v_count
  from public.token_usage tu
  left join public.profiles p on p.id = tu.user_id
  left join public.loteria_sets ls on ls.id = tu.set_id
  where
    (p_email is null or p_email = '' or p.email ilike '%' || p_email || '%')
    and (p_date_from is null or tu.created_at >= p_date_from)
    and (p_date_to is null or tu.created_at <= p_date_to)
    and (p_set_name is null or p_set_name = '' or ls.name ilike '%' || p_set_name || '%');
  return v_count;
end;
$$;

comment on function public.admin_get_token_usage_with_users is 'Admin: uso de tokens IA con email y lotería. Solo admins.';
comment on function public.admin_get_token_usage_count is 'Admin: conteo de uso de tokens con filtros. Solo admins.';

grant execute on function public.admin_get_token_usage_with_users(integer, integer, text, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_get_token_usage_count(text, timestamptz, timestamptz, text) to authenticated;
