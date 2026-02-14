-- Tabla admin_users: usuarios con acceso al panel de administración
create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  added_at timestamptz default now() not null
);

create index if not exists admin_users_user_id_idx on public.admin_users (user_id);

alter table public.admin_users enable row level security;

-- Función para verificar si el usuario actual es admin.
-- SECURITY DEFINER: corre con privilegios del owner, bypassa RLS para leer admin_users.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

comment on function public.is_admin is 'Devuelve true si el usuario autenticado está en admin_users.';

grant execute on function public.is_admin() to authenticated;

-- Políticas: solo los admins pueden leer y gestionar admin_users.
-- El primer admin debe insertarse manualmente en Supabase SQL Editor:
--   INSERT INTO public.admin_users (user_id)
--   SELECT id FROM auth.users WHERE email = 'tu@email.com' LIMIT 1;
drop policy if exists "Admins can read admin_users" on public.admin_users;
create policy "Admins can read admin_users" on public.admin_users
  for select using (public.is_admin());

drop policy if exists "Admins can insert admin_users" on public.admin_users;
create policy "Admins can insert admin_users" on public.admin_users
  for insert with check (public.is_admin());

drop policy if exists "Admins can delete admin_users" on public.admin_users;
create policy "Admins can delete admin_users" on public.admin_users
  for delete using (public.is_admin());
