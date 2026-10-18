-- Cartas generadas con IA en el asistente de loterías temáticas (FEAT-50, US A2). Por lotería: el
-- prompt general y la calidad; la lista de cartas (número, nombre, escena e imagen de entrada); y los
-- intentos de cada carta, con el que se queda. Solo administradores; vive fuera de seasonal_loterias
-- porque esa tabla la lee el público. Todo se borra con la lotería.
-- Los intentos los genera la función generate-seasonal-card con la llave de servicio: el administrador
-- los ve, elige y borra, pero no los registra ni los sube él.

-- ---------------------------------------------------------------------------
-- 1. Espacio privado de los intentos: <lotería>/<carta>/<intento>.<ext>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seasonal-ai', 'seasonal-ai', false, 10485760, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read seasonal ai attempts" on storage.objects;
create policy "Admins can read seasonal ai attempts"
on storage.objects for select
to authenticated
using (bucket_id = 'seasonal-ai' and public.is_admin());

drop policy if exists "Admins can delete seasonal ai attempts" on storage.objects;
create policy "Admins can delete seasonal ai attempts"
on storage.objects for delete
to authenticated
using (bucket_id = 'seasonal-ai' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Ajustes de la generación de cada lotería.
-- ---------------------------------------------------------------------------
create table if not exists public.seasonal_ai_builds (
  loteria_id uuid primary key references public.seasonal_loterias (id) on delete cascade,
  general_prompt text not null default '' check (char_length(general_prompt) <= 4000),
  quality text not null default 'low' check (quality in ('low', 'medium', 'high')),
  -- La carta cuyo intento elegido sirve de referencia de estilo (FEAT-50, decisión 5).
  reference_card_id uuid,
  updated_at timestamptz default now() not null
);

comment on table public.seasonal_ai_builds is
  'FEAT-50: prompt general y calidad de la generación con IA de cada lotería temática. Solo administradores.';

-- ---------------------------------------------------------------------------
-- 3. Las cartas por generar, en su orden.
-- ---------------------------------------------------------------------------
create table if not exists public.seasonal_ai_cards (
  id uuid primary key default gen_random_uuid(),
  loteria_id uuid not null references public.seasonal_ai_builds (loteria_id) on delete cascade,
  position integer not null check (position >= 0),
  number integer not null check (number between 1 and 999),
  name text not null check (char_length(name) between 1 and 80),
  scene text not null default '' check (char_length(scene) <= 2000),
  input_source text not null default 'none' check (input_source in ('base', 'reference', 'none')),
  chosen_attempt_id uuid,
  updated_at timestamptz default now() not null,
  -- La baraja base solo tiene las cartas 1 a 54 (migración 056).
  constraint seasonal_ai_cards_base_number check (input_source <> 'base' or number <= 54),
  constraint seasonal_ai_cards_position_key unique (loteria_id, position) deferrable initially immediate
);

comment on table public.seasonal_ai_cards is
  'FEAT-50: cartas de una lotería temática por generar con IA: número, nombre, escena e imagen de entrada.';

-- ---------------------------------------------------------------------------
-- 4. Los intentos de cada carta.
-- ---------------------------------------------------------------------------
create table if not exists public.seasonal_ai_attempts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.seasonal_ai_cards (id) on delete cascade,
  path text not null,
  quality text not null check (quality in ('low', 'medium', 'high')),
  -- El prompt completo con el que se generó, para saber qué se pidió.
  prompt text not null,
  created_at timestamptz default now() not null
);

create index if not exists seasonal_ai_attempts_card_idx on public.seasonal_ai_attempts (card_id, created_at);

comment on table public.seasonal_ai_attempts is
  'FEAT-50: intentos generados de cada carta. Los registra el servidor; el administrador los ve y los borra.';

alter table public.seasonal_ai_cards drop constraint if exists seasonal_ai_cards_chosen_attempt_fkey;
alter table public.seasonal_ai_cards add constraint seasonal_ai_cards_chosen_attempt_fkey
  foreign key (chosen_attempt_id) references public.seasonal_ai_attempts (id) on delete set null;

alter table public.seasonal_ai_builds drop constraint if exists seasonal_ai_builds_reference_card_fkey;
alter table public.seasonal_ai_builds add constraint seasonal_ai_builds_reference_card_fkey
  foreign key (reference_card_id) references public.seasonal_ai_cards (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. Acceso: administradores; los intentos solo se leen y se borran.
-- ---------------------------------------------------------------------------
alter table public.seasonal_ai_builds enable row level security;
alter table public.seasonal_ai_cards enable row level security;
alter table public.seasonal_ai_attempts enable row level security;

drop policy if exists "Admins manage seasonal_ai_builds" on public.seasonal_ai_builds;
create policy "Admins manage seasonal_ai_builds" on public.seasonal_ai_builds
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage seasonal_ai_cards" on public.seasonal_ai_cards;
create policy "Admins manage seasonal_ai_cards" on public.seasonal_ai_cards
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read seasonal_ai_attempts" on public.seasonal_ai_attempts;
create policy "Admins can read seasonal_ai_attempts" on public.seasonal_ai_attempts
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can delete seasonal_ai_attempts" on public.seasonal_ai_attempts;
create policy "Admins can delete seasonal_ai_attempts" on public.seasonal_ai_attempts
  for delete to authenticated using (public.is_admin());

-- Permisos explícitos: un visitante no tiene ningún acceso.
revoke all on table public.seasonal_ai_builds, public.seasonal_ai_cards, public.seasonal_ai_attempts
  from public, anon, authenticated;
grant select, insert, update, delete on table public.seasonal_ai_builds, public.seasonal_ai_cards to authenticated;
grant select, delete on table public.seasonal_ai_attempts to authenticated;
grant all on table public.seasonal_ai_builds, public.seasonal_ai_cards, public.seasonal_ai_attempts to service_role;
