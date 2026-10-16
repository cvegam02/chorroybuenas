-- Pestaña Ventas del panel (FEAT-44, US A2): totales que respetan los filtros (migración 040).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000004421', 'admin-totales@test.dev'),
  ('00000000-0000-0000-0000-000000004422', 'ana-totales@test.dev'),
  ('00000000-0000-0000-0000-000000004423', 'beto-totales@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004421');
insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000004422', 'ana-totales@test.dev', 'Ana López'),
  ('00000000-0000-0000-0000-000000004423', 'beto-totales@test.dev', 'Roberto Ruiz')
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000004431', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000004432', '00000000-0000-0000-0000-000000004431', 'Muertos', 4900),
  ('00000000-0000-0000-0000-000000004433', '00000000-0000-0000-0000-000000004431', 'Catrinas', 5900);

insert into public.token_purchases
  (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status, created_at)
values
  ('00000000-0000-0000-0000-000000004422', 20, 5, 25, 3500, 'mercadopago', 'T-1', 'approved', '2026-10-05T18:00:00Z'),
  -- 15 de octubre a las 23:00 en Hermosillo: dentro del periodo.
  ('00000000-0000-0000-0000-000000004423', 10, 0, 10, 2000, 'mercadopago', 'T-2', 'approved', '2026-10-16T06:00:00Z'),
  -- Pendiente: no suma a lo cobrado ni a los tokens vendidos.
  ('00000000-0000-0000-0000-000000004423', 50, 0, 50, 8000, 'mercadopago', 'T-3', 'pending', '2026-10-06T18:00:00Z'),
  -- 30 de septiembre a las 23:00 en Hermosillo: fuera.
  ('00000000-0000-0000-0000-000000004422', 10, 0, 10, 2000, 'mercadopago', 'T-4', 'approved', '2026-10-01T06:00:00Z');

insert into public.seasonal_purchases
  (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  ('00000000-0000-0000-0000-000000004423', '00000000-0000-0000-0000-000000004432', 4900, 'mercadopago', 'T-5', 'approved', '2026-10-07T18:00:00Z'),
  ('00000000-0000-0000-0000-000000004422', '00000000-0000-0000-0000-000000004433', 5900, 'mercadopago', 'T-6', 'pending', '2026-10-09T18:00:00Z'),
  -- Aviso repetido de Mercado Pago: no cuenta en ningún total.
  ('00000000-0000-0000-0000-000000004423', '00000000-0000-0000-0000-000000004432', 4900, 'mercadopago', 'T-7', 'repeated', '2026-10-08T18:00:00Z');

select test.as_user('00000000-0000-0000-0000-000000004421');

select test.is(
  (select row(sales, collected_cents, pending_count, pending_cents, tokens_sold)::text
     from public.admin_get_sales_totals('2026-10-01', '2026-10-15')),
  '(5,10400,2,13900,35)',
  'ventas, cobrado (solo aprobadas), pendiente y tokens vendidos del periodo, sin las repetidas');

select test.is(
  (select row(sales, collected_cents, pending_count, pending_cents, tokens_sold)::text
     from public.admin_get_sales_totals('2026-10-01', '2026-10-15', null, 'tokens')),
  '(3,5500,1,8000,35)',
  'con Tipo «Tokens», solo las compras de tokens');

select test.is(
  (select row(sales, collected_cents, pending_count, pending_cents, tokens_sold)::text
     from public.admin_get_sales_totals('2026-10-01', '2026-10-15', null, null, 'approved')),
  '(3,10400,0,0,35)',
  'con «Aprobadas», nada pendiente');

select test.is(
  (select row(sales, collected_cents, pending_count, pending_cents, tokens_sold)::text
     from public.admin_get_sales_totals('2026-10-01', '2026-10-15', 'lópez')),
  '(2,3500,1,5900,25)',
  'con el buscador, solo esa persona');

select test.is(
  (select row(sales, collected_cents, pending_count, pending_cents, tokens_sold)::text
     from public.admin_get_sales_totals('2025-01-01', '2025-01-31')),
  '(0,0,0,0,0)',
  'un periodo sin ventas da ceros, no vacío');

select test.is(
  (select collected_cents from public.admin_get_sales_totals('2026-10-01', '2026-10-15'))::bigint,
  (select tokens_revenue_cents + seasonal_revenue_cents
     from public.admin_get_dashboard_summary('2026-10-01', '2026-10-15'))::bigint,
  'lo cobrado coincide con los ingresos del Resumen');

select test.throws($$
  select * from public.admin_get_sales_totals('2026-10-01', '2026-10-15', null, null, 'repeated')
$$, 'Invalid sale status', 'no se puede pedir el estado repetido');

select test.throws($$
  select * from public.admin_get_sales_totals('2026-10-15', '2026-10-01')
$$, 'Invalid period', 'un periodo al revés se rechaza');

select test.as_user('00000000-0000-0000-0000-000000004422');
select test.throws($$
  select * from public.admin_get_sales_totals('2026-10-01', '2026-10-15')
$$, 'Unauthorized', 'una usuaria normal no puede ver los totales');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_sales_totals('2026-10-01', '2026-10-15')
$$, '42501', 'un visitante no puede ver los totales');

rollback;
