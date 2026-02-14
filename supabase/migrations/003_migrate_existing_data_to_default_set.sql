-- Migración 1.7: asignar cartas y tableros existentes a un set por defecto por usuario
-- Ejecutar después de 001 y 002. Es idempotente: se puede ejecutar más de una vez.

-- 1. Crear un set "Mi primera lotería" por cada usuario que tenga cards o boards con set_id null
--    (solo si ese usuario aún no tiene un set con ese nombre)
INSERT INTO public.loteria_sets (user_id, name)
SELECT DISTINCT u.user_id, 'Mi primera lotería'
FROM (
  SELECT user_id FROM public.cards WHERE set_id IS NULL
  UNION
  SELECT user_id FROM public.boards WHERE set_id IS NULL
) u
WHERE NOT EXISTS (
  SELECT 1 FROM public.loteria_sets ls
  WHERE ls.user_id = u.user_id AND ls.name = 'Mi primera lotería'
);

-- 2. Asignar ese set a todas las cards con set_id null
UPDATE public.cards c
SET set_id = (
  SELECT id FROM public.loteria_sets ls
  WHERE ls.user_id = c.user_id AND ls.name = 'Mi primera lotería'
  ORDER BY created_at
  LIMIT 1
)
WHERE c.set_id IS NULL;

-- 3. Asignar ese set a todos los boards con set_id null
UPDATE public.boards b
SET set_id = (
  SELECT id FROM public.loteria_sets ls
  WHERE ls.user_id = b.user_id AND ls.name = 'Mi primera lotería'
  ORDER BY created_at
  LIMIT 1
)
WHERE b.set_id IS NULL;

-- Opcional: cuando ya no queden nulls, descomentar para exigir set_id NOT NULL:
-- ALTER TABLE public.cards ALTER COLUMN set_id SET NOT NULL;
-- ALTER TABLE public.boards ALTER COLUMN set_id SET NOT NULL;
