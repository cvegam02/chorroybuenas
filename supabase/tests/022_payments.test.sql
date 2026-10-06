-- Acreditación idempotente de pagos (migración 022).
begin;

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'pagos@test.dev');

select test.lives($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 12, null, 10, 2, 12, 2000,
    'mercadopago', 'PAY-1', 'approved', '{}'::jsonb, null)
$$, 'primera acreditación funciona');

select test.lives($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 12, null, 10, 2, 12, 2000,
    'mercadopago', 'PAY-1', 'approved', '{}'::jsonb, null)
$$, 'segunda llamada con el mismo payment_id no falla');

select test.is(
  (select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000001'),
  12, 'el saldo se acredita una sola vez');

select test.is(
  (select count(*)::int from public.token_purchases where payment_id = 'PAY-1'),
  1, 'hay una sola fila de compra');

select test.is(
  public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 12, null, 10, 2, 12, 2000,
    'mercadopago', 'PAY-1', 'approved', '{}'::jsonb, null),
  12, 'un pago repetido devuelve el saldo actual');

select test.is(
  public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 5, null, 5, 0, 5, 1000,
    'mercadopago', 'PAY-2', 'approved', '{}'::jsonb,
    array['00000000-0000-0000-0000-0000000000aa']::uuid[]),
  17, 'un pago distinto sí suma');

select test.is(
  (select promotion_ids from public.token_purchases where payment_id = 'PAY-2'),
  array['00000000-0000-0000-0000-0000000000aa']::uuid[], 'la compra registra la promoción usada');

-- Llamada de 11 argumentos: la que hacen las edge functions desplegadas hoy.
select test.is(
  public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 3, null, 3, 0, 3, 600,
    'mercadopago', 'PAY-3', 'approved', '{}'::jsonb),
  20, 'la llamada sin p_promotion_ids sigue funcionando');

select test.throws($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 5, null, 5, 0, 5, 1000,
    'mercadopago', null, 'approved', '{}'::jsonb, null)
$$, 'p_payment_id is required', 'sin payment_id no se acredita');

select test.throws($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 0, null, 0, 0, 0, 0,
    'mercadopago', 'PAY-4', 'approved', '{}'::jsonb, null)
$$, 'p_tokens_to_add must be positive', 'no se acreditan 0 tokens');

select test.throws($$
  insert into public.token_purchases
    (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id)
  values ('00000000-0000-0000-0000-000000000001', 1, 0, 1, 200, 'mercadopago', 'PAY-1')
$$, '23505', 'el índice único impide duplicar un payment_id');

select test.as_user('00000000-0000-0000-0000-000000000001');
select test.throws($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 99, null, 99, 0, 99, 1,
    'mercadopago', 'PAY-9', 'approved', '{}'::jsonb, null)
$$, '42501', 'un usuario autenticado no puede ejecutar la función');

select test.as_anon();
select test.throws($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 99, null, 99, 0, 99, 1,
    'mercadopago', 'PAY-9', 'approved', '{}'::jsonb, null)
$$, '42501', 'un visitante no puede ejecutar la función');

select test.as_service_role();
select test.is(
  public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 1, null, 1, 0, 1, 200,
    'mercadopago', 'PAY-5', 'approved', '{}'::jsonb, null),
  21, 'service_role sí puede acreditar');

rollback;
