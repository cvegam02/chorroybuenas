-- Posición de «TABLERO N» en los tableros de una lotería (FEAT-67, US A4; migración 080).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000008001', 'duena-titulo@test.dev'),
  ('00000000-0000-0000-0000-000000008002', 'otra-titulo@test.dev');

select test.as_user('00000000-0000-0000-0000-000000008001');
insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-000000008011', '00000000-0000-0000-0000-000000008001', 'Mi lotería');

select test.is((select board_title_position from public.loteria_sets where id = '00000000-0000-0000-0000-000000008011'),
  'center', 'una lotería nueva lleva el título al centro');

select test.lives($$
  update public.loteria_sets set board_title_position = 'left' where id = '00000000-0000-0000-0000-000000008011'
$$, 'la dueña pone el título a la izquierda');
select test.lives($$
  update public.loteria_sets set board_title_position = 'right' where id = '00000000-0000-0000-0000-000000008011'
$$, 'la dueña pone el título a la derecha');
select test.is((select board_title_position from public.loteria_sets where id = '00000000-0000-0000-0000-000000008011'),
  'right', 'la posición se guarda en la lotería');

select test.throws($$
  update public.loteria_sets set board_title_position = 'arriba' where id = '00000000-0000-0000-0000-000000008011'
$$, '23514', 'no se acepta una posición que no existe');
select test.throws($$
  update public.loteria_sets set board_title_position = null where id = '00000000-0000-0000-0000-000000008011'
$$, '23502', 'la posición no puede quedar vacía');

select test.as_user('00000000-0000-0000-0000-000000008002');
update public.loteria_sets set board_title_position = 'left' where id = '00000000-0000-0000-0000-000000008011';

select test.as_user('00000000-0000-0000-0000-000000008001');
select test.is((select board_title_position from public.loteria_sets where id = '00000000-0000-0000-0000-000000008011'),
  'right', 'otra usuaria no puede cambiar la posición de una lotería ajena');

rollback;
