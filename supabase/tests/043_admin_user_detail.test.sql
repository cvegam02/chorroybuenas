-- Ficha del usuario en la pestaña Usuarios (FEAT-45, US A2): datos, saldo y los cuatro números
-- (migración 043), y que un regalo hecho desde la ficha se refleje en ella.
begin;

insert into auth.users (id, email, created_at, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000004601', 'admin-ficha@test.dev', now() - interval '90 days', '{"provider": "email"}'),
  ('00000000-0000-0000-0000-000000004602', 'ana@test.dev', '2026-09-03T06:00:00Z', '{"provider": "google", "providers": ["google"]}'),
  ('00000000-0000-0000-0000-000000004603', 'beto@test.dev', now() - interval '1 hour', '{"provider": "email"}');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004601');
insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000004602', 'ana@test.dev', 'Ana López'),
  ('00000000-0000-0000-0000-000000004603', 'beto@test.dev', '')
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.user_tokens (user_id, balance) values
  ('00000000-0000-0000-0000-000000004602', 18),
  ('00000000-0000-0000-0000-000000004603', 0)
on conflict (user_id) do update set balance = excluded.balance;

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000004611', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000004612', '00000000-0000-0000-0000-000000004611', 'Muertos', 4900),
  ('00000000-0000-0000-0000-000000004613', '00000000-0000-0000-0000-000000004611', 'Catrinas', 4900);

insert into public.token_purchases
  (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status)
values
  ('00000000-0000-0000-0000-000000004602', 20, 5, 25, 3500, 'mercadopago', 'F-1', 'approved'),
  ('00000000-0000-0000-0000-000000004602', 10, 0, 10, 2000, 'mercadopago', 'F-2', 'approved');

insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_provider, payment_id, status) values
  ('00000000-0000-0000-0000-000000004602', '00000000-0000-0000-0000-000000004612', 4900, 'mercadopago', 'F-3', 'approved'),
  -- Pendiente y repetida: no cuentan como pagadas ni como temáticas compradas.
  ('00000000-0000-0000-0000-000000004602', '00000000-0000-0000-0000-000000004613', 4900, 'mercadopago', 'F-4', 'pending'),
  ('00000000-0000-0000-0000-000000004602', '00000000-0000-0000-0000-000000004612', 4900, 'mercadopago', 'F-5', 'repeated');

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-000000004621', '00000000-0000-0000-0000-000000004602', 'Familia'),
  ('00000000-0000-0000-0000-000000004622', '00000000-0000-0000-0000-000000004602', 'Boda');

insert into public.token_usage (user_id, amount, set_id) values
  ('00000000-0000-0000-0000-000000004602', 1, '00000000-0000-0000-0000-000000004621'),
  ('00000000-0000-0000-0000-000000004602', 1, '00000000-0000-0000-0000-000000004621'),
  ('00000000-0000-0000-0000-000000004602', 2, null);

insert into public.token_gifts (recipient_id, admin_id, amount, reason) values
  ('00000000-0000-0000-0000-000000004602', '00000000-0000-0000-0000-000000004601', 10, 'Sorteo'),
  ('00000000-0000-0000-0000-000000004602', '00000000-0000-0000-0000-000000004601', 5, null);

select test.as_user('00000000-0000-0000-0000-000000004601');

select test.is(
  (select row(email, full_name, created_at = '2026-09-03T06:00:00Z'::timestamptz, provider, balance)::text
     from public.admin_get_user_detail('00000000-0000-0000-0000-000000004602')),
  '(ana@test.dev,"Ana López",t,google,18)',
  'la ficha trae correo, nombre, fecha de alta, cómo entró y el saldo');

select test.is(
  (select row(paid_cents, purchases_count)::text
     from public.admin_get_user_detail('00000000-0000-0000-0000-000000004602')),
  '(10400,3)',
  'ha pagado: solo compras aprobadas de tokens y temáticas, con cuántas son');

select test.is(
  (select row(ai_tokens, loterias_count, seasonal_count, gifted_tokens)::text
     from public.admin_get_user_detail('00000000-0000-0000-0000-000000004602')),
  '(4,2,1,15)',
  'tokens gastados en IA, loterías guardadas, temáticas compradas y tokens regalados');

select test.is(
  (select row(full_name is null, provider, balance, paid_cents, purchases_count, ai_tokens,
              loterias_count, seasonal_count, gifted_tokens)::text
     from public.admin_get_user_detail('00000000-0000-0000-0000-000000004603')),
  '(t,email,0,0,0,0,0,0,0)',
  'una cuenta nueva y sin nombre trae todo en cero');

select test.is(
  (select count(*) from public.admin_get_user_detail('00000000-0000-0000-0000-000000004699')),
  0::bigint,
  'una cuenta que no existe no trae ficha');

-- Regalar desde la ficha usa la función de siempre: la ficha cambia saldo y regalados.
select public.admin_gift_tokens('00000000-0000-0000-0000-000000004603', 5, '  Compensación  ');

select test.is(
  (select row(balance, gifted_tokens)::text
     from public.admin_get_user_detail('00000000-0000-0000-0000-000000004603')),
  '(5,5)',
  'después de regalar, la ficha trae el saldo nuevo y los tokens regalados');

select test.as_postgres();
select test.is(
  (select row(amount, reason, admin_id)::text from public.token_gifts
     where recipient_id = '00000000-0000-0000-0000-000000004603'),
  '(5,Compensación,00000000-0000-0000-0000-000000004601)',
  'el regalo queda en el historial con su motivo y quién regaló');
select test.as_user('00000000-0000-0000-0000-000000004601');

select test.throws($$
  select public.admin_gift_tokens('00000000-0000-0000-0000-000000004603', 0)
$$, 'Amount must be positive', 'no se regalan cero tokens');

select test.as_user('00000000-0000-0000-0000-000000004602');
select test.throws($$
  select * from public.admin_get_user_detail('00000000-0000-0000-0000-000000004603')
$$, 'Unauthorized', 'una usuaria normal no puede ver la ficha de nadie');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_user_detail('00000000-0000-0000-0000-000000004602')
$$, '42501', 'un visitante no puede pedir una ficha');

rollback;
