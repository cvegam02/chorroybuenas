-- RPC: Compras de Mercado Pago con payment_id y payment_metadata (para admin).
create or replace function public.admin_get_mp_transactions(
  p_limit int default 50,
  p_offset int default 0,
  p_email text default null,
  p_status text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
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
  payment_id text,
  payment_status text,
  payment_metadata jsonb,
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
    tp.payment_id,
    tp.payment_status,
    tp.payment_metadata,
    tp.created_at,
    p.email,
    p.full_name
  from public.token_purchases tp
  left join public.profiles p on p.id = tp.user_id
  where tp.payment_provider = 'mercadopago'
    and (p_email is null or p_email = '' or p.email ilike '%' || p_email || '%')
    and (p_status is null or p_status = '' or tp.payment_status = p_status)
    and (p_date_from is null or tp.created_at >= p_date_from)
    and (p_date_to is null or tp.created_at <= p_date_to)
  order by tp.created_at desc
  limit p_limit offset p_offset;
end;
$$;

-- Conteo de transacciones MP con filtros
create or replace function public.admin_get_mp_transactions_count(
  p_email text default null,
  p_status text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
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
  from public.token_purchases tp
  left join public.profiles p on p.id = tp.user_id
  where tp.payment_provider = 'mercadopago'
    and (p_email is null or p_email = '' or p.email ilike '%' || p_email || '%')
    and (p_status is null or p_status = '' or tp.payment_status = p_status)
    and (p_date_from is null or tp.created_at >= p_date_from)
    and (p_date_to is null or tp.created_at <= p_date_to);
  return v_count;
end;
$$;

grant execute on function public.admin_get_mp_transactions(integer, integer, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_get_mp_transactions_count(text, text, timestamptz, timestamptz) to authenticated;
