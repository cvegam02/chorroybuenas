-- 1. Create Tables First (loteria_sets antes de cards/boards por la FK set_id)
-- Loterías (sets): cada usuario puede tener varias (ej. "Fiesta", "Boda")
create table public.loteria_sets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

create table public.cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  set_id uuid references public.loteria_sets(id) on delete cascade,
  title text not null,
  image_path text, -- Path in Supabase Storage
  original_image_path text, -- Path in Supabase Storage (for revert)
  is_ai_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  set_id uuid references public.loteria_sets(id) on delete cascade,
  grid_size smallint not null default 16,
  created_at timestamptz default now()
);

create table public.board_cards (
  board_id uuid references public.boards on delete cascade not null,
  card_id uuid references public.cards on delete restrict not null,
  position smallint not null,
  primary key (board_id, card_id)
);

create table public.user_tokens (
  user_id uuid references auth.users primary key,
  balance integer default 0 not null,
  updated_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.cards enable row level security;
alter table public.boards enable row level security;
alter table public.board_cards enable row level security;
alter table public.loteria_sets enable row level security;
alter table public.user_tokens enable row level security;

-- 3. Create Indexes
create index loteria_sets_user_id_idx on public.loteria_sets (user_id);
create index cards_title_idx on public.cards (title);
create index cards_user_id_idx on public.cards (user_id);
create index cards_set_id_idx on public.cards (set_id);
create index boards_set_id_idx on public.boards (set_id);

-- 4. Create Policies (Users manage their own data; cards/boards también por set)
create policy "Users can manage their own cards" on public.cards
  for all
  using (
    auth.uid() = user_id
    and (set_id is null or exists (select 1 from public.loteria_sets s where s.id = cards.set_id and s.user_id = auth.uid()))
  )
  with check (
    auth.uid() = user_id
    and (set_id is null or exists (select 1 from public.loteria_sets s where s.id = cards.set_id and s.user_id = auth.uid()))
  );

create policy "Users can manage their own boards" on public.boards
  for all
  using (
    auth.uid() = user_id
    and (set_id is null or exists (select 1 from public.loteria_sets s where s.id = boards.set_id and s.user_id = auth.uid()))
  )
  with check (
    auth.uid() = user_id
    and (set_id is null or exists (select 1 from public.loteria_sets s where s.id = boards.set_id and s.user_id = auth.uid()))
  );

create policy "Users can manage board cards" on public.board_cards
  for all using (
    exists (
      select 1 from public.boards 
      where id = board_id and user_id = auth.uid()
    )
  );

create policy "Users can manage their own sets" on public.loteria_sets
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can see their own tokens" on public.user_tokens
  for select using (auth.uid() = user_id);

-- Service role policy (Internal use)
create policy "Service role can manage tokens" on public.user_tokens
  for all using (true) with check (true);
