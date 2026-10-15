-- Tarjetas de packs en Precios y promos (FEAT-46, US A3): ventas aprobadas de cada pack en un periodo,
-- en hora de Hermosillo (migración 047).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005001', 'admin-packs@test.dev'),
  ('00000000-0000-0000-0000-000000005002', 'ana-packs@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005001');

insert into public.token_packs (id, base_tokens, bonus_tokens, price_cents, sort_order, is_active) values
  ('00000000-0000-0000-0000-000000005101', 7, 1, 1300, 90, true),
  ('00000000-0000-0000-0000-000000005102', 13, 3, 2500, 91, true),
  -- Oculto: no se vende, pero conserva sus ventas.
  ('00000000-0000-0000-0000-000000005103', 17, 4, 3100, 92, false);

insert into public.token_purchases
  (user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status, created_at)
values
  -- Pack 7: dos aprobadas en octubre (una el 1 a las 00:30 de Hermosillo).
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000005101', 7, 1, 8, 1300, 'mercadopago', 'p1', 'approved', '2026-10-01T07:30:00Z'),
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000005101', 7, 1, 8, 1300, 'mercadopago', 'p2', 'approved', '2026-10-14T18:00:00Z'),
  -- 30 de septiembre a las 23:00 en Hermosillo: fuera.
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000005101', 7, 1, 8, 1300, 'mercadopago', 'p3', 'approved', '2026-10-01T06:00:00Z'),
  -- 15 de octubre a las 23:00 en Hermosillo: dentro.
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000005101', 7, 1, 8, 1300, 'mercadopago', 'p4', 'approved', '2026-10-16T06:00:00Z'),
  -- Pack 13: pendiente y repetida no cuentan; una aprobada sí.
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000005102', 13, 3, 16, 2500, 'mercadopago', 'p5', 'pending', '2026-10-10T18:00:00Z'),
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000005102', 13, 3, 16, 2500, 'mercadopago', 'p6', 'repeated', '2026-10-10T18:00:00Z'),
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000005102', 13, 3, 16, 2500, 'mercadopago', 'p7', 'approved', '2026-10-11T18:00:00Z'),
  -- Pack oculto con una venta aprobada del mes.
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000005103', 17, 4, 21, 3100, 'mercadopago', 'p8', 'approved', '2026-10-12T18:00:00Z'),
  -- Cantidad libre: sin pack, no cuenta para ninguno.
  ('00000000-0000-0000-0000-000000005002', null, 9, 0, 9, 1800, 'mercadopago', 'p9', 'approved', '2026-10-12T18:00:00Z');

select test.as_user('00000000-0000-0000-0000-000000005001');

select test.is(
  (select sales from public.admin_get_pack_sales('2026-10-01', '2026-10-15')
     where pack_id = '00000000-0000-0000-0000-000000005101'),
  3::bigint,
  'cuenta las aprobadas del periodo en hora de Hermosillo');

select test.is(
  (select sales from public.admin_get_pack_sales('2026-10-01', '2026-10-15')
     where pack_id = '00000000-0000-0000-0000-000000005102'),
  1::bigint,
  'no cuenta pendientes ni repetidas');

select test.is(
  (select sales from public.admin_get_pack_sales('2026-10-01', '2026-10-15')
     where pack_id = '00000000-0000-0000-0000-000000005103'),
  1::bigint,
  'un pack oculto conserva sus ventas');

select test.is(
  (select sales from public.admin_get_pack_sales('2026-11-01', '2026-11-30')
     where pack_id = '00000000-0000-0000-0000-000000005101'),
  0::bigint,
  'un pack sin ventas en el periodo sale con cero');

select test.is(
  (select count(*) from public.admin_get_pack_sales('2026-10-01', '2026-10-15') where pack_id is null),
  0::bigint,
  'la cantidad libre no aparece como pack');

select test.throws($$
  select * from public.admin_get_pack_sales('2026-10-15', '2026-10-01')
$$, 'Invalid period', 'un periodo al revés se rechaza');

select test.as_user('00000000-0000-0000-0000-000000005002');
select test.throws($$
  select * from public.admin_get_pack_sales('2026-10-01', '2026-10-15')
$$, 'Unauthorized', 'una usuaria normal no puede ver las ventas por pack');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_pack_sales('2026-10-01', '2026-10-15')
$$, '42501', 'un visitante no puede pedirlas');

rollback;
