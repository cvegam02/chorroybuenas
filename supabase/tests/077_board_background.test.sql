-- Fondo de los tableros de una lotería (FEAT-67, US A1; migración 077).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000007701', 'duena-fondo@test.dev'),
  ('00000000-0000-0000-0000-000000007702', 'otra-fondo@test.dev');

select test.as_user('00000000-0000-0000-0000-000000007701');
insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-000000007711', '00000000-0000-0000-0000-000000007701', 'Mi lotería'),
  ('00000000-0000-0000-0000-000000007712', '00000000-0000-0000-0000-000000007701', 'Otra lotería');

select test.is((select board_background from public.loteria_sets where id = '00000000-0000-0000-0000-000000007711'),
  'crema', 'una lotería nueva empieza con el crema de siempre');

select test.lives($$
  update public.loteria_sets set board_background = 'papel-picado' where id = '00000000-0000-0000-0000-000000007711'
$$, 'la dueña elige un fondo');
select test.is((select board_background from public.loteria_sets where id = '00000000-0000-0000-0000-000000007711'),
  'papel-picado', 'el fondo se guarda en la lotería');
select test.is((select board_background from public.loteria_sets where id = '00000000-0000-0000-0000-000000007712'),
  'crema', 'el fondo de una lotería no cambia el de otra');

select test.throws($$
  update public.loteria_sets set board_background = 'Fondo raro!' where id = '00000000-0000-0000-0000-000000007711'
$$, '23514', 'no se acepta un id con otra forma');
select test.throws($$
  update public.loteria_sets set board_background = repeat('a', 41) where id = '00000000-0000-0000-0000-000000007711'
$$, '23514', 'no se acepta un id demasiado largo');
select test.throws($$
  update public.loteria_sets set board_background = null where id = '00000000-0000-0000-0000-000000007711'
$$, '23502', 'el fondo no puede quedar vacío');

select test.as_user('00000000-0000-0000-0000-000000007702');
update public.loteria_sets set board_background = 'greca' where id = '00000000-0000-0000-0000-000000007711';

select test.as_user('00000000-0000-0000-0000-000000007701');
select test.is((select board_background from public.loteria_sets where id = '00000000-0000-0000-0000-000000007711'),
  'papel-picado', 'otra usuaria no puede cambiar el fondo de una lotería ajena');

rollback;
