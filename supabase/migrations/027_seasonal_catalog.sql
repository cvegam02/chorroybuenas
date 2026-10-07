-- Catálogo de loterías de temporada (FEAT-17): temporadas y fichas de lotería.
-- Cualquiera lee las temporadas y las loterías visibles; solo los administradores escriben.
-- El PDF y las compras llegan en migraciones posteriores.

create table if not exists public.seasons (
  id uuid default gen_random_uuid() primary key,
  name_es text not null check (char_length(btrim(name_es)) between 1 and 60),
  name_en text check (name_en is null or char_length(btrim(name_en)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz default now() not null
);

comment on table public.seasons is 'Temporadas del catálogo de loterías de temporada (Halloween, Navidad…).';

create table if not exists public.seasonal_loterias (
  id uuid default gen_random_uuid() primary key,
  -- restrict: una temporada con loterías no se puede borrar.
  season_id uuid not null references public.seasons (id) on delete restrict,
  name_es text not null check (char_length(btrim(name_es)) between 1 and 80),
  name_en text check (name_en is null or char_length(btrim(name_en)) between 1 and 80),
  description_es text check (description_es is null or char_length(description_es) <= 600),
  description_en text check (description_en is null or char_length(description_en) <= 600),
  -- Igual que loteria_sets.grid_size: 9 = Kids 3x3, 16 = Clásico 4x4.
  grid_size smallint not null default 16 check (grid_size in (9, 16)),
  card_count integer check (card_count is null or card_count > 0),
  board_count integer check (board_count is null or board_count > 0),
  -- Mínimo $10.00 MXN. Nulo mientras la lotería es un borrador sin precio.
  price_cents integer check (price_cents is null or price_cents >= 1000),
  is_published boolean not null default false,
  valid_from timestamptz,
  valid_until timestamptz,
  -- Imágenes ya reducidas y con marca de agua (bucket público de vistas previas).
  cover_path text,
  sample_paths text[] not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint seasonal_loterias_valid_range check (
    valid_from is null or valid_until is null or valid_until > valid_from
  )
);

comment on table public.seasonal_loterias is
  'Loterías de temporada: ficha, precio, visibilidad y vista previa. El PDF se guarda aparte.';

create index if not exists seasonal_loterias_season_id_idx on public.seasonal_loterias (season_id);

alter table public.seasons enable row level security;
alter table public.seasonal_loterias enable row level security;

-- Las policies de lectura pública no llaman a is_admin(): un visitante no necesita poder ejecutarla.
drop policy if exists "Anyone can read seasons" on public.seasons;
create policy "Anyone can read seasons" on public.seasons
  for select to anon, authenticated using (true);

drop policy if exists "Admins can insert seasons" on public.seasons;
create policy "Admins can insert seasons" on public.seasons
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update seasons" on public.seasons;
create policy "Admins can update seasons" on public.seasons
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete seasons" on public.seasons;
create policy "Admins can delete seasons" on public.seasons
  for delete to authenticated using (public.is_admin());

-- Visible: publicada, ya empezó (o no tiene inicio) y no ha terminado (o no tiene fin).
drop policy if exists "Anyone can read visible seasonal_loterias" on public.seasonal_loterias;
create policy "Anyone can read visible seasonal_loterias" on public.seasonal_loterias
  for select to anon, authenticated using (
    is_published
    and (valid_from is null or valid_from <= now())
    and (valid_until is null or valid_until > now())
  );

drop policy if exists "Admins can read seasonal_loterias" on public.seasonal_loterias;
create policy "Admins can read seasonal_loterias" on public.seasonal_loterias
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can insert seasonal_loterias" on public.seasonal_loterias;
create policy "Admins can insert seasonal_loterias" on public.seasonal_loterias
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update seasonal_loterias" on public.seasonal_loterias;
create policy "Admins can update seasonal_loterias" on public.seasonal_loterias
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete seasonal_loterias" on public.seasonal_loterias;
create policy "Admins can delete seasonal_loterias" on public.seasonal_loterias
  for delete to authenticated using (public.is_admin());

-- Permisos explícitos: no depender de los privilegios por defecto de cada entorno.
revoke all on table public.seasons, public.seasonal_loterias from public, anon, authenticated;
grant select on table public.seasons, public.seasonal_loterias to anon, authenticated;
grant insert, update, delete on table public.seasons, public.seasonal_loterias to authenticated;
grant all on table public.seasons, public.seasonal_loterias to service_role;
