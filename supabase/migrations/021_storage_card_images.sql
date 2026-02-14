-- Bucket y políticas RLS para Storage: imágenes de cartas (card-images)
-- El código usa CardRepository.BUCKET_NAME = 'card-images' y rutas userId/cardId_timestamp.png
-- docs/SUPABASE_STORAGE.md tiene más detalle.

-- ---------------------------------------------------------------------------
-- 1. Crear bucket card-images (privado, solo imágenes)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. Políticas RLS en storage.objects
-- Las rutas son userId/cardId_timestamp.png → (storage.foldername(name))[1] = auth.uid()::text
-- ---------------------------------------------------------------------------

-- Lectura: solo los archivos de tu carpeta
drop policy if exists "Users can read own card images" on storage.objects;
create policy "Users can read own card images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Subida: solo en tu carpeta
drop policy if exists "Users can upload to own folder" on storage.objects;
create policy "Users can upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Actualización: para upsert (CardRepository usa upsert: true)
drop policy if exists "Users can update own card images" on storage.objects;
create policy "Users can update own card images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Borrado: solo tus archivos
drop policy if exists "Users can delete own card images" on storage.objects;
create policy "Users can delete own card images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'card-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
