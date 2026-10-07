-- Pagos en proceso de loterías de temporada: efectivo o transferencia (migración 033).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'efectivo@test.dev'),
  ('00000000-0000-0000-0000-0000000000a2', 'otra-efectivo@test.dev');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000000aa1', 'Primavera');
-- Borradores: el público no las ve.
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000000ba1', '00000000-0000-0000-0000-000000000aa1', 'En efectivo', 4900),
  ('00000000-0000-0000-0000-000000000ba2', '00000000-0000-0000-0000-000000000aa1', 'Ya comprada', 4900),
  ('00000000-0000-0000-0000-000000000ba3', '00000000-0000-0000-0000-000000000aa1', 'Rechazada', 4900);

-- Un pago pendiente queda registrado como pendiente, una sola vez.
select test.is(
  public.record_pending_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba1', 4900,
    'mercadopago', 'PP-1', '{}'::jsonb),
  'pending'::text, 'un pago pendiente queda registrado como pendiente');
select test.is(
  public.record_pending_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba1', 4900,
    'mercadopago', 'PP-1', '{}'::jsonb),
  'pending'::text, 'el aviso repetido de un pago pendiente no falla');
select test.is(
  (select count(*)::int from public.seasonal_purchases where payment_id = 'PP-1'),
  1, 'el aviso repetido no registra dos compras');

-- Al aprobarse, pasa a aprobada sin duplicarse.
select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba1', 4900,
    'mercadopago', 'PP-1', '{"status":"approved"}'::jsonb),
  'approved'::text, 'al aprobarse el pago, la compra pasa a aprobada');
select test.is(
  (select array_agg(status) from public.seasonal_purchases where payment_id = 'PP-1'),
  array['approved'], 'la compra aprobada no se duplica');
select test.is(
  (select payment_metadata->>'status' from public.seasonal_purchases where payment_id = 'PP-1'),
  'approved'::text, 'al aprobarse se guarda el pago ya aprobado');
select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba1', 4900,
    'mercadopago', 'PP-1', '{}'::jsonb),
  'approved'::text, 'la aprobación repetida devuelve el mismo resultado');

-- Un aviso de pendiente que llega tarde no desaprueba la compra.
select test.is(
  public.record_pending_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba1', 4900,
    'mercadopago', 'PP-1', '{}'::jsonb),
  'approved'::text, 'un aviso de pendiente atrasado no desaprueba la compra');
select test.is(
  public.release_pending_seasonal_purchase('mercadopago', 'PP-1'),
  false, 'un aviso de rechazo no quita una compra aprobada');
select test.is(
  (select status from public.seasonal_purchases where payment_id = 'PP-1'),
  'approved'::text, 'la compra aprobada se conserva');

-- Pendiente que se aprueba cuando la cuenta ya tenía esa lotería: queda como repetido.
select public.deliver_seasonal_purchase(
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba2', 4900,
  'mercadopago', 'PP-2', '{}'::jsonb);
select public.record_pending_seasonal_purchase(
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba2', 4900,
  'mercadopago', 'PP-3', '{}'::jsonb);
select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba2', 4900,
    'mercadopago', 'PP-3', '{}'::jsonb),
  'repeated'::text, 'un pendiente que se aprueba cuando la cuenta ya tenía la lotería queda como repetido');

-- Un pendiente rechazado o caducado deja de existir.
select public.record_pending_seasonal_purchase(
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba3', 4900,
  'mercadopago', 'PP-4', '{}'::jsonb);
select test.is(
  public.release_pending_seasonal_purchase('mercadopago', 'PP-4'),
  true, 'un pago pendiente que se rechaza se libera');
select test.is(
  (select count(*)::int from public.seasonal_purchases where payment_id = 'PP-4'),
  0, 'el pendiente liberado ya no está registrado');
select test.is(
  public.release_pending_seasonal_purchase('mercadopago', 'PP-4'),
  false, 'liberar dos veces no falla');
select test.is(
  public.release_pending_seasonal_purchase('mercadopago', 'NO-EXISTE'),
  false, 'liberar un pago desconocido no falla');

select test.throws($$
  select public.record_pending_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ba3', 4900,
    'mercadopago', '', '{}'::jsonb)
$$, 'p_payment_id is required', 'sin payment_id no se registra un pendiente');

-- Quien tiene un pago en proceso ve la ficha de esa lotería aunque no esté visible.
select public.record_pending_seasonal_purchase(
  '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000ba3', 4900,
  'mercadopago', 'PP-5', '{}'::jsonb);
select test.as_user('00000000-0000-0000-0000-0000000000a2');
select test.is(
  (select array_agg(name_es order by name_es) from public.seasonal_loterias),
  array['Rechazada'], 'quien tiene un pago en proceso ve la ficha de esa lotería, y ninguna otra');
select test.is(
  (select array_agg(status) from public.seasonal_purchases),
  array['pending'], 'la usuaria ve su propio pago en proceso');

-- Solo el servidor ejecuta las funciones.
select test.throws($$
  select public.record_pending_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000ba1', 4900,
    'mercadopago', 'PP-9', '{}'::jsonb)
$$, '42501', 'una usuaria no puede registrar un pago pendiente');
select test.throws($$
  select public.release_pending_seasonal_purchase('mercadopago', 'PP-5')
$$, '42501', 'una usuaria no puede liberar un pago pendiente');

select test.as_anon();
select test.throws($$
  select public.record_pending_seasonal_purchase(
    '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000ba1', 4900,
    'mercadopago', 'PP-9', '{}'::jsonb)
$$, '42501', 'un visitante no puede registrar un pago pendiente');
select test.throws($$
  select public.release_pending_seasonal_purchase('mercadopago', 'PP-5')
$$, '42501', 'un visitante no puede liberar un pago pendiente');

select test.as_service_role();
select test.is(
  public.release_pending_seasonal_purchase('mercadopago', 'PP-5'),
  true, 'service_role sí puede liberar un pago pendiente');

rollback;
