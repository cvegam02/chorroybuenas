-- Juegos de tableros tradicionales guardados en «Mi cuenta» (FEAT-53, US A5; migración 059).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005901', 'duena-tradicional@test.dev'),
  ('00000000-0000-0000-0000-000000005902', 'otra-tradicional@test.dev');

-- La dueña guarda un juego: el dueño se llena solo con quien tiene la sesión.
select test.as_user('00000000-0000-0000-0000-000000005901');
select test.lives($$
  insert into public.traditional_games (id, name, grid_size, boards) values
    ('00000000-0000-0000-0000-000000005911', 'Posada', 16,
     '[{"id":"a","cards":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],"fixed":[]}]')
$$, 'la dueña guarda un juego');
select test.is((select user_id from public.traditional_games where id = '00000000-0000-0000-0000-000000005911'),
  '00000000-0000-0000-0000-000000005901'::uuid, 'el juego queda a nombre de quien lo guardó');
select test.lives($$
  insert into public.traditional_games (id, name, grid_size) values
    ('00000000-0000-0000-0000-000000005912', 'Escuela', 9)
$$, 'puede tener varios juegos; uno nuevo empieza sin tableros');
select test.is((select boards from public.traditional_games where id = '00000000-0000-0000-0000-000000005912'),
  '[]'::jsonb, 'un juego nuevo empieza sin tableros');
select test.is((select count(*)::int from public.traditional_games), 2, 'la dueña ve sus dos juegos');

-- Cambiar un juego: nombre y tableros; la fecha de cambio se actualiza sola.
update public.traditional_games set updated_at = now() - interval '1 day'
  where id = '00000000-0000-0000-0000-000000005911';
select test.lives($$
  update public.traditional_games set name = 'Posada 2026', boards = '[]' where id = '00000000-0000-0000-0000-000000005911'
$$, 'la dueña cambia el nombre y los tableros');
select test.ok((select updated_at > now() - interval '1 minute' from public.traditional_games
  where id = '00000000-0000-0000-0000-000000005911'), 'al cambiarlo se actualiza la fecha de cambio');

-- Lo que no se acepta.
select test.throws($$
  insert into public.traditional_games (name, grid_size) values ('Grande', 25)
$$, '23514', 'solo hay tableros de 3 × 3 o 4 × 4');
select test.throws($$
  insert into public.traditional_games (name, grid_size, boards) values ('Raro', 16, '{"a":1}')
$$, '23514', 'los tableros son una lista');
select test.throws($$
  insert into public.traditional_games (name, grid_size, boards)
  select 'Muchos', 9, jsonb_agg('{}'::jsonb) from generate_series(1, 51)
$$, '23514', 'no caben más de 50 tableros');
select test.throws($$
  insert into public.traditional_games (name, grid_size) values ('   ', 16)
$$, '23514', 'el nombre no puede quedar vacío');
select test.throws($$
  insert into public.traditional_games (name, grid_size) values (repeat('x', 81), 16)
$$, '23514', 'el nombre tiene un límite de 80 letras');
select test.throws($$
  insert into public.traditional_games (user_id, name, grid_size)
  values ('00000000-0000-0000-0000-000000005902', 'Ajeno', 16)
$$, '42501', 'no se puede guardar un juego a nombre de otra persona');

-- Otra usuaria no ve, no cambia y no borra los juegos ajenos.
select test.as_user('00000000-0000-0000-0000-000000005902');
select test.is((select count(*)::int from public.traditional_games), 0, 'otra usuaria no ve juegos ajenos');
update public.traditional_games set name = 'Robado' where id = '00000000-0000-0000-0000-000000005911';
delete from public.traditional_games where id = '00000000-0000-0000-0000-000000005912';

-- Sin sesión no hay acceso.
select test.as_anon();
select test.throws($$ select count(*) from public.traditional_games $$, '42501', 'sin sesión no se pueden leer juegos');
select test.throws($$
  insert into public.traditional_games (name, grid_size) values ('Visitante', 16)
$$, '42501', 'sin sesión no se pueden guardar juegos');

select test.as_user('00000000-0000-0000-0000-000000005901');
select test.is((select name from public.traditional_games where id = '00000000-0000-0000-0000-000000005911'),
  'Posada 2026', 'otra usuaria no pudo cambiar el juego');
select test.is((select count(*)::int from public.traditional_games), 2, 'otra usuaria no pudo borrar el juego');

-- La dueña borra su juego.
delete from public.traditional_games where id = '00000000-0000-0000-0000-000000005912';
select test.is((select count(*)::int from public.traditional_games), 1, 'la dueña borra su juego');

rollback;
