-- Actividad de la ficha del usuario (FEAT-45, US A3): compras, temáticas, regalos, registro y uso de IA
-- agrupado por lotería y día en hora de Hermosillo, de lo más reciente a lo más antiguo (migración 044).
begin;

insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-000000004701', 'admin-actividad@test.dev', '2026-01-01T00:00:00Z'),
  ('00000000-0000-0000-0000-000000004702', 'ana@test.dev', '2026-09-03T06:00:00Z'),
  ('00000000-0000-0000-0000-000000004703', 'beto@test.dev', '2026-10-01T18:00:00Z');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004701');

insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000004711', 'Otoño');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000004712', '00000000-0000-0000-0000-000000004711', 'Muertos', 10000),
  ('00000000-0000-0000-0000-000000004713', '00000000-0000-0000-0000-000000004711', 'Catrinas', 4900);
insert into public.token_packs (id, base_tokens, bonus_tokens, price_cents) values
  ('00000000-0000-0000-0000-000000004714', 37, 3, 3500);

insert into public.token_purchases
  (user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id,
   payment_status, payment_metadata, created_at)
values
  ('00000000-0000-0000-0000-000000004702', '00000000-0000-0000-0000-000000004714', 20, 5, 25, 3500, 'mercadopago',
   'A-1', 'approved', '{"payment_type_id": "debit_card", "payment_method_id": "visa", "payer": {"email": "x@y.z"}}',
   '2026-10-15T17:42:00Z');

insert into public.seasonal_purchases
  (user_id, loteria_id, amount_cents, payment_provider, payment_id, status, created_at)
values
  ('00000000-0000-0000-0000-000000004702', '00000000-0000-0000-0000-000000004712', 10000, 'mercadopago', 'A-2', 'approved', '2026-10-05T18:00:00Z'),
  ('00000000-0000-0000-0000-000000004702', '00000000-0000-0000-0000-000000004713', 4900, 'mercadopago', 'A-3', 'pending', '2026-10-14T18:00:00Z'),
  -- Aviso repetido de Mercado Pago: no aparece.
  ('00000000-0000-0000-0000-000000004702', '00000000-0000-0000-0000-000000004712', 10000, 'mercadopago', 'A-4', 'repeated', '2026-10-05T18:05:00Z');

insert into public.token_gifts (recipient_id, admin_id, amount, reason, created_at) values
  ('00000000-0000-0000-0000-000000004702', '00000000-0000-0000-0000-000000004701', 15, 'Sorteo', '2026-10-09T18:00:00Z');

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-000000004721', '00000000-0000-0000-0000-000000004702', 'Cumple de Sofi'),
  ('00000000-0000-0000-0000-000000004722', '00000000-0000-0000-0000-000000004702', 'Boda');

insert into public.token_usage (user_id, amount, set_id, created_at) values
  -- 14 de octubre en Hermosillo, misma lotería: un solo renglón de 3 fotos (la última, 23:30 del 14).
  ('00000000-0000-0000-0000-000000004702', 1, '00000000-0000-0000-0000-000000004721', '2026-10-14T16:00:00Z'),
  ('00000000-0000-0000-0000-000000004702', 1, '00000000-0000-0000-0000-000000004721', '2026-10-14T20:00:00Z'),
  ('00000000-0000-0000-0000-000000004702', 1, '00000000-0000-0000-0000-000000004721', '2026-10-15T06:30:00Z'),
  -- 15 de octubre en Hermosillo, misma lotería: otro renglón.
  ('00000000-0000-0000-0000-000000004702', 2, '00000000-0000-0000-0000-000000004721', '2026-10-15T08:00:00Z'),
  -- 14 de octubre, otra lotería: otro renglón.
  ('00000000-0000-0000-0000-000000004702', 1, '00000000-0000-0000-0000-000000004722', '2026-10-14T19:00:00Z'),
  -- Lotería borrada.
  ('00000000-0000-0000-0000-000000004702', 4, null, '2026-10-01T18:00:00Z');

select test.as_user('00000000-0000-0000-0000-000000004701');

select test.is(
  (select string_agg(kind || ':' || coalesce(ai_photos::text, total_tokens::text, amount_cents::text, ''), ',')
     from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702')),
  'tokens:25,ai:2,ai:3,ai:1,seasonal:4900,gift:15,seasonal:10000,ai:4,signup:',
  'todos los movimientos, del más reciente al más antiguo, con la IA agrupada por lotería y día');

select test.is(
  (select row(occurred_at = '2026-10-15T06:30:00Z'::timestamptz, loteria_name)::text
     from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702') where kind = 'ai' and ai_photos = 3),
  '(t,"Cumple de Sofi")',
  'un grupo de IA trae el día en hora de Hermosillo, su hora más reciente y el nombre de la lotería');

select test.is(
  (select loteria_name is null
     from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702') where kind = 'ai' and ai_photos = 4),
  true,
  'el uso en una lotería borrada viene sin nombre');

select test.is(
  (select row(status, pack_id, base_tokens, total_tokens, amount_cents, method_type, method_id)::text
     from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702') where kind = 'tokens'),
  '(approved,00000000-0000-0000-0000-000000004714,20,25,3500,debit_card,visa)',
  'una compra de tokens trae su estado, el pack, los tokens, el monto y el método de pago');

select test.is(
  (select string_agg(row(loteria_name, status, amount_cents)::text, ',')
     from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702') where kind = 'seasonal'),
  '(Catrinas,pending,4900),(Muertos,approved,10000)',
  'las temáticas traen nombre, estado (también pendientes) y monto, sin el aviso repetido');

select test.is(
  (select row(total_tokens, reason)::text
     from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702') where kind = 'gift'),
  '(15,Sorteo)',
  'un regalo trae sus tokens y su motivo');

select test.is(
  (select row(kind, occurred_at = '2026-10-01T18:00:00Z'::timestamptz)::text
     from public.admin_get_user_activity('00000000-0000-0000-0000-000000004703')),
  '(signup,t)',
  'una cuenta sin movimientos solo trae su registro');

select test.is(
  (select string_agg(kind, ',')
     from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702', 2)),
  'tokens,ai',
  'trae solo los movimientos más recientes que se pidan');

select test.is(
  (select count(*) from public.admin_get_user_activity('00000000-0000-0000-0000-000000004799')),
  0::bigint,
  'una cuenta que no existe no trae actividad');

select test.as_user('00000000-0000-0000-0000-000000004702');
select test.throws($$
  select * from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702')
$$, 'Unauthorized', 'una usuaria normal no puede ver la actividad, ni la suya por aquí');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_user_activity('00000000-0000-0000-0000-000000004702')
$$, '42501', 'un visitante no puede pedir la actividad');

rollback;
