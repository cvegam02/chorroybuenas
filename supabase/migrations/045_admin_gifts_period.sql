-- Sub-pestaña «Regalos de tokens» de Usuarios (FEAT-45, US A4): los regalos de un periodo, en hora de
-- Hermosillo como el Resumen, de 20 en 20, y sus totales: cuántos regalos, tokens regalados, a cuántos usuarios
-- y valor a precio de lista (tokens × precio por token vigente en MXN; vacío si no hay precio guardado).
-- admin_get_token_gifts (026) se conserva para el sitio ya publicado.

create or replace function public.admin_check_gifts_period(p_from date, p_to date)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid period';
  end if;
end;
$$;

create or replace function public.admin_get_gifts(
  p_from date,
  p_to date,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  amount integer,
  reason text,
  admin_id uuid,
  admin_email text,
  admin_name text,
  recipient_id uuid,
  recipient_email text,
  recipient_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_check_gifts_period(p_from, p_to);
  return query
  select g.id, g.created_at, g.amount, g.reason, g.admin_id, pa.email, pa.full_name, g.recipient_id, pr.email, pr.full_name
  from public.token_gifts g
  left join public.profiles pa on pa.id = g.admin_id
  left join public.profiles pr on pr.id = g.recipient_id
  where g.created_at >= p_from::timestamp at time zone 'America/Hermosillo'
    and g.created_at < (p_to + 1)::timestamp at time zone 'America/Hermosillo'
  order by g.created_at desc, g.id
  limit least(greatest(coalesce(p_limit, 20), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_get_gifts_totals(p_from date, p_to date)
returns table (
  gifts bigint,
  tokens bigint,
  recipients bigint,
  -- Nulo si no hay precio por token guardado: nunca se supone uno.
  value_cents bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_check_gifts_period(p_from, p_to);
  return query
  with period as (
    select g.amount, g.recipient_id
    from public.token_gifts g
    where g.created_at >= p_from::timestamp at time zone 'America/Hermosillo'
      and g.created_at < (p_to + 1)::timestamp at time zone 'America/Hermosillo'
  ),
  sums as (
    select count(*)::bigint as gifts, coalesce(sum(p.amount), 0)::bigint as tokens,
           count(distinct p.recipient_id)::bigint as recipients
    from period p
  )
  select s.gifts, s.tokens, s.recipients,
         s.tokens * (select tp.price_per_token_cents from public.token_pricing tp where tp.currency = 'MXN')::bigint
  from sums s;
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_check_gifts_period(date, date) from public, anon, authenticated;

revoke all on function public.admin_get_gifts(date, date, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_get_gifts(date, date, integer, integer) to authenticated, service_role;

revoke all on function public.admin_get_gifts_totals(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_gifts_totals(date, date) to authenticated, service_role;
