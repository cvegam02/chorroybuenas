-- Compras de loterías de temporada y su entrega idempotente (migración 031).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000081', 'admin-compras@test.dev'),
  ('00000000-0000-0000-0000-000000000082', 'compradora@test.dev'),
  ('00000000-0000-0000-0000-000000000083', 'otro@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000081');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000000a81', 'Posadas');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000000b81', '00000000-0000-0000-0000-000000000a81', 'Vendida', 4900),
  ('00000000-0000-0000-0000-000000000b82', '00000000-0000-0000-0000-000000000a81', 'Otra', 5900),
  ('00000000-0000-0000-0000-000000000b83', '00000000-0000-0000-0000-000000000a81', 'Sin ventas', 4900);

-- Entrega: un pago aprobado registra la compra una sola vez.
select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b81', 4900,
    'mercadopago', 'SP-1', '{}'::jsonb),
  'approved'::text, 'un pago aprobado entrega la lotería');

select test.is(
  (select row(user_id, loteria_id, amount_cents, status)::text from public.seasonal_purchases
    where payment_id = 'SP-1'),
  '(00000000-0000-0000-0000-000000000082,00000000-0000-0000-0000-000000000b81,4900,approved)'::text,
  'la compra queda a nombre de quien pagó, con el monto');

select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b81', 4900,
    'mercadopago', 'SP-1', '{}'::jsonb),
  'approved'::text, 'la misma notificación repetida devuelve el mismo resultado');

select test.is(
  (select count(*)::int from public.seasonal_purchases where payment_id = 'SP-1'),
  1, 'la notificación repetida no registra dos compras');

-- Segundo pago por la misma lotería y cuenta: se guarda como repetido.
select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b81', 4900,
    'mercadopago', 'SP-2', '{}'::jsonb),
  'repeated'::text, 'un segundo pago por la misma lotería queda como repetido');

select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b81', 4900,
    'mercadopago', 'SP-2', '{}'::jsonb),
  'repeated'::text, 'el pago repetido también es idempotente');

select test.is(
  (select count(*)::int from public.seasonal_purchases
    where user_id = '00000000-0000-0000-0000-000000000082'
      and loteria_id = '00000000-0000-0000-0000-000000000b81' and status = 'approved'),
  1, 'la cuenta tiene una sola compra aprobada de esa lotería');

select test.throws($$
  insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_provider, payment_id, status)
  values ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b81', 4900,
          'mercadopago', 'SP-3', 'approved')
$$, '23505', 'la base impide dos compras aprobadas de la misma lotería por cuenta');

select test.throws($$
  insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_provider, payment_id, status)
  values ('00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000b82', 5900,
          'mercadopago', 'SP-1', 'approved')
$$, '23505', 'la base impide repetir un pago');

select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b82', 5900,
    'mercadopago', 'SP-4', '{}'::jsonb),
  'approved'::text, 'la misma cuenta puede comprar otra lotería');

select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000b81', 4900,
    'mercadopago', 'SP-5', '{}'::jsonb),
  'approved'::text, 'otra cuenta puede comprar la misma lotería');

select test.throws($$
  select public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000b82', 5900,
    'mercadopago', null, '{}'::jsonb)
$$, 'p_payment_id is required', 'sin payment_id no se entrega');

select test.throws($$
  select public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000b82', 0,
    'mercadopago', 'SP-6', '{}'::jsonb)
$$, 'p_amount_cents must be positive', 'no se entrega con monto cero');

select test.throws($$
  insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_provider, payment_id, status)
  values ('00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000b82', 5900,
          'mercadopago', 'SP-7', 'regalada')
$$, '23514', 'el estado de una compra solo admite los valores definidos');

-- Quién lee y quién escribe.
select test.as_user('00000000-0000-0000-0000-000000000082');
select test.is(
  (select count(*)::int from public.seasonal_purchases), 3, 'una usuaria ve sus propias compras');
select test.is(
  (select count(*)::int from public.seasonal_purchases
    where user_id <> '00000000-0000-0000-0000-000000000082'),
  0, 'una usuaria no ve compras de otros');
select test.throws($$
  insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_provider, payment_id, status)
  values ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b83', 4900,
          'mercadopago', 'SP-8', 'approved')
$$, '42501', 'una usuaria no puede inventarse una compra');
select test.throws($$
  update public.seasonal_purchases set status = 'approved' where payment_id = 'SP-2'
$$, '42501', 'una usuaria no puede cambiar el estado de una compra');
select test.throws($$
  delete from public.seasonal_purchases where payment_id = 'SP-2'
$$, '42501', 'una usuaria no puede borrar una compra');
select test.throws($$
  select public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b83', 4900,
    'mercadopago', 'SP-9', '{}'::jsonb)
$$, '42501', 'una usuaria no puede ejecutar la función de entrega');

select test.as_anon();
select test.throws($$
  select count(*) from public.seasonal_purchases
$$, '42501', 'un visitante no puede leer las compras');
select test.throws($$
  select public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000b83', 4900,
    'mercadopago', 'SP-9', '{}'::jsonb)
$$, '42501', 'un visitante no puede ejecutar la función de entrega');

select test.as_user('00000000-0000-0000-0000-000000000081');
select test.is(
  (select count(*)::int from public.seasonal_purchases), 4, 'un administrador ve las compras de todos');
select test.throws($$
  insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_provider, payment_id, status)
  values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000b83', 4900,
          'mercadopago', 'SP-10', 'approved')
$$, '42501', 'ni un administrador puede escribir compras desde el navegador');

-- Una lotería con ventas no se borra; una sin ventas, sí.
select test.throws($$
  delete from public.seasonal_loterias where id = '00000000-0000-0000-0000-000000000b81'
$$, '23503', 'una lotería con ventas no se puede borrar');
select test.lives($$
  delete from public.seasonal_loterias where id = '00000000-0000-0000-0000-000000000b83'
$$, 'una lotería sin ventas se puede borrar');

-- Si se borra la cuenta, la compra se conserva sin dueño.
select test.as_postgres();
-- En la base de pruebas, el saldo no se borra en cascada con la cuenta: se quita antes.
delete from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000083';
delete from auth.users where id = '00000000-0000-0000-0000-000000000083';
select test.is(
  (select count(*)::int from public.seasonal_purchases where payment_id = 'SP-5' and user_id is null),
  1, 'al borrar la cuenta, la compra se conserva sin dueño');

select test.as_service_role();
select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000b82', 5900,
    'mercadopago', 'SP-11', '{}'::jsonb),
  'approved'::text, 'service_role sí puede entregar');

rollback;
