-- Loterías de temporada (FEAT-17, decisión 27): publicar exige también el número de cartas y de
-- tableros, porque el catálogo los muestra en cada tarjeta. Amplía la regla de la migración 029.

create or replace function public.seasonal_loteria_require_complete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.is_published then
    return new;
  end if;

  if new.description_es is null or btrim(new.description_es) = ''
     or new.card_count is null
     or new.board_count is null
     or new.price_cents is null
     or new.cover_path is null or btrim(new.cover_path) = ''
     or not exists (select 1 from public.seasonal_loteria_files f where f.loteria_id = new.id)
  then
    raise exception
      'Una lotería de temporada publicada necesita descripción, número de cartas y de tableros, precio, PDF y portada'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.seasonal_loteria_require_complete() from public, anon, authenticated;
