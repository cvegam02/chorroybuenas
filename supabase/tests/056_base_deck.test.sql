-- Baraja base: las 54 cartas tradicionales que se usan como imagen de entrada al generar con IA
-- (FEAT-50, decisión 3; migración 056). Solo las ven los administradores.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005601', 'admin-baraja@test.dev'),
  ('00000000-0000-0000-0000-000000005602', 'usuario-baraja@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005601');

-- Espacio de archivos
select test.is((select public from storage.buckets where id = 'base-deck'), false,
  'la baraja base es privada');
select test.is((select file_size_limit from storage.buckets where id = 'base-deck'), 10485760::bigint,
  'una carta base pesa como máximo 10 MB');
select test.is((select allowed_mime_types from storage.buckets where id = 'base-deck'),
  array['image/jpeg', 'image/png', 'image/webp'], 'la baraja base acepta JPEG, PNG y WebP');

-- Administrador
select test.as_user('00000000-0000-0000-0000-000000005601');
select test.lives($$
  insert into storage.objects (bucket_id, name) values ('base-deck', '1'), ('base-deck', '6'), ('base-deck', '54')
$$, 'un administrador sube cartas base con su número');
select test.is((select count(*)::int from storage.objects where bucket_id = 'base-deck'), 3,
  'un administrador lee la baraja base');
select test.throws($$ insert into storage.objects (bucket_id, name) values ('base-deck', '55') $$,
  '42501', 'no hay carta 55');
select test.throws($$ insert into storage.objects (bucket_id, name) values ('base-deck', '0') $$,
  '42501', 'no hay carta 0');
select test.throws($$ insert into storage.objects (bucket_id, name) values ('base-deck', '06') $$,
  '42501', 'el número no lleva ceros a la izquierda');
select test.throws($$ insert into storage.objects (bucket_id, name) values ('base-deck', 'otra/6') $$,
  '42501', 'las cartas base no van en carpetas');
select test.lives($$
  update storage.objects set name = '6' where bucket_id = 'base-deck' and name = '6'
$$, 'un administrador reemplaza una carta base');
select test.throws($$
  update storage.objects set name = '60' where bucket_id = 'base-deck' and name = '6'
$$, '42501', 'una carta base no se puede renombrar a un número inválido');
select test.lives($$ delete from storage.objects where bucket_id = 'base-deck' and name = '54' $$,
  'un administrador quita una carta base');

-- Usuario
select test.as_user('00000000-0000-0000-0000-000000005602');
select test.is((select count(*)::int from storage.objects where bucket_id = 'base-deck'), 0,
  'un usuario no puede ver la baraja base');
select test.throws($$ insert into storage.objects (bucket_id, name) values ('base-deck', '7') $$,
  '42501', 'un usuario no puede subir cartas base');
delete from storage.objects where bucket_id = 'base-deck';

-- Visitante
select test.as_anon();
select test.is((select count(*)::int from storage.objects where bucket_id = 'base-deck'), 0,
  'un visitante no puede ver la baraja base');
select test.throws($$ insert into storage.objects (bucket_id, name) values ('base-deck', '7') $$,
  '42501', 'un visitante no puede subir cartas base');

select test.as_user('00000000-0000-0000-0000-000000005601');
select test.is((select count(*)::int from storage.objects where bucket_id = 'base-deck'), 2,
  'ni el usuario ni el visitante borraron nada');

rollback;
