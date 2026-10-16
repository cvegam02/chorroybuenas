-- Ofertas con descuento (FEAT-49, US A1; contexto-negocio.md §8 y §9).
-- Una oferta descuenta un porcentaje del precio de la cantidad libre y de todos los packs entre sus
-- fechas. Solo una vigente a la vez: dos ofertas no canceladas no pueden cruzarse en fechas.
-- El precio con descuento lo calcula create-payment-preference; la compra guarda la oferta que tuvo.
-- Orden de despliegue: esta migración antes que las edge functions que mandan p_offer_id.

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  discount_percent integer not null check (discount_percent between 1 and 99),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_dates_check check (ends_at > starts_at),
  constraint offers_no_overlap exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (cancelled_at is null)
);

comment on table public.offers is
  'FEAT-49: descuento con fechas en el precio de los tokens. El nombre es interno (no se muestra al cliente).';

alter table public.offers enable row level security;

-- Solo administradores leen y escriben la tabla. Nadie la borra: una oferta se cancela.
drop policy if exists "Admins read offers" on public.offers;
create policy "Admins read offers" on public.offers
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins insert offers" on public.offers;
create policy "Admins insert offers" on public.offers
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update offers" on public.offers;
create policy "Admins update offers" on public.offers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.offers from anon;
grant select, insert, update on public.offers to authenticated;
grant all on public.offers to service_role;

-- La oferta vigente, para la pantalla de compra y el banner (con o sin sesión), sin el nombre interno.
create or replace function public.current_offer()
returns table (id uuid, discount_percent integer, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.discount_percent, o.starts_at, o.ends_at
  from public.offers o
  where o.cancelled_at is null
    and o.starts_at <= now()
    and o.ends_at > now()
  order by o.starts_at
  limit 1;
$$;

comment on function public.current_offer() is
  'FEAT-49: la oferta vigente (si hay), sin su nombre interno. La lee cualquiera.';

revoke all on function public.current_offer() from public;
grant execute on function public.current_offer() to anon, authenticated, service_role;

-- La compra guarda la oferta que tuvo y su descuento (el de ese momento).
alter table public.token_purchases
  add column if not exists offer_id uuid references public.offers (id) on delete set null,
  add column if not exists offer_percent integer check (offer_percent between 1 and 99);

create index if not exists token_purchases_offer_id_idx
  on public.token_purchases (offer_id) where offer_id is not null;

drop function if exists public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb, uuid[]);

create function public.add_tokens_after_purchase(
  p_user_id uuid,
  p_tokens_to_add integer,
  p_pack_id uuid,
  p_base_tokens integer,
  p_bonus_tokens integer,
  p_total_tokens integer,
  p_amount_cents integer,
  p_payment_provider text,
  p_payment_id text,
  p_payment_status text,
  p_payment_metadata jsonb default null,
  p_promotion_ids uuid[] default null,
  p_offer_id uuid default null,
  p_offer_percent integer default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_balance integer;
begin
  if p_tokens_to_add is null or p_tokens_to_add <= 0 then
    raise exception 'p_tokens_to_add must be positive';
  end if;
  if p_payment_id is null or p_payment_id = '' then
    raise exception 'p_payment_id is required';
  end if;

  -- Primero la compra: el índice único decide quién gana si llegan dos llamadas a la vez.
  insert into public.token_purchases (
    user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents,
    promotion_ids, payment_provider, payment_id, payment_status, payment_metadata,
    offer_id, offer_percent
  )
  values (
    p_user_id, p_pack_id, p_base_tokens, p_bonus_tokens, p_total_tokens, p_amount_cents,
    p_promotion_ids, p_payment_provider, p_payment_id, p_payment_status, p_payment_metadata,
    p_offer_id, p_offer_percent
  )
  on conflict (payment_provider, payment_id) where payment_id is not null do nothing
  returning id into v_purchase_id;

  if v_purchase_id is null then
    select balance into v_balance from public.user_tokens where user_id = p_user_id;
    return coalesce(v_balance, 0);
  end if;

  insert into public.user_tokens (user_id, balance, updated_at)
  values (p_user_id, p_tokens_to_add, now())
  on conflict (user_id) do update set
    balance = public.user_tokens.balance + excluded.balance,
    updated_at = now()
  returning balance into v_balance;

  return v_balance;
end;
$$;

comment on function public.add_tokens_after_purchase is
  'Acredita una compra de forma idempotente por (payment_provider, payment_id), con su oferta si tuvo. Solo service_role.';

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto:
-- revocar de public no basta, hay que revocarlos por nombre.
revoke all on function public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb, uuid[], uuid, integer)
  from public, anon, authenticated;
grant execute on function public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb, uuid[], uuid, integer)
  to service_role;
