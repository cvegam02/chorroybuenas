-- Pagos en proceso de loterías de temporada (FEAT-17, US C3): efectivo o transferencia.
-- El pago pendiente se registra como 'pending'; al aprobarse, esa misma fila pasa a 'approved'
-- (o a 'repeated'); si se rechaza o caduca, la fila se borra y deja de bloquear una nueva compra.

-- Quien tiene un pago en proceso ve la ficha de esa lotería aunque ya no esté visible (para
-- mostrarla en Mi cuenta). El PDF sigue exigiendo una compra aprobada (migración 032).
drop policy if exists "Buyers can read purchased seasonal_loterias" on public.seasonal_loterias;
create policy "Buyers can read purchased seasonal_loterias" on public.seasonal_loterias
  for select to authenticated using (
    exists (
      select 1 from public.seasonal_purchases p
       where p.loteria_id = seasonal_loterias.id
         and p.user_id = (select auth.uid())
         and p.status in ('approved', 'pending')
    )
  );

create or replace function public.record_pending_seasonal_purchase(
  p_user_id uuid,
  p_loteria_id uuid,
  p_amount_cents integer,
  p_payment_provider text,
  p_payment_id text,
  p_payment_metadata jsonb default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if p_payment_id is null or p_payment_id = '' then
    raise exception 'p_payment_id is required';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'p_amount_cents must be positive';
  end if;

  -- Si el pago ya está registrado (pendiente, aprobado o repetido) no se toca: un aviso atrasado
  -- de «pendiente» nunca desaprueba una compra.
  insert into public.seasonal_purchases (
    user_id, loteria_id, amount_cents, payment_provider, payment_id, status, payment_metadata
  )
  values (
    p_user_id, p_loteria_id, p_amount_cents, p_payment_provider, p_payment_id, 'pending', p_payment_metadata
  )
  on conflict (payment_provider, payment_id) do nothing;

  select status into v_status from public.seasonal_purchases
   where payment_provider = p_payment_provider and payment_id = p_payment_id;
  return v_status;
end;
$$;

comment on function public.record_pending_seasonal_purchase is
  'Registra un pago en proceso de una lotería de temporada, una sola vez por pago. Solo service_role.';

create or replace function public.release_pending_seasonal_purchase(
  p_payment_provider text,
  p_payment_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.seasonal_purchases
   where payment_provider = p_payment_provider and payment_id = p_payment_id and status = 'pending';
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

comment on function public.release_pending_seasonal_purchase is
  'Quita el registro de un pago en proceso que se rechazó o caducó. No toca compras aprobadas. Solo service_role.';

-- La entrega ahora también convierte en aprobada la fila de un pago que estaba pendiente.
create or replace function public.deliver_seasonal_purchase(
  p_user_id uuid,
  p_loteria_id uuid,
  p_amount_cents integer,
  p_payment_provider text,
  p_payment_id text,
  p_payment_metadata jsonb default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
begin
  if p_payment_id is null or p_payment_id = '' then
    raise exception 'p_payment_id is required';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'p_amount_cents must be positive';
  end if;

  select id, status into v_id, v_status from public.seasonal_purchases
   where payment_provider = p_payment_provider and payment_id = p_payment_id
   for update;

  if found and v_status <> 'pending' then
    return v_status;
  end if;

  if found then
    -- El pago estaba en proceso: la misma fila pasa a aprobada (o a repetida si ya tenía la lotería).
    begin
      update public.seasonal_purchases sp
         set status = case when exists (
               select 1 from public.seasonal_purchases o
                where o.user_id = sp.user_id and o.loteria_id = sp.loteria_id and o.status = 'approved'
             ) then 'repeated' else 'approved' end,
             amount_cents = p_amount_cents,
             payment_metadata = coalesce(p_payment_metadata, sp.payment_metadata)
       where sp.id = v_id
      returning sp.status into v_status;
      return v_status;
    exception when unique_violation then
      -- Otro pago de la misma cuenta y lotería se aprobó a la vez: este queda como repetido.
      update public.seasonal_purchases
         set status = 'repeated', amount_cents = p_amount_cents,
             payment_metadata = coalesce(p_payment_metadata, payment_metadata)
       where id = v_id;
      return 'repeated';
    end;
  end if;

  begin
    insert into public.seasonal_purchases (
      user_id, loteria_id, amount_cents, payment_provider, payment_id, status, payment_metadata
    )
    values (
      p_user_id, p_loteria_id, p_amount_cents, p_payment_provider, p_payment_id,
      case when exists (
        select 1 from public.seasonal_purchases
         where user_id = p_user_id and loteria_id = p_loteria_id and status = 'approved'
      ) then 'repeated' else 'approved' end,
      p_payment_metadata
    )
    returning status into v_status;
    return v_status;
  exception when unique_violation then
    -- Dos llamadas a la vez: los índices únicos deciden quién gana; se resuelve abajo.
    null;
  end;

  -- Perdió por el mismo pago: se devuelve lo que ya quedó registrado.
  select status into v_status from public.seasonal_purchases
   where payment_provider = p_payment_provider and payment_id = p_payment_id;
  if found then
    return v_status;
  end if;

  -- Perdió contra otro pago de la misma cuenta y lotería: este queda como repetido.
  insert into public.seasonal_purchases (
    user_id, loteria_id, amount_cents, payment_provider, payment_id, status, payment_metadata
  )
  values (
    p_user_id, p_loteria_id, p_amount_cents, p_payment_provider, p_payment_id, 'repeated', p_payment_metadata
  )
  on conflict (payment_provider, payment_id) do nothing;

  select status into v_status from public.seasonal_purchases
   where payment_provider = p_payment_provider and payment_id = p_payment_id;
  return v_status;
end;
$$;

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto:
-- revocar de public no basta, hay que revocarlos por nombre.
revoke all on function public.record_pending_seasonal_purchase(uuid, uuid, integer, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_pending_seasonal_purchase(uuid, uuid, integer, text, text, jsonb)
  to service_role;

revoke all on function public.release_pending_seasonal_purchase(text, text)
  from public, anon, authenticated;
grant execute on function public.release_pending_seasonal_purchase(text, text)
  to service_role;

revoke all on function public.deliver_seasonal_purchase(uuid, uuid, integer, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.deliver_seasonal_purchase(uuid, uuid, integer, text, text, jsonb)
  to service_role;
