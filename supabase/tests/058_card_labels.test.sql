-- Qué se ve en las cartas de una lotería: nombre y número, solo nombre, solo número o nada
-- (FEAT-51, decisiones 1, 4 y 5; migración 058).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005801', 'duena-etiquetas@test.dev'),
  ('00000000-0000-0000-0000-000000005802', 'otra-etiquetas@test.dev');

select test.as_user('00000000-0000-0000-0000-000000005801');
insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-000000005811', '00000000-0000-0000-0000-000000005801', 'Mi lotería'),
  ('00000000-0000-0000-0000-000000005812', '00000000-0000-0000-0000-000000005801', 'Otra lotería');

select test.is((select card_labels from public.loteria_sets where id = '00000000-0000-0000-0000-000000005811'),
  'both', 'una lotería nueva empieza con nombre y número');

select test.lives($$
  update public.loteria_sets set card_labels = 'name' where id = '00000000-0000-0000-0000-000000005811'
$$, 'la dueña elige solo nombre');
select test.lives($$
  update public.loteria_sets set card_labels = 'number' where id = '00000000-0000-0000-0000-000000005811'
$$, 'la dueña elige solo número');
select test.lives($$
  update public.loteria_sets set card_labels = 'none' where id = '00000000-0000-0000-0000-000000005811'
$$, 'la dueña elige que no se vea nada');
select test.is((select card_labels from public.loteria_sets where id = '00000000-0000-0000-0000-000000005811'),
  'none', 'el ajuste se guarda en la lotería');
select test.is((select card_labels from public.loteria_sets where id = '00000000-0000-0000-0000-000000005812'),
  'both', 'el ajuste de una lotería no cambia el de otra');

select test.throws($$
  update public.loteria_sets set card_labels = 'titulo' where id = '00000000-0000-0000-0000-000000005811'
$$, '23514', 'no se acepta una opción que no existe');
select test.throws($$
  update public.loteria_sets set card_labels = null where id = '00000000-0000-0000-0000-000000005811'
$$, '23502', 'el ajuste no puede quedar vacío');

select test.as_user('00000000-0000-0000-0000-000000005802');
update public.loteria_sets set card_labels = 'both' where id = '00000000-0000-0000-0000-000000005811';

select test.as_user('00000000-0000-0000-0000-000000005801');
select test.is((select card_labels from public.loteria_sets where id = '00000000-0000-0000-0000-000000005811'),
  'none', 'otra usuaria no puede cambiar el ajuste de una lotería ajena');

rollback;
