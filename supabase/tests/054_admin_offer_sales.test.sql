-- La oferta en Ventas y en el Resumen (FEAT-49, US A2, decisión 16): cada venta de tokens trae el nombre
-- y el descuento de su oferta, y el Resumen suma lo cobrado con oferta en el periodo, en hora de
-- Hermosillo, solo con compras aprobadas (migración 054).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005401', 'admin-ofertas@test.dev'),
  ('00000000-0000-0000-0000-000000005402', 'ana-ofertas@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005401');

insert into public.offers (id, name, discount_percent, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000054a1', 'Buen Fin 2026', 25, '2026-11-13T07:00:00Z', '2026-11-18T07:00:00Z');

insert into public.token_purchases
  (user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id,
   payment_status, created_at, offer_id, offer_percent)
values
  -- Dos aprobadas con oferta (una el 13 a las 00:30 de Hermosillo).
  ('00000000-0000-0000-0000-000000005402', null, 20, 5, 25, 3000, 'mercadopago', 'o1', 'approved', '2026-11-13T07:30:00Z', '00000000-0000-0000-0000-0000000054a1', 25),
  ('00000000-0000-0000-0000-000000005402', null, 10, 0, 10, 1500, 'mercadopago', 'o2', 'approved', '2026-11-15T18:00:00Z', '00000000-0000-0000-0000-0000000054a1', 25),
  -- Pendiente con oferta: no se cuenta como cobrada.
  ('00000000-0000-0000-0000-000000005402', null, 10, 0, 10, 1500, 'mercadopago', 'o3', 'pending', '2026-11-16T18:00:00Z', '00000000-0000-0000-0000-0000000054a1', 25),
  -- Aprobada sin oferta.
  ('00000000-0000-0000-0000-000000005402', null, 10, 0, 10, 2000, 'mercadopago', 'o4', 'approved', '2026-11-12T18:00:00Z', null, null),
  -- Con oferta, pero el 17 a las 23:30 de Hermosillo: fuera de un periodo del 13 al 16.
  ('00000000-0000-0000-0000-000000005402', null, 10, 0, 10, 1500, 'mercadopago', 'o5', 'approved', '2026-11-18T06:30:00Z', '00000000-0000-0000-0000-0000000054a1', 25);

select test.as_user('00000000-0000-0000-0000-000000005401');

select test.is(
  (select offer_name from public.admin_get_sales('2026-11-01', '2026-11-30') where payment_id = 'o1'),
  'Buen Fin 2026',
  'Ventas trae el nombre de la oferta de una compra');
select test.is(
  (select offer_percent from public.admin_get_sales('2026-11-01', '2026-11-30') where payment_id = 'o1'),
  25,
  'y el descuento que tuvo');
select test.ok(
  (select offer_name is null and offer_percent is null
     from public.admin_get_sales('2026-11-01', '2026-11-30') where payment_id = 'o4'),
  'una compra sin oferta no trae oferta');

-- El descuento es el guardado en la compra, aunque después se edite la oferta.
select test.as_postgres();
update public.offers set discount_percent = 30, name = 'Buen Fin 2026 (editada)'
where id = '00000000-0000-0000-0000-0000000054a1';
select test.as_user('00000000-0000-0000-0000-000000005401');
select test.is(
  (select offer_percent from public.admin_get_sales('2026-11-01', '2026-11-30') where payment_id = 'o1'),
  25,
  'el descuento de la venta no cambia al editar la oferta');

select test.is(
  (select array[sales, collected_cents] from public.admin_get_offer_sales_total('2026-11-13', '2026-11-16')),
  array[2, 4500]::bigint[],
  'el Resumen suma solo lo aprobado con oferta del periodo, en hora de Hermosillo');
select test.is(
  (select array[sales, collected_cents] from public.admin_get_offer_sales_total('2026-11-13', '2026-11-17')),
  array[3, 6000]::bigint[],
  'el último día del periodo cuenta hasta las 23:59 de Hermosillo');
select test.is(
  (select array[sales, collected_cents] from public.admin_get_offer_sales_total('2026-10-01', '2026-10-31')),
  array[0, 0]::bigint[],
  'un periodo sin ventas con oferta da ceros');
select test.throws($$
  select * from public.admin_get_offer_sales_total('2026-11-30', '2026-11-01')
$$, 'Invalid period', 'un periodo al revés se rechaza');

select test.as_user('00000000-0000-0000-0000-000000005402');
select test.throws($$
  select * from public.admin_get_offer_sales_total('2026-11-01', '2026-11-30')
$$, 'Unauthorized', 'una usuaria normal no ve lo vendido con oferta');
select test.throws($$
  select * from public.admin_get_sales('2026-11-01', '2026-11-30')
$$, 'Unauthorized', 'ni las ventas');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_offer_sales_total('2026-11-01', '2026-11-30')
$$, '42501', 'un visitante tampoco');

rollback;
