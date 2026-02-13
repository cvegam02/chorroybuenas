-- Migración: Fase 4 — Precios, packs, promociones, compras y tipo de cambio
-- Incluye tablas para tokens, datos iniciales, exchange_rates y RPC para webhook.

-- ---------------------------------------------------------------------------
-- 1. token_pricing (precio por token por moneda)
-- ---------------------------------------------------------------------------
create table if not exists public.token_pricing (
  id uuid default gen_random_uuid() primary key,
  price_per_token_cents integer not null check (price_per_token_cents >= 0),
  currency text not null default 'MXN',
  updated_at timestamptz default now() not null,
  unique (currency)
);

alter table public.token_pricing enable row level security;

-- Lectura para todos (autenticados y anónimos) para mostrar precios en la página de compra
drop policy if exists "Anyone can read token_pricing" on public.token_pricing;
create policy "Anyone can read token_pricing" on public.token_pricing
  for select using (true);

-- ---------------------------------------------------------------------------
-- 2. token_packs (packs disponibles: base + bono, precio)
-- ---------------------------------------------------------------------------
create table if not exists public.token_packs (
  id uuid default gen_random_uuid() primary key,
  base_tokens integer not null check (base_tokens > 0),
  bonus_tokens integer not null check (bonus_tokens >= 0),
  price_cents integer not null check (price_cents >= 0),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  unique (base_tokens, bonus_tokens)
);

alter table public.token_packs enable row level security;

drop policy if exists "Anyone can read active token_packs" on public.token_packs;
create policy "Anyone can read active token_packs" on public.token_packs
  for select using (true);

create index if not exists token_packs_sort_active_idx on public.token_packs (sort_order, is_active);

-- ---------------------------------------------------------------------------
-- 3. promotions (códigos y promos del sistema, ej. primera compra +20%)
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid default gen_random_uuid() primary key,
  code text unique,
  type text not null,
  config jsonb not null default '{}',
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz default now() not null
);

alter table public.promotions enable row level security;

-- Solo lectura para lógica de precios; escritura solo backend/admin
drop policy if exists "Anyone can read active promotions" on public.promotions;
create policy "Anyone can read active promotions" on public.promotions
  for select using (true);

-- ---------------------------------------------------------------------------
-- 4. token_purchases (registro de cada compra para admin y auditoría)
-- ---------------------------------------------------------------------------
create table if not exists public.token_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  pack_id uuid references public.token_packs,
  base_tokens integer not null,
  bonus_tokens integer not null,
  total_tokens integer not null,
  amount_cents integer not null,
  promotion_ids uuid[],
  payment_provider text not null,
  payment_id text,
  payment_status text,
  payment_metadata jsonb,
  created_at timestamptz default now() not null
);

alter table public.token_purchases enable row level security;

create index if not exists token_purchases_user_id_idx on public.token_purchases (user_id);
create index if not exists token_purchases_created_at_idx on public.token_purchases (created_at desc);

-- Usuario solo puede leer sus propias compras
drop policy if exists "Users can read own token_purchases" on public.token_purchases;
create policy "Users can read own token_purchases" on public.token_purchases
  for select using (auth.uid() = user_id);

-- Inserts solo vía RPC (service role / DEFINER); no policy INSERT para authenticated

-- ---------------------------------------------------------------------------
-- 5. exchange_rates (tipo de cambio diario MXN→USD para mostrar referencia)
-- ---------------------------------------------------------------------------
create table if not exists public.exchange_rates (
  id uuid default gen_random_uuid() primary key,
  from_currency text not null,
  to_currency text not null,
  rate numeric not null check (rate > 0),
  updated_at timestamptz default now() not null,
  unique (from_currency, to_currency)
);

alter table public.exchange_rates enable row level security;

drop policy if exists "Anyone can read exchange_rates" on public.exchange_rates;
create policy "Anyone can read exchange_rates" on public.exchange_rates
  for select using (true);

-- Escritura vía cron/GitHub Actions con service role o función dedicada

-- ---------------------------------------------------------------------------
-- 6. Datos iniciales (idempotentes: se pueden ejecutar varias veces)
-- ---------------------------------------------------------------------------
insert into public.token_pricing (price_per_token_cents, currency)
values (200, 'MXN')
on conflict (currency) do update set
  price_per_token_cents = excluded.price_per_token_cents,
  updated_at = now();

-- price_cents = solo lo que se cobra (base_tokens × precio por token); bonus_tokens son gratis
insert into public.token_packs (base_tokens, bonus_tokens, price_cents, sort_order, is_active)
values
  (10, 2,  2000, 1, true),
  (20, 5,  4000, 2, true),
  (50, 20, 10000, 3, true)
on conflict (base_tokens, bonus_tokens) do update set
  price_cents = excluded.price_cents,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.promotions (code, type, config, is_active)
values ('FIRST_PURCHASE', 'first_purchase', '{"percent": 20}', true)
on conflict (code) do update set
  type = excluded.type,
  config = excluded.config,
  is_active = excluded.is_active;

-- Tipo de cambio inicial (ej. ~0.058 MXN→USD); se actualizará diariamente
insert into public.exchange_rates (from_currency, to_currency, rate)
values ('MXN', 'USD', 0.058)
on conflict (from_currency, to_currency) do update set rate = excluded.rate, updated_at = now();

-- ---------------------------------------------------------------------------
-- 7. RPC: añadir tokens tras compra (llamada desde webhook Edge Function)
-- Usa SECURITY DEFINER para poder escribir en user_tokens y token_purchases.
-- Solo debe ser invocada por la Edge Function con service role.
-- ---------------------------------------------------------------------------
create or replace function public.add_tokens_after_purchase(
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
  p_payment_metadata jsonb default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_tokens_to_add <= 0 then
    raise exception 'p_tokens_to_add must be positive';
  end if;

  insert into public.user_tokens (user_id, balance, updated_at)
  values (p_user_id, p_tokens_to_add, now())
  on conflict (user_id) do update set
    balance = public.user_tokens.balance + p_tokens_to_add,
    updated_at = now();

  select balance into new_balance from public.user_tokens where user_id = p_user_id;

  insert into public.token_purchases (
    user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents,
    payment_provider, payment_id, payment_status, payment_metadata
  )
  values (
    p_user_id, p_pack_id, p_base_tokens, p_bonus_tokens, p_total_tokens, p_amount_cents,
    p_payment_provider, p_payment_id, p_payment_status, p_payment_metadata
  );

  return new_balance;
end;
$$;

comment on function public.add_tokens_after_purchase is 'Called by Edge Function webhook after payment approval. Do not call from frontend.';

-- Grant: solo service_role puede ejecutar (Edge Function con clave service_role)
revoke all on function public.add_tokens_after_purchase(uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb) from public;
grant execute on function public.add_tokens_after_purchase(uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb) to service_role;
