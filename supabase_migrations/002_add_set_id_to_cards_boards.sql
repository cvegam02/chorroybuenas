-- Migración 1.5: añadir set_id a cards y boards (nullable; 1.7 asignará valores)
-- Ejecutar después de 001_add_loteria_sets.sql

-- cards: set_id nullable, FK a loteria_sets
alter table public.cards
  add column if not exists set_id uuid references public.loteria_sets(id) on delete cascade;

-- boards: set_id nullable, FK a loteria_sets
alter table public.boards
  add column if not exists set_id uuid references public.loteria_sets(id) on delete cascade;

-- Índices para filtrar por set
create index if not exists cards_set_id_idx on public.cards (set_id);
create index if not exists boards_set_id_idx on public.boards (set_id);

-- RLS cards: solo filas propias (user_id) y cuyo set_id, si existe, sea un set del usuario
drop policy if exists "Users can manage their own cards" on public.cards;
create policy "Users can manage their own cards" on public.cards
  for all
  using (
    auth.uid() = user_id
    and (
      set_id is null
      or exists (
        select 1 from public.loteria_sets s
        where s.id = cards.set_id and s.user_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      set_id is null
      or exists (
        select 1 from public.loteria_sets s
        where s.id = cards.set_id and s.user_id = auth.uid()
      )
    )
  );

-- RLS boards: igual, solo tableros propios y cuyo set sea del usuario (o set_id null)
drop policy if exists "Users can manage their own boards" on public.boards;
create policy "Users can manage their own boards" on public.boards
  for all
  using (
    auth.uid() = user_id
    and (
      set_id is null
      or exists (
        select 1 from public.loteria_sets s
        where s.id = boards.set_id and s.user_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      set_id is null
      or exists (
        select 1 from public.loteria_sets s
        where s.id = boards.set_id and s.user_id = auth.uid()
      )
    )
  );
