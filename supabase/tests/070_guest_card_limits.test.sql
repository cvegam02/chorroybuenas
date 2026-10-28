-- Invitados: tope y una imagen por carta (FEAT-58, US A5; migración 070). Cada carta con su propia imagen, que
-- exista y que ninguna otra carta de la lotería use; 60 cartas por invitado por lotería y 10 por minuto
-- (decisión 9); la organizadora borra de una vez las fotos de un invitado.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000007001', 'organizadora-a5@test.dev'),
  ('00000000-0000-0000-0000-000000007002', 'invitado-a5@test.dev'),
  ('00000000-0000-0000-0000-000000007003', 'invitada-a5@test.dev'),
  ('00000000-0000-0000-0000-000000007004', 'extrano-a5@test.dev');

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000070a1', '00000000-0000-0000-0000-000000007001', 'Posada'),
  ('00000000-0000-0000-0000-0000000070a2', '00000000-0000-0000-0000-000000007001', 'Boda');
insert into public.loteria_invites (set_id, code) values
  ('00000000-0000-0000-0000-0000000070a1', '7000000000000001'),
  ('00000000-0000-0000-0000-0000000070a2', '7000000000000002');
insert into public.loteria_invitees (set_id, user_id) values
  ('00000000-0000-0000-0000-0000000070a1', '00000000-0000-0000-0000-000000007002'),
  ('00000000-0000-0000-0000-0000000070a1', '00000000-0000-0000-0000-000000007003'),
  ('00000000-0000-0000-0000-0000000070a2', '00000000-0000-0000-0000-000000007003');

-- Las imágenes que ya subieron a su carpeta de invitado
insert into storage.objects (bucket_id, name)
select 'card-images', '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/f' || i || '.png'
from generate_series(1, 5) i;
insert into storage.objects (bucket_id, name)
select 'card-images', '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007003/f' || i || '.png'
from generate_series(1, 5) i;

-- ---------------------------------------------------------------------------
-- Una imagen por carta, y que exista
-- ---------------------------------------------------------------------------
select test.as_user('00000000-0000-0000-0000-000000007002');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'El fantasma',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/no-existe.png')
$$, 'INVALID_IMAGE', 'no se agrega una carta con una imagen que no se subió');
select test.lives($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', '00000000-0000-0000-0000-0000000070c1', 'El tío',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/f1.png')
$$, 'el invitado agrega una carta con su imagen');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'El tío otra vez',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/f1.png')
$$, 'INVALID_IMAGE', 'la misma imagen no sirve para otra carta');

-- La organizadora transformó la carta con IA: la imagen original sigue siendo de esa carta
select test.as_postgres();
update public.cards
set image_path = '00000000-0000-0000-0000-000000007001/ai/c1.webp',
    original_image_path = '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/f1.png'
where id = '00000000-0000-0000-0000-0000000070c1';
select test.as_user('00000000-0000-0000-0000-000000007002');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'El tío de nuevo',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/f1.png')
$$, 'INVALID_IMAGE', 'tampoco la imagen original de una carta transformada');

-- ---------------------------------------------------------------------------
-- 10 por minuto por invitado (decisión 9)
-- ---------------------------------------------------------------------------
select test.as_postgres();
insert into public.cards (user_id, set_id, title, uploaded_by, created_at)
select '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-0000000070a2', 'Boda ' || i,
  '00000000-0000-0000-0000-000000007003', now() - interval '10 seconds'
from generate_series(1, 10) i;
select test.as_user('00000000-0000-0000-0000-000000007003');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'La prima',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007003/f1.png')
$$, 'RATE_LIMITED', 'con 10 cartas en el último minuto, aunque sean de otra lotería, la 11.ª espera');
select test.as_user('00000000-0000-0000-0000-000000007002');
select test.lives($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'El primo',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/f2.png')
$$, 'el límite de un invitado no frena a otro');
select test.as_postgres();
update public.cards set created_at = now() - interval '2 minutes'
where uploaded_by = '00000000-0000-0000-0000-000000007003';
select test.as_user('00000000-0000-0000-0000-000000007003');
select test.lives($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'La prima',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007003/f1.png')
$$, 'pasado el minuto, la invitada sigue subiendo');

