-- Archivos de las loterías de temporada (FEAT-17): PDF privado y vistas previas públicas.
-- Solo los administradores escriben. La lectura del PDF por quien lo compró llega con las compras.

-- ---------------------------------------------------------------------------
-- 1. Espacios de archivos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('seasonal-pdfs', 'seasonal-pdfs', false, 52428800, array['application/pdf']),
  -- Portada y muestras ya reducidas y con marca de agua: cualquiera las ve por su URL pública.
  ('seasonal-previews', 'seasonal-previews', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Rutas: <id de la lotería>/<archivo>.
drop policy if exists "Admins can read seasonal files" on storage.objects;
create policy "Admins can read seasonal files"
on storage.objects for select
to authenticated
using (bucket_id in ('seasonal-pdfs', 'seasonal-previews') and public.is_admin());

drop policy if exists "Admins can upload seasonal files" on storage.objects;
create policy "Admins can upload seasonal files"
on storage.objects for insert
to authenticated
with check (bucket_id in ('seasonal-pdfs', 'seasonal-previews') and public.is_admin());

drop policy if exists "Admins can update seasonal files" on storage.objects;
create policy "Admins can update seasonal files"
on storage.objects for update
to authenticated
using (bucket_id in ('seasonal-pdfs', 'seasonal-previews') and public.is_admin())
with check (bucket_id in ('seasonal-pdfs', 'seasonal-previews') and public.is_admin());

drop policy if exists "Admins can delete seasonal files" on storage.objects;
create policy "Admins can delete seasonal files"
on storage.objects for delete
to authenticated
using (bucket_id in ('seasonal-pdfs', 'seasonal-previews') and public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Registro del PDF de cada lotería
-- Vive fuera de seasonal_loterias porque esa tabla la lee el público y la ubicación del PDF no.
-- ---------------------------------------------------------------------------
create table if not exists public.seasonal_loteria_files (
  loteria_id uuid primary key references public.seasonal_loterias (id) on delete cascade,
  pdf_path text not null check (char_length(btrim(pdf_path)) > 0),
  -- Nombre original del archivo, para mostrarlo en el panel.
  pdf_name text not null check (char_length(btrim(pdf_name)) between 1 and 200),
  pdf_size_bytes bigint not null check (pdf_size_bytes between 1 and 52428800),
  uploaded_at timestamptz default now() not null
);

comment on table public.seasonal_loteria_files is
  'Ubicación del PDF de cada lotería de temporada. Solo la leen los administradores.';

alter table public.seasonal_loteria_files enable row level security;

drop policy if exists "Admins can read seasonal_loteria_files" on public.seasonal_loteria_files;
create policy "Admins can read seasonal_loteria_files" on public.seasonal_loteria_files
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can insert seasonal_loteria_files" on public.seasonal_loteria_files;
create policy "Admins can insert seasonal_loteria_files" on public.seasonal_loteria_files
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update seasonal_loteria_files" on public.seasonal_loteria_files;
create policy "Admins can update seasonal_loteria_files" on public.seasonal_loteria_files
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete seasonal_loteria_files" on public.seasonal_loteria_files;
create policy "Admins can delete seasonal_loteria_files" on public.seasonal_loteria_files
  for delete to authenticated using (public.is_admin());

-- Permisos explícitos: un visitante no tiene ningún acceso a esta tabla.
revoke all on table public.seasonal_loteria_files from public, anon, authenticated;
grant select, insert, update, delete on table public.seasonal_loteria_files to authenticated;
grant all on table public.seasonal_loteria_files to service_role;
