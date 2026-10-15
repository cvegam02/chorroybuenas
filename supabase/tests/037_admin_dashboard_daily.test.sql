-- Resumen del panel (FEAT-43, US A4): ingresos e imágenes de IA por día, en hora de Hermosillo (migración 037).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000043e1', 'admin-diario@test.dev'),
  ('00000000-0000-0000-0000-0000000043e2', 'clienta-diario@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000043e1');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000043f1', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-0000000043f2', '00000000-0000-0000-0000-0000000043f1', 'Muertos', 4900);

insert into public.token_purchases
  (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status, created_at)
values
  ('00000000-0000-0000-0000-0000000043e2', 10, 0, 10, 2000, 'mercadopago', 'D-1', 'approved', '2026-10-01T18:00:00Z'),
  -- 1 de octubre a las 23:30 en Hermosillo: mismo día.
  ('00000000-0000-0000-0000-0000000043e2', 20, 0, 20, 3500, 'mercadopago', 'D-2', 'approved', '2026-10-02T06:30:00Z'),
  ('00000000-0000-0000-0000-0000000043e2', 50, 0, 50, 8000, 'mercadopago', 'D-3', 'pending', '2026-10-03T18:00:00Z');

insert into public.seasonal_purchases
  (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  ('00000000-0000-0000-0000-0000000043e2', '00000000-0000-0000-0000-0000000043f2', 4900, 'mercadopago', 'D-4', 'approved', '2026-10-03T18:00:00Z');

insert into public.token_usage (user_id, amount, created_at) values
  ('00000000-0000-0000-0000-0000000043e2', 3, '2026-10-01T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000043e2', 2, '2026-10-04T06:00:00Z');

select test.as_user('00000000-0000-0000-0000-0000000043e1');

select test.is(
  (select array_agg(row(day, revenue_cents, ai_images)::text order by day)
     from public.admin_get_dashboard_daily('2026-10-01', '2026-10-04')),
  array['(2026-10-01,5500,3)', '(2026-10-02,0,0)', '(2026-10-03,4900,2)', '(2026-10-04,0,0)'],
  'un renglón por día del periodo, con los días en cero, solo lo aprobado y en hora de Hermosillo');

select test.is(
  (select sum(revenue_cents)::bigint from public.admin_get_dashboard_daily('2026-10-01', '2026-10-04')),
  (select tokens_revenue_cents + seasonal_revenue_cents from public.admin_get_dashboard_summary('2026-10-01', '2026-10-04')),
  'la suma de los días coincide con los ingresos del Resumen');

select test.is(
  (select sum(ai_images)::bigint from public.admin_get_dashboard_daily('2026-10-01', '2026-10-04')),
  (select ai_images from public.admin_get_dashboard_summary('2026-10-01', '2026-10-04')),
  'la suma de los días coincide con las imágenes de IA del Resumen');

select test.throws($$
  select * from public.admin_get_dashboard_daily('2026-10-04', '2026-10-01')
$$, 'Invalid period', 'un periodo al revés se rechaza');

select test.throws($$
  select * from public.admin_get_dashboard_daily('2020-01-01', '2026-10-01')
$$, 'Invalid period', 'un periodo de más de un año y un día se rechaza');

select test.as_user('00000000-0000-0000-0000-0000000043e2');
select test.throws($$
  select * from public.admin_get_dashboard_daily('2026-10-01', '2026-10-04')
$$, 'Unauthorized', 'una usuaria normal no puede ver la serie por día');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_dashboard_daily('2026-10-01', '2026-10-04')
$$, '42501', 'un visitante no puede ver la serie por día');

rollback;
