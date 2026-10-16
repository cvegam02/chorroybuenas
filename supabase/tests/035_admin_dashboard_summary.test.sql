-- Resumen del panel (FEAT-43, US A1): dinero del periodo en hora de Hermosillo (migración 035).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000043a1', 'admin-resumen@test.dev'),
  ('00000000-0000-0000-0000-0000000043a2', 'clienta-resumen@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000043a1');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000043b1', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-0000000043b2', '00000000-0000-0000-0000-0000000043b1', 'Muertos', 4900),
  ('00000000-0000-0000-0000-0000000043b3', '00000000-0000-0000-0000-0000000043b1', 'Catrinas', 4900);

-- Hermosillo está en UTC-7 todo el año: el 1 de octubre empieza a las 07:00 UTC.
insert into public.token_purchases
  (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status, created_at)
values
  ('00000000-0000-0000-0000-0000000043a2', 10, 0, 10, 2000, 'mercadopago', 'R-1', 'approved', '2026-10-01T07:00:00Z'),
  -- 30 de septiembre a las 23:59 en Hermosillo: fuera del mes.
  ('00000000-0000-0000-0000-0000000043a2', 5, 0, 5, 1000, 'mercadopago', 'R-2', 'approved', '2026-10-01T06:59:00Z'),
  ('00000000-0000-0000-0000-0000000043a2', 25, 0, 25, 5000, 'mercadopago', 'R-3', 'pending', '2026-10-05T18:00:00Z');

insert into public.seasonal_purchases
  (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  -- 15 de octubre a las 23:30 en Hermosillo: dentro del periodo.
  ('00000000-0000-0000-0000-0000000043a2', '00000000-0000-0000-0000-0000000043b2', 4900, 'mercadopago', 'R-4', 'approved', '2026-10-16T06:30:00Z'),
  ('00000000-0000-0000-0000-0000000043a2', '00000000-0000-0000-0000-0000000043b2', 4900, 'mercadopago', 'R-5', 'repeated', '2026-10-10T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043a2', '00000000-0000-0000-0000-0000000043b2', 4900, 'mercadopago', 'R-6', 'refunded', '2026-10-11T18:00:00Z'),
  -- 16 de octubre a las 00:00 en Hermosillo: fuera del periodo.
  ('00000000-0000-0000-0000-0000000043a2', '00000000-0000-0000-0000-0000000043b3', 4900, 'mercadopago', 'R-7', 'approved', '2026-10-16T07:00:00Z');

insert into public.token_usage (user_id, amount, created_at) values
  ('00000000-0000-0000-0000-0000000043a2', 3, '2026-10-02T18:00:00Z'),
  -- 15 de octubre a las 23:00 en Hermosillo.
  ('00000000-0000-0000-0000-0000000043a2', 2, '2026-10-16T06:00:00Z'),
  -- 30 de septiembre a las 23:00 en Hermosillo.
  ('00000000-0000-0000-0000-0000000043a2', 5, '2026-10-01T06:00:00Z');

select test.as_user('00000000-0000-0000-0000-0000000043a1');

select test.is(
  (select row(tokens_revenue_cents, seasonal_revenue_cents, ai_images)::text
     from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')),
  '(2000,4900,5)'::text,
  'el periodo cuenta solo lo aprobado, separa tokens y temáticas y corta los días en hora de Hermosillo');

select test.is(
  (select row(tokens_revenue_cents, seasonal_revenue_cents, ai_images)::text
     from public.admin_get_dashboard_summary('2026-09-30', '2026-09-30')),
  '(1000,0,5)'::text,
  'lo de las 23:00 del 30 de septiembre en Hermosillo cuenta para ese día');

select test.is(
  (select row(tokens_revenue_cents, seasonal_revenue_cents, ai_images)::text
     from public.admin_get_dashboard_summary('2025-01-01', '2025-01-31')),
  '(0,0,0)'::text,
  'un periodo sin movimientos da ceros, no vacíos');

select test.throws($$
  select * from public.admin_get_dashboard_summary('2026-10-15', '2026-10-01')
$$, 'Invalid period', 'un periodo que termina antes de empezar se rechaza');
select test.throws($$
  select * from public.admin_get_dashboard_summary(null, '2026-10-01')
$$, 'Invalid period', 'un periodo sin inicio se rechaza');

-- Solo un administrador puede pedir el resumen.
select test.as_user('00000000-0000-0000-0000-0000000043a2');
select test.throws($$
  select * from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')
$$, 'Unauthorized', 'una usuaria normal no puede ver el resumen');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')
$$, '42501', 'un visitante no puede ver el resumen');

rollback;
