-- Publicar exige también el número de cartas y de tableros (migración 030).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000071', 'admin-conteos@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000071');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000000a71', 'Pascua');

insert into public.seasonal_loterias
  (id, season_id, name_es, description_es, price_cents, cover_path, card_count, board_count) values
  ('00000000-0000-0000-0000-000000000b71', '00000000-0000-0000-0000-000000000a71', 'Completa', 'Lista', 4900, 'p.jpg', 54, 10),
  ('00000000-0000-0000-0000-000000000b72', '00000000-0000-0000-0000-000000000a71', 'Sin cartas', 'Lista', 4900, 'p.jpg', null, 10),
  ('00000000-0000-0000-0000-000000000b73', '00000000-0000-0000-0000-000000000a71', 'Sin tableros', 'Lista', 4900, 'p.jpg', 54, null);
insert into public.seasonal_loteria_files (loteria_id, pdf_path, pdf_name, pdf_size_bytes)
select id, id || '/1.pdf', 'loteria.pdf', 1024 from public.seasonal_loterias
 where season_id = '00000000-0000-0000-0000-000000000a71';

select test.as_user('00000000-0000-0000-0000-000000000071');

select test.lives($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-000000000b71'
$$, 'con número de cartas y de tableros se puede publicar');
select test.throws($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-000000000b72'
$$, '23514', 'sin número de cartas no se puede publicar');
select test.throws($$
  update public.seasonal_loterias set is_published = true where id = '00000000-0000-0000-0000-000000000b73'
$$, '23514', 'sin número de tableros no se puede publicar');
select test.throws($$
  update public.seasonal_loterias set card_count = null where id = '00000000-0000-0000-0000-000000000b71'
$$, '23514', 'a una lotería publicada no se le puede quitar el número de cartas');
select test.throws($$
  update public.seasonal_loterias set board_count = null where id = '00000000-0000-0000-0000-000000000b71'
$$, '23514', 'a una lotería publicada no se le puede quitar el número de tableros');
select test.lives($$
  update public.seasonal_loterias set card_count = 54, is_published = true
   where id = '00000000-0000-0000-0000-000000000b72'
$$, 'al llenar el dato que faltaba, se puede publicar');
select test.lives($$
  update public.seasonal_loterias set is_published = false, card_count = null, board_count = null
   where id = '00000000-0000-0000-0000-000000000b71'
$$, 'un borrador puede quedarse sin número de cartas ni de tableros');

rollback;
