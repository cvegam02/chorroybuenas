-- Cartas guardadas en privado para seguir armando una lotería temática (FEAT-48, decisión 18; migración 052).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005201', 'admin-cartas@test.dev'),
  ('00000000-0000-0000-0000-000000005202', 'usuario-cartas@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005201');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000052a1', 'Ocasiones');
insert into public.seasonal_loterias (id, season_id, name_es) values
  ('00000000-0000-0000-0000-0000000052b1', '00000000-0000-0000-0000-0000000052a1', 'Baby shower');

-- Espacio de archivos
select test.is((select public from storage.buckets where id = 'seasonal-cards'), false,
  'el espacio de las cartas es privado');
select test.is((select file_size_limit from storage.buckets where id = 'seasonal-cards'), 5242880::bigint,
  'una carta pesa como máximo 5 MB');
select test.is((select allowed_mime_types from storage.buckets where id = 'seasonal-cards'),
  array['image/jpeg'], 'el espacio de las cartas solo acepta las cartas ya preparadas en JPEG');

-- La ficha que lee el público no lleva las cartas
select test.is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'seasonal_loterias' and column_name like '%card%' and column_name <> 'card_count'),
  0, 'la ficha pública no tiene columnas de las cartas guardadas');

-- Administrador
select test.as_user('00000000-0000-0000-0000-000000005201');
select test.lives($$
  insert into storage.objects (bucket_id, name)
  values ('seasonal-cards', '00000000-0000-0000-0000-0000000052b1/1.jpg'),
         ('seasonal-cards', '00000000-0000-0000-0000-0000000052b1/2.jpg')
$$, 'un administrador sube cartas');
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-cards'), 2,
  'un administrador lee las cartas');
select test.lives($$
  insert into public.seasonal_loteria_builds (loteria_id, cards, boards)
  values ('00000000-0000-0000-0000-0000000052b1',
          '[{"path":"00000000-0000-0000-0000-0000000052b1/1.jpg","fileName":"1.png","offRatio":false},
            {"path":"00000000-0000-0000-0000-0000000052b1/2.jpg","fileName":"2.png","offRatio":true}]',
          '[]')
$$, 'un administrador guarda las cartas y su orden');
select test.lives($$
  update public.seasonal_loteria_builds set boards = '[[1,0],[0,1]]', pdf_is_current = true
$$, 'un administrador guarda el acomodo de los tableros');
select test.is((select jsonb_array_length(cards) from public.seasonal_loteria_builds), 2,
  'un administrador lee las cartas guardadas');
select test.throws($$ update public.seasonal_loteria_builds set cards = '{}' $$,
  '23514', 'las cartas son una lista');
select test.throws($$ update public.seasonal_loteria_builds set boards = '"x"' $$,
  '23514', 'los tableros son una lista');
select test.lives($$
  delete from storage.objects where bucket_id = 'seasonal-cards' and name = '00000000-0000-0000-0000-0000000052b1/2.jpg'
$$, 'un administrador quita una carta');

-- Usuario
select test.as_user('00000000-0000-0000-0000-000000005202');
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-cards'), 0,
  'un usuario no puede ver las cartas');
select test.is((select count(*)::int from public.seasonal_loteria_builds), 0,
  'un usuario no ve las cartas guardadas');
select test.throws($$
  insert into storage.objects (bucket_id, name) values ('seasonal-cards', 'intrusa.jpg')
$$, '42501', 'un usuario no puede subir cartas');
select test.throws($$
  insert into public.seasonal_loteria_builds (loteria_id) values ('00000000-0000-0000-0000-0000000052b1')
$$, '42501', 'un usuario no puede guardar cartas');
update public.seasonal_loteria_builds set cards = '[]';
delete from public.seasonal_loteria_builds;
delete from storage.objects where bucket_id = 'seasonal-cards';

-- Visitante
select test.as_anon();
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-cards'), 0,
  'un visitante no puede ver las cartas');
select test.throws($$ select cards from public.seasonal_loteria_builds $$,
  '42501', 'un visitante no puede consultar las cartas guardadas');
select test.throws($$
  insert into storage.objects (bucket_id, name) values ('seasonal-cards', 'intrusa.jpg')
$$, '42501', 'un visitante no puede subir cartas');

select test.as_postgres();
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-cards'), 1,
  'los intentos de usuarios y visitantes no borraron cartas');
select test.is((select jsonb_array_length(cards) from public.seasonal_loteria_builds), 2,
  'los intentos de usuarios no cambiaron las cartas guardadas');

-- Al borrar la lotería se van sus cartas guardadas
delete from public.seasonal_loterias where id = '00000000-0000-0000-0000-0000000052b1';
select test.is((select count(*)::int from public.seasonal_loteria_builds), 0,
  'al borrar una lotería se borra el registro de sus cartas');

rollback;
