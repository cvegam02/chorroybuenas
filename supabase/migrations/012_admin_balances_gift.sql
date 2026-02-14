-- RPC: Balances con email y nombre de usuario (admin).
-- Solo admins pueden ejecutar. Lee auth.users para email/full_name.
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
    au.email,
    coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')::text as full_name
  from public.user_tokens ut
  left join auth.users au on au.id = ut.user_id
  order by ut.updated_at desc nulls last
  limit p_limit;
end;
$$;

comment on function public.admin_get_balances_with_users is 'Admin: balances con email y nombre. Solo admins.';

grant execute on function public.admin_get_balances_with_users(integer) to authenticated;

-- RPC: Regalar tokens a un usuario (admin).
create or replace function public.admin_gift_tokens(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  insert into public.user_tokens (user_id, balance, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update set
    balance = public.user_tokens.balance + p_amount,
    updated_at = now();

  select balance into new_balance from public.user_tokens where user_id = p_user_id;
  return new_balance;
end;
$$;

comment on function public.admin_gift_tokens is 'Admin: regalar tokens a un usuario. Solo admins.';

grant execute on function public.admin_gift_tokens(uuid, integer) to authenticated;
