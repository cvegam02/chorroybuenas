-- Alternativa: admin_get_balances_with_users SIN join a auth.users.
-- Supabase Cloud puede restringir el acceso a auth.users desde funciones,
-- provocando 400. Esta versión devuelve null en email/full_name pero la RPC funciona.
create or replace function public.admin_get_balances_with_users(p_limit int default 200)
returns table (
  user_id uuid,
  balance integer,
  updated_at timestamptz,
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
  return query
  select
    ut.user_id,
    ut.balance,
    ut.updated_at,
    null::text as email,
    null::text as full_name
  from public.user_tokens ut
  order by ut.updated_at desc nulls last
  limit p_limit;
end;
$$;

comment on function public.admin_get_balances_with_users is 'Admin: balances (sin email/nombre si auth.users no accesible). Solo admins.';
