-- Los códigos promocionales dejan de ser legibles con la anon key.
-- La página de compra usa un resumen público (sin códigos) y valida cada código en el servidor.

-- Quitar toda policy de lectura de promotions, se llame como se llame, antes de crear la de admins.
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'promotions' and cmd in ('SELECT', 'ALL')
  loop
    raise notice 'Reemplazando policy de lectura de promotions: %', r.policyname;
    execute format('drop policy %I on public.promotions', r.policyname);
  end loop;
end $$;

create policy "Admins can read promotions" on public.promotions
  for select using (public.is_admin());

-- Porcentaje de bono de una promoción: entero entre 1 y 100, o 0 si la config no es válida.
create or replace function public.promo_percent(p_config jsonb)
returns integer
language sql
immutable
as $$
  select case
    when jsonb_typeof(p_config->'percent') = 'number'
     and (p_config->>'percent')::numeric between 1 and 100
    then round((p_config->>'percent')::numeric)::integer
    else 0
  end;
$$;

create or replace function public.get_public_promo_summary()
returns table (first_purchase_percent integer, has_code_promos boolean)
language sql
stable
security definer
set search_path = public
as $$
  with vigentes as (
    select type, public.promo_percent(config) as percent
    from public.promotions
    where is_active
      and (valid_from is null or valid_from <= now())
      and (valid_until is null or valid_until >= now())
  )
  select
    coalesce((select max(percent) from vigentes where type = 'first_purchase'), 0),
    exists (select 1 from vigentes where type = 'code' and percent > 0);
$$;

create or replace function public.check_promo_code(p_code text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.promo_percent(p.config)
    from public.promotions p
    where p.type = 'code'
      and upper(trim(p.code)) = upper(trim(p_code))
      and p.is_active
      and (p.valid_from is null or p.valid_from <= now())
      and (p.valid_until is null or p.valid_until >= now())
      and not exists (
        select 1 from public.token_purchases tp
        where tp.user_id = auth.uid() and p.id = any (tp.promotion_ids)
      )
    limit 1
  ), 0);
$$;

comment on function public.get_public_promo_summary is
  'Resumen público de promociones vigentes: % de primera compra y si existen códigos. No expone códigos.';
comment on function public.check_promo_code is
  'Porcentaje de bono de un código para el usuario actual; 0 si no existe, no está vigente o ya lo usó.';

revoke all on function public.get_public_promo_summary() from public;
grant execute on function public.get_public_promo_summary() to anon, authenticated;
revoke all on function public.check_promo_code(text) from public, anon;
grant execute on function public.check_promo_code(text) to authenticated;
