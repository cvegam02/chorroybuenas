# Mostrar chorroybuenas.com.mx en la pantalla de inicio de sesión de Google

Cuando los usuarios inician sesión con Google, ven **"Sign in to continue to vjglrfofyzvyvaetakpu.supabase.co"** porque la URL de callback de OAuth es la de tu proyecto Supabase. Para que aparezca **chorroybuenas.com.mx** (o un subdominio tuyo), hay que usar un **dominio personalizado** para Auth.

## Requisitos

- Proyecto Supabase en un **plan de pago** (Custom Domains es un add-on de pago).
- Acceso al DNS del dominio chorroybuenas.com.mx.

## Pasos

### 1. Configurar dominio personalizado en Supabase

1. Entra al [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto.
2. Ve a **Project Settings** (engranaje) → **Custom Domains** (o **General** > Custom Domains).
3. Si no tienes el add-on, actívalo en **Settings** → **Add-ons** → Custom Domain.
4. Añade un **subdominio** para Auth, por ejemplo:
   - **auth.chorroybuenas.com.mx** (recomendado)
   - o **api.chorroybuenas.com.mx**
5. Supabase te dará:
   - Un **CNAME**: apunta `auth.chorroybuenas.com.mx` a `vjglrfofyzvyvaetakpu.supabase.co`
   - Un **registro TXT** (ej. `_acme-challenge.auth.chorroybuenas.com.mx`) para verificación.
6. Crea esos registros en el DNS de chorroybuenas.com.mx (donde gestiones el dominio).
7. Espera a que Supabase verifique el dominio y active el certificado (puede tardar unos minutos).

Documentación oficial: [Custom Domains – Supabase](https://supabase.com/docs/guides/platform/custom-domains).

### 2. Añadir la URL de callback en Google Cloud

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Abre el **OAuth 2.0 Client ID** que usas con Supabase (tipo “Web application”).
3. En **Authorized redirect URIs** añade la URL de callback con tu dominio:
   ```text
   https://auth.chorroybuenas.com.mx/auth/v1/callback
   ```
   (Usa el subdominio que hayas configurado en Supabase.)
4. En **Authorized JavaScript origins** asegúrate de tener también:
   ```text
   https://chorroybuenas.com.mx
   https://www.chorroybuenas.com.mx   (si lo usas)
   ```
5. Guarda los cambios.

### 3. Usar la URL personalizada en producción

En el entorno de **producción** (variables de entorno del hosting donde está chorroybuenas.com.mx), define:

```env
VITE_SUPABASE_URL=https://auth.chorroybuenas.com.mx
VITE_SUPABASE_ANON_KEY=tu_anon_key_sin_cambios
```

No cambies la anon key; solo la URL. Así el cliente de Supabase (y el flujo OAuth) usarán tu dominio y Google mostrará **chorroybuenas.com.mx** (o el subdominio que hayas puesto).

### 4. (Opcional) Mejorar la confianza en Google

En [Google Auth Platform → Branding](https://console.cloud.google.com/auth/branding) puedes configurar nombre de la aplicación y logo. Si verificas la marca, la pantalla de consentimiento puede mostrar “chorroybuenas” en lugar del dominio. La verificación puede tardar unos días.

---

**Resumen:** Dominio personalizado en Supabase (ej. auth.chorroybuenas.com.mx) → mismo redirect URI en Google Cloud → `VITE_SUPABASE_URL` con esa URL en producción. Así dejará de salir la URL de Supabase y se verá tu dominio.
