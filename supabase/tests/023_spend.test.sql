-- Cobro y reembolso de tokens de IA desde el servidor (migración 023).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000002', 'gasto@test.dev'),
  ('00000000-0000-0000-0000-000000000003', 'otro@test.dev');
insert into public.user_tokens (user_id, balance)
values ('00000000-0000-0000-0000-000000000002', 2)
on conflict (user_id) do update set balance = 2;
delete from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000003';

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-000000000002', 'Propio'),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-000000000003', 'Ajeno');

create temp table usos (n int, id uuid) on commit drop;

insert into usos select 1, public.spend_tokens_for_user(
  '00000000-0000-0000-0000-000000000002', 1, '00000000-0000-0000-0000-00000000aaaa');
insert into usos select 2, public.spend_tokens_for_user(
  '00000000-0000-0000-0000-000000000002', 1, '00000000-0000-0000-0000-00000000bbbb');

select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000002'),
  0, 'dos gastos dejan el saldo en 0');

select test.is(
  (select set_id from public.token_usage where id = (select id from usos where n = 1)),
  '00000000-0000-0000-0000-00000000aaaa'::uuid, 'el uso registra el set propio');

select test.is(
  (select set_id from public.token_usage where id = (select id from usos where n = 2)),
  null::uuid, 'un set ajeno no se registra');

select test.throws($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, 'INSUFFICIENT_TOKENS', 'sin saldo no se puede gastar');

select test.throws($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000003', 1, null)
$$, 'INSUFFICIENT_TOKENS', 'un usuario sin fila de saldo no puede gastar');

select test.throws($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 0, null)
$$, 'Amount must be positive', 'no se puede gastar 0');

select test.throws($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', -3, null)
$$, 'Amount must be positive', 'no se puede gastar un monto negativo');

select test.is((select count(*)::int from public.token_usage where user_id = '00000000-0000-0000-0000-000000000002'),
  2, 'los gastos rechazados no dejan registro');

select test.lives(format($$ select public.refund_token_usage(%L) $$, (select id from usos where n = 1)),
  'reembolso funciona');
select test.lives(format($$ select public.refund_token_usage(%L) $$, (select id from usos where n = 1)),
  'reembolsar dos veces no falla');
select test.lives($$ select public.refund_token_usage('00000000-0000-0000-0000-00000000dead') $$,
  'reembolsar un uso inexistente no falla');

select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000002'),
  1, 'el reembolso devuelve el token una sola vez');
select test.is((select count(*)::int from public.token_usage where user_id = '00000000-0000-0000-0000-000000000002'),
  1, 'el uso reembolsado desaparece del registro');

select test.throws($$
  update public.user_tokens set balance = -1 where user_id = '00000000-0000-0000-0000-000000000002'
$$, '23514', 'el saldo no puede ser negativo');

-- Rate limit: queda 1 uso registrado; con 9 más se llega a 10 y el siguiente se rechaza.
update public.user_tokens set balance = 100 where user_id = '00000000-0000-0000-0000-000000000002';
select count(public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null))
from generate_series(1, 9);

select test.throws($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, 'RATE_LIMITED', 'más de 10 usos por minuto se rechazan');

select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000002'),
  91, 'el intento limitado no cobra');

-- Los usos de hace más de un minuto no cuentan.
update public.token_usage set created_at = now() - interval '2 minutes'
where user_id = '00000000-0000-0000-0000-000000000002';
select test.lives($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, 'pasado el minuto se puede volver a gastar');

select test.is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'spend_tokens'),
  0, 'la RPC del cliente spend_tokens ya no existe');

select test.as_user('00000000-0000-0000-0000-000000000002');
select test.throws($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, '42501', 'un usuario autenticado no puede cobrar tokens directamente');
select test.throws($$
  select public.refund_token_usage('00000000-0000-0000-0000-00000000dead')
$$, '42501', 'un usuario autenticado no puede reembolsarse');

select test.as_anon();
select test.throws($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, '42501', 'un visitante no puede cobrar tokens');

select test.as_service_role();
select test.lives($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, 'service_role sí puede cobrar');

rollback;