-- ---------------------------------------------------------------------------
-- 60 cartas por invitado por lotería (decisión 9)
-- ---------------------------------------------------------------------------
select test.as_postgres();
insert into public.cards (user_id, set_id, title, uploaded_by, created_at)
select '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-0000000070a1', 'Posada ' || i,
  '00000000-0000-0000-0000-000000007002', now() - interval '1 hour'
from generate_series(1, 57) i;
select test.as_user('00000000-0000-0000-0000-000000007002');
select test.lives($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'La número 60',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/f3.png')
$$, 'el invitado sube su carta 60');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'La número 61',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007002/f4.png')
$$, 'GUEST_LIMIT', 'la carta 61 del mismo invitado en la lotería se rechaza');
select test.is(
  (select count(*)::int from public.cards
    where set_id = '00000000-0000-0000-0000-0000000070a1' and uploaded_by = '00000000-0000-0000-0000-000000007002'),
  60, 'el invitado se queda con 60 cartas');
select test.as_user('00000000-0000-0000-0000-000000007003');
select test.lives($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000070a1', gen_random_uuid(), 'La tía',
    '00000000-0000-0000-0000-000000007001/guests/00000000-0000-0000-0000-000000007003/f2.png')
$$, 'el tope de un invitado no frena a otro');

-- ---------------------------------------------------------------------------
-- La organizadora borra las fotos de un invitado
-- ---------------------------------------------------------------------------
select test.as_user('00000000-0000-0000-0000-000000007004');
select test.throws($$
  select * from public.delete_guest_cards('00000000-0000-0000-0000-0000000070a1', '00000000-0000-0000-0000-000000007002')
$$, 'P0001', 'nadie más borra las fotos de los invitados');
select test.as_user('00000000-0000-0000-0000-000000007002');
select test.throws($$
  select * from public.delete_guest_cards('00000000-0000-0000-0000-0000000070a1', '00000000-0000-0000-0000-000000007002')
$$, 'P0001', 'el invitado tampoco las borra de una vez');

-- Una de sus cartas ya está en un tablero
select test.as_postgres();
insert into public.boards (id, user_id, set_id) values
  ('00000000-0000-0000-0000-0000000070b1', '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-0000000070a1');
insert into public.board_cards (board_id, card_id, position) values
  ('00000000-0000-0000-0000-0000000070b1', '00000000-0000-0000-0000-0000000070c1', 0);

select test.as_user('00000000-0000-0000-0000-000000007001');
select test.is(
  (select count(*)::int from public.delete_guest_cards('00000000-0000-0000-0000-0000000070a1',
    '00000000-0000-0000-0000-000000007002') where path is not null),
  4, 'devuelve las imágenes de sus cartas para borrarlas, también la original de la transformada');
select test.as_postgres();
select test.is(
  (select count(*)::int from public.cards
    where set_id = '00000000-0000-0000-0000-0000000070a1' and uploaded_by = '00000000-0000-0000-0000-000000007002'),
  0, 'las cartas del invitado desaparecen');
select test.is(
  (select count(*)::int from public.cards
    where set_id = '00000000-0000-0000-0000-0000000070a1' and uploaded_by = '00000000-0000-0000-0000-000000007003'),
  2, 'las de otros invitados se quedan');
select test.is(
  (select count(*)::int from public.board_cards where board_id = '00000000-0000-0000-0000-0000000070b1'),
  0, 'la carta borrada sale del tablero, como al borrar cualquier carta');
select test.is(
  (select count(*)::int from public.cards where uploaded_by = '00000000-0000-0000-0000-000000007003'
    and set_id = '00000000-0000-0000-0000-0000000070a2'),
  10, 'y las de otras loterías también');

rollback;
