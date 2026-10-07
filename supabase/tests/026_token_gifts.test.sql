-- Registro de regalos de tokens (migración 026).
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000031', 'admin-regalos@test.dev', '{"full_name": "Ada Admin"}'),
  ('00000000-0000-0000-0000-000000000032', 'ana@test.dev', '{"full_name": "Ana"}'),
  ('00000000-0000-0000-0000-000000000033', 'beto@test.dev', '{"full_name": "Beto"}');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000031');
update public.user_tokens set balance = 3
where user_id in ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000033');

-- Administrador: regalar deja registro
select test.as_user('00000000-0000-0000-0000-000000000031');
select test.is(
  (select public.admin_gift_tokens('00000000-0000-0000-0000-000000000032', 10, '  Compensación por error  ')),
  13, 'regalar con motivo sube el saldo y devuelve el saldo nuevo');
select test.is(
  (select public.admin_gift_tokens('00000000-0000-0000-0000-000000000033', 4)),
  7, 'regalar sin motivo sigue funcionando con dos parámetros');
select test.is(
  (select public.admin_gift_tokens('00000000-0000-0000-0000-000000000032', 2, '   ')),
  15, 'un motivo en blanco no impide regalar');

select test.throws($$ select public.admin_gift_tokens('00000000-0000-0000-0000-000000000032', 0, null) $$,
  'P0001', 'no se puede regalar 0 tokens');
select test.throws($$ select public.admin_gift_tokens('00000000-0000-0000-0000-000000000032', -5, null) $$,
  'P0001', 'no se puede regalar una cantidad negativa');
select test.throws(
  format($f$ select public.admin_gift_tokens('00000000-0000-0000-0000-000000000032', 1, %L) $f$, repeat('x', 201)),
  'P0001', 'un motivo de más de 200 caracteres se rechaza');

-- Administrador: lista general
select test.is((select count(*)::int from public.admin_get_token_gifts(100)), 3,
  'la lista general tiene un renglón por regalo; los rechazados no dejan registro');
select test.is(
  (select array_agg(amount order by amount) from public.admin_get_token_gifts(100)),
  array[2, 4, 10], 'la lista guarda la cantidad de cada regalo');
select test.is(
  (select reason from public.admin_get_token_gifts(100) where amount = 10),
  'Compensación por error', 'el motivo se guarda sin espacios sobrantes');
select test.is(
  (select count(*)::int from public.admin_get_token_gifts(100) where reason is null),
  2, 'sin motivo, o con motivo en blanco, se guarda vacío');
select test.is(
  (select admin_email from public.admin_get_token_gifts(100) where amount = 10),
  'admin-regalos@test.dev', 'la lista dice quién regaló');
select test.is(
  (select recipient_email from public.admin_get_token_gifts(100) where amount = 4),
  'beto@test.dev', 'la lista dice a quién se regaló');
select test.is(
  (select count(*)::int from public.admin_get_token_gifts(100) where created_at is null),
  0, 'cada regalo tiene fecha');
select test.is((select count(*)::int from public.admin_get_token_gifts(2)), 2,
  'la lista respeta el límite pedido');

-- Usuario que recibió: ve sus regalos, sin motivo ni quién los dio
select test.as_user('00000000-0000-0000-0000-000000000032');
select test.is((select count(*)::int from public.get_my_token_gifts()), 2,
  'el usuario ve solo sus propios regalos');
select test.is((select sum(amount)::int from public.get_my_token_gifts()), 12,
  'el usuario ve la cantidad de cada regalo');
select test.throws($$ select * from public.token_gifts $$, '42501',
  'el usuario no puede leer la tabla de regalos directamente');
select test.throws($$
  insert into public.token_gifts (recipient_id, admin_id, amount)
  values ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000032', 999)
$$, '42501', 'el usuario no puede inventarse un regalo');
select test.throws($$ select public.admin_gift_tokens('00000000-0000-0000-0000-000000000032', 50, null) $$,
  'P0001', 'quien no es administrador no puede regalar');
select test.throws($$ select * from public.admin_get_token_gifts(100) $$,
  'P0001', 'quien no es administrador no puede ver la lista general');

-- Visitante
select test.as_anon();
select test.throws($$ select * from public.token_gifts $$, '42501',
  'un visitante no puede leer la tabla de regalos');
select test.throws($$ select public.admin_gift_tokens('00000000-0000-0000-0000-000000000032', 50, null) $$,
  '42501', 'un visitante no puede ejecutar el regalo');
select test.throws($$ select * from public.get_my_token_gifts() $$,
  '42501', 'un visitante no puede pedir regalos');
select test.throws($$ select * from public.admin_get_token_gifts(100) $$,
  '42501', 'un visitante no puede pedir la lista general');

select test.as_postgres();
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000032'),
  15, 'los intentos rechazados no cambiaron el saldo');
select test.is((select count(*)::int from public.token_gifts), 3,
  'los intentos rechazados no dejaron registro');
select test.is(
  (select pg_get_function_result('public.get_my_token_gifts()'::regprocedure)),
  'TABLE(id uuid, amount integer, created_at timestamp with time zone)',
  'lo que ve el usuario no incluye el motivo ni quién regaló');
select test.is(
  (select count(*)::int from pg_proc
   where pronamespace = 'public'::regnamespace and proname = 'admin_gift_tokens'),
  1, 'solo existe una versión de la función de regalo');

rollback;
