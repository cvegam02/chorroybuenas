-- Archivos de las loterías de temporada: PDF privado y vistas previas públicas (migración 028).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000051', 'admin-archivos@test.dev'),
  ('00000000-0000-0000-0000-000000000052', 'usuario-archivos@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000051');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000000c1', 'Navidad');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Posadas', 4900);

-- Espacios de archivos
select test.is((select public from storage.buckets where id = 'seasonal-pdfs'), false,
  'el espacio de los PDF es privado');
select test.is((select file_size_limit from storage.buckets where id = 'seasonal-pdfs'), 52428800::bigint,
  'un PDF pesa como máximo 50 MB');
select test.is((select allowed_mime_types from storage.buckets where id = 'seasonal-pdfs'),
  array['application/pdf'], 'el espacio de los PDF solo acepta PDF');
select test.is((select public from storage.buckets where id = 'seasonal-previews'), true,
  'el espacio de las vistas previas es público');
select test.is((select file_size_limit from storage.buckets where id = 'seasonal-previews'), 5242880::bigint,
  'una vista previa pesa como máximo 5 MB');

-- La ficha pública no lleva la ubicación del PDF
select test.is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'seasonal_loterias' and column_name like '%pdf%'),
  0, 'la ficha que lee el público no tiene ninguna columna del PDF');

-- Administrador: sube, registra y reemplaza
select test.as_user('00000000-0000-0000-0000-000000000051');
select test.lives($$
  insert into storage.objects (bucket_id, name)
  values ('seasonal-pdfs', '00000000-0000-0000-0000-0000000000d1/1.pdf')
$$, 'un administrador sube un PDF');
select test.lives($$
  insert into public.seasonal_loteria_files (loteria_id, pdf_path, pdf_name, pdf_size_bytes)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1/1.pdf', 'posadas.pdf', 1024)
$$, 'un administrador registra el PDF de una lotería');
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-pdfs'), 1,
  'un administrador puede leer el PDF');
select test.is((select pdf_name from public.seasonal_loteria_files), 'posadas.pdf',
  'un administrador lee el registro del PDF');
select test.lives($$
  update public.seasonal_loteria_files
  set pdf_path = '00000000-0000-0000-0000-0000000000d1/2.pdf', pdf_name = 'posadas-v2.pdf', pdf_size_bytes = 2048
$$, 'un administrador reemplaza el PDF de una lotería');
select test.lives($$
  update storage.objects set name = '00000000-0000-0000-0000-0000000000d1/2.pdf' where bucket_id = 'seasonal-pdfs'
$$, 'un administrador sobrescribe el archivo del PDF');
select test.throws($$
  insert into public.seasonal_loteria_files (loteria_id, pdf_path, pdf_name, pdf_size_bytes)
  values ('00000000-0000-0000-0000-0000000000d1', 'otro.pdf', 'otro.pdf', 10)
$$, '23505', 'una lotería tiene un solo PDF');
select test.throws($$
  update public.seasonal_loteria_files set pdf_size_bytes = 52428801
$$, '23514', 'no se registra un PDF de más de 50 MB');
select test.throws($$ update public.seasonal_loteria_files set pdf_name = '  ' $$,
  '23514', 'el nombre del PDF no puede quedar en blanco');
select test.lives($$
  insert into storage.objects (bucket_id, name)
  values ('seasonal-previews', '00000000-0000-0000-0000-0000000000d1/portada.webp')
$$, 'un administrador sube una vista previa');

-- Usuario sin compra: ni el PDF ni su ubicación
select test.as_user('00000000-0000-0000-0000-000000000052');
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-pdfs'), 0,
  'un usuario sin compra no puede leer el PDF');
select test.is(
  (select count(*)::int from storage.objects
    where bucket_id = 'seasonal-pdfs' and name = '00000000-0000-0000-0000-0000000000d1/2.pdf'),
  0, 'un usuario sin compra no puede leer el PDF ni conociendo su ubicación');
select test.is((select count(*)::int from public.seasonal_loteria_files), 0,
  'un usuario no ve la ubicación del PDF');
select test.throws($$
  insert into storage.objects (bucket_id, name) values ('seasonal-pdfs', 'intruso.pdf')
$$, '42501', 'un usuario no puede subir un PDF');
select test.throws($$
  insert into storage.objects (bucket_id, name) values ('seasonal-previews', 'intrusa.webp')
$$, '42501', 'un usuario no puede subir vistas previas');
select test.throws($$
  insert into public.seasonal_loteria_files (loteria_id, pdf_path, pdf_name, pdf_size_bytes)
  values ('00000000-0000-0000-0000-0000000000d1', 'intruso.pdf', 'intruso.pdf', 10)
$$, '42501', 'un usuario no puede registrar un PDF');
update public.seasonal_loteria_files set pdf_path = 'cambiada.pdf';
delete from public.seasonal_loteria_files;
update storage.objects set name = 'cambiado' where bucket_id in ('seasonal-pdfs', 'seasonal-previews');
delete from storage.objects where bucket_id in ('seasonal-pdfs', 'seasonal-previews');

-- Visitante: tampoco
select test.as_anon();
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-pdfs'), 0,
  'un visitante no puede leer el PDF');
select test.throws($$ select pdf_path from public.seasonal_loteria_files $$,
  '42501', 'un visitante no puede consultar la ubicación del PDF');
select test.throws($$
  insert into storage.objects (bucket_id, name) values ('seasonal-pdfs', 'intruso.pdf')
$$, '42501', 'un visitante no puede subir un PDF');
select test.throws($$
  insert into storage.objects (bucket_id, name) values ('seasonal-previews', 'intrusa.webp')
$$, '42501', 'un visitante no puede subir vistas previas');
delete from storage.objects where bucket_id in ('seasonal-pdfs', 'seasonal-previews');

select test.as_postgres();
select test.is(
  (select array_agg(name order by name) from storage.objects where bucket_id in ('seasonal-pdfs', 'seasonal-previews')),
  array['00000000-0000-0000-0000-0000000000d1/2.pdf', '00000000-0000-0000-0000-0000000000d1/portada.webp'],
  'los intentos de usuarios y visitantes no cambiaron ni borraron archivos');
select test.is((select pdf_path from public.seasonal_loteria_files),
  '00000000-0000-0000-0000-0000000000d1/2.pdf',
  'los intentos de usuarios no cambiaron el registro del PDF');

-- Al borrar la lotería se va el registro de su PDF
delete from public.seasonal_loterias where id = '00000000-0000-0000-0000-0000000000d1';
select test.is((select count(*)::int from public.seasonal_loteria_files), 0,
  'al borrar una lotería se borra el registro de su PDF');

rollback;
