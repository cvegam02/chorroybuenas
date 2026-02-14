# Cómo ejecutar las migraciones de Supabase

Las migraciones están en `supabase/migrations/`. El CLI de Supabase usa esta carpeta estándar.

## Orden de migraciones

| Archivo | Propósito |
|---------|-----------|
| **000_baseline_core_tables.sql** | Tablas base: `loteria_sets`, `cards`, `boards`, `board_cards`, `user_tokens`, RLS e índices. **Debe ejecutarse primero** en una DB nueva. |
| 001–020 | Migraciones incrementales (añaden columnas, tablas auxiliares, RPC, etc.). Son idempotentes. |
| **021_storage_card_images.sql** | Storage: bucket `card-images` (privado) y políticas RLS para que cada usuario acceda solo a sus imágenes. Ver `docs/SUPABASE_STORAGE.md`. |

Si la migración 002 falla con `relation "public.cards" does not exist`, significa que la base de datos no tiene las tablas base. Ejecuta primero `000_baseline_core_tables.sql` (o todo el `db push` desde cero).

## Ejecutar migraciones en un proyecto remoto

### 1. Vincular al proyecto

Primero vincula tu proyecto de Supabase (solo la primera vez o al cambiar de proyecto):

```bash
npx supabase link --project-ref <REF_DEL_PROYECTO>
```

El `REF` lo encuentras en el Dashboard de Supabase → Settings → General → Reference ID (ej: `vjglrfofyzvyvaetakpu`).

### 2. Aplicar migraciones

```bash
npx supabase db push
```

O usando el script de npm:

```bash
npm run db:push
```

Esto aplicará todas las migraciones pendientes al proyecto vinculado.

**Nota:** Si tu base de datos ya fue creada manualmente (sin usar `db push` antes), algunas migraciones podrían fallar con errores como "table already exists". En ese caso, usa el SQL Editor del Dashboard para ejecutar solo las migraciones que falten, o considera marcar como aplicadas las que ya existen (avanzado).

### Si 002 falló con "relation public.cards does not exist"

Significa que faltan las tablas base. Opciones:

1. **Proyecto nuevo / DB vacía:** Ejecuta `npx supabase db push`. La migración 000 creará todas las tablas base antes de las demás.
2. **DB con datos parciales (001 aplicada, 002 falló):** Copia el contenido de `000_baseline_core_tables.sql` en el SQL Editor y ejecútalo. Usa `create table if not exists`, así que no borrará datos existentes. Luego ejecuta `db push` de nuevo.

---

## Proyectos DEV y PROD

Si tienes dos proyectos (desarrollo y producción):

```bash
# Aplicar a DEV
npx supabase link --project-ref <REF_DEV>
npx supabase db push

# Aplicar a PROD
npx supabase link --project-ref <REF_PROD>
npx supabase db push
```

---

## Alternativa: SQL Editor del Dashboard

Si prefieres ejecutar manualmente o `db push` da problemas:

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **SQL Editor** → New query
3. Copia y pega el contenido de cada archivo en `supabase/migrations/` **en orden** (001, 002, 003, …)
4. Ejecuta cada uno

---

## Carpeta de migraciones

- **`supabase/migrations/`** – Es la que usa el CLI (`db push`, `db reset`). Todas las migraciones deben estar aquí.

---

## Crear una nueva migración

```bash
npx supabase migration new nombre_descriptivo
```

Esto crea un archivo en `supabase/migrations/` con timestamp. Edítalo y luego:

```bash
npx supabase db push
```
