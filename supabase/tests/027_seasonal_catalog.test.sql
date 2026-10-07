-- Catálogo de loterías de temporada: temporadas y fichas (migración 027).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000041', 'admin-temporada@test.dev'),
  ('00000000-0000-0000-0000-000000000042', 'usuario-temporada@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000041');

-- Administrador: temporadas
select test.as_user('00000000-0000-0000-0000-000000000041');
select test.lives($$
  insert into public.seasons (id, name_es, sort_order)
  values ('00000000-0000-0000-0000-0000000000a1', 'Día de Muertos', 1)
$$, 'un administrador crea una temporada');
select test.lives($$
  insert into public.seasons (id, name_es, name_en, sort_order)
  values ('00000000-0000-0000-0000-0000000000a2', 'Navidad', 'Christmas', 2)
$$, 'un administrador crea una temporada con nombre en inglés');
select test.lives($$
  update public.seasons set sort_order = 0 where id = '00000000-0000-0000-0000-0000000000a2'
$$, 'un administrador cambia el orden de una temporada');
select test.is(
  (select array_agg(name_es order by sort_order, name_es) from public.seasons),
  array['Navidad', 'Día de Muertos'], 'las temporadas se pueden leer en su orden');
select test.throws($$ insert into public.seasons (name_es) values ('   ') $$,
  '23514', 'una temporada sin nombre en español se rechaza');
select test.throws($$ insert into public.seasons (name_es, name_en) values ('Pascua', '  ') $$,
  '23514', 'un nombre en inglés en blanco se rechaza');
select test.throws(format($f$ insert into public.seasons (name_es) values (%L) $f$, repeat('x', 61)),
  '23514', 'un nombre de temporada de más de 60 caracteres se rechaza');

-- Administrador: loterías
select test.lives($$
  insert into public.seasonal_loterias (id, season_id, name_es)
  values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Calaveritas')
$$, 'un administrador guarda una lotería incompleta');
select test.is(
  (select is_published from public.seasonal_loterias where id = '00000000-0000-0000-0000-0000000000b1'),
  false, 'una lotería nueva nace sin publicar');
select test.lives($$
  insert into public.seasonal_loterias (id, season_id, name_es, price_cents, is_published)
  values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'Ofrenda', 4900, true)
$$, 'un administrador guarda una lotería publicada');
select test.lives($$
  insert into public.seasonal_loterias (id, season_id, name_es, is_published, valid_from)
  values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', 'Programada', true,
          now() + interval '1 day')
$$, 'un administrador programa una lotería a futuro');
select test.lives($$
  insert into public.seasonal_loterias (id, season_id, name_es, is_published, valid_until)
  values ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a1', 'Vencida', true,
          now() - interval '1 day')
$$, 'un administrador guarda una lotería cuya fecha de fin ya pasó');
select test.is((select count(*)::int from public.seasonal_loterias), 4,
  'el administrador ve todas las loterías, visibles o no');
select test.throws($$
  insert into public.seasonal_loterias (season_id, name_es, price_cents)
  values ('00000000-0000-0000-0000-0000000000a1', 'Barata', 999)
$$, '23514', 'un precio menor a $10.00 se rechaza');
select test.throws($$
  insert into public.seasonal_loterias (season_id, name_es, valid_from, valid_until)
  values ('00000000-0000-0000-0000-0000000000a1', 'Fechas al revés', now(), now() - interval '1 day')
$$, '23514', 'una fecha de fin anterior a la de inicio se rechaza');
select test.throws($$
  insert into public.seasonal_loterias (season_id, name_es, grid_size)
  values ('00000000-0000-0000-0000-0000000000a1', 'Modo raro', 25)
$$, '23514', 'solo existen los modos Clásico y Kids');
select test.throws($$
  insert into public.seasonal_loterias (season_id, name_es, card_count)
  values ('00000000-0000-0000-0000-0000000000a1', 'Sin cartas', 0)
$$, '23514', 'el número de cartas debe ser mayor que cero');
select test.throws($$ delete from public.seasons where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23503', 'una temporada con loterías no se puede borrar');
select test.lives($$ delete from public.seasons where id = '00000000-0000-0000-0000-0000000000a2' $$,
  'una temporada sin loterías se puede borrar');

-- Usuario normal: lee, no escribe
select test.as_user('00000000-0000-0000-0000-000000000042');
select test.is((select count(*)::int from public.seasons), 1, 'un usuario lee las temporadas');
select test.is(
  (select array_agg(name_es) from public.seasonal_loterias),
  array['Ofrenda'], 'un usuario solo ve loterías publicadas y dentro de sus fechas');
select test.throws($$ insert into public.seasons (name_es) values ('Intrusa') $$,
  '42501', 'un usuario no puede crear temporadas');
select test.throws($$
  insert into public.seasonal_loterias (season_id, name_es)
  values ('00000000-0000-0000-0000-0000000000a1', 'Intrusa')
$$, '42501', 'un usuario no puede crear loterías de temporada');
update public.seasons set name_es = 'Cambiada';
update public.seasonal_loterias set price_cents = 1000, is_published = true;
delete from public.seasonal_loterias;
delete from public.seasons where id = '00000000-0000-0000-0000-0000000000a2';

-- Visitante: lee, no escribe
select test.as_anon();
select test.is((select count(*)::int from public.seasons), 1, 'un visitante lee las temporadas');
select test.is(
  (select array_agg(name_es) from public.seasonal_loterias),
  array['Ofrenda'], 'un visitante solo ve loterías publicadas y dentro de sus fechas');
select test.throws($$ insert into public.seasons (name_es) values ('Intrusa') $$,
  '42501', 'un visitante no puede crear temporadas');
select test.throws($$
  insert into public.seasonal_loterias (season_id, name_es)
  values ('00000000-0000-0000-0000-0000000000a1', 'Intrusa')
$$, '42501', 'un visitante no puede crear loterías de temporada');
select test.throws($$ update public.seasons set name_es = 'Cambiada' $$,
  '42501', 'un visitante no puede cambiar temporadas');
select test.throws($$ update public.seasonal_loterias set price_cents = 1000 $$,
  '42501', 'un visitante no puede cambiar loterías de temporada');
select test.throws($$ delete from public.seasonal_loterias $$,
  '42501', 'un visitante no puede borrar loterías de temporada');

select test.as_postgres();
select test.is((select name_es from public.seasons), 'Día de Muertos',
  'los intentos de usuarios y visitantes no cambiaron las temporadas');
select test.is((select count(*)::int from public.seasonal_loterias), 4,
  'los intentos de usuarios y visitantes no borraron loterías');
select test.is(
  (select price_cents from public.seasonal_loterias where id = '00000000-0000-0000-0000-0000000000b2'),
  4900, 'los intentos de usuarios y visitantes no cambiaron precios');
select test.is(
  (select count(*)::int from public.seasonal_loterias where is_published),
  3, 'los intentos de usuarios y visitantes no publicaron borradores');

rollback;
