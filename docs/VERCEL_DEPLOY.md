# Despliegue en Vercel

El frontend se despliega en Vercel. Cada entorno de Vercel apunta a un proyecto distinto de Supabase:

| Entorno de Vercel | Cuándo se usa | Proyecto Supabase | Dominio |
|---|---|---|---|
| **Production** | Push o merge a `main` | PROD | `chorroybuenas.com.mx` |
| **Preview** | Push a la rama `dev` | DEV | `dev.chorroybuenas.com.mx` |
| **Preview** | Cualquier otra rama o PR | DEV | URL generada por Vercel (ver "Límites") |

Vercel solo construye y publica el frontend. Las migraciones y las Edge Functions se siguen desplegando a Supabase con su CLI: ver `docs/ENTORNOS_DEV_PROD.md`, sección 10.

---

## 1. Crear el proyecto (una sola vez)

1. En https://vercel.com/new, importar el repositorio `cvegam02/chorroybuenas`.
2. Vercel detecta Vite. No hay que cambiar nada: `vercel.json` ya define el comando de build (`npm run verify && npm run build`), la carpeta de salida (`dist`) y la regla que sirve `index.html` en cualquier ruta de la SPA.
3. En **Settings → Git**, dejar `main` como rama de producción.

## 2. Variables de entorno

En **Settings → Environment Variables**. Las variables `VITE_*` se incrustan en el build, así que un cambio requiere volver a desplegar.

| Variable | Production | Preview |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto PROD | URL del proyecto DEV |
| `VITE_SUPABASE_ANON_KEY` | anon key de PROD | anon key de DEV |
| `VITE_APP_URL` | `https://chorroybuenas.com.mx` | **No definir** |
| `VITE_REPLICATE_USE_FLUX` | Opcional | Opcional |

Sin `VITE_APP_URL`, la app usa el dominio desde el que se abrió, que es lo correcto en Preview.

Solo van aquí valores públicos. **Nunca** poner en Vercel la `service_role` key, el token de Mercado Pago ni el de Replicate: esos son secrets de Supabase.

## 3. Dominios

En **Settings → Domains**:

- `chorroybuenas.com.mx` y `www.chorroybuenas.com.mx` → Production.
- `dev.chorroybuenas.com.mx` → asignado a la rama `dev`.

Vercel muestra los registros DNS a crear en GoDaddy. El dominio principal hoy apunta a GitHub Pages: ver la sección 6 antes de cambiarlo.

## 4. Lo que hay que ajustar en Supabase

Cada dominio nuevo debe estar permitido en el proyecto de Supabase que le corresponde.

**Secret `ALLOWED_ORIGINS`** (CORS de las Edge Functions y URL de retorno del pago):

```bash
# DEV
npx supabase secrets set --project-ref <REF-DEV> \
  ALLOWED_ORIGINS=https://dev.chorroybuenas.com.mx,http://localhost:5173

# PROD
npx supabase secrets set --project-ref <REF-PROD> \
  ALLOWED_ORIGINS=https://chorroybuenas.com.mx,https://www.chorroybuenas.com.mx
```

**Authentication → URL Configuration** (para que funcionen Google y el correo de recuperación):

| Proyecto | Site URL | Redirect URLs |
|---|---|---|
| DEV | `https://dev.chorroybuenas.com.mx` | `https://dev.chorroybuenas.com.mx/**`, `http://localhost:5173/**` |
| PROD | `https://chorroybuenas.com.mx` | `https://chorroybuenas.com.mx/**`, `https://www.chorroybuenas.com.mx/**` |

**Webhook de Mercado Pago:** no cambia. Apunta a la Edge Function de Supabase, no al frontend.

## 5. Flujo de trabajo

1. Trabajar en una rama y abrir un PR hacia `dev`. GitHub Actions (`ci.yml`) corre typecheck, lint, tests y los tests de base de datos.
2. Merge a `dev` → Vercel publica en `dev.chorroybuenas.com.mx` contra Supabase DEV. Probar ahí.
3. PR de `dev` a `main` → al hacer merge, Vercel publica en producción.
4. Si el cambio incluye migraciones o Edge Functions, desplegarlas al proyecto de Supabase correspondiente **antes** del merge (`docs/ENTORNOS_DEV_PROD.md`, sección 10).

Si el build falla en Vercel, el sitio publicado no cambia. Para volver a una versión anterior: **Deployments → ⋯ → Promote to Production** (o Instant Rollback).

## 6. Corte desde GitHub Pages

Hacerlo en este orden para que el sitio no se caiga:

1. Crear el proyecto en Vercel y configurar las variables (secciones 1 y 2).
2. Comprobar que el deployment de producción funciona en su URL `*.vercel.app`. Agregar temporalmente esa URL a `ALLOWED_ORIGINS` y a las Redirect URLs de PROD si se quiere probar compras o login ahí.
3. Agregar el dominio en Vercel y cambiar los registros DNS en GoDaddy. Mientras propaga, GitHub Pages sigue sirviendo la versión anterior.
4. Cuando el dominio ya responda desde Vercel: en GitHub → **Settings → Pages**, quitar el dominio personalizado y desactivar Pages.
5. Borrar los secrets `VITE_*` de GitHub → **Settings → Secrets and variables → Actions**: ya no se usan.

## Límites

- **Otras ramas y PR:** sus deployments de Preview usan Supabase DEV, pero su URL cambia en cada rama y no está en `ALLOWED_ORIGINS`, así que ahí no funcionan la compra de tokens ni la IA. Para probar esas funciones, usar `dev.chorroybuenas.com.mx`.
- **Tests de base de datos:** necesitan Docker y no corren en el build de Vercel; los corre GitHub Actions. Para que un PR no se pueda fusionar si fallan, activar la protección de rama en GitHub con el check `verify` como requerido.
