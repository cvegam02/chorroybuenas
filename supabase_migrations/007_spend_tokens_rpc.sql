-- RPC para que usuarios autenticados puedan descontar tokens.
-- El frontend no tiene política UPDATE en user_tokens; esta RPC usa SECURITY DEFINER.

create or replace function public.spend_tokens(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance integer;
  v_new_balance integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select balance into v_balance from public.user_tokens where user_id = v_user_id;
  if v_balance is null then
    raise exception 'Insufficient tokens';
  end if;
  if v_balance < p_amount then
    raise exception 'Insufficient tokens';
  end if;

  update public.user_tokens
  set balance = balance - p_amount, updated_at = now()
  where user_id = v_user_id
  returning balance into v_new_balance;

  return v_new_balance;
end;
$$;

comment on function public.spend_tokens(integer) is 'Allows authenticated users to spend their own tokens. Called from frontend after AI conversion.';

-- Solo usuarios autenticados pueden ejecutar (usa auth.uid() internamente)
grant execute on function public.spend_tokens(integer) to authenticated;
