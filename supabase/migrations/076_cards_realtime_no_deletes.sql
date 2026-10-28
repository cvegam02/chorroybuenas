-- Avisos en vivo sin borrados (FEAT-58, H21; decisión del 2026-10-27, Carlos: «no hay que mandar ese mensaje»).
-- Realtime no aplica las reglas de acceso a los avisos de borrado: el id de cualquier carta borrada llegaba a todo
-- el que escuchaba. La publicación pasa a mandar solo altas y cambios. Vale para todas sus tablas: en dev solo tiene
-- `cards` (revisado el 2026-10-27); en producción revisarlo antes de aplicar.
-- La base de pruebas local no tiene la publicación de Realtime: ahí no hace nada.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime set (publish = 'insert, update');
  end if;
end;
$$;
