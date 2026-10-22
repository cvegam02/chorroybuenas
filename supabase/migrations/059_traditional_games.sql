-- Juegos de tableros de lotería tradicional guardados en «Mi cuenta» (FEAT-53, US A5;
-- docs/contexto-negocio.md §19). Un usuario puede tener varios. Cada juego guarda su modo y sus tableros tal
-- como los arma la página: una lista de hasta 50 tableros con los números de sus cartas (1 a 54), casillas
-- vacías y cartas fijadas. El contenido de cada tablero lo valida el sitio al leerlo; aquí se limita la forma
-- y el tamaño. Solo la dueña lo ve y lo cambia; sin sesión no hay acceso.

create table if not exists public.traditional_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  grid_size smallint not null check (grid_size in (9, 16)),
  boards jsonb not null default '[]'::jsonb
    check (jsonb_typeof(boards) = 'array' and jsonb_array_length(boards) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.traditional_games is
  'FEAT-53: juegos de tableros de lotería tradicional guardados por cada usuario (§19).';

create index if not exists traditional_games_user_id_idx on public.traditional_games (user_id, updated_at desc);

create or replace function public.touch_traditional_game()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists traditional_games_touch on public.traditional_games;
create trigger traditional_games_touch
  before update on public.traditional_games
  for each row execute function public.touch_traditional_game();

alter table public.traditional_games enable row level security;

drop policy if exists "Users manage their own traditional games" on public.traditional_games;
create policy "Users manage their own traditional games" on public.traditional_games
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.traditional_games from anon, authenticated;
grant select, insert, update, delete on table public.traditional_games to authenticated;
grant all on table public.traditional_games to service_role;
