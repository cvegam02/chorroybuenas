-- Tokens iniciales asignados por el trigger de registro (migración 024).
begin;

update public.app_config set value = '5'::jsonb where key = 'initial_tokens';
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000011', 'nuevo@test.dev');

select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000011'),
  5, 'el usuario nuevo recibe los tokens iniciales configurados');
select test.is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000011'),
  1, 'el registro sigue creando el perfil');

-- El valor puede venir guardado como texto JSON ("7") además de número.
update public.app_config set value = '"7"'::jsonb where key = 'initial_tokens';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000012', 'texto@test.dev');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000012'),
  7, 'un número guardado como texto JSON también se respeta');

update public.app_config set value = '"abc"'::jsonb where key = 'initial_tokens';
select test.lives($$
  insert into auth.users (id, email)
  values ('00000000-0000-0000-0000-000000000013', 'config-rota@test.dev')
$$, 'una config no numérica no rompe el registro');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000013'),
  0, 'con config no numérica el saldo inicial es 0');

update public.app_config set value = '-4'::jsonb where key = 'initial_tokens';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000014', 'negativo@test.dev');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000014'),
  0, 'un valor negativo se trata como 0');

update public.app_config set value = '{"x": 1}'::jsonb where key = 'initial_tokens';
select test.lives($$
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000015', 'objeto@test.dev')
$$, 'una config con forma de objeto no rompe el registro');

delete from public.app_config where key = 'initial_tokens';
select test.lives($$
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000016', 'sin-config@test.dev')
$$, 'sin la clave initial_tokens el registro funciona');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000016'),
  0, 'sin config el saldo inicial es 0');

-- El usuario no puede escribir su saldo
select test.as_user('00000000-0000-0000-0000-000000000011');
update public.user_tokens set balance = 999 where user_id = '00000000-0000-0000-0000-000000000011';
select test.throws($$
  insert into public.user_tokens (user_id, balance)
  values ('00000000-0000-0000-0000-000000000011', 999)
  on conflict (user_id) do update set balance = 999
$$, '42501', 'el usuario no puede hacer upsert de su saldo');
delete from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000011';
select test.throws($$ select public.get_initial_tokens() $$,
  '42501', 'el usuario no puede ejecutar get_initial_tokens directamente');

select test.as_postgres();
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000011'),
  5, 'ni el UPDATE ni el DELETE del usuario cambiaron su saldo');

select test.is(
  (select array_agg(policyname::text order by policyname) from pg_policies
   where schemaname = 'public' and tablename = 'user_tokens'),
  array['Admins can read all user_tokens', 'Service role can manage tokens', 'Users can see their own tokens'],
  'user_tokens solo tiene las tres policies esperadas');

select test.is(
  (select count(*)::int from auth.users au
   where not exists (select 1 from public.user_tokens ut where ut.user_id = au.id)),
  0, 'todo usuario tiene fila de saldo');

rollback;
