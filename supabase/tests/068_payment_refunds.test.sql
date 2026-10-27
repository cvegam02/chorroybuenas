-- Reembolsos y contracargos (FEAT-58, US A8; migración 068).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000006801', 'compra-tokens@test.dev'),
  ('00000000-0000-0000-0000-000000006802', 'gasto-todo@test.dev'),
  ('00000000-0000-0000-0000-000000006803', 'tematica@test.dev');

select public.add_tokens_after_purchase(
  '00000000-0000-0000-0000-000000006801', 12, null, 10, 2, 12, 2000,
  'mercadopago', 'RF-1', 'approved', '{}'::jsonb, null);
select public.add_tokens_after_purchase(
  '00000000-0000-0000-0000-000000006801', 5, null, 5, 0, 5, 1000,
  'mercadopago', 'RF-2', 'approved', '{}'::jsonb, null);
select public.add_tokens_after_purchase(
  '00000000-0000-0000-0000-000000006802', 10, null, 10, 0, 10, 2000,
  'mercadopago', 'RF-3', 'approved', '{}'::jsonb, null);
-- La segunda cuenta ya gastó 7 de sus 10 tokens.
update public.user_tokens set balance = 3 where user_id = '00000000-0000-0000-0000-000000006802';

-- Devolución de una compra de tokens: se descuentan los tokens de esa compra.
select test.is(public.reverse_payment('mercadopago', 'RF-1', 'refunded'), 'tokens_reversed'::text,
  'un pago devuelto revierte la compra de tokens');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006801'),
  5, 'se descuentan los 12 tokens de esa compra y quedan los de la otra');
select test.is(
  (select row(payment_status, refund_reason, refunded_tokens, refunded_at is not null)::text
     from public.token_purchases where payment_id = 'RF-1'),
  '(refunded,refunded,12,t)'::text, 'la compra queda marcada como devuelta, con lo que se descontó');
select test.is((select payment_status from public.token_purchases where payment_id = 'RF-2'),
  'approved'::text, 'la otra compra de la misma cuenta no cambia');

-- El aviso repetido no vuelve a descontar.
select test.is(public.reverse_payment('mercadopago', 'RF-1', 'refunded'), 'repeated'::text,
  'el aviso repetido se reconoce');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006801'),
  5, 'el aviso repetido no descuenta dos veces');
select test.is(public.reverse_payment('mercadopago', 'RF-1', 'charged_back'), 'repeated'::text,
  'un contracargo después de la devolución tampoco descuenta otra vez');

-- Tokens ya gastados: el saldo queda en 0, nunca negativo (§8).
select test.is(public.reverse_payment('mercadopago', 'RF-3', 'charged_back'), 'tokens_reversed'::text,
  'un contracargo revierte la compra');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006802'),
  0, 'si ya gastó tokens, el saldo queda en 0 y no en negativo');
select test.is(
  (select row(payment_status, refund_reason, refunded_tokens)::text from public.token_purchases where payment_id = 'RF-3'),
  '(refunded,charged_back,3)'::text, 'se anota el motivo y que solo se pudieron descontar 3');

-- Lotería temática: deja de estar comprada y se pierde la descarga.
insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-00000000a868', 'Posadas');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-00000000b868', '00000000-0000-0000-0000-00000000a868', 'Navideña', 4900);
select public.deliver_seasonal_purchase(
  '00000000-0000-0000-0000-000000006803', '00000000-0000-0000-0000-00000000b868', 4900,
  'mercadopago', 'RF-4', '{}'::jsonb);
select test.is(public.reverse_payment('mercadopago', 'RF-4', 'refunded'), 'seasonal_refunded'::text,
  'un pago devuelto revierte la compra de la temática');
select test.is(
  (select row(status, refund_reason, refunded_at is not null)::text from public.seasonal_purchases where payment_id = 'RF-4'),
  '(refunded,refunded,t)'::text, 'la compra de la temática queda como devuelta');
select test.is(public.reverse_payment('mercadopago', 'RF-4', 'charged_back'), 'repeated'::text,
  'el aviso repetido de la temática se reconoce');
select test.is(
  public.deliver_seasonal_purchase(
    '00000000-0000-0000-0000-000000006803', '00000000-0000-0000-0000-00000000b868', 4900,
    'mercadopago', 'RF-5', '{}'::jsonb),
  'approved'::text, 'después de la devolución, la cuenta puede volver a comprarla');

-- Pagos que no son nuestros y motivos inválidos.
select test.is(public.reverse_payment('mercadopago', 'NO-EXISTE', 'refunded'), 'not_found'::text,
  'un pago desconocido no hace nada');
select test.throws($$ select public.reverse_payment('mercadopago', 'RF-2', 'approved') $$,
  'INVALID_REASON', 'solo se revierte por devolución o contracargo');
select test.is((select payment_status from public.token_purchases where payment_id = 'RF-2'),
  'approved'::text, 'un motivo inválido no toca la compra');

-- Solo el servidor puede revertir pagos.
select test.as_user('00000000-0000-0000-0000-000000006801');
select test.throws($$ select public.reverse_payment('mercadopago', 'RF-2', 'refunded') $$,
  '42501', 'un usuario autenticado no puede revertir pagos');
select test.as_anon();
select test.throws($$ select public.reverse_payment('mercadopago', 'RF-2', 'refunded') $$,
  '42501', 'un visitante no puede revertir pagos');
select test.as_service_role();
select test.is(public.reverse_payment('mercadopago', 'RF-2', 'refunded'), 'tokens_reversed'::text,
  'service_role sí puede revertir');

rollback;
