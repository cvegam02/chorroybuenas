-- Resumen del panel (FEAT-43, US A5): pagos pendientes y tokens regalados (migración 038).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000004301', 'admin-pend@test.dev'),
  ('00000000-0000-0000-0000-000000004302', 'clienta-pend@test.dev'),
  ('00000000-0000-0000-0000-000000004303', 'cliente-pend@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004301');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000004311', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000004312', '00000000-0000-0000-0000-000000004311', 'Muertos', 4900),
  ('00000000-0000-0000-0000-000000004313', '00000000-0000-0000-0000-000000004311', 'Catrinas', 4900);

insert into public.seasonal_purchases
  (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  -- Los pendientes cuentan aunque sean de antes del periodo: siguen esperando.
  ('00000000-0000-0000-0000-000000004302', '00000000-0000-0000-0000-000000004312', 4900, 'mercadopago', 'P-1', 'pending', '2026-09-20T18:00:00Z'),
  ('00000000-0000-0000-0000-000000004303', '00000000-0000-0000-0000-000000004313', 4900, 'mercadopago', 'P-2', 'pending', '2026-10-12T18:00:00Z'),
  ('00000000-0000-0000-0000-000000004303', '00000000-0000-0000-0000-000000004312', 4900, 'mercadopago', 'P-3', 'approved', '2026-10-05T18:00:00Z');

insert into public.token_gifts (recipient_id, admin_id, amount, created_at) values
  ('00000000-0000-0000-0000-000000004302', '00000000-0000-0000-0000-000000004301', 3, '2026-10-02T18:00:00Z'),
  ('00000000-0000-0000-0000-000000004302', '00000000-0000-0000-0000-000000004301', 2, '2026-10-03T18:00:00Z'),
  -- 15 de octubre a las 23:00 en Hermosillo: dentro del periodo.
  ('00000000-0000-0000-0000-000000004303', '00000000-0000-0000-0000-000000004301', 5, '2026-10-16T06:00:00Z'),
  -- 30 de septiembre a las 23:00 en Hermosillo: fuera.
  ('00000000-0000-0000-0000-000000004303', '00000000-0000-0000-0000-000000004301', 7, '2026-10-01T06:00:00Z');

select test.as_user('00000000-0000-0000-0000-000000004301');

select test.is(
  (select row(pending_payments, oldest_pending_at)::text
     from public.admin_get_dashboard_pending('2026-10-01', '2026-10-15')),
  (select row(2::bigint, '2026-09-20T18:00:00Z'::timestamptz)::text),
  'cuenta todos los pagos que siguen pendientes y dice desde cuándo espera el más viejo');

select test.is(
  (select row(gifted_tokens, gift_recipients)::text
     from public.admin_get_dashboard_pending('2026-10-01', '2026-10-15')),
  '(10,2)'::text,
  'suma los tokens regalados en el periodo y a cuántas personas, en hora de Hermosillo');

reset role;
delete from public.seasonal_purchases where status = 'pending';
select test.as_user('00000000-0000-0000-0000-000000004301');
select test.is(
  (select row(pending_payments, oldest_pending_at, gifted_tokens, gift_recipients)::text
     from public.admin_get_dashboard_pending('2025-01-01', '2025-01-31')),
  '(0,,0,0)'::text,
  'sin pendientes ni regalos, todo en cero');

select test.throws($$
  select * from public.admin_get_dashboard_pending('2026-10-15', '2026-10-01')
$$, 'Invalid period', 'un periodo al revés se rechaza');

select test.as_user('00000000-0000-0000-0000-000000004302');
select test.throws($$
  select * from public.admin_get_dashboard_pending('2026-10-01', '2026-10-15')
$$, 'Unauthorized', 'una usuaria normal no puede ver los pendientes');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_dashboard_pending('2026-10-01', '2026-10-15')
$$, '42501', 'un visitante no puede ver los pendientes');

rollback;
