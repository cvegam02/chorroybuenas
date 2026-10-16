-- Precio por token editable desde Precios y promos (FEAT-46, US A2): solo un administrador lo cambia,
-- con un precio válido, y lo que leen la pantalla de compra y el cobro es el precio nuevo (migración 046).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000004901', 'admin-precio@test.dev'),
  ('00000000-0000-0000-0000-000000004902', 'ana-precio@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004901');

insert into public.token_pricing (currency, price_per_token_cents) values ('MXN', 200)
on conflict (currency) do update set price_per_token_cents = excluded.price_per_token_cents;

select test.as_user('00000000-0000-0000-0000-000000004901');

select test.is(
  public.admin_set_price_per_token(250),
  250,
  'el administrador cambia el precio por token');

select test.as_anon();
select test.is(
  (select price_per_token_cents from public.token_pricing where currency = 'MXN'),
  250,
  'la pantalla de compra ve el precio nuevo');

select test.as_service_role();
select test.is(
  (select price_per_token_cents from public.token_pricing where currency = 'MXN'),
  250,
  'el cobro de la cantidad libre lee el precio nuevo');

select test.as_user('00000000-0000-0000-0000-000000004901');
select test.throws($$ select public.admin_set_price_per_token(0) $$, 'Invalid price', 'no se guarda un precio de cero');
select test.throws($$ select public.admin_set_price_per_token(-50) $$, 'Invalid price', 'no se guarda un precio negativo');
select test.throws($$ select public.admin_set_price_per_token(null) $$, 'Invalid price', 'no se guarda un precio vacío');

select test.as_user('00000000-0000-0000-0000-000000004902');
select test.throws($$
  select public.admin_set_price_per_token(10)
$$, 'Unauthorized', 'una usuaria normal no puede cambiar el precio');

-- Tampoco escribiendo directo en la tabla: las reglas de acceso no le dejan cambiar nada.
select test.lives($$
  update public.token_pricing set price_per_token_cents = 10 where currency = 'MXN'
$$, 'una usuaria normal no ve error al intentar escribir directo');

select test.as_anon();
select test.throws($$
  select public.admin_set_price_per_token(10)
$$, '42501', 'un visitante no puede cambiar el precio');

select test.as_postgres();
select test.is(
  (select price_per_token_cents from public.token_pricing where currency = 'MXN'),
  250,
  'después de los intentos rechazados el precio sigue siendo el del administrador');

-- Si no hubiera precio guardado, se crea (el cobro usaría el de respaldo mientras tanto).
delete from public.token_pricing where currency = 'MXN';
select test.as_user('00000000-0000-0000-0000-000000004901');
select test.is(public.admin_set_price_per_token(300), 300, 'sin precio guardado, el administrador lo crea');
select test.as_postgres();
select test.is(
  (select price_per_token_cents from public.token_pricing where currency = 'MXN'),
  300,
  'queda guardado en MXN');

rollback;
