-- Tabla de promociones en Precios y promos (FEAT-46, US A4): cuántas compras aprobadas usaron cada promoción
-- (`token_purchases.promotion_ids`) y cuántos tokens regaló. La compra junta en `bonus_tokens` el regalo del
-- pack y el de la promoción; el de la promoción se lee de lo que guardó el pago
-- (`payment_metadata.metadata.promotion_bonus`) y, en compras sin ese dato, se deduce restando el regalo
-- actual del pack. Salen todas las promociones, con ceros si nadie las usó.

create or replace function public.admin_get_promotion_usage()
returns table (promotion_id uuid, uses bigint, tokens bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  return query
  with used as (
    select
      u.promo_id,
      case
        when jsonb_typeof(tp.payment_metadata -> 'metadata' -> 'promotion_bonus') = 'number'
          then (tp.payment_metadata -> 'metadata' ->> 'promotion_bonus')::numeric::bigint
        else greatest(tp.bonus_tokens - coalesce(pk.bonus_tokens, 0), 0)::bigint
      end as promo_tokens
    from public.token_purchases tp
    cross join lateral unnest(tp.promotion_ids) as u(promo_id)
    left join public.token_packs pk on pk.id = tp.pack_id
    where tp.payment_status = 'approved'
  )
  select p.id, count(u.promo_id), coalesce(sum(u.promo_tokens), 0)::bigint
  from public.promotions p
  left join used u on u.promo_id = p.id
  group by p.id;
end;
$$;

comment on function public.admin_get_promotion_usage() is
  'FEAT-46: compras aprobadas que usaron cada promoción y tokens que regaló; todas las promociones, con ceros.';

revoke all on function public.admin_get_promotion_usage() from public, anon, authenticated;
grant execute on function public.admin_get_promotion_usage() to authenticated, service_role;
