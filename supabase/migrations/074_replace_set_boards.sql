-- Tableros sin pérdidas y con tope (FEAT-58, US A10; H7 y H8).
--   · Regenerar los tableros de una lotería los reemplaza en una sola transacción: si algo falla, se quedan los de
--     antes (antes se borraban primero y se guardaban uno por uno, con dos peticiones por tablero).
--   · Decisión 4 (reabre la regla DEFINIDA de §4 del 2026-10-06): como máximo 200 tableros por lotería.

-- ---------------------------------------------------------------------------
-- 1. Tope: la base lo exige aunque se inserte directo.
-- ---------------------------------------------------------------------------
create or replace function public.check_boards_per_set()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.set_id is not null
     and (select count(*) from public.boards where set_id = new.set_id) >= 200 then
    raise exception 'BOARD_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists boards_per_set on public.boards;
create trigger boards_per_set
  before insert on public.boards
  for each row execute function public.check_boards_per_set();

-- ---------------------------------------------------------------------------
-- 2. Reemplazar los tableros de una lotería. p_boards: un arreglo de tableros, cada uno el arreglo de ids de sus
--    cartas en orden. Devuelve los ids de los tableros nuevos, en el mismo orden. Lanza SET_NOT_FOUND (no es suya),
--    INVALID_BOARD (tamaño, cartas repetidas o de otra lotería) o BOARD_LIMIT (más de 200).
-- ---------------------------------------------------------------------------
create or replace function public.replace_set_boards(p_set_id uuid, p_grid_size integer, p_boards jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_boards constant integer := 200;
  v_user_id uuid := auth.uid();
  v_board jsonb;
  v_board_id uuid;
  v_ids uuid[] := '{}';
begin
  if v_user_id is null
     or not exists (select 1 from public.loteria_sets where id = p_set_id and user_id = v_user_id) then
    raise exception 'SET_NOT_FOUND';
  end if;
  if p_grid_size not in (9, 16) or jsonb_typeof(p_boards) is distinct from 'array' then
    raise exception 'INVALID_BOARD';
  end if;
  if jsonb_array_length(p_boards) > v_max_boards then
    raise exception 'BOARD_LIMIT';
  end if;

  -- Validar todo antes de tocar nada
  for v_board in select value from jsonb_array_elements(p_boards) loop
    if jsonb_typeof(v_board) is distinct from 'array'
       or jsonb_array_length(v_board) <> p_grid_size
       or (select count(distinct value) from jsonb_array_elements_text(v_board)) <> p_grid_size
       or (select count(*) from public.cards c
           where c.set_id = p_set_id and c.id::text in (select value from jsonb_array_elements_text(v_board)))
          <> p_grid_size then
      raise exception 'INVALID_BOARD';
    end if;
  end loop;

  delete from public.boards where set_id = p_set_id;

  for v_board in select value from jsonb_array_elements(p_boards) loop
    insert into public.boards (user_id, set_id, grid_size)
    values (v_user_id, p_set_id, p_grid_size)
    returning id into v_board_id;
    insert into public.board_cards (board_id, card_id, position)
    select v_board_id, card.value::uuid, (card.ordinality - 1)::smallint
    from jsonb_array_elements_text(v_board) with ordinality as card(value, ordinality);
    v_ids := v_ids || v_board_id;
  end loop;

  return v_ids;
end;
$$;

comment on function public.replace_set_boards is
  'FEAT-58: reemplaza los tableros de una lotería del usuario en una sola transacción (máximo 200). Lanza SET_NOT_FOUND, INVALID_BOARD o BOARD_LIMIT.';

revoke all on function public.replace_set_boards(uuid, integer, jsonb) from public, anon;
grant execute on function public.replace_set_boards(uuid, integer, jsonb) to authenticated;
