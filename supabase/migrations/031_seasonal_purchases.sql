-- Compras de loterías de temporada (FEAT-17, US C1).
-- Tabla aparte de token_purchases (esa exige cantidades de tokens). Solo el servidor escribe:
-- la entrega pasa por deliver_seasonal_purchase, idempotente por (payment_provider, payment_id).

create table if not exists public.seasonal_purchases (
  id uuid default gen_random_uuid() primary key,
  -- set null: si se borra la cuenta, la venta se conserva en el historial, sin dueño.
  user_id uuid references auth.users (id) on delete set null,
  -- restrict: una lotería con ventas no se puede borrar, solo despublicar.
  loteria_id uuid not null references public.seasonal_loterias (id) on delete restrict,
  -- Lo que se pagó: no cambia aunque después cambie el precio de la lotería.
  amount_cents integer not null check (amount_cents > 0),
  payment_provider text not null default 'mercadopago',
  payment_id text not null check (payment_id <> ''),
  -- repeated: segundo pago aprobado por una lotería que la cuenta ya tenía (se devuelve a mano).
  -- pending y refunded quedan reservados para el pago en efectivo y el reembolso.
  status text not null check (status in ('pending', 'approved', 'repeated', 'refunded')),
  payment_metadata jsonb,
  created_at timestamptz default now() not null
);

comment on table public.seasonal_purchases is
  'Compras de loterías de temporada. Solo escribe el servidor, con deliver_seasonal_purchase.';

create unique index if not exists seasonal_purchases_provider_payment_uidx
  on public.seasonal_purchases (payment_provider, payment_id);

create unique index if not exists seasonal_purchases_owner_uidx
  on public.seasonal_purchases (user_id, loteria_id)
  where status = 'approved';

create index if not exists seasonal_purchases_loteria_id_idx on public.seasonal_purchases (loteria_id);

alter table public.seasonal_purchases enable row level security;

drop policy if exists "Users can read own seasonal_purchases" on public.seasonal_purchases;
create policy "Users can read own seasonal_purchases" on public.seasonal_purchases
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Admins can read seasonal_purchases" on public.seasonal_purchases;
create policy "Admins can read seasonal_purchases" on public.seasonal_purchases
  for select to authenticated using (public.is_admin());

-- Permisos explícitos: nadie escribe desde el navegador, ni siquiera un administrador.
revoke all on table public.seasonal_purchases from public, anon, authenticated;
grant select on table public.seasonal_purchases to authenticated;
grant all on table public.seasonal_purchases to service_role;

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
  v_status text;
begin
  if p_payment_id is null or p_payment_id = '' then
    raise exception 'p_payment_id is required';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'p_amount_cents must be positive';
  end if;

  select status into v_status from public.seasonal_purchases
   where payment_provider = p_payment_provider and payment_id = p_payment_id;
  if found then
    return v_status;
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

comment on function public.deliver_seasonal_purchase is
  'Registra la compra de una lotería de temporada de forma idempotente por (payment_provider, payment_id). Solo service_role.';

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto:
-- revocar de public no basta, hay que revocarlos por nombre.
revoke all on function public.deliver_seasonal_purchase(uuid, uuid, integer, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.deliver_seasonal_purchase(uuid, uuid, integer, text, text, jsonb)
  to service_role;
