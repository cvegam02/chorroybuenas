-- Migración: añadir tabla loteria_sets (ejecutar solo si cards/boards ya existen)
-- No modifica tablas existentes.

create table if not exists public.loteria_sets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

alter table public.loteria_sets enable row level security;

create index if not exists loteria_sets_user_id_idx on public.loteria_sets (user_id);

drop policy if exists "Users can manage their own sets" on public.loteria_sets;
create policy "Users can manage their own sets" on public.loteria_sets
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
