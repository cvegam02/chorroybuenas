-- Pestaña Ventas del panel (FEAT-44, US A1): lista de ventas con filtros, en hora de Hermosillo (migración 039).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000004401', 'admin-ventas@test.dev'),
  ('00000000-0000-0000-0000-000000004402', 'Ana.Lopez@test.dev'),
  ('00000000-0000-0000-0000-000000004403', 'beto@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004401');
insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000004402', 'Ana.Lopez@test.dev', 'Ana López'),
  ('00000000-0000-0000-0000-000000004403', 'beto@test.dev', 'Roberto Ruiz')
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000004411', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000004412', '00000000-0000-0000-0000-000000004411', 'Muertos', 4900),
  ('00000000-0000-0000-0000-000000004413', '00000000-0000-0000-0000-000000004411', 'Catrinas', 4900);

insert into public.token_purchases
  (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status, created_at)
values
  ('00000000-0000-0000-0000-000000004402', 20, 5, 25, 3500, 'mercadopago', 'V-1', 'approved', '2026-10-05T18:00:00Z'),
  -- 15 de octubre a las 23:00 en Hermosillo: dentro del periodo.
  ('00000000-0000-0000-0000-000000004403', 10, 0, 10, 2000, 'mercadopago', 'V-2', 'approved', '2026-10-16T06:00:00Z'),
  -- 30 de septiembre a las 23:00 en Hermosillo: fuera.
  ('00000000-0000-0000-0000-000000004402', 10, 0, 10, 2000, 'mercadopago', 'V-3', 'approved', '2026-10-01T06:00:00Z');

insert into public.seasonal_purchases
  (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  ('00000000-0000-0000-0000-000000004403', '00000000-0000-0000-0000-000000004412', 4900, 'mercadopago', 'V-4', 'approved', '2026-10-07T18:00:00Z'),
  ('00000000-0000-0000-0000-000000004402', '00000000-0000-0000-0000-000000004413', 4900, 'mercadopago', 'V-5', 'pending', '2026-10-09T18:00:00Z'),
  -- Aviso repetido de Mercado Pago: no se muestra.
  ('00000000-0000-0000-0000-000000004403', '00000000-0000-0000-0000-000000004412', 4900, 'mercadopago', 'V-6', 'repeated', '2026-10-08T18:00:00Z'),
  -- Compra de una cuenta borrada: se muestra, sin cliente.
  (null, '00000000-0000-0000-0000-000000004413', 4900, 'mercadopago', 'V-7', 'approved', '2026-10-03T18:00:00Z');

select test.as_user('00000000-0000-0000-0000-000000004401');

select test.is(
  (select string_agg(payment_id, ',') from public.admin_get_sales('2026-10-01', '2026-10-15')),
  'V-2,V-5,V-4,V-1,V-7',
  'las ventas del periodo en hora de Hermosillo, la más nueva primero, sin las repetidas');

select test.is(
  (select row(kind, loteria_name, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_status, email, full_name)::text
     from public.admin_get_sales('2026-10-01', '2026-10-15') where payment_id = 'V-1'),
  '(tokens,,20,5,25,3500,approved,Ana.Lopez@test.dev,"Ana López")',
  'una compra de tokens trae sus tokens, el monto, el estado y el cliente');

select test.is(
  (select row(kind, loteria_name, total_tokens, email)::text
     from public.admin_get_sales('2026-10-01', '2026-10-15') where payment_id = 'V-4'),
  '(seasonal,Muertos,,beto@test.dev)',
  'una compra temática trae el nombre de la lotería');

select test.is(
  (select string_agg(payment_id, ',') from public.admin_get_sales('2026-10-01', '2026-10-15', 'lópez')),
  'V-5,V-1',
  'busca por nombre sin importar mayúsculas');

select test.is(
  (select string_agg(payment_id, ',') from public.admin_get_sales('2026-10-01', '2026-10-15', 'ana.lo')),
  'V-5,V-1',
  'busca por correo sin importar mayúsculas');

select test.is(
  (select string_agg(payment_id, ',') from public.admin_get_sales('2026-10-01', '2026-10-15', null, 'seasonal')),
  'V-5,V-4,V-7',
  'el tipo deja solo las temáticas');

select test.is(
  (select string_agg(payment_id, ',') from public.admin_get_sales('2026-10-01', '2026-10-15', null, null, 'pending')),
  'V-5',
  'el estado deja solo las pendientes');

select test.is(
  (select string_agg(payment_id, ',') from public.admin_get_sales('2026-10-01', '2026-10-15', 'beto', 'tokens', 'approved')),
  'V-2',
  'buscador, tipo y estado se combinan');

select test.is(
  (select string_agg(payment_id, ',') from public.admin_get_sales('2026-10-01', '2026-10-15', null, null, null, 2, 2)),
  'V-4,V-1',
  'pagina con límite y desplazamiento');

select test.is(
  (select row(
     public.admin_get_sales_count('2026-10-01', '2026-10-15'),
     public.admin_get_sales_count('2026-10-01', '2026-10-15', 'lópez', 'seasonal', 'pending'))::text),
  '(5,1)',
  'el conteo respeta los mismos filtros y no cuenta las repetidas');

select test.throws($$
  select * from public.admin_get_sales('2026-10-01', '2026-10-15', null, null, 'repeated')
$$, 'Invalid sale status', 'no se puede pedir el estado repetido');

select test.throws($$
  select * from public.admin_get_sales('2026-10-01', '2026-10-15', null, 'regalo')
$$, 'Invalid sale kind', 'un tipo desconocido se rechaza');

select test.throws($$
  select public.admin_get_sales_count('2026-10-15', '2026-10-01')
$$, 'Invalid period', 'un periodo al revés se rechaza');

select test.as_user('00000000-0000-0000-0000-000000004402');
select test.throws($$
  select * from public.admin_get_sales('2026-10-01', '2026-10-15')
$$, 'Unauthorized', 'una usuaria normal no puede ver las ventas');

select test.throws($$
  select * from public.admin_sales_filtered('2026-10-01', '2026-10-15', null, null, null)
$$, '42501', 'nadie puede llamar directo a la consulta interna');

select test.as_anon();
select test.throws($$
  select public.admin_get_sales_count('2026-10-01', '2026-10-15')
$$, '42501', 'un visitante no puede contar las ventas');

rollback;
