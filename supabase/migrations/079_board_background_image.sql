-- Imagen propia de fondo de los tableros (FEAT-67, US A2). Una por lotería: la ruta del archivo en
-- `card-images`, dentro de la carpeta de la dueña (las reglas del almacenamiento ya solo la dejan leer y
-- escribir ahí), y si se le pone el velo blanco para que el logo y «TABLERO N» se lean (de entrada, sí).
-- El fondo elegido es la imagen cuando `board_background` vale 'imagen'.
alter table public.loteria_sets
  add column if not exists board_background_image_path text,
  add column if not exists board_background_lighten boolean not null default true;

alter table public.loteria_sets
  drop constraint if exists loteria_sets_board_background_image_path_check;
alter table public.loteria_sets
  add constraint loteria_sets_board_background_image_path_check check (
    board_background_image_path is null
    or board_background_image_path like user_id::text || '/board-bg-%'
  );
