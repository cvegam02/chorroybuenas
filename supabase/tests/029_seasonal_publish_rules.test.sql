-- Reglas para publicar y borrar una lotería de temporada (migración 029).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000061', 'admin-publicar@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000061');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000000e1', 'Halloween');

-- f1 está completa; a cada una de las demás le falta una sola cosa.
insert into public.seasonal_loterias (id, season_id, name_es, description_es, price_cents, cover_path, card_count, board_count) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'Completa', 'Lista', 4900, 'f1/portada.jpg', 54, 10),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e1', 'Sin descripción', null, 4900, 'f2/portada.jpg', 54, 10),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000e1', 'Sin precio', 'Lista', null, 'f3/portada.jpg', 54, 10),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000e1', 'Sin portada', 'Lista', 4900, null, 54, 10),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000e1', 'Sin PDF', 'Lista', 4900, 'f5/portada.jpg', 54, 10),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000e1', 'Descripción en blanco', '   ', 4900, 'f6/portada.jpg', 54, 10);
insert into public.seasonal_loteria_files (loteria_id, pdf_path, pdf_name, pdf_size_bytes)
select id, id || '/1.pdf', 'loteria.pdf', 1024
  from public.seasonal_loterias
 where id <> '00000000-0000-0000-0000-0000000000f5';

select test.as_user('00000000-0000-0000-0000-000000000061');

-- Publicar
select test.lives($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-0000000000f1'
$$, 'una lotería completa se puede publicar');
select test.throws($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-0000000000f2'
$$, '23514', 'sin descripción no se puede publicar');
select test.throws($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-0000000000f3'
$$, '23514', 'sin precio no se puede publicar');
select test.throws($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-0000000000f4'
$$, '23514', 'sin portada no se puede publicar');
select test.throws($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-0000000000f5'
$$, '23514', 'sin PDF no se puede publicar');
select test.throws($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-0000000000f6'
$$, '23514', 'una descripción en blanco no cuenta como descripción');
select test.throws($$
  insert into public.seasonal_loterias (season_id, name_es, description_es, price_cents, cover_path, card_count, board_count, is_published)
  values ('00000000-0000-0000-0000-0000000000e1', 'Directa', 'Lista', 4900, 'x/portada.jpg', 54, 10, true)
$$, '23514', 'una lotería no puede nacer publicada: todavía no tiene PDF');
select test.lives($$
  update public.seasonal_loterias set description_es = 'Ahora sí', is_published = true
   where id = '00000000-0000-0000-0000-0000000000f2'
$$, 'al completar lo que faltaba, se puede publicar');

-- Una lotería publicada no puede quedar incompleta
select test.throws($$
  update public.seasonal_loterias set description_es = null where id = '00000000-0000-0000-0000-0000000000f1'
$$, '23514', 'a una lotería publicada no se le puede quitar la descripción');
select test.throws($$
  update public.seasonal_loterias set price_cents = null where id = '00000000-0000-0000-0000-0000000000f1'
$$, '23514', 'a una lotería publicada no se le puede quitar el precio');
select test.throws($$
  update public.seasonal_loterias set cover_path = null where id = '00000000-0000-0000-0000-0000000000f1'
$$, '23514', 'a una lotería publicada no se le puede quitar la portada');
select test.throws($$
  delete from public.seasonal_loteria_files where loteria_id = '00000000-0000-0000-0000-0000000000f1'
$$, '23514', 'a una lotería publicada no se le puede quitar el PDF');
select test.lives($$
  update public.seasonal_loteria_files set pdf_path = 'f1/2.pdf', pdf_name = 'nueva.pdf'
   where loteria_id = '00000000-0000-0000-0000-0000000000f1'
$$, 'el PDF de una lotería publicada se puede reemplazar');
select test.lives($$
  update public.seasonal_loterias set price_cents = 5900, valid_from = now() + interval '1 day'
   where id = '00000000-0000-0000-0000-0000000000f1'
$$, 'una lotería publicada se puede seguir editando y programando');

-- Despublicar
select test.lives($$
  update public.seasonal_loterias set is_published = false, cover_path = null
   where id = '00000000-0000-0000-0000-0000000000f1'
$$, 'despublicar siempre se puede, aunque quede incompleta');
select test.lives($$
  delete from public.seasonal_loteria_files where loteria_id = '00000000-0000-0000-0000-0000000000f1'
$$, 'a un borrador sí se le puede quitar el PDF');

-- Borrar (sin ventas; el bloqueo por ventas llega con las compras)
select test.lives($$
  delete from public.seasonal_loterias where id = '00000000-0000-0000-0000-0000000000f2'
$$, 'una lotería publicada sin ventas se puede borrar');
select test.is(
  (select count(*)::int from public.seasonal_loteria_files
    where loteria_id = '00000000-0000-0000-0000-0000000000f2'),
  0, 'al borrar una lotería se borra el registro de su PDF');

rollback;
