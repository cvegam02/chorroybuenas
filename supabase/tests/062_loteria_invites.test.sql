-- Enlace para invitar a subir fotos a una lotería (FEAT-56, US B1; migración 062).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000006201', 'organizadora@test.dev'),
  ('00000000-0000-0000-0000-000000006202', 'otra-colectiva@test.dev');

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000062a1', '00000000-0000-0000-0000-000000006201', 'Posada familiar'),
  ('00000000-0000-0000-0000-0000000062a2', '00000000-0000-0000-0000-000000006201', 'La de la oficina'),
  ('00000000-0000-0000-0000-0000000062b1', '00000000-0000-0000-0000-000000006202', 'Ajena');

-- La organizadora abre el enlace: se crea abierto, con un código difícil de adivinar.
select test.as_user('00000000-0000-0000-0000-000000006201');
select test.is((select count(*)::int from public.loteria_invites), 0, 'al principio ninguna lotería es colectiva');
select test.ok((select is_open and code ~ '^[0-9a-f]{16}$'
  from public.open_loteria_invite('00000000-0000-0000-0000-0000000062a1')),
  'abrir el enlace lo crea abierto, con un código de 16 caracteres');
create temp table first_code on commit drop as
  select code from public.loteria_invites where set_id = '00000000-0000-0000-0000-0000000062a1';
grant select on first_code to authenticated;
select test.is((select code from public.open_loteria_invite('00000000-0000-0000-0000-0000000062a1')),
  (select code from first_code), 'abrirlo otra vez devuelve el mismo enlace');
select test.is((select count(*)::int from public.loteria_invites), 1, 'la organizadora ve su lotería colectiva');

-- Cerrar el enlace.
select test.is((select is_open from public.close_loteria_invite('00000000-0000-0000-0000-0000000062a1')),
  false, 'cerrar el enlace lo deja cerrado');
select test.is((select is_open from public.open_loteria_invite('00000000-0000-0000-0000-0000000062a1')),
  false, 'abrir la ventana no vuelve a abrir un enlace cerrado');
select test.is((select code from public.loteria_invites where set_id = '00000000-0000-0000-0000-0000000062a1'),
  (select code from first_code), 'cerrar no cambia el código');

-- Generar un enlace nuevo: otro código, abierto; el anterior deja de existir.
select test.ok((select is_open and code <> (select code from first_code)
  from public.regenerate_loteria_invite('00000000-0000-0000-0000-0000000062a1')),
  'generar un enlace nuevo da otro código y lo abre');
select test.is((select count(*)::int from public.loteria_invites
  where code = (select code from first_code)), 0, 'el código anterior ya no existe');
select test.ok((select is_open from public.regenerate_loteria_invite('00000000-0000-0000-0000-0000000062a2')),
  'generar un enlace en una lotería sin enlace también lo crea abierto');

-- Nadie escribe directo en la tabla: solo con las funciones.
select test.throws($$
  insert into public.loteria_invites (set_id, code) values ('00000000-0000-0000-0000-0000000062a1', 'aaaaaaaaaaaaaaaa')
$$, '42501', 'no se puede crear un enlace a mano');
select test.throws($$
  update public.loteria_invites set code = 'aaaaaaaaaaaaaaaa'
$$, '42501', 'no se puede escoger el código a mano');
select test.throws($$
  delete from public.loteria_invites
$$, '42501', 'no se puede borrar el enlace a mano');

-- Otra usuaria no ve ni toca el enlace de una lotería ajena.
select test.as_user('00000000-0000-0000-0000-000000006202');
select test.is((select count(*)::int from public.loteria_invites), 0, 'otra usuaria no ve enlaces ajenos');
select test.throws($$ select public.open_loteria_invite('00000000-0000-0000-0000-0000000062a1') $$,
  'P0001', 'otra usuaria no puede abrir el enlace de una lotería ajena');
select test.throws($$ select public.regenerate_loteria_invite('00000000-0000-0000-0000-0000000062a1') $$,
  'P0001', 'otra usuaria no puede generar un enlace nuevo en una lotería ajena');
select test.throws($$ select public.close_loteria_invite('00000000-0000-0000-0000-0000000062a1') $$,
  'P0001', 'otra usuaria no puede cerrar el enlace de una lotería ajena');
select test.throws($$ select public.close_loteria_invite('00000000-0000-0000-0000-0000000062b1') $$,
  'P0001', 'no se puede cerrar un enlace que no existe');

-- Sin sesión no hay acceso.
select test.as_anon();
select test.throws($$ select count(*) from public.loteria_invites $$, '42501', 'sin sesión no se leen enlaces');
select test.throws($$ select public.open_loteria_invite('00000000-0000-0000-0000-0000000062a1') $$,
  '42501', 'sin sesión no se abre un enlace');

-- Al borrar la lotería se borra su enlace.
select test.as_user('00000000-0000-0000-0000-000000006201');
delete from public.loteria_sets where id = '00000000-0000-0000-0000-0000000062a2';
select test.is((select count(*)::int from public.loteria_invites), 1, 'al borrar la lotería se borra su enlace');

rollback;
