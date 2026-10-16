-- Pantalla Temáticas (FEAT-48, US A1): ventas e ingresos de cada lotería temática, lo vendido en un
-- periodo en hora de Hermosillo, y el orden de las temáticas (migración 051).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005101', 'admin-tematicas@test.dev'),
  ('00000000-0000-0000-0000-000000005102', 'ana-tematicas@test.dev'),
  ('00000000-0000-0000-0000-000000005103', 'beto-tematicas@test.dev'),
  ('00000000-0000-0000-0000-000000005104', 'caro-tematicas@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005101');

insert into public.seasons (id, name_es, sort_order) values
  ('00000000-0000-0000-0000-0000000051a1', 'Día de Muertos', 0),
  ('00000000-0000-0000-0000-0000000051a2', 'Navidad', 1),
  ('00000000-0000-0000-0000-0000000051a3', 'Ocasiones', 2);

insert into public.seasonal_loterias (id, season_id, name_es) values
  ('00000000-0000-0000-0000-0000000051b1', '00000000-0000-0000-0000-0000000051a1', 'Calaveritas'),
  ('00000000-0000-0000-0000-0000000051b2', '00000000-0000-0000-0000-0000000051a2', 'Navidad Kids'),
  ('00000000-0000-0000-0000-0000000051b3', '00000000-0000-0000-0000-0000000051a3', 'Baby shower'),
  ('00000000-0000-0000-0000-0000000051b4', '00000000-0000-0000-0000-0000000051a3', 'Boda');

insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_id, status, created_at) values
  -- Calaveritas: dos aprobadas en octubre (una el 1 a las 00:30 de Hermosillo), una de septiembre.
  ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-0000000051b1', 10000, 's1', 'approved', '2026-10-01T07:30:00Z'),
  ('00000000-0000-0000-0000-000000005103', '00000000-0000-0000-0000-0000000051b1', 9000, 's2', 'approved', '2026-10-14T18:00:00Z'),
  -- 30 de septiembre a las 23:00 en Hermosillo: cuenta en el total, no en octubre.
  ('00000000-0000-0000-0000-000000005104', '00000000-0000-0000-0000-0000000051b1', 10000, 's3', 'approved', '2026-10-01T06:00:00Z'),
  -- Navidad Kids: pendiente, repetida y devuelta no cuentan como venta ni como ingreso.
  ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-0000000051b2', 8000, 's4', 'pending', '2026-10-10T18:00:00Z'),
  ('00000000-0000-0000-0000-000000005103', '00000000-0000-0000-0000-0000000051b2', 8000, 's5', 'repeated', '2026-10-10T18:00:00Z'),
  ('00000000-0000-0000-0000-000000005104', '00000000-0000-0000-0000-0000000051b2', 8000, 's6', 'refunded', '2026-10-10T18:00:00Z'),
  -- Baby shower: 15 de octubre a las 23:00 en Hermosillo, dentro de octubre.
  ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-0000000051b3', 9000, 's7', 'approved', '2026-10-16T06:00:00Z');

select test.as_user('00000000-0000-0000-0000-000000005101');

-- Ventas e ingresos
select test.is(
  (select row(approved_sales, revenue_cents, period_revenue_cents, has_purchases)::text
     from public.admin_get_seasonal_sales('2026-10-01', '2026-10-31')
     where loteria_id = '00000000-0000-0000-0000-0000000051b1'),
  '(3,29000,19000,t)',
  'cuenta ventas e ingresos de siempre, y lo del periodo en hora de Hermosillo');

select test.is(
  (select row(approved_sales, revenue_cents, period_revenue_cents, has_purchases)::text
     from public.admin_get_seasonal_sales('2026-10-01', '2026-10-31')
     where loteria_id = '00000000-0000-0000-0000-0000000051b2'),
  '(0,0,0,t)',
  'pendientes, repetidas y devueltas no son ventas, pero sí impiden borrarla');

select test.is(
  (select period_revenue_cents
     from public.admin_get_seasonal_sales('2026-10-01', '2026-10-31')
     where loteria_id = '00000000-0000-0000-0000-0000000051b3'),
  9000::bigint,
  'una compra del último día del periodo en Hermosillo cuenta');

select test.is(
  (select row(approved_sales, revenue_cents, period_revenue_cents, has_purchases)::text
     from public.admin_get_seasonal_sales('2026-10-01', '2026-10-31')
     where loteria_id = '00000000-0000-0000-0000-0000000051b4'),
  '(0,0,0,f)',
  'una lotería sin compras sale con ceros');

select test.is(
  (select count(*) from public.admin_get_seasonal_sales('2026-10-01', '2026-10-31')),
  4::bigint,
  'salen todas las loterías');

select test.throws($$
  select * from public.admin_get_seasonal_sales('2026-10-31', '2026-10-01')
$$, 'Invalid period', 'un periodo al revés se rechaza');

-- Orden de las temáticas
select test.lives($$
  select public.admin_set_season_order(array[
    '00000000-0000-0000-0000-0000000051a3',
    '00000000-0000-0000-0000-0000000051a1',
    '00000000-0000-0000-0000-0000000051a2']::uuid[])
$$, 'el administrador cambia el orden de las temáticas');

select test.is(
  (select array_agg(name_es order by sort_order) from public.seasons),
  array['Ocasiones', 'Día de Muertos', 'Navidad'],
  'las temáticas quedan en el orden nuevo');

select test.throws($$
  select public.admin_set_season_order(array[
    '00000000-0000-0000-0000-0000000051a1',
    '00000000-0000-0000-0000-0000000051a2']::uuid[])
$$, 'Invalid order', 'un orden al que le falta una temática se rechaza');

select test.throws($$
  select public.admin_set_season_order(array[
    '00000000-0000-0000-0000-0000000051a1',
    '00000000-0000-0000-0000-0000000051a1',
    '00000000-0000-0000-0000-0000000051a2']::uuid[])
$$, 'Invalid order', 'un orden con una temática repetida se rechaza');

select test.throws($$
  select public.admin_set_season_order(array[
    '00000000-0000-0000-0000-0000000051a1',
    '00000000-0000-0000-0000-0000000051a2',
    '00000000-0000-0000-0000-0000000051ff']::uuid[])
$$, 'Invalid order', 'un orden con una temática que no existe se rechaza');

select test.is(
  (select array_agg(name_es order by sort_order) from public.seasons),
  array['Ocasiones', 'Día de Muertos', 'Navidad'],
  'tras los intentos rechazados el orden no cambió');

-- Sin permiso
select test.as_user('00000000-0000-0000-0000-000000005102');
select test.throws($$
  select * from public.admin_get_seasonal_sales('2026-10-01', '2026-10-31')
$$, 'Unauthorized', 'una usuaria normal no ve las ventas por lotería');
select test.throws($$
  select public.admin_set_season_order(array[
    '00000000-0000-0000-0000-0000000051a1',
    '00000000-0000-0000-0000-0000000051a2',
    '00000000-0000-0000-0000-0000000051a3']::uuid[])
$$, 'Unauthorized', 'una usuaria normal no cambia el orden');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_seasonal_sales('2026-10-01', '2026-10-31')
$$, '42501', 'un visitante no puede pedir las ventas');
select test.throws($$
  select public.admin_set_season_order(array['00000000-0000-0000-0000-0000000051a1']::uuid[])
$$, '42501', 'un visitante no puede cambiar el orden');

select test.as_postgres();
select test.is(
  (select array_agg(name_es order by sort_order) from public.seasons),
  array['Ocasiones', 'Día de Muertos', 'Navidad'],
  'el orden sigue siendo el del administrador');

rollback;
