-- Loterías de temporada (FEAT-17): no se puede publicar una lotería incompleta.
-- Publicar exige nombre, descripción, precio, PDF y portada. El nombre ya es obligatorio en la ficha.
-- El PDF vive en otra tabla, así que la regla no cabe en un check: va en dos disparadores.

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
     or new.price_cents is null
     or new.cover_path is null or btrim(new.cover_path) = ''
     or not exists (select 1 from public.seasonal_loteria_files f where f.loteria_id = new.id)
  then
    raise exception 'Una lotería de temporada publicada necesita descripción, precio, PDF y portada'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists seasonal_loterias_require_complete on public.seasonal_loterias;
create trigger seasonal_loterias_require_complete
  before insert or update on public.seasonal_loterias
  for each row execute function public.seasonal_loteria_require_complete();

-- Quitarle el PDF a una lotería publicada la dejaría incompleta. Al borrar la lotería entera su
-- ficha ya no existe cuando se borra este registro, así que el borrado en cascada sí pasa.
create or replace function public.seasonal_loteria_files_keep_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.seasonal_loterias l where l.id = old.loteria_id and l.is_published) then
    raise exception 'No se puede quitar el PDF de una lotería de temporada publicada'
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists seasonal_loteria_files_keep_published on public.seasonal_loteria_files;
create trigger seasonal_loteria_files_keep_published
  before delete on public.seasonal_loteria_files
  for each row execute function public.seasonal_loteria_files_keep_published();

-- Son funciones de disparador: nadie las llama directamente.
revoke all on function public.seasonal_loteria_require_complete() from public, anon, authenticated;
revoke all on function public.seasonal_loteria_files_keep_published() from public, anon, authenticated;
