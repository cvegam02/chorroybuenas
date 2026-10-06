-- Idempotencia de acreditación: un payment_id se acredita una sola vez,
-- y la función de acreditación solo la puede ejecutar service_role.

-- Guarda: si ya hay duplicados, detener con mensaje claro (resolver a mano antes de migrar).
do $$
begin
  if exists (
    select 1 from public.token_purchases
    where payment_id is not null
    group by payment_provider, payment_id
    having count(*) > 1
  ) then
    raise exception 'token_purchases tiene payment_id duplicados; resolverlos antes de aplicar 022 (ver docs/features/FEAT-03, CYB-305)';
  end if;
end $$;

create unique index if not exists token_purchases_provider_payment_uidx
  on public.token_purchases (payment_provider, payment_id)
  where payment_id is not null;

drop function if exists public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb);

create function public.add_tokens_after_purchase(
  p_user_id uuid,
  p_tokens_to_add integer,
  p_pack_id uuid,
  p_base_tokens integer,
  p_bonus_tokens integer,
  p_total_tokens integer,
  p_amount_cents integer,
  p_payment_provider text,
  p_payment_id text,
  p_payment_status text,
  p_payment_metadata jsonb default null,
  p_promotion_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_balance integer;
begin
  if p_tokens_to_add is null or p_tokens_to_add <= 0 then
    raise exception 'p_tokens_to_add must be positive';
  end if;
  if p_payment_id is null or p_payment_id = '' then
    raise exception 'p_payment_id is required';
  end if;

  -- Primero la compra: el índice único decide quién gana si llegan dos llamadas a la vez.
  insert into public.token_purchases (
    user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents,
    promotion_ids, payment_provider, payment_id, payment_status, payment_metadata
  )
  values (
    p_user_id, p_pack_id, p_base_tokens, p_bonus_tokens, p_total_tokens, p_amount_cents,
    p_promotion_ids, p_payment_provider, p_payment_id, p_payment_status, p_payment_metadata
  )
  on conflict (payment_provider, payment_id) where payment_id is not null do nothing
  returning id into v_purchase_id;

  if v_purchase_id is null then
    select balance into v_balance from public.user_tokens where user_id = p_user_id;
    return coalesce(v_balance, 0);
  end if;

  insert into public.user_tokens (user_id, balance, updated_at)
  values (p_user_id, p_tokens_to_add, now())
  on conflict (user_id) do update set
    balance = public.user_tokens.balance + excluded.balance,
    updated_at = now()
  returning balance into v_balance;

  return v_balance;
end;
$$;

comment on function public.add_tokens_after_purchase is
  'Acredita una compra de forma idempotente por (payment_provider, payment_id). Solo service_role.';

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto:
-- revocar de public no basta, hay que revocarlos por nombre.
revoke all on function public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb, uuid[])
  from public, anon, authenticated;
grant execute on function public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb, uuid[])
  to service_role;
