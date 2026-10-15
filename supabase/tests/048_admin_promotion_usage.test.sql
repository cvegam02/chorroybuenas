-- Tabla de promociones en Precios y promos (FEAT-46, US A4): cuántas compras aprobadas usaron cada
-- promoción y cuántos tokens regaló (migración 048). El bono de la promoción se lee de lo que guardó el pago
-- (`payment_metadata.metadata.promotion_bonus`); en compras viejas sin ese dato, es el regalo de la compra
-- menos el regalo del pack.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005201', 'admin-promos@test.dev'),
  ('00000000-0000-0000-0000-000000005202', 'ana-promos@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005201');

insert into public.token_packs (id, base_tokens, bonus_tokens, price_cents, sort_order, is_active) values
  ('00000000-0000-0000-0000-000000005301', 19, 5, 4000, 93, true);

insert into public.promotions (id, code, type, config, is_active) values
  ('00000000-0000-0000-0000-000000005401', 'INSTA15', 'code', '{"percent": 15}', true),
  ('00000000-0000-0000-0000-000000005402', null, 'first_purchase', '{"percent": 10}', true),
  ('00000000-0000-0000-0000-000000005403', 'NADIE', 'code', '{"percent": 20}', true);

insert into public.token_purchases
  (user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents, promotion_ids,
   payment_provider, payment_id, payment_status, payment_metadata)
values
  -- INSTA15 con pack: el pago guardó el bono (2).
  ('00000000-0000-0000-0000-000000005202', '00000000-0000-0000-0000-000000005301', 19, 7, 26, 4000,
   array['00000000-0000-0000-0000-000000005401']::uuid[], 'mercadopago', 'q1', 'approved',
   '{"metadata": {"promotion_bonus": 2}}'),
  -- INSTA15 con cantidad libre, compra vieja sin el dato: regalo de la compra (3) menos el del pack (0).
  ('00000000-0000-0000-0000-000000005202', null, 20, 3, 23, 4000,
   array['00000000-0000-0000-0000-000000005401']::uuid[], 'mercadopago', 'q2', 'approved', '{}'),
  -- INSTA15 pendiente y repetida: no cuentan.
  ('00000000-0000-0000-0000-000000005202', null, 20, 3, 23, 4000,
   array['00000000-0000-0000-0000-000000005401']::uuid[], 'mercadopago', 'q3', 'pending', '{}'),
  ('00000000-0000-0000-0000-000000005202', null, 20, 3, 23, 4000,
   array['00000000-0000-0000-0000-000000005401']::uuid[], 'mercadopago', 'q4', 'repeated', '{}'),
  -- Primera compra con pack, compra vieja sin el dato: 6 de regalo − 5 del pack = 1.
  ('00000000-0000-0000-0000-000000005202', '00000000-0000-0000-0000-000000005301', 19, 6, 25, 4000,
   array['00000000-0000-0000-0000-000000005402']::uuid[], 'mercadopago', 'q5', 'approved', null),
  -- Compra sin promoción: no cuenta para ninguna.
  ('00000000-0000-0000-0000-000000005202', '00000000-0000-0000-0000-000000005301', 19, 5, 24, 4000,
   null, 'mercadopago', 'q6', 'approved', '{"metadata": {"promotion_bonus": 0}}');

select test.as_user('00000000-0000-0000-0000-000000005201');

select test.is(
  (select row(uses, tokens)::text from public.admin_get_promotion_usage()
     where promotion_id = '00000000-0000-0000-0000-000000005401'),
  '(2,5)',
  'un código: dos compras aprobadas y sus tokens de promoción (del pago o deducidos)');

select test.is(
  (select row(uses, tokens)::text from public.admin_get_promotion_usage()
     where promotion_id = '00000000-0000-0000-0000-000000005402'),
  '(1,1)',
  'primera compra con pack: se resta el regalo del pack');

select test.is(
  (select row(uses, tokens)::text from public.admin_get_promotion_usage()
     where promotion_id = '00000000-0000-0000-0000-000000005403'),
  '(0,0)',
  'una promoción sin usos sale con ceros');

select test.as_user('00000000-0000-0000-0000-000000005202');
select test.throws($$
  select * from public.admin_get_promotion_usage()
$$, 'Unauthorized', 'una usuaria normal no puede ver los usos');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_promotion_usage()
$$, '42501', 'un visitante no puede pedirlos');

rollback;
