-- Fondo de los tableros de una lotería (FEAT-67, US A1). Guarda el id de un fondo del catálogo; las que ya
-- existen quedan con el crema de siempre. El catálogo fijo vive en el sitio (`src/utils/boardBackgrounds.ts`)
-- y más adelante el administrador podrá agregar fondos (US A3), así que aquí solo se limita la forma del id.
-- La dueña lo cambia con la regla de acceso que ya tiene la tabla.
alter table public.loteria_sets
  add column if not exists board_background text not null default 'crema';

alter table public.loteria_sets
  drop constraint if exists loteria_sets_board_background_check;
alter table public.loteria_sets
  add constraint loteria_sets_board_background_check check (board_background ~ '^[a-z0-9-]{1,40}$');
