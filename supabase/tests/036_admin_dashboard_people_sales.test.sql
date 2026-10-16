-- Resumen del panel (FEAT-43, US A2): gente y ventas del periodo en hora de Hermosillo (migración 036).
begin;

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000043c1', 'admin-gente@test.dev', '2026-01-01T12:00:00Z'),
  -- Cuenta vieja que ya había comprado antes del periodo.
  ('00000000-0000-0000-0000-0000000043c2', 'vieja@test.dev', '2026-09-01T12:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c3', 'nueva-compra@test.dev', '2026-10-03T12:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c4', 'nueva-ia@test.dev', '2026-10-10T12:00:00Z'),
  -- 15 de octubre a las 23:00 en Hermosillo: nueva en el periodo.
  ('00000000-0000-0000-0000-0000000043c5', 'nueva-noche@test.dev', '2026-10-16T06:00:00Z'),
  -- 30 de septiembre a las 23:00 en Hermosillo: fuera del periodo.
  ('00000000-0000-0000-0000-0000000043c6', 'septiembre@test.dev', '2026-10-01T06:00:00Z');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000043c1');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000043d1', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-0000000043d2', '00000000-0000-0000-0000-0000000043d1', 'Muertos', 4900),
  ('00000000-0000-0000-0000-0000000043d3', '00000000-0000-0000-0000-0000000043d1', 'Catrinas', 4900);

insert into public.token_purchases
  (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status, created_at)
values
  ('00000000-0000-0000-0000-0000000043c2', 10, 0, 10, 2000, 'mercadopago', 'G-1', 'approved', '2026-09-10T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c2', 20, 0, 20, 3500, 'mercadopago', 'G-2', 'approved', '2026-10-05T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c3', 20, 2, 22, 3500, 'mercadopago', 'G-3', 'approved', '2026-10-04T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c3', 10, 0, 10, 2000, 'mercadopago', 'G-4', 'approved', '2026-10-07T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c4', 50, 0, 50, 8000, 'mercadopago', 'G-5', 'pending', '2026-10-08T18:00:00Z');

insert into public.seasonal_purchases
  (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  ('00000000-0000-0000-0000-0000000043c3', '00000000-0000-0000-0000-0000000043d2', 4900, 'mercadopago', 'G-6', 'approved', '2026-10-06T18:00:00Z'),
  -- Compra de una cuenta que ya se borró: es una venta, pero no es una persona que se pueda contar.
  (null, '00000000-0000-0000-0000-0000000043d3', 4900, 'mercadopago', 'G-7', 'approved', '2026-10-09T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c2', '00000000-0000-0000-0000-0000000043d2', 4900, 'mercadopago', 'G-8', 'approved', '2026-10-11T18:00:00Z');

insert into public.token_usage (user_id, amount, created_at) values
  ('00000000-0000-0000-0000-0000000043c4', 1, '2026-10-08T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c2', 2, '2026-10-02T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c2', 1, '2026-10-03T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043c3', 1, '2026-10-01T06:00:00Z');

select test.as_user('00000000-0000-0000-0000-0000000043c1');

select test.is(
  (select new_users from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')),
  3::bigint, 'usuarios nuevos cuenta las cuentas creadas en el periodo, en hora de Hermosillo');

select test.is(
  (select row(buyers, first_time_buyers)::text from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')),
  '(2,1)'::text,
  'compraron cuenta personas con compras aprobadas; por primera vez, solo quien no había comprado antes');

select test.is(
  (select ai_users from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')),
  2::bigint, 'usaron la IA cuenta personas distintas, no imágenes');

select test.is(
  (select row(token_purchases, tokens_sold, seasonal_sales)::text
     from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')),
  '(3,52,3)'::text,
  'las ventas de tokens y de temáticas se cuentan por separado, solo las aprobadas');

select test.is(
  (select row(top_pack_tokens, top_pack_sales, top_loteria_name, top_loteria_sales)::text
     from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')),
  '(20,2,Muertos,2)'::text,
  'lo más vendido es el pack y la temática con más compras aprobadas');

select test.is(
  (select row(tokens_revenue_cents, seasonal_revenue_cents)::text
     from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')),
  '(9000,14700)'::text,
  'el dinero de US A1 sigue igual');

select test.is(
  (select row(new_users, buyers, first_time_buyers, ai_users, token_purchases, tokens_sold, seasonal_sales,
              top_pack_tokens, top_pack_sales, top_loteria_name, top_loteria_sales)::text
     from public.admin_get_dashboard_summary('2025-01-01', '2025-01-31')),
  '(0,0,0,0,0,0,0,,0,,0)'::text,
  'sin ventas, lo más vendido queda vacío y los conteos en cero');

select test.as_user('00000000-0000-0000-0000-0000000043c2');
select test.throws($$
  select * from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15')
$$, 'Unauthorized', 'una usuaria normal sigue sin poder ver el resumen');

rollback;
