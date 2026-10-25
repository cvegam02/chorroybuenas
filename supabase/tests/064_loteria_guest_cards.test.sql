-- El invitado ve las cartas de la lotería y sube las suyas (FEAT-56, US B3; migración 064).
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000006401', 'organizadora-b3@test.dev', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-000000006402', 'invitado-b3@test.dev', '{"full_name":"Beto"}'),
  ('00000000-0000-0000-0000-000000006403', 'extrano-b3@test.dev', '{}'),
  ('00000000-0000-0000-0000-000000006404', 'quitado-b3@test.dev', '{}');

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000064a1', '00000000-0000-0000-0000-000000006401', 'Posada familiar'),
  ('00000000-0000-0000-0000-0000000064a2', '00000000-0000-0000-0000-000000006401', 'Otra de Ana');

insert into public.cards (id, user_id, set_id, title, image_path, created_at) values
  ('00000000-0000-0000-0000-0000000064c1', '00000000-0000-0000-0000-000000006401', '00000000-0000-0000-0000-0000000064a1',
   'La abuela', '00000000-0000-0000-0000-000000006401/abuela.png', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000064c2', '00000000-0000-0000-0000-000000006401', '00000000-0000-0000-0000-0000000064a2',
   'Secreta', '00000000-0000-0000-0000-000000006401/secreta.png', now() - interval '1 hour');

insert into storage.objects (bucket_id, name) values
  ('card-images', '00000000-0000-0000-0000-000000006401/abuela.png'),
  ('card-images', '00000000-0000-0000-0000-000000006401/secreta.png');

insert into public.loteria_invites (set_id, code) values ('00000000-0000-0000-0000-0000000064a1', '6400000000000001');
insert into public.loteria_invitees (set_id, user_id, removed_at) values
  ('00000000-0000-0000-0000-0000000064a1', '00000000-0000-0000-0000-000000006402', null),
  ('00000000-0000-0000-0000-0000000064a1', '00000000-0000-0000-0000-000000006404', now());

-- El invitado ve la lotería, sus cartas y sus imágenes; nada de otras loterías de la organizadora.
select test.as_user('00000000-0000-0000-0000-000000006402');
select test.is((select name from public.loteria_sets), 'Posada familiar', 'el invitado ve solo la lotería a la que lo invitaron');
select test.is((select count(*)::int from public.cards), 1, 'el invitado ve las cartas de esa lotería y no las de otras');
select test.is((select count(*)::int from storage.objects where bucket_id = 'card-images'), 1,
  'el invitado ve las imágenes de las cartas de esa lotería y no las de otras');
select test.is((select count(*)::int from public.loteria_members('00000000-0000-0000-0000-0000000064a1')), 3,
  'el invitado ve los nombres de quienes participan (organizadora e invitados)');
select test.is((select full_name from public.loteria_members('00000000-0000-0000-0000-0000000064a1')
  where user_id = '00000000-0000-0000-0000-000000006401'), 'Ana', 'con el nombre de cada cuenta');

-- Subir su imagen: solo en su carpeta de invitado dentro de la de la organizadora.
select test.lives($$
  insert into storage.objects (bucket_id, name) values
    ('card-images', '00000000-0000-0000-0000-000000006401/guests/00000000-0000-0000-0000-000000006402/c3.png')
$$, 'el invitado sube su imagen a su carpeta de invitado');
select test.throws($$
  insert into storage.objects (bucket_id, name) values
    ('card-images', '00000000-0000-0000-0000-000000006401/c4.png')
$$, '42501', 'el invitado no sube imágenes sueltas en la carpeta de la organizadora');
select test.throws($$
  insert into storage.objects (bucket_id, name) values
    ('card-images', '00000000-0000-0000-0000-000000006401/guests/00000000-0000-0000-0000-000000006403/c4.png')
$$, '42501', 'el invitado no sube imágenes a nombre de otro invitado');

-- Agregar la carta: al final, a nombre de la organizadora, con quién la subió.
select test.lives($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000064a1', '00000000-0000-0000-0000-0000000064c3', '  El   tío ',
    '00000000-0000-0000-0000-000000006401/guests/00000000-0000-0000-0000-000000006402/c3.png')
$$, 'el invitado agrega su carta');
select test.is((select user_id from public.cards where id = '00000000-0000-0000-0000-0000000064c3'),
  '00000000-0000-0000-0000-000000006401'::uuid, 'la carta queda en la lotería de la organizadora');
select test.is((select uploaded_by from public.cards where id = '00000000-0000-0000-0000-0000000064c3'),
  '00000000-0000-0000-0000-000000006402'::uuid, 'la carta guarda quién la subió');
select test.is((select title from public.cards where id = '00000000-0000-0000-0000-0000000064c3'), 'El tío',
  'el título se guarda sin espacios de más');
