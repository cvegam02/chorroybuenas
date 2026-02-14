-- Tabla profiles: copia email y full_name desde auth.users.
-- Los triggers tienen acceso a auth.users; las RPCs leen public.profiles (sin restricciones).
-- Patrón recomendado por Supabase para exponer datos de usuario en public.

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  updated_at timestamptz default now()
);

-- Índice para joins frecuentes
create index if not exists profiles_id_idx on public.profiles (id);

alter table public.profiles enable row level security;

-- Los usuarios pueden leer su propio perfil
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Trigger: al crear usuario en auth.users, insertar en profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')::text
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Solo aplicamos si el trigger no existe (evitar duplicados)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: al actualizar usuario en auth.users, actualizar profiles
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')::text,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_updated();

-- Backfill: usuarios existentes (ejecuta como postgres, tiene acceso a auth.users)
insert into public.profiles (id, email, full_name)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')::text
from auth.users au
where au.id not in (select id from public.profiles)
on conflict (id) do nothing;

-- RPC: Balances con email y nombre desde profiles (no auth.users)
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
    p.email,
    p.full_name
  from public.user_tokens ut
  left join public.profiles p on p.id = ut.user_id
  order by ut.updated_at desc nulls last
  limit p_limit;
end;
$$;

comment on function public.admin_get_balances_with_users is 'Admin: balances con email y nombre desde profiles. Solo admins.';
