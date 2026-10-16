-- Pestaña Ventas del panel (FEAT-44, US A3): el pago de Mercado Pago de una venta, para el panel de detalle.
-- payment_metadata guarda el objeto de pago completo, con datos personales de quien pagó (correo,
-- identificación, IP, tarjeta): aquí solo salen los campos que el panel muestra. Las fechas y el monto
-- vienen de Mercado Pago; si alguno llega con un formato raro sale vacío en lugar de romper el detalle.

create or replace function public.admin_try_timestamptz(p_value text)
returns timestamptz
language plpgsql
immutable
set search_path = public
as $$
begin
  return nullif(p_value, '')::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.admin_try_numeric(p_value text)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
begin
  return nullif(p_value, '')::numeric;
exception when others then
  return null;
end;
$$;

create or replace function public.admin_get_sale_detail(
  -- 'tokens' o 'seasonal': los ids son de tablas distintas.
  p_kind text,
  p_id uuid
)
returns table (
  payment_id text,
  payer_id text,
  method_type text,
  method_id text,
  mp_status text,
  mp_status_detail text,
  mp_created_at timestamptz,
  mp_approved_at timestamptz,
  -- Pesos, como los manda Mercado Pago.
  mp_amount numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if coalesce(p_kind, '') not in ('tokens', 'seasonal') then
    raise exception 'Invalid sale kind';
  end if;

  return query
  with sale as (
    select tp.payment_id, tp.payment_metadata as meta
    from public.token_purchases tp
    where p_kind = 'tokens' and tp.id = p_id
    union all
    select sp.payment_id, sp.payment_metadata
    from public.seasonal_purchases sp
    where p_kind = 'seasonal' and sp.id = p_id
  )
  select
    s.payment_id,
    s.meta -> 'payer' ->> 'id',
    s.meta ->> 'payment_type_id',
    s.meta ->> 'payment_method_id',
    s.meta ->> 'status',
    s.meta ->> 'status_detail',
    public.admin_try_timestamptz(s.meta ->> 'date_created'),
    public.admin_try_timestamptz(s.meta ->> 'date_approved'),
    public.admin_try_numeric(s.meta ->> 'transaction_amount')
  from sale s;
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_try_timestamptz(text) from public, anon, authenticated;
revoke all on function public.admin_try_numeric(text) from public, anon, authenticated;

revoke all on function public.admin_get_sale_detail(text, uuid) from public, anon, authenticated;
grant execute on function public.admin_get_sale_detail(text, uuid) to authenticated, service_role;
