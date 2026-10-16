-- Paso 5 del asistente de loterías temáticas (FEAT-48, US A5): «Guardar sin publicar», «Publicar» y
-- «Guardar cambios». La base no deja publicar una lotería incompleta ni guardar un precio menor a $10.00,
-- ni siquiera en un borrador (migraciones 027, 029 y 030); esta prueba lo confirma tal como escribe el
-- asistente, también con precio, fechas y publicar en una sola escritura.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005211', 'admin-publicar-asistente@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005211');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000052a2', 'Ocasiones');

-- c1 tiene todo menos el precio, como llega al paso 5; c2 es un borrador recién empezado.
insert into public.seasonal_loterias
  (id, season_id, name_es, description_es, price_cents, cover_path, card_count, board_count) values
  ('00000000-0000-0000-0000-0000000052c1', '00000000-0000-0000-0000-0000000052a2', 'Baby shower', 'Tierna', null, 'c1/portada.jpg', 32, 20),
  ('00000000-0000-0000-0000-0000000052c2', '00000000-0000-0000-0000-0000000052a2', 'Boda', null, null, null, null, null);
insert into public.seasonal_loteria_files (loteria_id, pdf_path, pdf_name, pdf_size_bytes)
values ('00000000-0000-0000-0000-0000000052c1', 'c1/1.pdf', 'loteria.pdf', 1024);

select test.as_user('00000000-0000-0000-0000-000000005211');

-- «Guardar sin publicar»
select test.throws($$
  update public.seasonal_loterias set price_cents = 500 where id = '00000000-0000-0000-0000-0000000052c1'
$$, '23514', 'un borrador no guarda un precio de $5.00');
select test.throws($$
  update public.seasonal_loterias set price_cents = 999 where id = '00000000-0000-0000-0000-0000000052c1'
$$, '23514', 'un borrador no guarda un precio de $9.99');
select test.lives($$
  update public.seasonal_loterias set price_cents = 1000 where id = '00000000-0000-0000-0000-0000000052c1'
$$, '$10.00 justos sí se guardan');
select test.lives($$
  update public.seasonal_loterias set price_cents = null where id = '00000000-0000-0000-0000-0000000052c1'
$$, 'un borrador puede quedarse sin precio');

-- «Publicar»: precio, fechas y publicar a la vez
select test.throws($$
  update public.seasonal_loterias set price_cents = null, valid_from = null, valid_until = null, is_published = true
   where id = '00000000-0000-0000-0000-0000000052c1'
$$, '23514', 'sin precio no se publica');
select test.throws($$
  update public.seasonal_loterias set price_cents = 500, valid_from = null, valid_until = null, is_published = true
   where id = '00000000-0000-0000-0000-0000000052c1'
$$, '23514', 'con precio de $5.00 no se publica');
select test.throws($$
  update public.seasonal_loterias set price_cents = 9000, valid_from = null, valid_until = null, is_published = true
   where id = '00000000-0000-0000-0000-0000000052c2'
$$, '23514', 'con precio pero sin descripción, cartas, tableros, PDF ni portada no se publica');
select test.is(
  (select count(*)::int from public.seasonal_loterias
    where id in ('00000000-0000-0000-0000-0000000052c1', '00000000-0000-0000-0000-0000000052c2')
      and is_published),
  0, 'ninguna de las dos quedó publicada');
select test.lives($$
  update public.seasonal_loterias set price_cents = 9000, valid_from = null, valid_until = null, is_published = true
   where id = '00000000-0000-0000-0000-0000000052c1'
$$, 'completa y con $90.00, se publica');

-- «Guardar cambios» de una publicada
select test.throws($$
  update public.seasonal_loterias set price_cents = 999 where id = '00000000-0000-0000-0000-0000000052c1'
$$, '23514', 'a una publicada no se le baja el precio de $10.00');
select test.throws($$
  update public.seasonal_loterias set description_es = '  ' where id = '00000000-0000-0000-0000-0000000052c1'
$$, '23514', 'a una publicada no se le deja la descripción en blanco');
select test.throws($$
  update public.seasonal_loterias set name_es = '  ' where id = '00000000-0000-0000-0000-0000000052c1'
$$, '23514', 'el nombre no puede quedar en blanco');
select test.lives($$
  update public.seasonal_loterias set price_cents = 12000, valid_until = now() + interval '30 days'
   where id = '00000000-0000-0000-0000-0000000052c1'
$$, 'una publicada guarda su precio y fechas nuevos');
select test.is(
  (select price_cents from public.seasonal_loterias where id = '00000000-0000-0000-0000-0000000052c1'),
  12000, 'el precio nuevo quedó guardado');

rollback;
