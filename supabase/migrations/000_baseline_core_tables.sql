-- =============================================================================
-- Migración 000: Tablas base (cards, boards, board_cards, loteria_sets, user_tokens)
-- Ejecutar PRIMERO en una base de datos nueva. Las migraciones 001+ asumen que
-- estas tablas existen (001 crea loteria_sets que ya está aquí; 002 añade set_id
-- que ya existe; 003 migra datos; todas son idempotentes).
-- =============================================================================

-- 1. loteria_sets (debe existir antes de cards/boards por la FK set_id)
create table if not exists public.loteria_sets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  grid_size smallint not null default 16,
  created_at timestamptz default now()
);

-- 2. cards
create table if not exists public.cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  set_id uuid references public.loteria_sets(id) on delete cascade,
  title text not null,
  image_path text,
  original_image_path text,
  is_ai_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. boards
create table if not exists public.boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  set_id uuid references public.loteria_sets(id) on delete cascade,
  grid_size smallint not null default 16,
  created_at timestamptz default now()
);

-- 4. board_cards (asociación N:N)
create table if not exists public.board_cards (
  board_id uuid references public.boards on delete cascade not null,
  card_id uuid references public.cards on delete restrict not null,
  position smallint not null,
  primary key (board_id, card_id)
);

-- 5. user_tokens (balance de tokens por usuario)
create table if not exists public.user_tokens (
  user_id uuid references auth.users primary key,
  balance integer default 0 not null,
  updated_at timestamptz default now()
);

-- 6. RLS
alter table public.loteria_sets enable row level security;
alter table public.cards enable row level security;
alter table public.boards enable row level security;
alter table public.board_cards enable row level security;
alter table public.user_tokens enable row level security;

-- 7. Índices
create index if not exists loteria_sets_user_id_idx on public.loteria_sets (user_id);
create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_set_id_idx on public.cards (set_id);
create index if not exists cards_title_idx on public.cards (title);
create index if not exists boards_set_id_idx on public.boards (set_id);

-- 8. Políticas RLS
drop policy if exists "Users can manage their own sets" on public.loteria_sets;
create policy "Users can manage their own sets" on public.loteria_sets
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own cards" on public.cards;
create policy "Users can manage their own cards" on public.cards
  for all
  using (
    auth.uid() = user_id
    and (
      set_id is null
      or exists (select 1 from public.loteria_sets s where s.id = cards.set_id and s.user_id = auth.uid())
    )
  )
  with check (
    auth.uid() = user_id
    and (
      set_id is null
      or exists (select 1 from public.loteria_sets s where s.id = cards.set_id and s.user_id = auth.uid())
    )
  );

drop policy if exists "Users can manage their own boards" on public.boards;
create policy "Users can manage their own boards" on public.boards
  for all
  using (
    auth.uid() = user_id
    and (
      set_id is null
      or exists (select 1 from public.loteria_sets s where s.id = boards.set_id and s.user_id = auth.uid())
    )
  )
  with check (
    auth.uid() = user_id
    and (
      set_id is null
      or exists (select 1 from public.loteria_sets s where s.id = boards.set_id and s.user_id = auth.uid())
    )
  );

drop policy if exists "Users can manage board cards" on public.board_cards;
create policy "Users can manage board cards" on public.board_cards
  for all using (
    exists (select 1 from public.boards where id = board_id and user_id = auth.uid())
  );

drop policy if exists "Users can see their own tokens" on public.user_tokens;
create policy "Users can see their own tokens" on public.user_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "Service role can manage tokens" on public.user_tokens;
create policy "Service role can manage tokens" on public.user_tokens
  for all using (auth.jwt()->>'role' = 'service_role') with check (auth.jwt()->>'role' = 'service_role');
