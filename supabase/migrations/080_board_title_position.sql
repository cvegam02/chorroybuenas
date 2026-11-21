-- Dónde va «TABLERO N» en los tableros de una lotería (FEAT-67, US A4): a la izquierda, al centro o a la
-- derecha, aparte de la posición del logo. Las que ya existen quedan al centro, como se veían.
-- La dueña lo cambia con la regla de acceso que ya tiene la tabla.
alter table public.loteria_sets
  add column if not exists board_title_position text not null default 'center';

alter table public.loteria_sets
  drop constraint if exists loteria_sets_board_title_position_check;
alter table public.loteria_sets
  add constraint loteria_sets_board_title_position_check check (board_title_position in ('left', 'center', 'right'));
