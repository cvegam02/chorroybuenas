-- Pestaña Usuarios del panel (FEAT-45, US A1): todas las cuentas con buscador, filtros, orden y paginación
-- (migración 042).
begin;

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-000000004501', 'admin-usuarios@test.dev', now() - interval '90 days'),
  ('00000000-0000-0000-0000-000000004502', 'Ana.Lopez@test.dev', now() - interval '40 days'),
  ('00000000-0000-0000-0000-000000004503', 'beto@test.dev', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000004504', 'carla@test.dev', now() - interval '100 days');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004501');
insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000004501', 'admin-usuarios@test.dev', 'Admin'),
  ('00000000-0000-0000-0000-000000004502', 'Ana.Lopez@test.dev', 'Ana López'),
  -- Sin nombre: la pestaña muestra su correo.
  ('00000000-0000-0000-0000-000000004503', 'beto@test.dev', ''),
  ('00000000-0000-0000-0000-000000004504', 'carla@test.dev', 'Carla Ruiz')
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.user_tokens (user_id, balance) values
  ('00000000-0000-0000-0000-000000004501', 0),
  ('00000000-0000-0000-0000-000000004502', 30),
  ('00000000-0000-0000-0000-000000004503', 5),
  ('00000000-0000-0000-0000-000000004504', 100)
on conflict (user_id) do update set balance = excluded.balance;

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000004511', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000004512', '00000000-0000-0000-0000-000000004511', 'Muertos', 4900),
  ('00000000-0000-0000-0000-000000004513', '00000000-0000-0000-0000-000000004511', 'Catrinas', 4900);

insert into public.token_purchases
  (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status, created_at)
values
  ('00000000-0000-0000-0000-000000004502', 20, 5, 25, 3500, 'mercadopago', 'U-1', 'approved', now() - interval '20 days');

insert into public.seasonal_purchases
  (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  ('00000000-0000-0000-0000-000000004502', '00000000-0000-0000-0000-000000004512', 4900, 'mercadopago', 'U-2', 'approved', now() - interval '10 days'),
  -- Pendiente: no cuenta en lo que ha comprado.
  ('00000000-0000-0000-0000-000000004502', '00000000-0000-0000-0000-000000004513', 4900, 'mercadopago', 'U-3', 'pending', now() - interval '5 days'),
  -- Aviso repetido de Mercado Pago: ni cuenta como compra ni como actividad.
  ('00000000-0000-0000-0000-000000004504', '00000000-0000-0000-0000-000000004512', 4900, 'mercadopago', 'U-4', 'repeated', now() - interval '5 minutes');

insert into public.token_usage (user_id, amount, created_at) values
  ('00000000-0000-0000-0000-000000004502', 1, now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000004504', 1, now() - interval '10 minutes');

insert into public.token_gifts (recipient_id, admin_id, amount, reason, created_at) values
  ('00000000-0000-0000-0000-000000004503', '00000000-0000-0000-0000-000000004501', 5, 'Bienvenida', now() - interval '30 minutes');

select test.as_user('00000000-0000-0000-0000-000000004501');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users()),
  'beto@test.dev,Ana.Lopez@test.dev,admin-usuarios@test.dev,carla@test.dev',
  'al abrir, todas las cuentas, la más reciente primero');

select test.is(
  (select row(full_name, balance, paid_cents, created_at = now() - interval '40 days',
              last_activity_at = now() - interval '1 day')::text
     from public.admin_get_users() where email = 'Ana.Lopez@test.dev'),
  '("Ana López",30,8400,t,t)',
  'una cuenta trae nombre, saldo, lo pagado en compras aprobadas (tokens y temáticas) y su última actividad');

select test.is(
  (select row(full_name is null, last_activity_at = now() - interval '30 minutes')::text
     from public.admin_get_users() where email = 'beto@test.dev'),
  '(t,t)',
  'una cuenta sin nombre lo trae vacío, y un regalo cuenta como actividad');

