-- Códigos promocionales privados (migración 025).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000021', 'promo@test.dev'),
  ('00000000-0000-0000-0000-000000000022', 'admin@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000022');

insert into public.promotions (id, code, type, config, is_active)
values ('00000000-0000-0000-0000-0000000000aa', 'Verano', 'code', '{"percent": 15}', true);
insert into public.promotions (code, type, config, is_active, valid_until)
values ('VENCIDO', 'code', '{"percent": 50}', true, now() - interval '1 day');
insert into public.promotions (code, type, config, is_active, valid_from)
values ('FUTURO', 'code', '{"percent": 50}', true, now() + interval '1 day');
insert into public.promotions (code, type, config, is_active)
values ('APAGADO', 'code', '{"percent": 50}', false);
insert into public.promotions (code, type, config, is_active)
values ('ROTO', 'code', '{"percent": "mucho"}', true);

-- Visitante
select test.as_anon();
select test.is((select count(*)::int from public.promotions), 0, 'un visitante no puede listar promociones');
select test.is((select first_purchase_percent from public.get_public_promo_summary()), 20,
  'un visitante ve el % de primera compra');
select test.is((select has_code_promos from public.get_public_promo_summary()), true,
  'un visitante sabe que hay códigos, sin verlos');
select test.throws($$ select public.check_promo_code('VERANO') $$, '42501',
  'un visitante no puede validar códigos');

-- Usuario normal
select test.as_user('00000000-0000-0000-0000-000000000021');
select test.is((select count(*)::int from public.promotions), 0, 'un usuario normal no puede listar promociones');
select test.is(public.check_promo_code(' verano '), 15,
  'código válido devuelve su porcentaje (sin importar mayúsculas ni espacios)');
select test.is(public.check_promo_code('NOPE'), 0, 'código inexistente devuelve 0');
select test.is(public.check_promo_code('VENCIDO'), 0, 'código vencido devuelve 0');
select test.is(public.check_promo_code('FUTURO'), 0, 'código aún no vigente devuelve 0');
select test.is(public.check_promo_code('APAGADO'), 0, 'código inactivo devuelve 0');
select test.is(public.check_promo_code('ROTO'), 0, 'código con porcentaje inválido devuelve 0');
select test.is(public.check_promo_code('FIRST_PURCHASE'), 0, 'la promo de primera compra no se canjea como código');
select test.is(public.check_promo_code(''), 0, 'código vacío devuelve 0');
select test.is(public.check_promo_code(null), 0, 'código nulo devuelve 0');

-- El usuario compra usando el código
select test.as_postgres();
insert into public.token_purchases
  (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, promotion_ids)
values ('00000000-0000-0000-0000-000000000021', 10, 1, 11, 2000, 'mercadopago', 'PAY-PROMO',
        array['00000000-0000-0000-0000-0000000000aa']::uuid[]);

select test.as_user('00000000-0000-0000-0000-000000000021');
select test.is(public.check_promo_code('VERANO'), 0, 'un código ya usado por el usuario devuelve 0');

-- Otro usuario (la admin) todavía puede usarlo y sí puede listar
select test.as_user('00000000-0000-0000-0000-000000000022');
select test.is(public.check_promo_code('VERANO'), 15, 'otro usuario sí puede usar el mismo código');
select test.ok((select count(*) from public.promotions) >= 6, 'la admin ve todas las promociones');
select test.lives($$
  update public.promotions set is_active = false where code = 'Verano'
$$, 'la admin puede editar promociones');

-- Sin promociones vigentes el resumen queda en cero
select test.as_postgres();
update public.promotions set is_active = false;
select test.as_anon();
select test.is((select first_purchase_percent from public.get_public_promo_summary()), 0,
  'sin promo de primera compra vigente el % es 0');
select test.is((select has_code_promos from public.get_public_promo_summary()), false,
  'sin códigos vigentes has_code_promos es false');

rollback;
