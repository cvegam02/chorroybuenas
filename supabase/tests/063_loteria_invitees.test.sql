-- Unirse a una lotería colectiva con su enlace (FEAT-56, US B2; migración 063).
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000006301', 'organizadora-b2@test.dev', '{"full_name":"Ana Organizadora"}'),
  ('00000000-0000-0000-0000-000000006302', 'invitado-b2@test.dev', '{}'),
  ('00000000-0000-0000-0000-000000006303', 'otro-b2@test.dev', '{}'),
  ('00000000-0000-0000-0000-000000006304', 'sin-nombre-b2@test.dev', '{}');

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000063a1', '00000000-0000-0000-0000-000000006301', 'Posada familiar'),
  ('00000000-0000-0000-0000-0000000063a2', '00000000-0000-0000-0000-000000006304', 'Sin nombre');

insert into public.cards (user_id, set_id, title) values
  ('00000000-0000-0000-0000-000000006301', '00000000-0000-0000-0000-0000000063a1', 'La abuela'),
  ('00000000-0000-0000-0000-000000006301', '00000000-0000-0000-0000-0000000063a1', 'El tío');

-- Enlaces fijos para la prueba (la función los escoge al azar; aquí se ponen a mano como postgres).
insert into public.loteria_invites (set_id, code) values
  ('00000000-0000-0000-0000-0000000063a1', '6300000000000001'),
  ('00000000-0000-0000-0000-0000000063a2', '6300000000000002');

-- Sin sesión: el enlace abierto muestra la lotería, quién la organiza y cuántas cartas lleva.
select test.as_anon();
select test.is((select public.get_loteria_invite('6300000000000001')),
  '{"status":"open","role":"none","set_id":null,"set_name":"Posada familiar","organizer_name":"Ana Organizadora","card_count":2}'::jsonb,
  'sin sesión, el enlace abierto muestra nombre, organizadora y cartas');
select test.is((select public.get_loteria_invite('6300000000000002') ->> 'organizer_name'), null,
  'sin nombre en la cuenta, no se muestra organizador (nunca el correo)');
select test.is((select public.get_loteria_invite('ffffffffffffffff')),
  '{"status":"unavailable"}'::jsonb, 'un código inventado no muestra nada');
select test.is((select public.get_loteria_invite('no es un código')),
  '{"status":"unavailable"}'::jsonb, 'un texto cualquiera no muestra nada');
select test.throws($$ select public.join_loteria('6300000000000001') $$, '42501', 'sin sesión no se puede unir');
select test.throws($$ select count(*) from public.loteria_invitees $$, '42501', 'sin sesión no se leen invitados');

-- El invitado se une: queda como invitado y no se duplica.
select test.as_user('00000000-0000-0000-0000-000000006302');
select test.is((select public.join_loteria('6300000000000001')), '00000000-0000-0000-0000-0000000063a1'::uuid,
  'al unirse recibe la lotería');
select test.is((select public.join_loteria('6300000000000001')), '00000000-0000-0000-0000-0000000063a1'::uuid,
  'unirse otra vez no falla');
select test.is((select count(*)::int from public.loteria_invitees), 1, 'el invitado ve su invitación, sin duplicarse');
select test.is((select public.get_loteria_invite('6300000000000001') ->> 'role'), 'guest', 'el enlace lo reconoce como invitado');
select test.is((select public.get_loteria_invite('6300000000000001') ->> 'set_id'), '00000000-0000-0000-0000-0000000063a1',
  'al invitado se le da la lotería para ir a ella');
select test.throws($$
  insert into public.loteria_invitees (set_id, user_id)
  values ('00000000-0000-0000-0000-0000000063a2', '00000000-0000-0000-0000-000000006302')
$$, '42501', 'nadie se agrega a mano a otra lotería');
select test.throws($$ update public.loteria_invitees set removed_at = null $$, '42501', 'el invitado no cambia su invitación');

-- El organizador que abre su propio enlace va a su lotería, sin volverse invitado.
select test.as_user('00000000-0000-0000-0000-000000006301');
select test.is((select public.get_loteria_invite('6300000000000001') ->> 'role'), 'owner', 'el enlace reconoce a la organizadora');
select test.is((select public.join_loteria('6300000000000001')), '00000000-0000-0000-0000-0000000063a1'::uuid,
  'la organizadora llega a su lotería');
select test.is((select count(*)::int from public.loteria_invitees), 1, 'la organizadora ve a su invitado y no se agrega ella');

-- Enlace cerrado: no se une nadie nuevo y no se muestra la lotería; el invitado sigue reconocido.
select test.as_postgres();
update public.loteria_invites set is_open = false where set_id = '00000000-0000-0000-0000-0000000063a1';
select test.as_user('00000000-0000-0000-0000-000000006303');
select test.is((select public.get_loteria_invite('6300000000000001')),
  '{"status":"unavailable"}'::jsonb, 'con el enlace cerrado no se muestra la lotería');
select test.throws($$ select public.join_loteria('6300000000000001') $$, 'P0001', 'con el enlace cerrado no se une nadie nuevo');
select test.as_user('00000000-0000-0000-0000-000000006302');
select test.is((select public.get_loteria_invite('6300000000000001') ->> 'role'), 'guest',
  'con el enlace cerrado, el invitado sigue reconocido');
select test.is((select public.join_loteria('6300000000000001')), '00000000-0000-0000-0000-0000000063a1'::uuid,
  'con el enlace cerrado, el invitado todavía llega a la lotería');

-- Invitado quitado: no vuelve a entrar aunque el enlace esté abierto (decisión 10).
select test.as_postgres();
update public.loteria_invites set is_open = true where set_id = '00000000-0000-0000-0000-0000000063a1';
update public.loteria_invitees set removed_at = now() where user_id = '00000000-0000-0000-0000-000000006302';
select test.as_user('00000000-0000-0000-0000-000000006302');
select test.is((select public.get_loteria_invite('6300000000000001')),
  '{"status":"removed"}'::jsonb, 'al invitado quitado se le dice que ya no puede unirse');
select test.throws($$ select public.join_loteria('6300000000000001') $$, 'P0001', 'el invitado quitado no vuelve a entrar');

-- Otra persona no ve invitaciones ajenas.
select test.as_user('00000000-0000-0000-0000-000000006303');
select test.is((select count(*)::int from public.loteria_invitees), 0, 'nadie ve invitaciones ajenas');

-- Al borrar la lotería se borran sus invitados.
select test.as_postgres();
delete from public.loteria_sets where id = '00000000-0000-0000-0000-0000000063a1';
select test.is((select count(*)::int from public.loteria_invitees), 0, 'al borrar la lotería se borran sus invitados');

rollback;
