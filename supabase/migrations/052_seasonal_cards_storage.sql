-- Cartas de una lotería temática guardadas en privado (FEAT-48, decisión 18): así el administrador puede
-- seguir armándola otro día y elegir de entre ellas la portada y las muestras. Antes solo vivían en el
-- navegador (FEAT-23). Solo las ven los administradores y se borran con la lotería.

-- ---------------------------------------------------------------------------
-- 1. Espacio privado de las cartas: las cartas ya preparadas en 2:3, en JPEG.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seasonal-cards', 'seasonal-cards', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read seasonal cards" on storage.objects;
create policy "Admins can read seasonal cards"
on storage.objects for select
to authenticated
using (bucket_id = 'seasonal-cards' and public.is_admin());

drop policy if exists "Admins can upload seasonal cards" on storage.objects;
create policy "Admins can upload seasonal cards"
on storage.objects for insert
to authenticated
with check (bucket_id = 'seasonal-cards' and public.is_admin());

drop policy if exists "Admins can update seasonal cards" on storage.objects;
create policy "Admins can update seasonal cards"
on storage.objects for update
to authenticated
using (bucket_id = 'seasonal-cards' and public.is_admin())
with check (bucket_id = 'seasonal-cards' and public.is_admin());

drop policy if exists "Admins can delete seasonal cards" on storage.objects;
create policy "Admins can delete seasonal cards"
on storage.objects for delete
to authenticated
using (bucket_id = 'seasonal-cards' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Las cartas de cada lotería, en su orden, y el acomodo de sus tableros.
-- Vive fuera de seasonal_loterias porque esa tabla la lee el público.
-- cards: [{ "path": "<loteria>/<carta>.jpg", "fileName": "carta.png", "offRatio": false }, …]
-- boards: [[0, 5, 12, …], …] — en cada tablero, la posición de cada carta en `cards`.
-- pdf_is_current: el PDF guardado se armó con estas cartas y estos tableros.
-- ---------------------------------------------------------------------------
create table if not exists public.seasonal_loteria_builds (
  loteria_id uuid primary key references public.seasonal_loterias (id) on delete cascade,
  cards jsonb not null default '[]' check (jsonb_typeof(cards) = 'array'),
  boards jsonb not null default '[]' check (jsonb_typeof(boards) = 'array'),
  pdf_is_current boolean not null default false,
  updated_at timestamptz default now() not null
);

comment on table public.seasonal_loteria_builds is
  'FEAT-48: cartas guardadas en privado de cada lotería temática y el acomodo de sus tableros. Solo administradores.';

alter table public.seasonal_loteria_builds enable row level security;

drop policy if exists "Admins can read seasonal_loteria_builds" on public.seasonal_loteria_builds;
create policy "Admins can read seasonal_loteria_builds" on public.seasonal_loteria_builds
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can insert seasonal_loteria_builds" on public.seasonal_loteria_builds;
create policy "Admins can insert seasonal_loteria_builds" on public.seasonal_loteria_builds
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update seasonal_loteria_builds" on public.seasonal_loteria_builds;
create policy "Admins can update seasonal_loteria_builds" on public.seasonal_loteria_builds
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete seasonal_loteria_builds" on public.seasonal_loteria_builds;
create policy "Admins can delete seasonal_loteria_builds" on public.seasonal_loteria_builds
  for delete to authenticated using (public.is_admin());

-- Permisos explícitos: un visitante no tiene ningún acceso a esta tabla.
revoke all on table public.seasonal_loteria_builds from public, anon, authenticated;
grant select, insert, update, delete on table public.seasonal_loteria_builds to authenticated;
grant all on table public.seasonal_loteria_builds to service_role;
