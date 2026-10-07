-- Registro de regalos de tokens: cada regalo de un administrador queda guardado
-- (quién, a quién, cuánto, cuándo y un motivo opcional).
-- Nadie lee ni escribe la tabla directamente: el administrador la consulta con
-- admin_get_token_gifts y el usuario ve los suyos con get_my_token_gifts, que no
-- devuelve el motivo ni quién regaló.

create table if not exists public.token_gifts (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid not null references auth.users on delete cascade,
  admin_id uuid references auth.users on delete set null,
  amount integer not null check (amount > 0),
  reason text check (reason is null or char_length(reason) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists token_gifts_recipient_idx on public.token_gifts (recipient_id, created_at desc);
create index if not exists token_gifts_created_at_idx on public.token_gifts (created_at desc);

comment on table public.token_gifts is
  'Regalos de tokens hechos por administradores. Solo se escribe desde admin_gift_tokens.';

alter table public.token_gifts enable row level security;

-- Sin policies para anon/authenticated y sin privilegios: el acceso es solo por las funciones.
revoke all on table public.token_gifts from public, anon, authenticated;
grant all on table public.token_gifts to service_role;

-- Regalar: la versión anterior (dos parámetros) se reemplaza por una con motivo opcional.
-- Las llamadas con dos parámetros siguen funcionando.
drop function if exists public.admin_gift_tokens(uuid, integer);

create function public.admin_gift_tokens(p_user_id uuid, p_amount integer, p_reason text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
  clean_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if char_length(clean_reason) > 200 then
    raise exception 'Reason too long';
  end if;

  insert into public.user_tokens (user_id, balance, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update set
    balance = public.user_tokens.balance + p_amount,
    updated_at = now()
  returning balance into new_balance;

  insert into public.token_gifts (recipient_id, admin_id, amount, reason)
  values (p_user_id, auth.uid(), p_amount, clean_reason);

  return new_balance;
end;
$$;

comment on function public.admin_gift_tokens(uuid, integer, text) is
  'Admin: regalar tokens a un usuario y dejar registro del regalo. Solo admins.';

revoke all on function public.admin_gift_tokens(uuid, integer, text) from public, anon;
grant execute on function public.admin_gift_tokens(uuid, integer, text) to authenticated;

-- Lista general de regalos para el panel de administración (más recientes primero).
create or replace function public.admin_get_token_gifts(p_limit integer default 200)
returns table (
  id uuid,
  created_at timestamptz,
  amount integer,
  reason text,
  admin_id uuid,
  admin_email text,
  admin_name text,
  recipient_id uuid,
  recipient_email text,
  recipient_name text
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
    g.id,
    g.created_at,
    g.amount,
    g.reason,
    g.admin_id,
    pa.email,
    pa.full_name,
    g.recipient_id,
    pr.email,
    pr.full_name
  from public.token_gifts g
  left join public.profiles pa on pa.id = g.admin_id
  left join public.profiles pr on pr.id = g.recipient_id
  order by g.created_at desc, g.id
  limit greatest(least(coalesce(p_limit, 200), 1000), 1);
end;
$$;

comment on function public.admin_get_token_gifts(integer) is
  'Admin: lista general de regalos de tokens con quién regaló y a quién. Solo admins.';

revoke all on function public.admin_get_token_gifts(integer) from public, anon;
grant execute on function public.admin_get_token_gifts(integer) to authenticated;

-- Regalos recibidos por el usuario que llama. No devuelve el motivo ni quién regaló.
create or replace function public.get_my_token_gifts()
returns table (
  id uuid,
  amount integer,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select g.id, g.amount, g.created_at
  from public.token_gifts g
  where g.recipient_id = auth.uid()
  order by g.created_at desc, g.id;
$$;

comment on function public.get_my_token_gifts() is
  'Regalos de tokens recibidos por el usuario autenticado: cantidad y fecha.';

revoke all on function public.get_my_token_gifts() from public, anon;
grant execute on function public.get_my_token_gifts() to authenticated;
