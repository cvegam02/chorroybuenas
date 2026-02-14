# Storage en Supabase: bucket de imágenes de cartas

La app usa **Supabase Storage** para guardar las imágenes de las cartas cuando el usuario está logueado. El bucket es **privado**: solo quien tiene sesión puede ver las imágenes (mediante URLs firmadas). Los invitados guardan imágenes en IndexedDB.

---

## 1. Bucket `card-images`

- **Nombre:** `card-images` (debe coincidir exactamente).
- **Uso en código:** `CardRepository` en `src/repositories/CardRepository.ts` (`BUCKET_NAME = 'card-images'`). Las rutas son `userId/cardId_timestamp.png` (y `_orig` para la imagen original antes de IA).

### Opción A: Migración automática (recomendado)

La migración `supabase/migrations/021_storage_card_images.sql` crea el bucket y las políticas RLS al ejecutar:

```bash
npx supabase db push
```

Aplica a proyectos DEV y PROD cuando vinculas el proyecto correspondiente.

### Opción B: Crear manualmente en el Dashboard

Si la migración falla (p. ej. el esquema `storage` no permite INSERT en `storage.buckets`):

1. [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. **Storage** → **New bucket**.
3. **Name:** `card-images`.
4. **Public bucket:** desactivado (privado).
5. **File size limit:** 5MB (opcional).
6. **Allowed MIME types:** image/png, image/jpeg, image/jpg, image/webp (opcional).
7. Guardar.

Luego ejecuta las políticas de la sección 2 (o aplica solo la migración 021 si el bucket ya existe; las políticas se crearán igual).

---

## 2. Políticas RLS de Storage

Sin políticas, los usuarios no pueden subir ni leer. Hay que crear políticas sobre `storage.objects` para que cada usuario solo acceda a su carpeta (`userId/...`).

### Opción A: SQL Editor

En **SQL Editor** ejecuta:

```sql
-- Lectura: solo los archivos de tu carpeta (userId = auth.uid())
CREATE POLICY "Users can read own card images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'card-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Subida: solo en tu carpeta
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'card-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Borrado: solo tus archivos
CREATE POLICY "Users can delete own card images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'card-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Opción B: Desde la UI

En **Storage** → bucket **card-images** → **Policies** → **New policy**, crea tres políticas:

- **SELECT** (Read): expresión `bucket_id = 'card-images' AND (storage.foldername(name))[1] = auth.uid()::text`, rol `authenticated`.
- **INSERT**: misma expresión en WITH CHECK, rol `authenticated`.
- **DELETE**: misma expresión en USING, rol `authenticated`.

---

## 3. Signed URLs en código (no URLs públicas)

Para no exponer URLs permanentes, la app **no** usa `getPublicUrl`. En su lugar:

- **`CardRepository.getImageUrl(path)`** es **async** y llama a `createSignedUrl(path, 3600)` (1 hora de validez).
- Solo con sesión activa se generan esas URLs; sin sesión no se puede obtener enlace a la imagen.

Archivos donde se usa:

- `CardRepository.getCards()`: al mapear cada carta, `await this.getImageUrl(dbCard.image_path)`.
- `BoardRepository.getBoards()`: al mapear cartas de cada tablero, `await CardRepository.getImageUrl(bc.cards.image_path)`.
- `useCards.updateCard()`: tras subir una nueva imagen, se obtiene la signed URL para actualizar el estado.

Constante de expiración: `SIGNED_URL_EXPIRY_SEC = 3600` en `CardRepository.ts`.

---

## 4. Auth: Site URL y Redirect URLs

Para que el login y los callbacks funcionen en tu dominio:

- **Authentication** → **URL Configuration**: **Site URL** = la URL de tu app (ej. `https://chorroybuenas.com.mx` o `http://localhost:5173` en desarrollo).
- **Redirect URLs**: añade las URLs a las que Supabase puede redirigir tras login (tu dominio y, en desarrollo, `http://localhost:*`).

Si usas dominio personalizado para la pantalla de login (p. ej. Google), ver **docs/OAUTH_DOMINIO_PERSONALIZADO.md**.

---

## Verificación

Tras crear el bucket y las políticas:

1. Usuario logueado sube una carta con imagen → la imagen debe guardarse en `card-images/<user_id>/...`.
2. La lista de cartas y los tableros muestran las imágenes (signed URLs).
3. Generar PDF con tableros que usan esas cartas → las imágenes deben verse en el PDF.
