-- Dónde va el logo en los tableros de una lotería (FEAT-67, US A4): a la izquierda, al centro o a la
-- derecha. Las que ya existen quedan al centro, como se veían. «TABLERO N» siempre va centrado.
-- La dueña lo cambia con la regla de acceso que ya tiene la tabla.
alter table public.loteria_sets
  add column if not exists board_logo_position text not null default 'center';

alter table public.loteria_sets
  drop constraint if exists loteria_sets_board_logo_position_check;
alter table public.loteria_sets
  add constraint loteria_sets_board_logo_position_check check (board_logo_position in ('left', 'center', 'right'));
