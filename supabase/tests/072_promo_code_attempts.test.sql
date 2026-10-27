-- Intentos de código promocional (FEAT-58, US A9; migración 072): 5 códigos sin bono por usuario por hora.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000007201', 'adivina@test.dev'),
  ('00000000-0000-0000-0000-000000007202', 'otra@test.dev');
insert into public.promotions (id, code, type, config, is_active) values
  ('00000000-0000-0000-0000-0000000072aa', 'NAVIDAD', 'code', '{"percent": 20}', true);

select test.as_user('00000000-0000-0000-0000-000000007201');
select test.is(public.check_promo_code('navidad'), 20, 'un código vigente da su bono a la primera');
select test.is(public.check_promo_code('NOEXISTE1'), 0, 'un código sin bono da 0');
select test.is(public.check_promo_code('NOEXISTE2'), 0, 'segundo intento sin bono');
select test.is(public.check_promo_code('NOEXISTE3'), 0, 'tercero');
select test.is(public.check_promo_code('NOEXISTE4'), 0, 'cuarto');
select test.is(public.check_promo_code('NOEXISTE5'), 0, 'quinto');
select test.throws($$ select public.check_promo_code('NOEXISTE6') $$, 'RATE_LIMITED',
  'el sexto intento en la hora se rechaza');
select test.throws($$ select public.check_promo_code('NAVIDAD') $$, 'RATE_LIMITED',
  'pasado el tope, ni el código bueno se revisa hasta que pase la hora');
select test.throws($$ select count(*) from public.promo_code_attempts $$, '42501', 'nadie ve los intentos');

select test.as_user('00000000-0000-0000-0000-000000007202');
select test.is(public.check_promo_code('NAVIDAD'), 20, 'el tope de un usuario no frena a otro');

select test.as_postgres();
update public.promo_code_attempts set created_at = now() - interval '61 minutes'
where user_id = '00000000-0000-0000-0000-000000007201';
select test.as_user('00000000-0000-0000-0000-000000007201');
select test.is(public.check_promo_code('NAVIDAD'), 20, 'pasada la hora se puede volver a probar');

-- El servidor (create-payment-preference) registra los suyos con la misma cuenta
select test.as_service_role();
select test.lives($$ select public.assert_promo_code_attempts('00000000-0000-0000-0000-000000007202') $$,
  'con intentos libres, el pago sigue');
select public.record_failed_promo_code('00000000-0000-0000-0000-000000007202')
from generate_series(1, 5);
select test.throws($$ select public.assert_promo_code_attempts('00000000-0000-0000-0000-000000007202') $$,
  'RATE_LIMITED', 'con 5 intentos fallidos en la hora, el pago con código se rechaza');
select test.as_user('00000000-0000-0000-0000-000000007202');
select test.throws($$ select public.check_promo_code('NAVIDAD') $$, 'RATE_LIMITED',
  'y los intentos del pago cuentan también al revisar en la página');
select test.throws($$ select public.record_failed_promo_code('00000000-0000-0000-0000-000000007202') $$, '42501',
  'un usuario no registra intentos a mano');

select test.as_anon();
select test.throws($$ select public.check_promo_code('NAVIDAD') $$, '42501', 'sin sesión no se revisan códigos');

rollback;
