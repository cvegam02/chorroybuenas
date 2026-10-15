-- Tarjetas de packs en Precios y promos (FEAT-46, US A3): cuántas compras aprobadas tuvo cada pack en un
-- periodo, en hora de Hermosillo como el Resumen. Salen todos los packs, también los ocultos y los que no
-- vendieron (con cero). Las repetidas y pendientes no cuentan; la cantidad libre no es un pack.

create or replace function public.admin_get_pack_sales(p_from date, p_to date)
returns table (pack_id uuid, sales bigint)
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

  return query
  select p.id, count(tp.id)
  from public.token_packs p
  left join public.token_purchases tp
    on tp.pack_id = p.id
   and tp.payment_status = 'approved'
   and tp.created_at >= p_from::timestamp at time zone 'America/Hermosillo'
   and tp.created_at < (p_to + 1)::timestamp at time zone 'America/Hermosillo'
  group by p.id;
end;
$$;

comment on function public.admin_get_pack_sales(date, date) is
  'FEAT-46: compras aprobadas por pack en un periodo (hora de Hermosillo); todos los packs, con cero si no vendieron.';

revoke all on function public.admin_get_pack_sales(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_pack_sales(date, date) to authenticated, service_role;
