-- Loterías colectivas (FEAT-56, US B3): el organizador ve en vivo las fotos que suben sus invitados.
-- Las cartas mandan avisos de Supabase Realtime. Cada quien solo recibe los de las cartas que ya puede leer: el
-- aviso respeta las reglas de acceso de `cards` (el dueño, las suyas; el invitado, las de su lotería colectiva).
-- La base de pruebas local no tiene la publicación de Realtime: ahí no hace nada.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cards'
     ) then
    alter publication supabase_realtime add table public.cards;
  end if;
end;
$$;
