-- «Loterías donde participo» de Mi cuenta (FEAT-56, US B5; migración 067).
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000006701', 'organizadora-b5@test.dev', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-000000006702', 'organizador-b5@test.dev', '{}'),
  ('00000000-0000-0000-0000-000000006703', 'invitado-b5@test.dev', '{"full_name":"Beto"}'),
  ('00000000-0000-0000-0000-000000006704', 'nuevo-b5@test.dev', '{}');

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000067a1', '00000000-0000-0000-0000-000000006701', 'Posada familiar'),
  ('00000000-0000-0000-0000-0000000067a2', '00000000-0000-0000-0000-000000006702', 'Cumple del abuelo'),
  ('00000000-0000-0000-0000-0000000067a3', '00000000-0000-0000-0000-000000006701', 'Me quitaron'),
  ('00000000-0000-0000-0000-0000000067a4', '00000000-0000-0000-0000-000000006703', 'La mía');

insert into public.loteria_invites (set_id, code, is_open) values
  ('00000000-0000-0000-0000-0000000067a1', '6700000000000001', true),
  ('00000000-0000-0000-0000-0000000067a2', '6700000000000002', false),
  ('00000000-0000-0000-0000-0000000067a3', '6700000000000003', true);

insert into public.loteria_invitees (set_id, user_id, joined_at, removed_at) values
  ('00000000-0000-0000-0000-0000000067a1', '00000000-0000-0000-0000-000000006703', now() - interval '1 day', null),
  ('00000000-0000-0000-0000-0000000067a2', '00000000-0000-0000-0000-000000006703', now() - interval '2 days', null),
  ('00000000-0000-0000-0000-0000000067a3', '00000000-0000-0000-0000-000000006703', now() - interval '3 days', now());

insert into public.cards (id, user_id, set_id, title, image_path) values
  ('00000000-0000-0000-0000-0000000067c1', '00000000-0000-0000-0000-000000006701', '00000000-0000-0000-0000-0000000067a1', 'Uno', 'a.png'),
  ('00000000-0000-0000-0000-0000000067c2', '00000000-0000-0000-0000-000000006701', '00000000-0000-0000-0000-0000000067a1', 'Dos', 'b.png'),
  ('00000000-0000-0000-0000-0000000067c3', '00000000-0000-0000-0000-000000006702', '00000000-0000-0000-0000-0000000067a2', 'Tres', 'c.png');

-- El invitado ve las loterías donde participa, sin las suyas ni de las que lo quitaron.
select test.as_user('00000000-0000-0000-0000-000000006703');
select test.is((select array_agg(set_id order by set_id) from public.list_my_guest_loterias()),
  array['00000000-0000-0000-0000-0000000067a1', '00000000-0000-0000-0000-0000000067a2']::uuid[],
  'el invitado ve las loterías donde participa, sin las suyas ni de las que lo quitaron');
select test.is((select set_id from public.list_my_guest_loterias() limit 1),
  '00000000-0000-0000-0000-0000000067a1'::uuid, 'la más reciente sale primero');
select test.is((select name from public.list_my_guest_loterias() where set_id = '00000000-0000-0000-0000-0000000067a1'),
  'Posada familiar', 'con el nombre de la lotería');
select test.is((select organizer_name from public.list_my_guest_loterias()
  where set_id = '00000000-0000-0000-0000-0000000067a1'), 'Ana', 'con el nombre de quien organiza');
select test.is((select organizer_name from public.list_my_guest_loterias()
  where set_id = '00000000-0000-0000-0000-0000000067a2'), null, 'sin nombre si la cuenta del organizador no tiene');
select test.is((select card_count from public.list_my_guest_loterias()
  where set_id = '00000000-0000-0000-0000-0000000067a1'), 2, 'con cuántas cartas lleva');
select test.is((select can_upload from public.list_my_guest_loterias()
  where set_id = '00000000-0000-0000-0000-0000000067a1'), true, 'con el enlace abierto puede subir fotos');
select test.is((select can_upload from public.list_my_guest_loterias()
  where set_id = '00000000-0000-0000-0000-0000000067a2'), false,
  'con el enlace cerrado la lotería sigue en su lista, sin poder subir');

-- Quien no participa en ninguna no ve nada; sin sesión no se puede usar.
select test.as_user('00000000-0000-0000-0000-000000006704');
select test.is((select count(*)::int from public.list_my_guest_loterias()), 0, 'sin invitaciones la lista está vacía');
select test.as_user('00000000-0000-0000-0000-000000006701');
select test.is((select count(*)::int from public.list_my_guest_loterias()), 0,
  'el organizador no ve sus propias loterías como invitado');

select test.as_anon();
select test.throws($$ select * from public.list_my_guest_loterias() $$, '42501', 'sin sesión no se puede usar');

-- Al quitarlo, la lotería desaparece de su lista.
select test.as_postgres();
update public.loteria_invitees set removed_at = now()
where set_id = '00000000-0000-0000-0000-0000000067a2' and user_id = '00000000-0000-0000-0000-000000006703';
select test.as_user('00000000-0000-0000-0000-000000006703');
select test.is((select count(*)::int from public.list_my_guest_loterias()), 1,
  'la lotería de la que lo quitan desaparece de su lista');

rollback;
