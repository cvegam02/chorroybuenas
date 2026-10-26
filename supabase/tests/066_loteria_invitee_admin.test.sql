-- El organizador administra a sus invitados y ve las fotos nuevas (FEAT-56, US B4; migración 066).
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000006601', 'organizadora-b4@test.dev', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-000000006602', 'invitado-b4@test.dev', '{"full_name":"Beto"}'),
  ('00000000-0000-0000-0000-000000006603', 'invitada-b4@test.dev', '{}'),
  ('00000000-0000-0000-0000-000000006604', 'extrano-b4@test.dev', '{}');

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000066a1', '00000000-0000-0000-0000-000000006601', 'Posada familiar'),
  ('00000000-0000-0000-0000-0000000066a2', '00000000-0000-0000-0000-000000006601', 'Sin enlace');

insert into public.loteria_invites (set_id, code, owner_seen_at)
values ('00000000-0000-0000-0000-0000000066a1', '6600000000000001', now() - interval '1 day');

insert into public.loteria_invitees (set_id, user_id, joined_at) values
  ('00000000-0000-0000-0000-0000000066a1', '00000000-0000-0000-0000-000000006602', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000066a1', '00000000-0000-0000-0000-000000006603', now() - interval '2 days');

-- Una carta de la organizadora, una vieja de Beto (ya vista) y dos nuevas: una de Beto y una de la invitada.
insert into public.cards (id, user_id, set_id, title, image_path, uploaded_by, created_at) values
  ('00000000-0000-0000-0000-0000000066c1', '00000000-0000-0000-0000-000000006601', '00000000-0000-0000-0000-0000000066a1',
   'La abuela', 'a.png', null, now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000066c2', '00000000-0000-0000-0000-000000006601', '00000000-0000-0000-0000-0000000066a1',
   'El tío', 'b.png', '00000000-0000-0000-0000-000000006602', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000066c3', '00000000-0000-0000-0000-000000006601', '00000000-0000-0000-0000-0000000066a1',
   'El perro', 'c.png', '00000000-0000-0000-0000-000000006602', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000066c4', '00000000-0000-0000-0000-000000006601', '00000000-0000-0000-0000-0000000066a1',
   'La prima', 'd.png', '00000000-0000-0000-0000-000000006603', now() - interval '30 minutes'),
  ('00000000-0000-0000-0000-0000000066c5', '00000000-0000-0000-0000-000000006601', '00000000-0000-0000-0000-0000000066a2',
   'Mía', 'e.png', null, now() - interval '10 minutes');

-- Las fotos nuevas: las que subieron los invitados desde la última vez que la organizadora abrió la lotería.
select test.as_user('00000000-0000-0000-0000-000000006601');
select test.is((select new_count from public.loteria_new_guest_cards() where set_id = '00000000-0000-0000-0000-0000000066a1'),
  2, 'la organizadora ve cuántas fotos nuevas tiene la lotería');
select test.is((select count(*)::int from public.loteria_new_guest_cards()), 1,
  'solo salen las loterías con fotos nuevas de invitados');

-- La lista de invitados, con cuántas fotos subió cada uno.
select test.is((select count(*)::int from public.list_loteria_invitees('00000000-0000-0000-0000-0000000066a1')), 2,
  'la organizadora ve a sus invitados');
select test.is((select card_count from public.list_loteria_invitees('00000000-0000-0000-0000-0000000066a1')
  where user_id = '00000000-0000-0000-0000-000000006602'), 2, 'con cuántas fotos subió cada uno');
select test.is((select full_name from public.list_loteria_invitees('00000000-0000-0000-0000-0000000066a1')
  where user_id = '00000000-0000-0000-0000-000000006602'), 'Beto', 'con el nombre de su cuenta');
select test.is((select full_name from public.list_loteria_invitees('00000000-0000-0000-0000-0000000066a1')
  where user_id = '00000000-0000-0000-0000-000000006603'), null, 'sin nombre si la cuenta no tiene');

-- Abrir la lotería: devuelve las cartas nuevas y el contador se borra.
select test.is((select array_agg(card_id order by card_id) from public.see_loteria_guest_cards('00000000-0000-0000-0000-0000000066a1')),
  array['00000000-0000-0000-0000-0000000066c3', '00000000-0000-0000-0000-0000000066c4']::uuid[],
  'al abrirla, la organizadora sabe cuáles cartas son nuevas');
select test.is((select count(*)::int from public.loteria_new_guest_cards()), 0, 'al abrirla, el contador se borra');
select test.is((select count(*)::int from public.see_loteria_guest_cards('00000000-0000-0000-0000-0000000066a1')), 0,
  'la siguiente vez ya no hay cartas nuevas');
select test.is((select count(*)::int from public.see_loteria_guest_cards('00000000-0000-0000-0000-0000000066a2')), 0,
  'una lotería sin enlace no tiene fotos nuevas');

-- Una foto que llega después vuelve a contar.
select test.as_postgres();
insert into public.cards (id, user_id, set_id, title, image_path, uploaded_by, created_at) values
  ('00000000-0000-0000-0000-0000000066c6', '00000000-0000-0000-0000-000000006601', '00000000-0000-0000-0000-0000000066a1',
   'El gato', 'f.png', '00000000-0000-0000-0000-000000006603', clock_timestamp() + interval '1 second');
select test.as_user('00000000-0000-0000-0000-000000006601');
select test.is((select new_count from public.loteria_new_guest_cards() where set_id = '00000000-0000-0000-0000-0000000066a1'),
  1, 'una foto subida después vuelve a contar como nueva');

-- Nadie más ve ni cambia esto.
select test.as_user('00000000-0000-0000-0000-000000006602');
select test.is((select count(*)::int from public.loteria_new_guest_cards()), 0, 'un invitado no ve el contador de la lotería');
select test.throws($$ select * from public.list_loteria_invitees('00000000-0000-0000-0000-0000000066a1') $$, 'P0001',
  'un invitado no ve la lista de invitados');
select test.throws($$ select * from public.see_loteria_guest_cards('00000000-0000-0000-0000-0000000066a1') $$, 'P0001',
  'un invitado no borra el contador');
select test.throws($$
  select public.remove_loteria_invitee('00000000-0000-0000-0000-0000000066a1', '00000000-0000-0000-0000-000000006603')
$$, 'P0001', 'un invitado no quita a otro');
select test.as_user('00000000-0000-0000-0000-000000006604');
select test.throws($$
  select public.remove_loteria_invitee('00000000-0000-0000-0000-0000000066a1', '00000000-0000-0000-0000-000000006602')
$$, 'P0001', 'un extraño no quita invitados');

-- Quitar a un invitado: pierde el acceso, sus fotos se quedan y ya no sale en la lista.
select test.as_user('00000000-0000-0000-0000-000000006601');
select test.lives($$
  select public.remove_loteria_invitee('00000000-0000-0000-0000-0000000066a1', '00000000-0000-0000-0000-000000006602')
$$, 'la organizadora quita a un invitado');
select test.is((select count(*)::int from public.list_loteria_invitees('00000000-0000-0000-0000-0000000066a1')), 1,
  'el invitado quitado ya no sale en la lista');
select test.is((select count(*)::int from public.cards where uploaded_by = '00000000-0000-0000-0000-000000006602'), 2,
  'las fotos del invitado quitado se quedan en la lotería');
select test.throws($$
  select public.remove_loteria_invitee('00000000-0000-0000-0000-0000000066a1', '00000000-0000-0000-0000-000000006602')
$$, 'P0001', 'no se quita dos veces al mismo invitado');
select test.as_user('00000000-0000-0000-0000-000000006602');
select test.is((select count(*)::int from public.cards), 0, 'el invitado quitado ya no ve las cartas');
select test.throws($$ select public.join_loteria('6600000000000001') $$, 'P0001',
  'el invitado quitado no vuelve a unirse con el enlace');

-- Quitarlo no cuenta sus fotos como nuevas otra vez ni cambia el contador.
select test.as_user('00000000-0000-0000-0000-000000006601');
select test.is((select new_count from public.loteria_new_guest_cards() where set_id = '00000000-0000-0000-0000-0000000066a1'),
  1, 'quitar a un invitado no cambia el contador');

-- Un invitado cuya cuenta se borra (el sitio no tiene esa opción: solo desde Supabase, con su saldo antes):
-- sus fotos se quedan, sin nombre, y deja de salir en la lista.
select test.as_postgres();
delete from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006603';
delete from auth.users where id = '00000000-0000-0000-0000-000000006603';
select test.is((select count(*)::int from public.cards where id in
  ('00000000-0000-0000-0000-0000000066c4', '00000000-0000-0000-0000-0000000066c6') and uploaded_by is null), 2,
  'las fotos de quien borra su cuenta se quedan en la lotería');
select test.as_user('00000000-0000-0000-0000-000000006601');
select test.is((select count(*)::int from public.list_loteria_invitees('00000000-0000-0000-0000-0000000066a1')), 0,
  'quien borra su cuenta deja de salir en la lista');

rollback;
