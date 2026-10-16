-- Se retira la pestaña Uso de IA del panel (FEAT-47, US A2; contexto-negocio.md §10).
-- Estas seis RPCs solo las usaba esa pestaña (revisado con grep el 2026-10-15: ni otras pantallas, ni
-- las edge functions, ni otras funciones de la base las llaman). Los datos de token_usage no se tocan:
-- el gasto en IA del periodo sigue en el Resumen (035, 037) y el uso de cada usuario en su ficha (044).

drop function if exists public.admin_get_token_usage_with_users(integer, integer, text, timestamptz, timestamptz, text);
drop function if exists public.admin_get_token_usage_count(text, timestamptz, timestamptz, text);
drop function if exists public.admin_get_usage_summary(timestamptz, timestamptz);
drop function if exists public.admin_get_usage_by_day(integer, timestamptz, timestamptz);
drop function if exists public.admin_get_usage_by_user(integer, timestamptz, timestamptz);
drop function if exists public.admin_get_usage_by_set(integer, timestamptz, timestamptz);
