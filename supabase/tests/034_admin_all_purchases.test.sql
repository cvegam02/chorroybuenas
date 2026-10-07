-- Lista de compras del panel con tokens y loterías de temporada (migración 034).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'admin-ventas@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'clienta-ventas@test.dev'),
  ('00000000-0000-0000-0000-0000000000b3', 'cliente-dos@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000b2', 'clienta-ventas@test.dev', 'Clienta'),
  ('00000000-0000-0000-0000-0000000000b3', 'cliente-dos@test.dev', 'Cliente Dos')
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000000ab1', 'Verano');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000000bb1', '00000000-0000-0000-0000-000000000ab1', 'Playa', 4900);

insert into public.token_purchases
  (id, user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, payment_status, created_at)
values
  ('00000000-0000-0000-0000-000000000cb1', '00000000-0000-0000-0000-0000000000b2', 10, 2, 12, 2000,
   'mercadopago', 'AP-1', 'approved', '2026-10-01T10:00:00Z');
insert into public.seasonal_purchases
  (id, user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  ('00000000-0000-0000-0000-000000000cb2', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000bb1',
   4900, 'mercadopago', 'AP-2', 'approved', '2026-10-03T10:00:00Z'),
  ('00000000-0000-0000-0000-000000000cb3', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000bb1',
   4900, 'mercadopago', 'AP-3', 'pending', '2026-10-02T10:00:00Z'),
  -- Compra de una cuenta que ya se borró: se conserva sin dueño.
  ('00000000-0000-0000-0000-000000000cb4', null, '00000000-0000-0000-0000-000000000bb1',
   4900, 'mercadopago', 'AP-4', 'approved', '2026-09-30T10:00:00Z');

select test.as_user('00000000-0000-0000-0000-0000000000b1');

select test.is(
  (select array_agg(id order by ord) from public.admin_get_all_purchases(50, 0) with ordinality as t(
     id, user_id, kind, loteria_name, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents,
     payment_provider, payment_status, created_at, email, full_name, ord)),
  array['00000000-0000-0000-0000-000000000cb2', '00000000-0000-0000-0000-000000000cb3',
        '00000000-0000-0000-0000-000000000cb1', '00000000-0000-0000-0000-000000000cb4']::uuid[],
  'el panel mezcla compras de tokens y de temporada, de la más reciente a la más antigua');

select test.is(
  (select row(kind, loteria_name, total_tokens, amount_cents, payment_status, email)::text
     from public.admin_get_all_purchases(50, 0) where id = '00000000-0000-0000-0000-000000000cb2'),
  '(seasonal,Playa,,4900,approved,clienta-ventas@test.dev)'::text,
  'una compra de temporada lleva su tipo, el nombre de la lotería, el monto y quién compró, sin tokens');

select test.is(
  (select row(kind, loteria_name, total_tokens, amount_cents, payment_status, email)::text
     from public.admin_get_all_purchases(50, 0) where id = '00000000-0000-0000-0000-000000000cb1'),
  '(tokens,,12,2000,approved,clienta-ventas@test.dev)'::text,
  'una compra de tokens lleva su tipo y sus tokens, sin nombre de lotería');

select test.is(
  (select row(kind, user_id, email)::text
     from public.admin_get_all_purchases(50, 0) where id = '00000000-0000-0000-0000-000000000cb4'),
  '(seasonal,,)'::text, 'la compra de una cuenta borrada aparece sin dueño');

select test.is(
  (select count(*)::int from public.admin_get_all_purchases(50, 0, null, null, null, null, null, 'seasonal')),
  3, 'el filtro por tipo deja solo las de temporada');
select test.is(
  (select count(*)::int from public.admin_get_all_purchases(50, 0, null, null, null, null, null, 'tokens')),
  1, 'el filtro por tipo deja solo las de tokens');
select test.is(
  (select count(*)::int from public.admin_get_all_purchases(50, 0, null, 'pending')),
  1, 'el filtro por estado aplica a las de temporada');
select test.is(
  (select count(*)::int from public.admin_get_all_purchases(50, 0, 'clienta')),
  2, 'el filtro por correo aplica a los dos tipos');
select test.is(
  (select count(*)::int from public.admin_get_all_purchases(50, 0, null, null, null, '2026-10-02T00:00:00Z', '2026-10-02T23:59:59Z')),
  1, 'el filtro por fechas aplica a los dos tipos');
select test.is(
  (select array_agg(id) from public.admin_get_all_purchases(1, 1)),
  array['00000000-0000-0000-0000-000000000cb3']::uuid[], 'la paginación recorre la lista mezclada');

select test.is(public.admin_get_all_purchases_count(), 4::bigint, 'el conteo incluye los dos tipos');
select test.is(
  public.admin_get_all_purchases_count(null, null, null, null, null, 'seasonal'),
  3::bigint, 'el conteo respeta el filtro por tipo');
select test.is(
  public.admin_get_all_purchases_count('clienta', 'approved'),
  2::bigint, 'el conteo respeta los demás filtros');

select test.throws($$
  select * from public.admin_get_all_purchases(50, 0, null, null, null, null, null, 'otra')
$$, 'Invalid purchase kind', 'un tipo desconocido se rechaza');

-- Solo un administrador ve las compras de todos.
select test.as_user('00000000-0000-0000-0000-0000000000b2');
select test.throws($$
  select * from public.admin_get_all_purchases(50, 0)
$$, 'Unauthorized', 'una usuaria normal no puede listar las compras de todos');
select test.throws($$
  select public.admin_get_all_purchases_count()
$$, 'Unauthorized', 'una usuaria normal no puede contar las compras de todos');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_all_purchases(50, 0)
$$, '42501', 'un visitante no puede listar las compras');
select test.throws($$
  select public.admin_get_all_purchases_count()
$$, '42501', 'un visitante no puede contar las compras');

rollback;
