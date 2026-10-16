-- Costo de IA por imagen editable desde Precios y promos (FEAT-47, US A1): arranca en 0.012 USD,
-- solo un administrador lo lee y lo cambia, y solo a un valor mayor que cero (migración 049).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000004701', 'admin-ia@test.dev'),
  ('00000000-0000-0000-0000-000000004702', 'ana-ia@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000004701');

select test.as_user('00000000-0000-0000-0000-000000004701');

select test.is(
  public.admin_get_ai_cost_per_image(),
  0.012::numeric,
  'arranca en 0.012 USD, lo que cobra Replicate por GPT-Image en calidad low');

select test.is(
  public.admin_set_ai_cost_per_image(0.0245),
  0.0245::numeric,
  'el administrador cambia el costo por imagen');

select test.is(
  public.admin_get_ai_cost_per_image(),
  0.0245::numeric,
  'el cálculo lee el costo nuevo');

select test.throws($$ select public.admin_set_ai_cost_per_image(0) $$, 'Invalid cost', 'no se guarda un costo de cero');
select test.throws($$ select public.admin_set_ai_cost_per_image(-0.01) $$, 'Invalid cost', 'no se guarda un costo negativo');
select test.throws($$ select public.admin_set_ai_cost_per_image(null) $$, 'Invalid cost', 'no se guarda un costo vacío');

select test.as_user('00000000-0000-0000-0000-000000004702');
select test.throws($$
  select public.admin_get_ai_cost_per_image()
$$, 'Unauthorized', 'una usuaria normal no puede ver el costo');
select test.throws($$
  select public.admin_set_ai_cost_per_image(0.001)
$$, 'Unauthorized', 'una usuaria normal no puede cambiar el costo');

-- Tampoco directo en la tabla: sin reglas de acceso no ve ni cambia nada.
select test.is(
  (select count(*)::integer from public.ai_cost_settings),
  0,
  'una usuaria normal no ve la tabla del costo');
select test.lives($$
  update public.ai_cost_settings set cost_per_image_usd = 0.001
$$, 'una usuaria normal no ve error al intentar escribir directo');

select test.as_anon();
select test.throws($$
  select public.admin_get_ai_cost_per_image()
$$, '42501', 'un visitante no puede ver el costo');
select test.throws($$
  select public.admin_set_ai_cost_per_image(0.001)
$$, '42501', 'un visitante no puede cambiar el costo');

select test.as_postgres();
select test.is(
  (select cost_per_image_usd from public.ai_cost_settings),
  0.0245::numeric,
  'después de los intentos rechazados el costo sigue siendo el del administrador');

rollback;
