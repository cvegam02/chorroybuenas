-- Sub-pestaña «Regalos de tokens» (FEAT-45, US A4): regalos de un periodo en hora de Hermosillo, de 20 en 20,
-- y sus totales: tokens regalados, a cuántos usuarios y valor a precio de lista (migración 045).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000004801', 'admin-regalos@test.dev'),
  ('00000000-0000-0000-0000-000000004802', 'ana@test.dev'),
  ('00000000-0000-0000-0000-000000004803', 'beto@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004801');
insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000004801', 'admin-regalos@test.dev', 'Carlos'),
  ('00000000-0000-0000-0000-000000004802', 'ana@test.dev', 'Ana López'),
  ('00000000-0000-0000-0000-000000004803', 'beto@test.dev', '')
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.token_pricing (currency, price_per_token_cents) values ('MXN', 200)
on conflict (currency) do update set price_per_token_cents = excluded.price_per_token_cents;

insert into public.token_gifts (recipient_id, admin_id, amount, reason, created_at) values
  ('00000000-0000-0000-0000-000000004802', '00000000-0000-0000-0000-000000004801', 10, 'Sorteo', '2026-10-14T18:20:00Z'),
  -- 15 de octubre a las 23:00 en Hermosillo: dentro.
  ('00000000-0000-0000-0000-000000004803', '00000000-0000-0000-0000-000000004801', 5, null, '2026-10-16T06:00:00Z'),
  ('00000000-0000-0000-0000-000000004802', '00000000-0000-0000-0000-000000004801', 15, 'Pago fallido', '2026-10-09T16:45:00Z'),
  -- 30 de septiembre a las 23:00 en Hermosillo: fuera.
  ('00000000-0000-0000-0000-000000004803', '00000000-0000-0000-0000-000000004801', 50, 'Viejo', '2026-10-01T06:00:00Z');

select test.as_user('00000000-0000-0000-0000-000000004801');

select test.is(
  (select string_agg(amount::text, ',') from public.admin_get_gifts('2026-10-01', '2026-10-15')),
  '5,10,15',
  'los regalos del periodo en hora de Hermosillo, el más nuevo primero');

select test.is(
  (select row(reason, admin_name, recipient_email, recipient_name)::text
     from public.admin_get_gifts('2026-10-01', '2026-10-15') where amount = 10),
  '(Sorteo,Carlos,ana@test.dev,"Ana López")',
  'cada regalo trae su motivo, quién regaló y para quién');

select test.is(
  (select string_agg(amount::text, ',') from public.admin_get_gifts('2026-10-01', '2026-10-15', 2, 1)),
  '10,15',
  'pagina con límite y desplazamiento');

select test.is(
  (select row(gifts, tokens, recipients, value_cents)::text from public.admin_get_gifts_totals('2026-10-01', '2026-10-15')),
  '(3,30,2,6000)',
  'totales del periodo: regalos, tokens, a cuántos usuarios y valor a precio de lista');

select test.is(
  (select row(gifts, tokens, recipients, value_cents)::text from public.admin_get_gifts_totals('2026-11-01', '2026-11-30')),
  '(0,0,0,0)',
  'un periodo sin regalos da ceros');

select test.is(
  (select tokens from public.admin_get_gifts_totals('2026-10-01', '2026-10-15'))
    = (select gifted_tokens from public.admin_get_dashboard_pending('2026-10-01', '2026-10-15')),
  true,
  'los tokens regalados coinciden con los del Resumen');

select test.as_postgres();
delete from public.token_pricing where currency = 'MXN';
select test.as_user('00000000-0000-0000-0000-000000004801');

select test.is(
  (select row(tokens, value_cents is null)::text from public.admin_get_gifts_totals('2026-10-01', '2026-10-15')),
  '(30,t)',
  'sin precio guardado el valor viene vacío, no supuesto');

select test.throws($$
  select * from public.admin_get_gifts('2026-10-15', '2026-10-01')
$$, 'Invalid period', 'un periodo al revés se rechaza');

select test.as_user('00000000-0000-0000-0000-000000004802');
select test.throws($$
  select * from public.admin_get_gifts_totals('2026-10-01', '2026-10-15')
$$, 'Unauthorized', 'una usuaria normal no puede ver los regalos');

select test.as_anon();
select test.throws($$
  select * from public.admin_get_gifts('2026-10-01', '2026-10-15')
$$, '42501', 'un visitante no puede ver los regalos');

rollback;
