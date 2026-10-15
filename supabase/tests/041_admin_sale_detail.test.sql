-- Pestaña Ventas del panel (FEAT-44, US A3): el pago de Mercado Pago de una venta (migración 041).
-- Solo salen los campos que muestra el panel, no el objeto de pago completo (trae datos personales).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000004441', 'admin-detalle@test.dev'),
  ('00000000-0000-0000-0000-000000004442', 'ana-detalle@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004441');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000004451', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000004452', '00000000-0000-0000-0000-000000004451', 'Muertos', 4900);

insert into public.token_purchases
  (id, user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status,
   payment_metadata, created_at)
values
  ('00000000-0000-0000-0000-000000004461', '00000000-0000-0000-0000-000000004442', 20, 5, 25, 3500, 'mercadopago',
   'D-1', 'approved',
   '{"payment_type_id": "debit_card", "payment_method_id": "debvisa", "status": "approved",
     "status_detail": "accredited", "date_created": "2026-10-14T10:41:00.000-04:00",
     "date_approved": "2026-10-14T10:42:00.000-04:00", "transaction_amount": 35,
     "payer": {"id": "2087331904", "email": "privado@test.dev", "identification": {"number": "SECRETO"}},
     "additional_info": {"ip_address": "1.2.3.4"}}',
   '2026-10-14T14:42:00Z'),
  -- Sin datos de Mercado Pago guardados: el detalle sale vacío, no falla.
  ('00000000-0000-0000-0000-000000004462', '00000000-0000-0000-0000-000000004442', 10, 0, 10, 2000, 'mercadopago',
   'D-2', 'approved', null, '2026-10-14T15:00:00Z');

insert into public.seasonal_purchases
  (id, user_id, loteria_id, amount_cents, payment_provider, payment_id, status, payment_metadata, created_at)
values
  ('00000000-0000-0000-0000-000000004463', '00000000-0000-0000-0000-000000004442',
   '00000000-0000-0000-0000-000000004452', 4900, 'mercadopago', 'D-3', 'pending',
   '{"payment_type_id": "ticket", "payment_method_id": "oxxo", "status": "pending",
     "status_detail": "pending_waiting_payment", "date_created": "2026-10-13T21:03:00.000-07:00",
     "date_approved": null, "transaction_amount": 49, "payer": {"id": "2110487330"}}',
   '2026-10-14T04:03:00Z');

select test.as_user('00000000-0000-0000-0000-000000004441');

select test.is(
  (select row(payment_id, payer_id, method_type, method_id, mp_status, mp_status_detail,
              mp_created_at, mp_approved_at, mp_amount)::text
     from public.admin_get_sale_detail('tokens', '00000000-0000-0000-0000-000000004461')),
  (select row('D-1', '2087331904', 'debit_card', 'debvisa', 'approved', 'accredited',
              '2026-10-14T14:41:00Z'::timestamptz, '2026-10-14T14:42:00Z'::timestamptz, 35::numeric)::text),
  'una compra de tokens trae su pago de Mercado Pago');

select test.is(
  (select row(payer_id, method_type, method_id, mp_status_detail, mp_approved_at, mp_amount)::text
     from public.admin_get_sale_detail('seasonal', '00000000-0000-0000-0000-000000004463')),
  '(2110487330,ticket,oxxo,pending_waiting_payment,,49)',
  'una temática pendiente trae su pago, sin fecha de aprobación');

select test.is(
  (select row(payment_id, payer_id, method_type, mp_amount)::text
     from public.admin_get_sale_detail('tokens', '00000000-0000-0000-0000-000000004462')),
  '(D-2,,,)',
  'sin datos de Mercado Pago guardados, el detalle sale vacío');

select test.is(
  (select count(*)::int from public.admin_get_sale_detail('seasonal', '00000000-0000-0000-0000-000000004461')),
  0,
  'el tipo tiene que coincidir con la venta');

select test.is(
  (select row_to_json(d)::text from public.admin_get_sale_detail('tokens', '00000000-0000-0000-0000-000000004461') d)
    !~ '(privado|SECRETO|1\.2\.3\.4)',
  true,
  'no salen el correo, la identificación ni la IP de quien pagó');

select test.throws($$
  select * from public.admin_get_sale_detail('regalo', '00000000-0000-0000-0000-000000004461')
$$, 'Invalid sale kind', 'un tipo desconocido se rechaza');

select test.as_user('00000000-0000-0000-0000-000000004442');
select test.throws($$
  select * from public.admin_get_sale_detail('tokens', '00000000-0000-0000-0000-000000004461')
$$, 'Unauthorized', 'una usuaria normal no puede ver el detalle, ni de su propia compra');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_sale_detail('tokens', '00000000-0000-0000-0000-000000004461')
$$, '42501', 'un visitante no puede ver el detalle');

rollback;
