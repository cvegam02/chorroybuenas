-- Políticas RLS para que los admins puedan leer y escribir en tablas del panel de administración.
-- Requiere que exista la función public.is_admin() (migración 010).

-- ---------------------------------------------------------------------------
-- token_purchases: admins pueden leer TODAS las compras
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can read all token_purchases" on public.token_purchases;
create policy "Admins can read all token_purchases" on public.token_purchases
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- token_usage: admins pueden leer TODO el uso de tokens
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can read all token_usage" on public.token_usage;
create policy "Admins can read all token_usage" on public.token_usage
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- user_tokens: admins pueden leer TODOS los balances
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can read all user_tokens" on public.user_tokens;
create policy "Admins can read all user_tokens" on public.user_tokens
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- promotions: admins pueden insertar, actualizar y eliminar
-- (la lectura ya está permitida para todos con "Anyone can read active promotions")
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can insert promotions" on public.promotions;
create policy "Admins can insert promotions" on public.promotions
  for insert with check (public.is_admin());

drop policy if exists "Admins can update promotions" on public.promotions;
create policy "Admins can update promotions" on public.promotions
  for update using (public.is_admin());

drop policy if exists "Admins can delete promotions" on public.promotions;
create policy "Admins can delete promotions" on public.promotions
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- token_packs: admins pueden actualizar (precio, is_active)
-- (la lectura ya está permitida para todos)
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can update token_packs" on public.token_packs;
create policy "Admins can update token_packs" on public.token_packs
  for update using (public.is_admin());

drop policy if exists "Admins can insert token_packs" on public.token_packs;
create policy "Admins can insert token_packs" on public.token_packs
  for insert with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- token_pricing: admins pueden actualizar precios
-- (la lectura ya está permitida para todos)
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can update token_pricing" on public.token_pricing;
create policy "Admins can update token_pricing" on public.token_pricing
  for update using (public.is_admin());
