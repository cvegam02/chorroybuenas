-- Ofertas con descuento (FEAT-49, US A1; contexto-negocio.md §8 y §9): solo un administrador las
-- crea, edita y cancela; no se cruzan dos en fechas (salvo canceladas); cualquiera lee la vigente
-- sin ver su nombre interno ni las programadas; la compra guarda la oferta que tuvo (migración 053).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005301', 'admin-oferta@test.dev'),
  ('00000000-0000-0000-0000-000000005302', 'ana-oferta@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005301');

-- Sin ofertas, no hay vigente.
select test.as_anon();
select test.is((select count(*)::int from public.current_offer()), 0, 'sin ofertas no hay oferta vigente');

-- El administrador crea una oferta vigente (empezó ayer, termina mañana).
select test.as_user('00000000-0000-0000-0000-000000005301');
select test.lives($$
  insert into public.offers (id, name, discount_percent, starts_at, ends_at)
  values ('00000000-0000-0000-0000-0000000053a1', 'Buen Fin prueba', 25, now() - interval '1 day', now() + interval '1 day')
$$, 'el administrador crea una oferta');

select test.as_anon();
select test.is(
  (select discount_percent from public.current_offer()),
  25,
  'un visitante ve el descuento de la oferta vigente');
select test.is(
  (select id from public.current_offer()),
  '00000000-0000-0000-0000-0000000053a1'::uuid,
  'y cuál es');
select test.throws($$ select count(*) from public.offers $$, '42501',
  'un visitante no lee la tabla de ofertas (ni el nombre interno ni las programadas)');

select test.as_user('00000000-0000-0000-0000-000000005302');
select test.is(
  (select discount_percent from public.current_offer()),
  25,
  'una usuaria con sesión también ve la oferta vigente');
select test.is((select count(*)::int from public.offers), 0, 'una usuaria normal no lee la tabla de ofertas');

-- No se cruzan dos ofertas.
select test.as_user('00000000-0000-0000-0000-000000005301');
select test.throws($$
  insert into public.offers (name, discount_percent, starts_at, ends_at)
  values ('Cruzada', 10, now(), now() + interval '3 days')
$$, '23P01', 'no se guarda una oferta que se cruza con otra');

select test.lives($$
  insert into public.offers (id, name, discount_percent, starts_at, ends_at)
  values ('00000000-0000-0000-0000-0000000053a2', 'Programada', 10,
          now() + interval '1 day', now() + interval '5 days')
$$, 'una oferta que empieza justo cuando termina otra sí se guarda');

select test.throws($$
  update public.offers set ends_at = now() + interval '2 days'
  where id = '00000000-0000-0000-0000-0000000053a1'
$$, '23P01', 'tampoco se puede alargar una oferta hasta cruzarla con otra');

-- Datos inválidos.
select test.throws($$
  insert into public.offers (name, discount_percent, starts_at, ends_at)
  values ('Sin descuento', 0, now() + interval '10 days', now() + interval '11 days')
$$, '23514', 'el descuento no puede ser 0%');
select test.throws($$
  insert into public.offers (name, discount_percent, starts_at, ends_at)
  values ('Gratis', 100, now() + interval '10 days', now() + interval '11 days')
$$, '23514', 'el descuento no puede ser 100%');
select test.throws($$
  insert into public.offers (name, discount_percent, starts_at, ends_at)
  values ('Al revés', 20, now() + interval '11 days', now() + interval '10 days')
$$, '23514', 'el fin tiene que ser después del inicio');
select test.throws($$
  insert into public.offers (name, discount_percent, starts_at, ends_at)
  values ('   ', 20, now() + interval '10 days', now() + interval '11 days')
$$, '23514', 'el nombre interno es obligatorio');
select test.throws($$
  insert into public.offers (name, discount_percent, starts_at, ends_at)
  values ('Sin fin', 20, now() + interval '10 days', null)
$$, '23502', 'las fechas son obligatorias');

