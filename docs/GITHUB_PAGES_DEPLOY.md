# Deploy a GitHub Pages con variables de entorno

La app usa variables `VITE_*` que Vite embebe en el build. En GitHub Actions esas variables no existen, por lo que debes configurarlas como **GitHub Secrets**.

---

## 1. Crear los secrets en GitHub

1. Abre tu repositorio en GitHub.
2. **Settings** → **Secrets and variables** → **Actions**.
3. **New repository secret** y crea:

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (producción) | `https://vjglrfofyzvyvaetakpu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública del proyecto | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_APP_URL` | URL pública de tu app en GitHub Pages | Ver abajo |

### VITE_APP_URL: ¿ qué valor usar?

- **GitHub Pages proyecto** (ej. `usuario.github.io/loteria-personalizada`):  
  `https://<usuario>.github.io/<nombre-repo>/`
- **GitHub Pages usuario** (ej. `usuario.github.io`):  
  `https://<usuario>.github.io`
- **Dominio propio** (ej. `chorroybuenas.com.mx`):  
  `https://chorroybuenas.com.mx`

---

## 2. Opcional: VITE_REPLICATE_USE_FLUX

Si quieres que la transformación con IA use primero el modelo FLUX (preferencia de estilo):

- Secret: `VITE_REPLICATE_USE_FLUX`  
- Valor: `true`

Si no lo creas, no pasa nada (la app usa el valor por defecto).

---

## 3. Base URL para subcarpeta (si aplica)

Si tu app se sirve en una subcarpeta (ej. `usuario.github.io/loteria-personalizada/`), Vite necesita el `base` correcto.

En `vite.config.ts`:

```ts
base: '/loteria-personalizada/',  // nombre de tu repo
```

Si la app está en la raíz (usuario.github.io o dominio propio), deja `base: '/'`.

---

## 4. Flujo de deploy

1. Haces push a `main` (o ejecutas el workflow manualmente).
2. GitHub Actions ejecuta el workflow `.github/workflows/deploy.yml`.
3. El paso **Build** usa los secrets como variables de entorno.
4. Vite embebe `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_APP_URL` en el JavaScript del build.
5. El artifact se sube y GitHub Pages lo publica.

---

## 5. Verificación

Tras el deploy:

1. Abre la URL de tu app en GitHub Pages.
2. Inicia sesión con Supabase.
3. Si falla "Invalid API key" o errores de conexión, revisa que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` sean del proyecto correcto (producción).

---

## 6. Seguridad

- **VITE_SUPABASE_ANON_KEY** es la clave "anon/public" de Supabase: está pensada para el frontend. Las RLS protegen los datos.
- **NUNCA** pongas `service_role` ni tokens de Mercado Pago / Replicate en variables VITE. Esos van en Supabase Secrets (Edge Functions).
- Los secrets de GitHub no se muestran en los logs; solo se usan en el build.
