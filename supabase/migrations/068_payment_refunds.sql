-- Reembolsos y contracargos (FEAT-58, US A8; §8 y §18 de contexto-negocio).
-- Cuando Mercado Pago avisa que un pago se devolvió o el banco lo revirtió, el webhook llama a
-- reverse_payment: en una compra de tokens descuenta los tokens de esa compra sin dejar el saldo
-- negativo; en una lotería temática la marca como devuelta, lo que quita la descarga (migración 032
-- solo la permite con status = 'approved'). Idempotente por (payment_provider, payment_id).

alter table public.token_purchases
  add column if not exists refund_reason text check (refund_reason in ('refunded', 'charged_back')),
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_tokens integer check (refunded_tokens >= 0);

comment on column public.token_purchases.refund_reason is 'Por qué se revirtió: devolución (refunded) o contracargo (charged_back).';
comment on column public.token_purchases.refunded_tokens is 'Tokens que se pudieron descontar al revertir (el saldo no baja de 0).';

alter table public.seasonal_purchases
  add column if not exists refund_reason text check (refund_reason in ('refunded', 'charged_back')),
  add column if not exists refunded_at timestamptz;

comment on column public.seasonal_purchases.refund_reason is 'Por qué se revirtió: devolución (refunded) o contracargo (charged_back).';

create or replace function public.reverse_payment(
  p_payment_provider text,
  p_payment_id text,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.token_purchases%rowtype;
  v_seasonal public.seasonal_purchases%rowtype;
  v_balance integer;
  v_deducted integer;
begin
  if p_reason is null or p_reason not in ('refunded', 'charged_back') then
    raise exception 'INVALID_REASON';
  end if;

  select * into v_purchase from public.token_purchases
    where payment_provider = p_payment_provider and payment_id = p_payment_id
    for update;
  if found then
    if v_purchase.refunded_at is not null then
      return 'repeated';
    end if;
    select balance into v_balance from public.user_tokens where user_id = v_purchase.user_id for update;
    v_deducted := least(coalesce(v_balance, 0), v_purchase.total_tokens);
    update public.user_tokens set balance = balance - v_deducted, updated_at = now()
      where user_id = v_purchase.user_id;
    update public.token_purchases set
      payment_status = 'refunded',
      refund_reason = p_reason,
      refunded_at = now(),
      refunded_tokens = v_deducted
    where id = v_purchase.id;
    return 'tokens_reversed';
  end if;

  select * into v_seasonal from public.seasonal_purchases
    where payment_provider = p_payment_provider and payment_id = p_payment_id
    for update;
  if found then
    if v_seasonal.status = 'refunded' then
      return 'repeated';
    end if;
    -- Un pago en proceso no se puede devolver: solo se revierte lo entregado o guardado como repetido.
    if v_seasonal.status not in ('approved', 'repeated') then
      return 'not_found';
    end if;
    update public.seasonal_purchases set
      status = 'refunded',
      refund_reason = p_reason,
      refunded_at = now()
    where id = v_seasonal.id;
    return 'seasonal_refunded';
  end if;

  return 'not_found';
end;
$$;

comment on function public.reverse_payment is
  'Revierte un pago devuelto o con contracargo: descuenta los tokens de la compra (saldo mínimo 0) o marca la temática como devuelta. Idempotente. Solo service_role.';

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto:
-- revocar de public no basta, hay que revocarlos por nombre.
revoke all on function public.reverse_payment(text, text, text) from public, anon, authenticated;
grant execute on function public.reverse_payment(text, text, text) to service_role;
