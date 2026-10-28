-- Tableros sin pérdidas y con tope (FEAT-58, US A10; migración 074): se reemplazan todos en una sola transacción y
-- una lotería tiene como máximo 200 tableros (decisión 4).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000007401', 'tableros@test.dev'),
  ('00000000-0000-0000-0000-000000007402', 'ajena-tableros@test.dev');
insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000074a1', '00000000-0000-0000-0000-000000007401', 'Kids'),
  ('00000000-0000-0000-0000-0000000074a2', '00000000-0000-0000-0000-000000007401', 'Otra');
insert into public.cards (id, user_id, set_id, title)
select ('00000000-0000-0000-0000-0000000074' || lpad(i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-000000007401',
  '00000000-0000-0000-0000-0000000074a1', 'Carta ' || i
from generate_series(10, 24) i;
insert into public.cards (id, user_id, set_id, title) values
  ('00000000-0000-0000-0000-0000000074ff', '00000000-0000-0000-0000-000000007401', '00000000-0000-0000-0000-0000000074a2', 'De otra');

-- Un tablero de Kids: 9 cartas de la lotería
create temp table t_board as select jsonb_agg(id order by title) as cards
from (select id, title from public.cards where set_id = '00000000-0000-0000-0000-0000000074a1' order by title limit 9) c;
grant select on t_board to authenticated;

select test.as_user('00000000-0000-0000-0000-000000007401');
select test.is(
  (select array_length(public.replace_set_boards('00000000-0000-0000-0000-0000000074a1', 9,
    (select jsonb_build_array(cards, cards) from t_board)), 1)),
  2, 'se guardan los tableros nuevos y devuelve sus ids');
select test.is((select count(*)::int from public.boards where set_id = '00000000-0000-0000-0000-0000000074a1'), 2,
  'la lotería tiene 2 tableros');
select test.is((select count(*)::int from public.board_cards bc join public.boards b on b.id = bc.board_id
  where b.set_id = '00000000-0000-0000-0000-0000000074a1'), 18, 'cada uno con sus 9 cartas');
select test.is((select array_agg(position order by position) from public.board_cards
  where board_id = (select id from public.boards where set_id = '00000000-0000-0000-0000-0000000074a1' limit 1)),
  array[0, 1, 2, 3, 4, 5, 6, 7, 8]::smallint[], 'en su orden');

select public.replace_set_boards('00000000-0000-0000-0000-0000000074a1', 9,
  (select jsonb_build_array(cards, cards, cards) from t_board));
select test.is((select count(*)::int from public.boards where set_id = '00000000-0000-0000-0000-0000000074a1'), 3,
  'regenerar reemplaza los anteriores');

-- Todo o nada: con un error, se quedan los tableros de antes
select test.throws($$
  select public.replace_set_boards('00000000-0000-0000-0000-0000000074a1', 9,
    (select jsonb_build_array(cards, (cards || '["00000000-0000-0000-0000-0000000074ff"]'::jsonb) - 0) from t_board))
$$, 'INVALID_BOARD', 'una carta de otra lotería se rechaza');
select test.throws($$
  select public.replace_set_boards('00000000-0000-0000-0000-0000000074a1', 9,
    (select jsonb_build_array(cards - 0) from t_board))
$$, 'INVALID_BOARD', 'un tablero con menos cartas que su tamaño se rechaza');
select test.throws($$
  select public.replace_set_boards('00000000-0000-0000-0000-0000000074a1', 9,
    (select jsonb_agg(t.cards) from t_board t, generate_series(1, 201)))
$$, 'BOARD_LIMIT', 'más de 200 tableros se rechazan (decisión 4)');
select test.is((select count(*)::int from public.boards where set_id = '00000000-0000-0000-0000-0000000074a1'), 3,
  'tras cada error siguen los 3 tableros de antes');
select test.is(
  (select array_length(public.replace_set_boards('00000000-0000-0000-0000-0000000074a1', 9,
    (select jsonb_agg(t.cards) from t_board t, generate_series(1, 200))), 1)),
  200, '200 tableros sí se guardan');
select test.lives($$ select public.replace_set_boards('00000000-0000-0000-0000-0000000074a1', 9, '[]'::jsonb) $$,
  'una lista vacía deja la lotería sin tableros');

-- Nadie más
select test.as_user('00000000-0000-0000-0000-000000007402');
select test.throws($$
  select public.replace_set_boards('00000000-0000-0000-0000-0000000074a1', 9, (select jsonb_build_array(cards) from t_board))
$$, 'SET_NOT_FOUND', 'nadie reemplaza los tableros de una lotería ajena');

-- La base exige el tope aunque se inserte directo
select test.as_postgres();
insert into public.boards (user_id, set_id, grid_size)
select '00000000-0000-0000-0000-000000007401', '00000000-0000-0000-0000-0000000074a2', 16 from generate_series(1, 200);
select test.throws($$
  insert into public.boards (user_id, set_id, grid_size)
  values ('00000000-0000-0000-0000-000000007401', '00000000-0000-0000-0000-0000000074a2', 16)
$$, 'BOARD_LIMIT', 'el tablero 201 de una lotería no se guarda ni insertándolo directo');

rollback;
