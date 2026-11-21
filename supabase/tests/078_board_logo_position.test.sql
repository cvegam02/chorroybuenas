-- Posición del logo en los tableros de una lotería (FEAT-67, US A4; migración 078).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000007801', 'duena-logo@test.dev'),
  ('00000000-0000-0000-0000-000000007802', 'otra-logo@test.dev');

select test.as_user('00000000-0000-0000-0000-000000007801');
insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-000000007811', '00000000-0000-0000-0000-000000007801', 'Mi lotería');

select test.is((select board_logo_position from public.loteria_sets where id = '00000000-0000-0000-0000-000000007811'),
  'center', 'una lotería nueva lleva el logo al centro');

select test.lives($$
  update public.loteria_sets set board_logo_position = 'left' where id = '00000000-0000-0000-0000-000000007811'
$$, 'la dueña pone el logo a la izquierda');
select test.lives($$
  update public.loteria_sets set board_logo_position = 'right' where id = '00000000-0000-0000-0000-000000007811'
$$, 'la dueña pone el logo a la derecha');
select test.is((select board_logo_position from public.loteria_sets where id = '00000000-0000-0000-0000-000000007811'),
  'right', 'la posición se guarda en la lotería');

select test.throws($$
  update public.loteria_sets set board_logo_position = 'arriba' where id = '00000000-0000-0000-0000-000000007811'
$$, '23514', 'no se acepta una posición que no existe');
select test.throws($$
  update public.loteria_sets set board_logo_position = null where id = '00000000-0000-0000-0000-000000007811'
$$, '23502', 'la posición no puede quedar vacía');

select test.as_user('00000000-0000-0000-0000-000000007802');
update public.loteria_sets set board_logo_position = 'left' where id = '00000000-0000-0000-0000-000000007811';

select test.as_user('00000000-0000-0000-0000-000000007801');
select test.is((select board_logo_position from public.loteria_sets where id = '00000000-0000-0000-0000-000000007811'),
  'right', 'otra usuaria no puede cambiar la posición de una lotería ajena');

rollback;
