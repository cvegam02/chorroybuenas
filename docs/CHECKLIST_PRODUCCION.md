# Checklist: Pasar a producción (chorroybuenas.com.mx)

Usa esta lista para verificar que todo está listo para producción.

---

## 1. GitHub (ya hecho según comentaste)

- [ ] **Secrets** en Settings → Secrets and variables → Actions:
  - `VITE_SUPABASE_URL` = URL del proyecto PROD (ej. `https://xxx.supabase.co`)
  - `VITE_SUPABASE_ANON_KEY` = anon key del proyecto PROD
  - `VITE_APP_URL` = `https://chorroybuenas.com.mx`
- [ ] Merge a `main` para que se dispare el deploy (o workflow manual)
- [ ] GitHub Pages: custom domain `chorroybuenas.com.mx` configurado (Settings → Pages → Custom domain)

---

## 2. Supabase – Proyecto PROD

### Base de datos

- [ ] Migraciones aplicadas:  
  `npx supabase link --project-ref <REF-PROD>` → `npx supabase db push`
- [ ] Incluye la migración **021_storage_card_images** (bucket + políticas)

### Edge Functions

- [ ] Funciones desplegadas:
  ```bash
  npx supabase link --project-ref <REF-PROD>
  npm run deploy:functions:all
  ```
  O una por una: `create-payment-preference`, `webhook-mercadopago --no-verify-jwt`, `credit-payment-on-return`, `transform-loteria`

### Secrets en Supabase (Settings → Edge Functions → Secrets)

- [ ] `MERCADOPAGO_ACCESS_TOKEN` = token de **producción** de Mercado Pago
- [ ] `SERVICE_ROLE_KEY` = service_role del proyecto PROD
- [ ] `REPLICATE_API_TOKEN` = token de Replicate (para transformación con IA)

### Auth (Authentication → URL Configuration)

- [ ] **Site URL** = `https://chorroybuenas.com.mx`
- [ ] **Redirect URLs** incluye:
  - `https://chorroybuenas.com.mx/**`
  - `https://www.chorroybuenas.com.mx/**` (si usas www)

---

## 3. Mercado Pago

- [ ] En [Tus integraciones](https://www.mercadopago.com.mx/developers/panel/app) → **Webhooks**:
  - URL de producción =  
    `https://<REF-PROD>.supabase.co/functions/v1/webhook-mercadopago`
- [ ] Credenciales de **producción** (no sandbox) configuradas
- [ ] Token de producción guardado en Supabase como `MERCADOPAGO_ACCESS_TOKEN`

---

## 4. Verificación rápida

| Acción | Cómo verificar |
|--------|----------------|
| Build | GitHub Actions → último workflow en verde |
| Deploy | Abrir `https://chorroybuenas.com.mx` |
| Auth | Crear cuenta o iniciar sesión |
| Imágenes | Subir una carta y ver que se guarda (Storage) |
| IA | Transformar una imagen con IA (Replicate) |
| Comprar tokens | Hacer un pago de prueba con MP (sandbox) o real (prod) |
| Volver de MP | Tras pago, que redirija a `chorroybuenas.com.mx/comprar-tokens?success=1` y se acrediten los tokens |

---

## 5. Si algo falla

- **"Invalid API key"** → Revisa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en GitHub Secrets
- **Imágenes no cargan** → Revisa que exista el bucket `card-images` y sus políticas (migración 021)
- **Pago no acredita tokens** → Revisa webhook en MP, secret `SERVICE_ROLE_KEY` y logs en Supabase Edge Functions
- **OAuth no redirige bien** → Revisa Site URL y Redirect URLs en Supabase Auth
- **IA no responde** → Revisa `REPLICATE_API_TOKEN` en Supabase Secrets
