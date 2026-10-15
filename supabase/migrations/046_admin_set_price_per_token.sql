-- Precio por token editable desde Precios y promos (FEAT-46, US A2; contexto-negocio.md §10).
-- Solo un administrador lo cambia y solo a un precio mayor que cero. Si no hay precio guardado en MXN,
-- se crea. La pantalla de compra y create-payment-preference leen esta misma fila.

create or replace function public.admin_set_price_per_token(p_price_cents integer)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_price integer;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_price_cents is null or p_price_cents <= 0 then
    raise exception 'Invalid price';
  end if;

  insert into public.token_pricing (currency, price_per_token_cents, updated_at)
  values ('MXN', p_price_cents, now())
  on conflict (currency) do update
    set price_per_token_cents = excluded.price_per_token_cents,
        updated_at = excluded.updated_at
  returning price_per_token_cents into v_price;

  return v_price;
end;
$$;

comment on function public.admin_set_price_per_token(integer) is
  'FEAT-46: el administrador cambia el precio por token en MXN (centavos, mayor que cero).';

revoke all on function public.admin_set_price_per_token(integer) from public, anon, authenticated;
grant execute on function public.admin_set_price_per_token(integer) to authenticated, service_role;
