-- Imagen propia de fondo de los tableros (FEAT-67, US A2; migración 079).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000007901', 'duena-imagen@test.dev'),
  ('00000000-0000-0000-0000-000000007902', 'otra-imagen@test.dev');

select test.as_user('00000000-0000-0000-0000-000000007901');
insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-000000007911', '00000000-0000-0000-0000-000000007901', 'Mi lotería');

select test.is((select board_background_image_path from public.loteria_sets where id = '00000000-0000-0000-0000-000000007911'),
  null, 'una lotería nueva no tiene imagen de fondo');
select test.is((select board_background_lighten from public.loteria_sets where id = '00000000-0000-0000-0000-000000007911'),
  true, '«Aclarar la imagen» empieza encendido');

select test.lives($$
  update public.loteria_sets
  set board_background = 'imagen',
      board_background_image_path = '00000000-0000-0000-0000-000000007901/board-bg-00000000-0000-0000-0000-000000007911_1.jpg',
      board_background_lighten = false
  where id = '00000000-0000-0000-0000-000000007911'
$$, 'la dueña guarda su imagen, en su carpeta, sin aclarar');
select test.is((select board_background from public.loteria_sets where id = '00000000-0000-0000-0000-000000007911'),
  'imagen', 'el fondo elegido es la imagen');

select test.throws($$
  update public.loteria_sets
  set board_background_image_path = '00000000-0000-0000-0000-000000007902/board-bg-x_1.jpg'
  where id = '00000000-0000-0000-0000-000000007911'
$$, '23514', 'la imagen no puede estar en la carpeta de otra persona');
select test.throws($$
  update public.loteria_sets
  set board_background_image_path = '00000000-0000-0000-0000-000000007901/carta_1.jpg'
  where id = '00000000-0000-0000-0000-000000007911'
$$, '23514', 'la imagen tiene que ser un archivo de fondo, no el de una carta');
select test.throws($$
  update public.loteria_sets set board_background_lighten = null where id = '00000000-0000-0000-0000-000000007911'
$$, '23502', '«Aclarar la imagen» no puede quedar vacío');

select test.as_user('00000000-0000-0000-0000-000000007902');
update public.loteria_sets set board_background_lighten = true where id = '00000000-0000-0000-0000-000000007911';

select test.as_user('00000000-0000-0000-0000-000000007901');
select test.is((select board_background_lighten from public.loteria_sets where id = '00000000-0000-0000-0000-000000007911'),
  false, 'otra usuaria no puede cambiar la imagen de una lotería ajena');

rollback;
