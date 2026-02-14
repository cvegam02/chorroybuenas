# Configurar Replicate (IA Lotería) vía Edge Function

La transformación de imágenes a estilo Lotería usa Replicate (GPT-Image-1.5 / FLUX). La API key se guarda como **secret en Supabase** para no exponerla en el frontend.

## 1. Obtener token de Replicate

1. Crea una cuenta en [Replicate](https://replicate.com)
2. Ve a [Account → API tokens](https://replicate.com/account)
3. Copia tu token (formato `r8_...`)

## 2. Configurar el secret en Supabase

### Opción A: Dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **Settings** → **Edge Functions** → **Secrets**
3. **Add Secret**
   - Nombre: `REPLICATE_API_TOKEN`
   - Valor: tu token de Replicate
4. Guarda

### Opción B: CLI

```bash
npx supabase secrets set REPLICATE_API_TOKEN=r8_tu_token_aqui
```

## 3. Desplegar la Edge Function

```bash
npx supabase functions deploy transform-loteria
```

## 4. Verificar

Al transformar una imagen en la app, la Edge Function `transform-loteria` recibirá la imagen en base64, validará el JWT del usuario, y llamará a Replicate con el token del secret. El frontend nunca ve la API key.

## Variables de entorno del frontend (opcional)

| Variable | Descripción |
|---------|-------------|
| `VITE_REPLICATE_USE_FLUX` | `true` para usar FLUX img2img primero (menos filtros). Por defecto: GPT-Image. |

Estas variables **no** contienen secretos; son preferencias de modelo.
