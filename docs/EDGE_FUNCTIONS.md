# Edge Functions en Supabase

La app usa **4 Edge Functions** para: crear preferencias de pago (Mercado Pago), webhook de pagos, acreditar tokens al volver de MP, y transformar imágenes con IA (Replicate).

---

## 1. Lista de funciones

| Función | Propósito | Invocada por |
|---------|-----------|--------------|
| `create-payment-preference` | Crea preferencia en Mercado Pago para comprar tokens | Frontend (`PurchaseService`) |
| `webhook-mercadopago` | Recibe notificaciones de MP cuando se aprueba un pago, acredita tokens | Mercado Pago (webhook) |
| `credit-payment-on-return` | Acredita tokens cuando el usuario vuelve de MP con `?success=1&payment_id=...` | Frontend al volver de MP |
| `transform-loteria` | Transforma imagen con IA (Replicate) al estilo Loteria | Frontend (`AIService`) |

---

## 2. Secrets requeridos

Configura los secrets **en cada proyecto Supabase** (DEV y PROD por separado):

```bash
npx supabase link --project-ref <REF>

# Obligatorios para pagos
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
npx supabase secrets set SERVICE_ROLE_KEY=<service_role_del_proyecto>

# Obligatorio para IA
npx supabase secrets set REPLICATE_API_TOKEN=r8_xxx
```

### Detalle por función

| Secret | Usado por | Descripción |
|--------|-----------|-------------|
| `MERCADOPAGO_ACCESS_TOKEN` | create-payment-preference, webhook-mercadopago, credit-payment-on-return | Token de MP (sandbox en dev, producción en prod) |
| `SERVICE_ROLE_KEY` | webhook-mercadopago, credit-payment-on-return | Service role del proyecto (para escribir en `user_tokens`, `token_purchases`) |
| `REPLICATE_API_TOKEN` | transform-loteria | API key de Replicate para IA |

**Nota:** `SUPABASE_URL` y `SUPABASE_ANON_KEY` se inyectan automáticamente por Supabase; no hace falta definirlos.

### Opcionales

| Secret | Función | Uso |
|--------|---------|-----|
| `APP_URL` | create-payment-preference | Fallback para `back_urls` si el frontend no envía `app_url` (default: `https://chorroybuenas.com.mx`) |
| `MP_USE_PRODUCTION_CHECKOUT` | create-payment-preference | `true` para forzar `init_point` de producción en lugar de sandbox |

---

## 3. Desplegar

### Todas las funciones

```bash
npm run deploy:functions:all
```

O manualmente, una por una:

```bash
npx supabase functions deploy create-payment-preference
npx supabase functions deploy webhook-mercadopago --no-verify-jwt
npx supabase functions deploy credit-payment-on-return
npx supabase functions deploy transform-loteria
```

**Importante:** `webhook-mercadopago` debe desplegarse con `--no-verify-jwt` porque Mercado Pago llama sin cabecera `Authorization`. Sin esto, las notificaciones serán rechazadas con 401.

### Por entorno (DEV / PROD)

```bash
# DEV
npx supabase link --project-ref <REF-DEV>
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx-sandbox
npx supabase secrets set SERVICE_ROLE_KEY=<service_role_dev>
npx supabase secrets set REPLICATE_API_TOKEN=r8_xxx
npm run deploy:functions:all

# PROD
npx supabase link --project-ref <REF-PROD>
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx-produccion
npx supabase secrets set SERVICE_ROLE_KEY=<service_role_prod>
npx supabase secrets set REPLICATE_API_TOKEN=r8_xxx
npm run deploy:functions:all
```

---

## 4. URLs

Las funciones quedan en:

```
https://<REF>.supabase.co/functions/v1/<nombre-funcion>
```

Ejemplo para el proyecto `abc123xyz`:

- `https://abc123xyz.supabase.co/functions/v1/create-payment-preference`
- `https://abc123xyz.supabase.co/functions/v1/webhook-mercadopago`
- `https://abc123xyz.supabase.co/functions/v1/credit-payment-on-return`
- `https://abc123xyz.supabase.co/functions/v1/transform-loteria`

El frontend usa `VITE_SUPABASE_URL` para construir estas URLs, así que apuntará al proyecto correcto según el `.env` (dev) o `.env.production` (prod).

---

## 5. Webhook de Mercado Pago

En [Mercadopago.com → Tus integraciones → Webhooks](https://www.mercadopago.com.mx/developers/panel/app), configura:

- **Producción:** `https://<REF-PROD>.supabase.co/functions/v1/webhook-mercadopago`
- **Pruebas:** `https://<REF-DEV>.supabase.co/functions/v1/webhook-mercadopago` (si MP lo permite)

Ver `docs/CONFIGURAR_MERCADOPAGO.md` para más detalles.

---

## 6. Verificación

1. **transform-loteria:** Sube una carta, activa “Transformar con IA”. Si falla con "Servicio de IA no configurado", falta `REPLICATE_API_TOKEN`.
2. **create-payment-preference:** En la pantalla de comprar tokens, haz clic en comprar. Si devuelve 500 "Error de configuración", falta `MERCADOPAGO_ACCESS_TOKEN`.
3. **webhook-mercadopago:** `GET https://<REF>.supabase.co/functions/v1/webhook-mercadopago?id=123&topic=payment` → debe devolver 200 (aunque no acredite, confirma que la función responde).
4. **credit-payment-on-return:** Tras un pago aprobado, vuelve con `?success=1&payment_id=...`. Los tokens deben acreditarse. Si no, revisa logs en Supabase Dashboard → Edge Functions → Logs.
