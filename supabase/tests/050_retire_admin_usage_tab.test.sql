-- Se retira la pestaña Uso de IA (FEAT-47, US A2): sus seis RPCs dejan de existir, y lo que usan el
-- Resumen y la ficha de Usuarios sigue en pie, igual que los datos de token_usage (migración 050).
begin;

select test.is(
  (select count(*)::integer from (values
     (to_regprocedure('public.admin_get_token_usage_with_users(integer, integer, text, timestamptz, timestamptz, text)')),
     (to_regprocedure('public.admin_get_token_usage_count(text, timestamptz, timestamptz, text)')),
     (to_regprocedure('public.admin_get_usage_summary(timestamptz, timestamptz)')),
     (to_regprocedure('public.admin_get_usage_by_day(integer, timestamptz, timestamptz)')),
     (to_regprocedure('public.admin_get_usage_by_user(integer, timestamptz, timestamptz)')),
     (to_regprocedure('public.admin_get_usage_by_set(integer, timestamptz, timestamptz)'))
   ) as f(oid) where oid is not null),
  0,
  'ya no existen las seis RPCs que solo usaba la pestaña Uso de IA');

select test.is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('admin_get_token_usage_with_users', 'admin_get_token_usage_count', 'admin_get_usage_summary',
                        'admin_get_usage_by_day', 'admin_get_usage_by_user', 'admin_get_usage_by_set')),
  0,
  'tampoco queda ninguna versión con otros parámetros');

select test.ok(to_regclass('public.token_usage') is not null, 'la tabla token_usage sigue ahí');

select test.ok(
  to_regprocedure('public.admin_get_dashboard_summary(date, date)') is not null
  and to_regprocedure('public.admin_get_dashboard_daily(date, date)') is not null,
  'el Resumen conserva sus funciones (gasto en IA del periodo)');

select test.ok(
  exists (select 1 from pg_proc where proname = 'admin_get_user_activity'),
  'la ficha de Usuarios conserva su actividad (uso de IA por lotería y día)');

rollback;
