-- Configuración global de la app (tokens iniciales, etc.)
-- Visible para todos; solo admins pueden modificar.

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz default now() not null
);

alter table public.app_config enable row level security;

-- Lectura para todos (necesario para TokenRepository y Dashboard)
drop policy if exists "Anyone can read app_config" on public.app_config;
create policy "Anyone can read app_config" on public.app_config
  for select using (true);

-- Solo admins pueden insertar/actualizar
drop policy if exists "Admins can insert app_config" on public.app_config;
create policy "Admins can insert app_config" on public.app_config
  for insert with check (public.is_admin());

drop policy if exists "Admins can update app_config" on public.app_config;
create policy "Admins can update app_config" on public.app_config
  for update using (public.is_admin());

-- Valor por defecto: 0 tokens al registrarse
insert into public.app_config (key, value)
values ('initial_tokens', '0')
on conflict (key) do nothing;
