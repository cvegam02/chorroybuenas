# Entornos: Desarrollo vs Producción

Guía para manejar **dos bases de datos** (Supabase) y **dos conjuntos de credenciales** (Mercado Pago) según el entorno.

## Resumen

| Componente | Desarrollo | Producción |
|------------|------------|------------|
| **Supabase** | Proyecto DEV (DB, Auth, Storage) | Proyecto PROD |
| **Mercado Pago** | Token de prueba/sandbox | Token de producción |
| **VITE_APP_URL** | ngrok o localhost | https://chorroybuenas.com.mx |

---

## 1. Crear dos proyectos en Supabase

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Crea **dos proyectos**:
   - **loteria-dev** (o similar) → para desarrollo
   - **loteria-prod** (o similar) → para producción

3. En cada proyecto, anota:
   - **Project URL** (Settings → API)
   - **anon public** key
   - **service_role** key (solo para secrets de Edge Functions)

---

## 2. Migraciones en ambos proyectos

Las migraciones están en `supabase/migrations/`. Ejecuta en **cada** proyecto:

```bash
# Vincular al proyecto DEV
npx supabase link --project-ref <REF_PROYECTO_DEV>

# Aplicar migraciones
npm run db:push
# o: npx supabase db push

# Repetir para PROD
npx supabase link --project-ref <REF_PROYECTO_PROD>
npm run db:push
```

Ver **docs/MIGRACIONES.md** para más detalles.

---

## 3. Archivos de entorno

### `.env` (desarrollo, gitignore)
Usado cuando ejecutas `npm run dev`.

```env
VITE_SUPABASE_URL=https://<REF-DEV>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_del_proyecto_dev>
VITE_APP_URL=https://tu-ngrok.ngrok-free.dev

# Solo para desplegar funciones al proyecto DEV
SUPABASE_ACCESS_TOKEN=<tu_token_de_supabase>
```

### `.env.production` (producción)
Usado cuando ejecutas `npm run build` (Vite usa este archivo por defecto en modo producción).

```env
VITE_SUPABASE_URL=https://<REF-PROD>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_del_proyecto_prod>
VITE_APP_URL=https://chorroybuenas.com.mx
```

**Importante:** Añade `.env.production` a `.gitignore` si contiene datos sensibles, o usa variables de entorno en tu plataforma de deploy (Vercel, Netlify, etc.) en lugar del archivo.

---

## 4. Mercado Pago: tokens distintos por proyecto

El token de Mercado Pago se guarda como **secret en Supabase** (no en el frontend). Cada proyecto Supabase tiene sus propios secrets.

### Proyecto DEV
- Token de **prueba/sandbox** de Mercado Pago
- Los pagos no son reales

```bash
npx supabase link --project-ref <REF-DEV>
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx-token-prueba
npx supabase secrets set SERVICE_ROLE_KEY=<service_role_del_proyecto_dev>
npx supabase secrets set REPLICATE_API_TOKEN=r8_xxx
```

### Proyecto PROD
- Token de **producción** de Mercado Pago
- Los pagos son reales

```bash
npx supabase link --project-ref <REF-PROD>
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx-token-produccion
npx supabase secrets set SERVICE_ROLE_KEY=<service_role_del_proyecto_prod>
npx supabase secrets set REPLICATE_API_TOKEN=r8_xxx
```

---

## 5. Desplegar Edge Functions por entorno

Ver **docs/EDGE_FUNCTIONS.md** para guía completa (secrets, URLs, verificación).

Las funciones se despliegan en el proyecto al que está vinculado `supabase link`.

### Desplegar en DEV

```bash
npx supabase link --project-ref <REF-DEV>
npx supabase functions deploy create-payment-preference
npx supabase functions deploy webhook-mercadopago --no-verify-jwt
npx supabase functions deploy credit-payment-on-return
npx supabase functions deploy transform-loteria
```

### Desplegar en PROD

```bash
npx supabase link --project-ref <REF-PROD>
npx supabase functions deploy create-payment-preference
npx supabase functions deploy webhook-mercadopago --no-verify-jwt
npx supabase functions deploy credit-payment-on-return
npx supabase functions deploy transform-loteria
```

### Usando --project-ref (sin cambiar link)

```bash
npx supabase functions deploy create-payment-preference --project-ref <REF-PROD>
```

### Scripts en package.json

```bash
# Desplegar todas las funciones (requiere estar vinculado: supabase link --project-ref <REF>)
npm run deploy:functions:all

# Build para producción (usa .env.production)
npm run build:prod
```

---

## 6. Webhooks de Mercado Pago

MP permite configurar **dos URLs** distintas: una para pruebas y otra para producción.

1. En [Tus integraciones](https://www.mercadopago.com.mx/developers/panel/app) → Webhooks
2. **URL de producción:**  
   `https://<REF-PROD>.supabase.co/functions/v1/webhook-mercadopago`
3. **URL de prueba** (si MP lo ofrece):  
   `https://<REF-DEV>.supabase.co/functions/v1/webhook-mercadopago`

Así, cuando pagues con credenciales de prueba, MP notificará al webhook de dev. En producción, al webhook de prod.

---

## 7. Flujo de trabajo diario

### Desarrollo local
1. `npm run dev` → usa `.env` (proyecto DEV)
2. Las Edge Functions llaman al proyecto DEV (Supabase URL del frontend)
3. MP sandbox para pagos de prueba

### Deploy a producción
1. En tu hosting, configura:
   - `VITE_SUPABASE_URL` = URL del proyecto PROD
   - `VITE_SUPABASE_ANON_KEY` = anon key del proyecto PROD
   - `VITE_APP_URL` = `https://chorroybuenas.com.mx`

2. O usa `.env.production` si tu build lo carga (ej. `npm run build` en CI con ese archivo)

3. Las Edge Functions de prod usan los secrets del proyecto PROD (incluido el token de MP producción)

---

## 8. Resumen de variables

| Variable | Dónde | DEV | PROD |
|----------|-------|-----|------|
| `VITE_SUPABASE_URL` | Frontend (.env) | URL proyecto dev | URL proyecto prod |
| `VITE_SUPABASE_ANON_KEY` | Frontend (.env) | anon key dev | anon key prod |
| `VITE_APP_URL` | Frontend (.env) | ngrok | chorroybuenas.com.mx |
| `MERCADOPAGO_ACCESS_TOKEN` | Secret Supabase | Token sandbox | Token producción |
| `SERVICE_ROLE_KEY` | Secret Supabase | Del proyecto dev | Del proyecto prod |
| `REPLICATE_API_TOKEN` | Secret Supabase | Mismo (o distinto si quieres) | Mismo |

---

## 9. Seguridad

- Nunca subas `.env` o `.env.production` al repo si contienen keys reales
- Usa variables de entorno en la plataforma de deploy (Vercel, Netlify)
- Mantén `SERVICE_ROLE_KEY` solo en Supabase Secrets, nunca en el frontend
