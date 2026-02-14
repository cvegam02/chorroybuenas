-- Tabla para registrar cada gasto de tokens (fuente de verdad para "tokens gastados").
create table if not exists public.token_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  amount integer not null check (amount > 0),
  reason text default 'ai_conversion',
  created_at timestamptz default now() not null
);

create index if not exists token_usage_user_id_idx on public.token_usage (user_id);
create index if not exists token_usage_created_at_idx on public.token_usage (created_at desc);

alter table public.token_usage enable row level security;

-- Usuario solo puede leer sus propios registros
drop policy if exists "Users can read own token_usage" on public.token_usage;
create policy "Users can read own token_usage" on public.token_usage
  for select using (auth.uid() = user_id);

-- Inserts solo vía RPC spend_tokens (no policy INSERT para usuarios)
comment on table public.token_usage is 'Registro de cada gasto de tokens. Insertado por RPC spend_tokens.';

-- Modificar spend_tokens para insertar en token_usage
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

  -- Registrar el gasto para el contador "tokens gastados"
  insert into public.token_usage (user_id, amount, reason)
  values (v_user_id, p_amount, 'ai_conversion');

  return v_new_balance;
end;
$$;
