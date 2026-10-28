-- Pagos pendientes de temáticas que caducan (FEAT-58, US A11; migración 075), decisión 5: un pago pendiente sin
-- aviso de Mercado Pago se libera a los 3 días.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000007501', 'pendiente@test.dev'),
  ('00000000-0000-0000-0000-000000007502', 'otro-pendiente@test.dev');
insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-0000000075a0', 'Invierno');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-0000000075a1', '00000000-0000-0000-0000-0000000075a0', 'Navidad', 4900),
  ('00000000-0000-0000-0000-0000000075a2', '00000000-0000-0000-0000-0000000075a0', 'Posadas', 4900);

insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at) values
  ('00000000-0000-0000-0000-000000007501', '00000000-0000-0000-0000-0000000075a1', 4900, 'mercadopago', 'P-VIEJO', 'pending', now() - interval '73 hours'),
  ('00000000-0000-0000-0000-000000007501', '00000000-0000-0000-0000-0000000075a2', 4900, 'mercadopago', 'P-RECIENTE', 'pending', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000007502', '00000000-0000-0000-0000-0000000075a1', 4900, 'mercadopago', 'P-AJENO', 'pending', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000007501', '00000000-0000-0000-0000-0000000075a2', 4900, 'mercadopago', 'P-APROBADO', 'approved', now() - interval '30 days');

select test.as_service_role();
select test.is(
  public.release_stale_seasonal_pending('00000000-0000-0000-0000-000000007501', '00000000-0000-0000-0000-0000000075a1'),
  1, 'un pendiente de más de 3 días se libera al volver a comprar');
select test.is(
  public.release_stale_seasonal_pending('00000000-0000-0000-0000-000000007501', '00000000-0000-0000-0000-0000000075a2'),
  0, 'uno de 2 días sigue bloqueando');
select test.as_postgres();
select test.is((select count(*)::int from public.seasonal_purchases where payment_id = 'P-VIEJO'), 0,
  'el pendiente viejo ya no está');
select test.is((select count(*)::int from public.seasonal_purchases where payment_id = 'P-AJENO'), 1,
  'el de otra cuenta no se toca');
select test.is((select count(*)::int from public.seasonal_purchases where payment_id = 'P-APROBADO'), 1,
  'las compras aprobadas no se tocan, aunque sean viejas');

select test.as_user('00000000-0000-0000-0000-000000007501');
select test.throws($$
  select public.release_stale_seasonal_pending('00000000-0000-0000-0000-000000007501', '00000000-0000-0000-0000-0000000075a2')
$$, '42501', 'solo el servidor libera pendientes');

rollback;
