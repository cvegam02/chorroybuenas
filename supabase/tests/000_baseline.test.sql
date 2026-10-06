-- Comportamiento base de RLS y permisos que las migraciones 000–021 ya garantizan.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'beto@test.dev');

select test.is(
  (select count(*)::int from public.profiles where id in
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')),
  2, 'el registro crea el perfil de cada usuario');

insert into public.user_tokens (user_id, balance) values
  ('00000000-0000-0000-0000-0000000000a1', 5),
  ('00000000-0000-0000-0000-0000000000b2', 7)
on conflict (user_id) do update set balance = excluded.balance;

-- Ana crea su lotería y una carta
select test.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.loteria_sets (id, user_id, name)
values ('00000000-0000-0000-0000-00000000005e', '00000000-0000-0000-0000-0000000000a1', 'Set de Ana');
insert into public.cards (user_id, set_id, title)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000005e', 'El Gallo');

select test.is((select count(*)::int from public.cards), 1, 'Ana ve su carta');
select test.is((select count(*)::int from public.user_tokens), 1, 'Ana solo ve su propio saldo');
select test.is((select balance from public.user_tokens), 5, 'el saldo que ve Ana es el suyo');
select test.is(public.is_admin(), false, 'Ana no es admin');

-- Beto no puede ver ni tocar lo de Ana
select test.as_user('00000000-0000-0000-0000-0000000000b2');
select test.is((select count(*)::int from public.cards), 0, 'Beto no ve las cartas de Ana');
select test.is((select count(*)::int from public.loteria_sets), 0, 'Beto no ve las loterías de Ana');

select test.throws($$
  insert into public.cards (user_id, title)
  values ('00000000-0000-0000-0000-0000000000a1', 'Carta ajena')
$$, '42501', 'Beto no puede crear cartas a nombre de Ana');

select test.throws($$
  insert into public.cards (user_id, set_id, title)
  values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000005e', 'Intrusa')
$$, '42501', 'Beto no puede meter cartas en la lotería de Ana');

select test.throws($$ update public.user_tokens set balance = 999 $$, '42501',
  'un usuario no puede hacer UPDATE de saldos');
select test.throws($$
  insert into public.user_tokens (user_id, balance)
  values ('00000000-0000-0000-0000-0000000000b2', 999)
  on conflict (user_id) do update set balance = 999
$$, '42501', 'un usuario no puede hacer upsert de su saldo');

select test.throws($$
  select public.admin_gift_tokens('00000000-0000-0000-0000-0000000000b2', 100)
$$, 'Unauthorized', 'un usuario normal no puede regalarse tokens');

select test.as_postgres();
select test.is(
  (select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-0000000000b2'),
  7, 'el intento de Beto no cambió ningún saldo');

-- Admin
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000000a1');
select test.as_user('00000000-0000-0000-0000-0000000000a1');
select test.is(public.is_admin(), true, 'Ana es admin tras agregarla a admin_users');
select test.is((select count(*)::int from public.user_tokens), 2, 'la admin ve todos los saldos');

-- Visitante sin sesión
select test.as_anon();
select test.is((select count(*)::int from public.cards), 0, 'un visitante no ve cartas');
select test.is((select count(*)::int from public.user_tokens), 0, 'un visitante no ve saldos');

rollback;