select test.is((select array_agg(id order by created_at, id) from public.cards),
  array['00000000-0000-0000-0000-0000000064c1', '00000000-0000-0000-0000-0000000064c3']::uuid[],
  'la carta nueva queda al final de la baraja');
select test.is((select count(*)::int from storage.objects where bucket_id = 'card-images'), 2,
  'el invitado ve la imagen de su carta nueva');

-- Lo que no se acepta al agregar.
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000064a1', '00000000-0000-0000-0000-0000000064c4', 'la ABUELA',
    '00000000-0000-0000-0000-000000006401/guests/00000000-0000-0000-0000-000000006402/c4.png')
$$, 'P0001', 'un título que ya existe en la lotería se rechaza, sin importar mayúsculas');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000064a1', '00000000-0000-0000-0000-0000000064c4', '   ',
    '00000000-0000-0000-0000-000000006401/guests/00000000-0000-0000-0000-000000006402/c4.png')
$$, 'P0001', 'el título no puede quedar vacío');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000064a1', '00000000-0000-0000-0000-0000000064c4', 'El perro',
    '00000000-0000-0000-0000-000000006401/abuela.png')
$$, 'P0001', 'la imagen tiene que ser una de su carpeta de invitado');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000064a2', '00000000-0000-0000-0000-0000000064c4', 'El perro',
    '00000000-0000-0000-0000-000000006401/guests/00000000-0000-0000-0000-000000006402/c4.png')
$$, 'P0001', 'no se agregan cartas a una lotería a la que no lo invitaron');
select test.throws($$
  insert into public.cards (user_id, set_id, title)
  values ('00000000-0000-0000-0000-000000006401', '00000000-0000-0000-0000-0000000064a1', 'A mano')
$$, '42501', 'el invitado no agrega cartas directo a la tabla');

-- El invitado no cambia ni borra cartas, ni las suyas (decisión 3).
update public.cards set title = 'Cambiada';
delete from public.cards;
delete from storage.objects where bucket_id = 'card-images';
select test.as_postgres();
select test.is((select count(*)::int from public.cards where title = 'Cambiada'), 0, 'el invitado no cambia cartas');
select test.is((select count(*)::int from public.cards where set_id = '00000000-0000-0000-0000-0000000064a1'), 2,
  'el invitado no borra cartas');
select test.is((select count(*)::int from storage.objects where bucket_id = 'card-images'), 3, 'el invitado no borra imágenes');

-- Con el enlace cerrado sigue viendo la lotería, pero ya no sube.
update public.loteria_invites set is_open = false;
select test.as_user('00000000-0000-0000-0000-000000006402');
select test.is((select count(*)::int from public.cards), 2, 'con el enlace cerrado el invitado sigue viendo las cartas');
select test.throws($$
  select public.add_guest_card('00000000-0000-0000-0000-0000000064a1', '00000000-0000-0000-0000-0000000064c5', 'El perro',
    '00000000-0000-0000-0000-000000006401/guests/00000000-0000-0000-0000-000000006402/c5.png')
$$, 'P0001', 'con el enlace cerrado no se agregan cartas');
select test.throws($$
  insert into storage.objects (bucket_id, name) values
    ('card-images', '00000000-0000-0000-0000-000000006401/guests/00000000-0000-0000-0000-000000006402/c5.png')
$$, '42501', 'con el enlace cerrado no se suben imágenes');

-- Quien fue quitado o nunca fue invitado no ve nada.
select test.as_user('00000000-0000-0000-0000-000000006404');
select test.is((select count(*)::int from public.cards), 0, 'el invitado quitado ya no ve las cartas');
select test.is((select count(*)::int from public.loteria_sets), 0, 'el invitado quitado ya no ve la lotería');
select test.throws($$ select * from public.loteria_members('00000000-0000-0000-0000-0000000064a1') $$, 'P0001',
  'el invitado quitado ya no ve quiénes participan');
select test.as_user('00000000-0000-0000-0000-000000006403');
select test.is((select count(*)::int from storage.objects where bucket_id = 'card-images'), 0, 'un extraño no ve imágenes');

-- La organizadora ve, cambia y borra la carta del invitado como las suyas (US B4 usa esto).
select test.as_user('00000000-0000-0000-0000-000000006401');
select test.is((select count(*)::int from public.cards where set_id = '00000000-0000-0000-0000-0000000064a1'), 2,
  'la organizadora ve la carta del invitado');
select test.is((select count(*)::int from storage.objects
  where name like '00000000-0000-0000-0000-000000006401/guests/%'), 1, 'la organizadora ve la imagen del invitado');
update public.cards set title = 'Tío Juan' where id = '00000000-0000-0000-0000-0000000064c3';
select test.is((select title from public.cards where id = '00000000-0000-0000-0000-0000000064c3'), 'Tío Juan',
  'la organizadora cambia el título de la carta del invitado');

rollback;
