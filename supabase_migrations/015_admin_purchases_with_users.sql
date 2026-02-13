-- RPC: Compras con email y nombre del usuario (admin).
-- Usa public.profiles para evitar acceder a auth.users directamente.
create or replace function public.admin_get_purchases_with_users(
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
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
  return query
  select
    tp.id,
    tp.user_id,
    tp.pack_id,
    tp.base_tokens,
    tp.bonus_tokens,
    tp.total_tokens,
    tp.amount_cents,
    tp.payment_provider,
    tp.payment_status,
    tp.created_at,
    p.email,
    p.full_name
  from public.token_purchases tp
  left join public.profiles p on p.id = tp.user_id
  order by tp.created_at desc
  limit p_limit offset p_offset;
end;
$$;

comment on function public.admin_get_purchases_with_users is 'Admin: compras con email y nombre. Solo admins.';

grant execute on function public.admin_get_purchases_with_users(integer, integer) to authenticated;
