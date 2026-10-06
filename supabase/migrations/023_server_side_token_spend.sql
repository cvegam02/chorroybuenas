-- El cobro de tokens de IA pasa al servidor (edge function transform-loteria con service role).
-- El navegador deja de decidir cuándo se cobra.

-- Guarda: saldos negativos existentes impedirían crear el check.
do $$
begin
  if exists (select 1 from public.user_tokens where balance < 0) then
    raise exception 'user_tokens tiene saldos negativos; corregirlos antes de aplicar 023 (ver docs/features/FEAT-04, CYB-403)';
  end if;
end $$;

alter table public.user_tokens
  drop constraint if exists user_tokens_balance_nonneg;
alter table public.user_tokens
  add constraint user_tokens_balance_nonneg check (balance >= 0);

create index if not exists token_usage_user_created_idx
  on public.token_usage (user_id, created_at desc);

create or replace function public.spend_tokens_for_user(
  p_user_id uuid,
  p_amount integer,
  p_set_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set_id uuid;
  v_usage_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  -- Máximo 10 usos por minuto por usuario.
  if (
    select count(*) from public.token_usage
    where user_id = p_user_id and created_at > now() - interval '60 seconds'
  ) >= 10 then
    raise exception 'RATE_LIMITED';
  end if;

  -- Un solo UPDATE condicional: no hay ventana entre leer el saldo y descontarlo.
  update public.user_tokens
  set balance = balance - p_amount, updated_at = now()
  where user_id = p_user_id and balance >= p_amount;

  if not found then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  -- Solo se registra el set si es del usuario.
  select id into v_set_id from public.loteria_sets
  where id = p_set_id and user_id = p_user_id;

  insert into public.token_usage (user_id, amount, reason, set_id)
  values (p_user_id, p_amount, 'ai_conversion', v_set_id)
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

create or replace function public.refund_token_usage(p_usage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_amount integer;
begin
  delete from public.token_usage where id = p_usage_id
  returning user_id, amount into v_user_id, v_amount;

  if v_user_id is null then
    return; -- ya reembolsado o inexistente
  end if;

  update public.user_tokens
  set balance = balance + v_amount, updated_at = now()
  where user_id = v_user_id;
end;
$$;

comment on function public.spend_tokens_for_user is
  'Cobra tokens de IA. Lanza INSUFFICIENT_TOKENS o RATE_LIMITED. Solo service_role (edge function transform-loteria).';
comment on function public.refund_token_usage is
  'Devuelve un cobro cuando la IA falla. Idempotente. Solo service_role.';

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: revocarlos por nombre.
revoke all on function public.spend_tokens_for_user(uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.refund_token_usage(uuid) from public, anon, authenticated;
grant execute on function public.spend_tokens_for_user(uuid, integer, uuid) to service_role;
grant execute on function public.refund_token_usage(uuid) to service_role;

-- La RPC que llamaba el navegador desaparece.
drop function if exists public.spend_tokens(integer);
drop function if exists public.spend_tokens(integer, uuid);
