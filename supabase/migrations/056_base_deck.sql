-- Baraja base (FEAT-50, decisión 3): las 54 cartas tradicionales que el administrador sube una vez y
-- que se usan como imagen de entrada al generar cartas temáticas con IA. Privada, solo administradores;
-- nunca se muestra al público y no depende de ninguna lotería.
-- Cada carta se guarda con su número como nombre de archivo ('1' … '54', sin extensión), así que
-- reemplazarla es subirla otra vez al mismo nombre. El nombre de la carta sale de la baraja
-- tradicional (src/utils/traditionalDeck.ts): no hace falta una tabla.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('base-deck', 'base-deck', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Un número de carta válido: del 1 al 54, sin ceros a la izquierda ni carpetas.
create or replace function public.is_base_deck_card_name(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_name ~ '^([1-9]|[1-4][0-9]|5[0-4])$';
$$;

drop policy if exists "Admins can read base deck" on storage.objects;
create policy "Admins can read base deck"
on storage.objects for select
to authenticated
using (bucket_id = 'base-deck' and public.is_admin());

drop policy if exists "Admins can upload base deck" on storage.objects;
create policy "Admins can upload base deck"
on storage.objects for insert
to authenticated
with check (bucket_id = 'base-deck' and public.is_admin() and public.is_base_deck_card_name(name));

drop policy if exists "Admins can update base deck" on storage.objects;
create policy "Admins can update base deck"
on storage.objects for update
to authenticated
using (bucket_id = 'base-deck' and public.is_admin())
with check (bucket_id = 'base-deck' and public.is_admin() and public.is_base_deck_card_name(name));

drop policy if exists "Admins can delete base deck" on storage.objects;
create policy "Admins can delete base deck"
on storage.objects for delete
to authenticated
using (bucket_id = 'base-deck' and public.is_admin());