select test.is(
  (select row(paid_cents, last_activity_at = now() - interval '10 minutes')::text
     from public.admin_get_users() where email = 'carla@test.dev'),
  '(0,t)',
  'el aviso repetido no cuenta como compra ni como actividad; el uso de IA sí');

select test.is(
  (select row(paid_cents, last_activity_at = created_at)::text
     from public.admin_get_users() where email = 'admin-usuarios@test.dev'),
  '(0,t)',
  'sin movimientos, la última actividad es el registro');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users('lópez')),
  'Ana.Lopez@test.dev',
  'busca por nombre sin importar mayúsculas');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users('  BETO@ ')),
  'beto@test.dev',
  'busca por correo sin importar mayúsculas ni espacios');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users(null, 'new_this_month')),
  'beto@test.dev',
  'nuevos este mes, en hora de Hermosillo');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users(null, 'buyers')),
  'Ana.Lopez@test.dev',
  'han comprado: solo con compras aprobadas');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users(null, 'never_bought')),
  'beto@test.dev,admin-usuarios@test.dev,carla@test.dev',
  'nunca han comprado: sin compras aprobadas, aunque tengan una pendiente o repetida');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users(null, null, 'activity')),
  'carla@test.dev,beto@test.dev,Ana.Lopez@test.dev,admin-usuarios@test.dev',
  'ordenar por última actividad');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users(null, null, 'paid')),
  'Ana.Lopez@test.dev,beto@test.dev,admin-usuarios@test.dev,carla@test.dev',
  'ordenar por lo que más compraron; los empates, la más reciente primero');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users(null, null, 'balance')),
  'carla@test.dev,Ana.Lopez@test.dev,beto@test.dev,admin-usuarios@test.dev',
  'ordenar por mayor saldo');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users('test.dev', 'never_bought', 'balance')),
  'carla@test.dev,beto@test.dev,admin-usuarios@test.dev',
  'buscador, filtro y orden se combinan');

select test.is(
  public.admin_get_users_count('test.dev', 'never_bought'),
  3::bigint,
  'el conteo respeta buscador y filtro');

-- Más de 200 cuentas viejas: la búsqueda y la paginación llegan a todas.
select test.as_postgres();
insert into auth.users (id, email, created_at)
select gen_random_uuid(), 'relleno-' || n || '@test.dev', now() - interval '200 days' - n * interval '1 minute'
from generate_series(1, 205) as n;
select test.as_user('00000000-0000-0000-0000-000000004501');

select test.is(
  (select string_agg(email, ',') from public.admin_get_users('relleno-205@')),
  'relleno-205@test.dev',
  'la búsqueda encuentra cuentas fuera de las 200 más recientes');

select test.is(
  row(public.admin_get_users_count(),
      (select count(*) from public.admin_get_users(null, null, 'recent', 20, 200)),
      (select string_agg(email, ',') from public.admin_get_users(null, null, 'recent', 2, 207)))::text,
  '(209,9,"relleno-204@test.dev,relleno-205@test.dev")',
  'pagina de 20 en 20 sobre todas las cuentas');

select test.throws($$
  select * from public.admin_get_users(null, 'vip')
$$, 'Invalid user filter', 'un filtro desconocido se rechaza');

select test.throws($$
  select * from public.admin_get_users(null, null, 'nombre')
$$, 'Invalid user sort', 'un orden desconocido se rechaza');

select test.as_user('00000000-0000-0000-0000-000000004502');
select test.throws($$
  select * from public.admin_get_users()
$$, 'Unauthorized', 'una usuaria normal no puede ver las cuentas');

select test.throws($$
  select * from public.admin_users_filtered(null, null)
$$, '42501', 'nadie puede llamar directo a la consulta interna');

select test.as_anon();
select test.throws($$
  select public.admin_get_users_count()
$$, '42501', 'un visitante no puede contar las cuentas');

rollback;
