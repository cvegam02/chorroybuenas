-- Vincular uso de tokens por lotería (set).
alter table public.token_usage
add column if not exists set_id uuid references public.loteria_sets(id) on delete set null;

create index if not exists token_usage_set_id_idx on public.token_usage (set_id);

comment on column public.token_usage.set_id is 'Lotería (set) en la que se gastaron los tokens. Null si no aplica.';

-- Sobrecarga spend_tokens con set_id opcional (mantener compatibilidad con llamadas sin set_id)
create or replace function public.spend_tokens(p_amount integer, p_set_id uuid default null)
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

  insert into public.token_usage (user_id, amount, reason, set_id)
  values (v_user_id, p_amount, 'ai_conversion', p_set_id);

  return v_new_balance;
end;
$$;

grant execute on function public.spend_tokens(integer, uuid) to authenticated;
