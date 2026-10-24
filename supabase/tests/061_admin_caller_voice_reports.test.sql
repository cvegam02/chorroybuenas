-- La voz con IA del cantador en los reportes del administrador (FEAT-55, decisión 28; migración 061):
-- las fotos con IA no cuentan la voz, la voz se cuenta aparte y tiene su costo por lotería editable.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000061a1', 'admin-voz@test.dev'),
  ('00000000-0000-0000-0000-0000000061a2', 'clienta-voz@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000061a1');
insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000061b1', '00000000-0000-0000-0000-0000000061a2', 'La de la fiesta');

-- 2 de octubre en Hermosillo: 3 fotos con IA y una voz (10 tokens) de la misma lotería.
insert into public.token_usage (user_id, amount, reason, set_id, created_at) values
  ('00000000-0000-0000-0000-0000000061a2', 3, 'ai_conversion', '00000000-0000-0000-0000-0000000061b1', '2026-10-02T18:00:00Z'),
  ('00000000-0000-0000-0000-0000000061a2', 10, 'caller_voice', '00000000-0000-0000-0000-0000000061b1', '2026-10-02T19:00:00Z');

select test.as_user('00000000-0000-0000-0000-0000000061a1');

-- Resumen
select test.is(
  (select row(ai_images, ai_voices)::text from public.admin_get_dashboard_summary('2026-10-01', '2026-10-31')),
  '(3,1)'::text, 'el Resumen cuenta las fotos sin la voz y la voz aparte');
select test.is(
  (select row(ai_images, ai_voices)::text from public.admin_get_dashboard_daily('2026-10-02', '2026-10-02')),
  '(3,1)'::text, 'la gráfica por día también separa la voz');

-- Actividad del usuario
select test.is(
  (select ai_photos from public.admin_get_user_activity('00000000-0000-0000-0000-0000000061a2', 50) where kind = 'ai'),
  3::bigint, 'la actividad cuenta como fotos solo las fotos');
select test.is(
  (select row(loteria_name, total_tokens)::text
     from public.admin_get_user_activity('00000000-0000-0000-0000-0000000061a2', 50) where kind = 'voice'),
  '("La de la fiesta",10)'::text, 'la voz sale como su propio renglón, con su lotería y sus tokens');

-- Costo de la voz por lotería (decisión 28)
select test.is(public.admin_get_ai_cost_per_voice(), 0.10::numeric, 'arranca en 0.10 USD por lotería');
select test.is(public.admin_set_ai_cost_per_voice(0.08), 0.08::numeric, 'el administrador cambia el costo de la voz');
select test.is(public.admin_get_ai_cost_per_voice(), 0.08::numeric, 'el Resumen lee el costo nuevo');
select test.is(public.admin_get_ai_cost_per_image(), 0.012::numeric, 'el costo por imagen no cambia');
select test.throws($$ select public.admin_set_ai_cost_per_voice(0) $$, 'Invalid cost', 'no se guarda un costo de cero');
select test.throws($$ select public.admin_set_ai_cost_per_voice(null) $$, 'Invalid cost', 'no se guarda un costo vacío');

select test.as_user('00000000-0000-0000-0000-0000000061a2');
select test.throws($$ select public.admin_get_ai_cost_per_voice() $$, 'Unauthorized',
  'una usuaria normal no puede ver el costo de la voz');
select test.throws($$ select public.admin_set_ai_cost_per_voice(0.01) $$, 'Unauthorized',
  'una usuaria normal no puede cambiar el costo de la voz');

select test.as_anon();
select test.throws($$ select public.admin_get_ai_cost_per_voice() $$, '42501', 'un visitante no puede ver el costo');

rollback;