-- Cancelar: deja de estar vigente y ya no estorba a otra en esas fechas.
select test.lives($$
  update public.offers set cancelled_at = now() where id = '00000000-0000-0000-0000-0000000053a1'
$$, 'el administrador cancela la oferta');
select test.as_anon();
select test.is((select count(*)::int from public.current_offer()), 0, 'una oferta cancelada ya no está vigente');
select test.as_user('00000000-0000-0000-0000-000000005301');
select test.lives($$
  insert into public.offers (id, name, discount_percent, starts_at, ends_at)
  values ('00000000-0000-0000-0000-0000000053a3', 'Reemplazo', 15, now() - interval '1 hour', now() + interval '1 hour')
$$, 'una oferta cancelada no impide crear otra en sus fechas');
select test.as_anon();
select test.is((select discount_percent from public.current_offer()), 15, 'la nueva queda vigente');

-- Una oferta terminada o programada no está vigente.
select test.as_postgres();
update public.offers set cancelled_at = now() where id = '00000000-0000-0000-0000-0000000053a3';
insert into public.offers (name, discount_percent, starts_at, ends_at)
values ('Terminada', 30, now() - interval '10 days', now() - interval '5 days');
select test.as_anon();
select test.is((select count(*)::int from public.current_offer()), 0, 'ni terminada ni programada cuentan como vigentes');

-- Una usuaria normal no crea, no cambia ni borra ofertas.
select test.as_user('00000000-0000-0000-0000-000000005302');
select test.throws($$
  insert into public.offers (name, discount_percent, starts_at, ends_at)
  values ('Mía', 90, now() + interval '20 days', now() + interval '21 days')
$$, '42501', 'una usuaria normal no crea ofertas');
select test.lives($$
  update public.offers set discount_percent = 90 where id = '00000000-0000-0000-0000-0000000053a2'
$$, 'una usuaria normal no ve error al intentar cambiar una oferta');
select test.as_anon();
select test.throws($$
  insert into public.offers (name, discount_percent, starts_at, ends_at)
  values ('Visitante', 90, now() + interval '20 days', now() + interval '21 days')
$$, '42501', 'un visitante no crea ofertas');
select test.as_user('00000000-0000-0000-0000-000000005301');
select test.lives($$
  delete from public.offers where id = '00000000-0000-0000-0000-0000000053a2'
$$, 'borrar no da error, pero no borra');
select test.as_postgres();
select test.is(
  (select discount_percent from public.offers where id = '00000000-0000-0000-0000-0000000053a2'),
  10,
  'la oferta sigue igual después de los intentos y no se borró');

-- La compra guarda la oferta que tuvo.
select test.as_service_role();
select test.is(
  public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000005302', 25, null, 20, 5, 25, 3000,
    'mercadopago', 'PAY-OFERTA-1', 'approved', '{}'::jsonb, null,
    '00000000-0000-0000-0000-0000000053a1', 25),
  25,
  'una compra con oferta se acredita');
select test.as_postgres();
select test.is(
  (select offer_id from public.token_purchases where payment_id = 'PAY-OFERTA-1'),
  '00000000-0000-0000-0000-0000000053a1'::uuid,
  'la compra guarda la oferta');
select test.is(
  (select offer_percent from public.token_purchases where payment_id = 'PAY-OFERTA-1'),
  25,
  'y el descuento que tuvo');

-- La compra se acredita aunque la oferta ya esté cancelada (pago pendiente que se confirma después).
select test.as_service_role();
select test.is(
  public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000005302', 10, null, 10, 0, 10, 1500,
    'mercadopago', 'PAY-OFERTA-2', 'approved', '{}'::jsonb, null,
    '00000000-0000-0000-0000-0000000053a1', 25),
  35,
  'un pago iniciado con oferta se acredita aunque la oferta ya terminó');

-- La llamada de 12 argumentos (funciones desplegadas antes de esta migración) sigue funcionando.
select test.is(
  public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000005302', 5, null, 5, 0, 5, 1000,
    'mercadopago', 'PAY-OFERTA-3', 'approved', '{}'::jsonb, null),
  40,
  'la llamada sin oferta sigue funcionando');
select test.as_postgres();
select test.ok(
  (select offer_id is null and offer_percent is null from public.token_purchases where payment_id = 'PAY-OFERTA-3'),
  'una compra sin oferta no guarda oferta');

-- Nadie más que el servidor acredita.
select test.as_user('00000000-0000-0000-0000-000000005302');
select test.throws($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000005302', 500, null, 500, 0, 500, 1,
    'mercadopago', 'PAY-OFERTA-4', 'approved', '{}'::jsonb, null,
    '00000000-0000-0000-0000-0000000053a1', 25)
$$, '42501', 'una usuaria no puede acreditarse una compra con oferta');

rollback;
