-- Cartas generadas con IA en el asistente (FEAT-50, US A2; migración 057): el prompt general, la lista
-- de cartas y sus intentos. Solo los administradores; los intentos los registra el servidor.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005701', 'admin-ia@test.dev'),
  ('00000000-0000-0000-0000-000000005702', 'usuario-ia@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005701');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000057a1', 'Navidad');
insert into public.seasonal_loterias (id, season_id, name_es) values
  ('00000000-0000-0000-0000-0000000057b1', '00000000-0000-0000-0000-0000000057a1', 'Navidad en el mar');

-- Espacio de archivos de los intentos
select test.is((select public from storage.buckets where id = 'seasonal-ai'), false,
  'los intentos se guardan en privado');
select test.is((select allowed_mime_types from storage.buckets where id = 'seasonal-ai'),
  array['image/webp', 'image/png', 'image/jpeg'], 'los intentos son imágenes WebP, PNG o JPEG');

-- La ficha que lee el público no lleva nada de la IA
select test.is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'seasonal_loterias' and (column_name like '%prompt%' or column_name like '%ai%')),
  0, 'la ficha pública no tiene columnas de la generación con IA');

-- Administrador
select test.as_user('00000000-0000-0000-0000-000000005701');
select test.lives($$
  insert into public.seasonal_ai_builds (loteria_id, general_prompt) values
    ('00000000-0000-0000-0000-0000000057b1', 'Lotería navideña, estilo acuarela')
$$, 'un administrador guarda el prompt general');
select test.is((select quality from public.seasonal_ai_builds), 'low', 'la calidad es low por defecto');
select test.throws($$ update public.seasonal_ai_builds set quality = 'ultra' $$, '23514',
  'la calidad es low, medium o high');
select test.lives($$
  insert into public.seasonal_ai_cards (id, loteria_id, position, number, name, scene, input_source) values
    ('00000000-0000-0000-0000-0000000057c1', '00000000-0000-0000-0000-0000000057b1', 0, 6, 'LA SIRENA', 'una sirena con gorro de Santa', 'base'),
    ('00000000-0000-0000-0000-0000000057c2', '00000000-0000-0000-0000-0000000057b1', 1, 60, 'EL RENO', 'un reno', 'none')
$$, 'un administrador guarda la lista de cartas');
select test.throws($$
  insert into public.seasonal_ai_cards (loteria_id, position, number, name, input_source) values
    ('00000000-0000-0000-0000-0000000057b1', 2, 55, 'LA CARTA 55', 'base')
$$, '23514', 'solo las cartas 1 a 54 pueden partir de la baraja base');
select test.throws($$
  insert into public.seasonal_ai_cards (loteria_id, position, number, name) values
    ('00000000-0000-0000-0000-0000000057b1', 0, 7, 'REPETIDA')
$$, '23505', 'dos cartas no ocupan el mismo lugar');
select test.throws($$
  insert into public.seasonal_ai_cards (loteria_id, position, number, name) values
    ('00000000-0000-0000-0000-0000000057b1', 3, 8, '')
$$, '23514', 'una carta lleva nombre');
select test.throws($$
  insert into public.seasonal_ai_attempts (card_id, path, quality, prompt) values
    ('00000000-0000-0000-0000-0000000057c1', 'x.webp', 'low', 'p')
$$, '42501', 'un administrador no registra intentos: los registra el servidor');
select test.throws($$
  insert into storage.objects (bucket_id, name) values ('seasonal-ai', 'x.webp')
$$, '42501', 'un administrador no sube intentos: los sube el servidor');

-- El servidor registra un intento
select test.as_service_role();
insert into public.seasonal_ai_attempts (id, card_id, path, quality, prompt) values
  ('00000000-0000-0000-0000-0000000057d1', '00000000-0000-0000-0000-0000000057c1',
   '00000000-0000-0000-0000-0000000057b1/00000000-0000-0000-0000-0000000057c1/00000000-0000-0000-0000-0000000057d1.webp', 'low', 'p');
insert into storage.objects (bucket_id, name) values
  ('seasonal-ai', '00000000-0000-0000-0000-0000000057b1/00000000-0000-0000-0000-0000000057c1/00000000-0000-0000-0000-0000000057d1.webp');
update public.seasonal_ai_cards set chosen_attempt_id = '00000000-0000-0000-0000-0000000057d1'
  where id = '00000000-0000-0000-0000-0000000057c1';

select test.as_user('00000000-0000-0000-0000-000000005701');
select test.is((select count(*)::int from public.seasonal_ai_attempts), 1, 'un administrador ve los intentos');
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-ai'), 1,
  'un administrador ve los archivos de los intentos');
select test.lives($$
  update public.seasonal_ai_cards set scene = 'una sirena adornando un pino' where id = '00000000-0000-0000-0000-0000000057c1'
$$, 'un administrador cambia la escena de una carta');

-- Usuario
select test.as_user('00000000-0000-0000-0000-000000005702');
select test.is((select count(*)::int from public.seasonal_ai_builds), 0, 'un usuario no ve el prompt general');
select test.is((select count(*)::int from public.seasonal_ai_cards), 0, 'un usuario no ve las cartas');
select test.is((select count(*)::int from public.seasonal_ai_attempts), 0, 'un usuario no ve los intentos');
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-ai'), 0,
  'un usuario no ve los archivos de los intentos');
select test.throws($$
  insert into public.seasonal_ai_cards (loteria_id, position, number, name) values
    ('00000000-0000-0000-0000-0000000057b1', 5, 9, 'INTRUSA')
$$, '42501', 'un usuario no puede agregar cartas');

-- Visitante
select test.as_anon();
select test.throws($$ select general_prompt from public.seasonal_ai_builds $$, '42501',
  'un visitante no puede consultar el prompt general');
select test.throws($$ select scene from public.seasonal_ai_cards $$, '42501',
  'un visitante no puede consultar las cartas');

-- Borrar
select test.as_user('00000000-0000-0000-0000-000000005701');
select test.lives($$ delete from public.seasonal_ai_attempts where id = '00000000-0000-0000-0000-0000000057d1' $$,
  'un administrador borra un intento');
select test.is((select chosen_attempt_id from public.seasonal_ai_cards where id = '00000000-0000-0000-0000-0000000057c1'),
  null::uuid, 'al borrar el intento elegido, la carta queda sin elegido');
select test.lives($$ delete from storage.objects where bucket_id = 'seasonal-ai' $$,
  'un administrador borra los archivos de los intentos');

select test.as_service_role();
delete from public.seasonal_loterias where id = '00000000-0000-0000-0000-0000000057b1';
select test.is((select count(*)::int from public.seasonal_ai_cards), 0,
  'al borrar la lotería se borran sus cartas generadas');
select test.is((select count(*)::int from public.seasonal_ai_builds), 0,
  'al borrar la lotería se borra su prompt general');

rollback;
