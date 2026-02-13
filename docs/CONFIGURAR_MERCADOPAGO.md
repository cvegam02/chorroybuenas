# Configurar Mercado Pago en Supabase

## 1. Configurar Access Token como Secret

El Access Token de Mercado Pago debe configurarse como **secret** en Supabase para que la Edge Function pueda usarlo.

### Opción A: Desde el Dashboard de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Settings** → **Edge Functions** → **Secrets**
3. Haz clic en **Add Secret**
4. Nombre: `MERCADOPAGO_ACCESS_TOKEN`
5. Valor: tu Access Token (credenciales de **producción** del Seller de prueba para pagos de prueba)
6. Guarda

### Opción B: Desde la CLI

```bash
# Cargar token desde .env
$env:SUPABASE_ACCESS_TOKEN = (Get-Content .env | Where-Object { $_ -match '^SUPABASE_ACCESS_TOKEN=' } | ForEach-Object { $_.Split('=', 2)[1].Trim() })

# Configurar secret
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=<tu-access-token>
```

### Secret necesario para el webhook (acreditar tokens al aprobar el pago)

La Edge Function **webhook-mercadopago** necesita poder llamar a la RPC `add_tokens_after_purchase` con privilegios de servicio. Para eso debe existir el secret **SERVICE_ROLE_KEY** en el mismo proyecto. (Supabase no permite nombres que empiecen por `SUPABASE_`.)

1. En Supabase Dashboard: **Settings** → **API** → en **Project API keys** copia la clave **service_role** (secret).
2. **Settings** → **Edge Functions** → **Secrets** → **Add Secret**  
   - Nombre: `SERVICE_ROLE_KEY`  
   - Valor: la clave service_role que copiaste.  
3. Guarda. (No subas esta clave al repo ni la pongas en `.env`.)

Con eso, cuando Mercado Pago notifique un pago aprobado, el webhook podrá acreditar los tokens al usuario.

## 2. Configurar URL de la app (variable de entorno en .env)

Las URLs de retorno de Mercado Pago (success/cancel/pending) las define **VITE_APP_URL** en el `.env` de la aplicación. El mismo código sirve para prod y no prod; solo cambias el valor en el entorno.

En tu `.env` (o `.env.local` / `.env.production`):

```env
# Local con ngrok (cambia la URL cuando reinicies ngrok)
VITE_APP_URL=https://abc123.ngrok.io

# Producción (mismo repo, otro valor)
# VITE_APP_URL=https://chorroybuenas.com.mx
```

| Entorno   | Valor de VITE_APP_URL               |
|-----------|-------------------------------------|
| Local     | Tu URL de ngrok (ej. `https://abc123.ngrok.io`) |
| Producción| Tu dominio (ej. `https://chorroybuenas.com.mx`)   |

El frontend envía este valor al crear la preferencia; la Edge Function no necesita el secret `APP_URL` en Supabase (solo se usa como fallback si no llega `app_url`).

## 3. Desplegar Edge Functions

Despliega ambas funciones para que Mercado Pago y el webhook funcionen:

```bash
# Cargar token desde .env (PowerShell)
$env:SUPABASE_ACCESS_TOKEN = (Get-Content .env | Where-Object { $_ -match '^SUPABASE_ACCESS_TOKEN=' } | ForEach-Object { $_.Split('=', 2)[1].Trim() })

# Desplegar creación de preferencia y webhook
npx supabase functions deploy create-payment-preference
npx supabase functions deploy webhook-mercadopago
```

Si al abrir la URL del webhook en el navegador ves **401 "Missing authorization header"**, el despliegue no aplicó `verify_jwt = false`. Vuelve a desplegar con:

```bash
npx supabase functions deploy webhook-mercadopago --no-verify-jwt
```

Así la función queda pública y Mercado Pago podrá llamarla sin enviar ningún token.

Después de añadir o cambiar secrets, no hace falta redesplegar; la próxima invocación ya usará los nuevos valores.

### Activar evento **Pagos** en el panel (importante para acreditar tokens)

Con solo la `notification_url` de la preferencia, MP suele enviar **solo** `merchant_order`; en Checkout Pro esa orden puede llegar con `payments` vacío y no nos sirve para acreditar. Para recibir el **pago aprobado** (y acreditar tokens) hay que configurar la misma URL en el panel y activar **Pagos**:

1. Entra a [Tus integraciones](https://www.mercadopago.com.mx/developers/panel/app) → tu aplicación.
2. Menú **Webhooks** → **Configurar notificaciones**.
3. **URL de producción** (o la que uses):  
   `https://<tu-proyecto>.supabase.co/functions/v1/webhook-mercadopago`  
   (misma URL que usa la preferencia; reemplaza `<tu-proyecto>` por tu ref de Supabase, ej. `vjglrfofyzvyvaetakpu`).
4. En **Eventos**, marca **Pagos** (y si quieres, deja también Órdenes comerciales).
5. Guarda.

Así, cuando un pago se apruebe, MP enviará una notificación con `topic: payment` e `id` del pago. Nuestro webhook ya trata ese caso y acredita los tokens.

### Ver que el webhook recibe notificaciones

- **Logs:** Supabase → **Edge Functions** → **webhook-mercadopago** → **Logs**. Deberías ver `Webhook MP: request received` y, si llega un pago, `Webhook MP: pago obtenido` y `Webhook MP: tokens acreditados`.
- **Probar la URL:** `GET https://<tu-proyecto>.supabase.co/functions/v1/webhook-mercadopago?id=123&topic=payment` → debe devolver 200.
- **Simulador:** En Webhooks del panel puedes usar **Simular** con evento "Pagos" para probar.

## 4. Probar el flujo (sandbox)

Para que el pago de prueba se **apruebe**, Mercado Pago exige:

### 4.1 Crear un usuario de prueba comprador

1. Entra a [Tus integraciones](https://www.mercadopago.com.mx/developers/panel/app) y abre tu aplicación.
2. En el menú lateral ve a **Cuentas de prueba** (o **Pruebas** → cuentas de prueba).
3. Crea un **usuario de prueba comprador** y anota usuario y contraseña.
4. Opcional pero recomendado: haz la prueba en una **pestaña de incógnito** para evitar conflictos con tu sesión normal.

### 4.2 Datos de tarjeta de prueba (México)

Usa una de estas tarjetas y **vencimiento 11/30** (no 11/25):

| Resultado   | Número              | CVV  | Vencimiento | **Nombre del titular** |
|------------|---------------------|------|-------------|------------------------|
| **Aprobado** | 5474 9254 3267 0366 (Mastercard) o 4075 5957 1648 3764 (Visa) | 123 | 11/30 | **APRO** (exactamente) |
| Rechazado  | La misma            | 123  | 11/30       | OTHE                   |
| Pendiente  | La misma            | 123  | 11/30       | CONT                   |

Si el **nombre del titular** no es `APRO`, el sandbox puede simular rechazo u otro estado aunque la tarjeta sea de prueba.

### 4.3 Pasos de la prueba

1. (Recomendado) Abre una ventana de **incógnito**.
2. **Primero** inicia sesión en [Mercado Pago Developers](https://www.mercadopago.com.mx/developers) o en la página de MP con tu **usuario de prueba comprador**. Si pide código por email, usa los **últimos 6 dígitos del User ID** de esa cuenta (Tus integraciones → Tu app → Cuentas de prueba).
3. **Después**, en la misma ventana (ya con sesión de test buyer), abre tu app (p. ej. tu URL de ngrok) y ve a `/comprar-tokens`. Elige pack y haz clic en "Comprar".
4. Serás redirigido al checkout de MP (sandbox). La URL debe ser **sandbox.mercadopago.com.mx** (revisa la barra de direcciones). Usa una tarjeta de la tabla de arriba y **Nombre y apellido = APRO**.
5. Completa el pago; si todo es correcto volverás a tu app con `?success=1&payment_id=...`.

**Nota:** En modo prueba la preferencia no envía email del pagador; MP usará el usuario con el que iniciaste sesión en el checkout (tu test buyer). Así se evitan conflictos que provocan "algo salió mal".

### Si sigue fallando al hacer clic en "Pagar" (sandbox)

Según Mercado Pago, el error **"Algo anduvo mal"** puede deberse a:

| Causa | En nuestra integración |
|-------|------------------------|
| **1. Cuentas incompatibles** | La preferencia se crea con **credenciales de prueba** (token `APP_USR-...`). Quien paga en el checkout **debe** ser un **usuario de prueba comprador** de la misma app. Si en el navegador tienes sesión con una cuenta **real** de MP, el entorno es distinto y MP rechaza. **Solución:** ventana de incógnito (o otro navegador), iniciar sesión **solo** con el usuario de prueba comprador de [Cuentas de prueba](https://www.mercadopago.com.mx/developers/panel/app) → tu app → Comprador, y desde ahí abrir tu app y pagar. |
| **2. URLs inválidas** | `back_urls` y `notification_url` deben ser **públicas**, **HTTPS** y con certificado SSL válido (no `localhost`). Nosotros usamos tu `VITE_APP_URL` (ej. ngrok `https://....ngrok-free.dev`) para back_urls y `https://...supabase.co/functions/v1/webhook-mercadopago` para notification_url. Ambas son HTTPS públicas. Si usas ngrok, asegúrate de que la URL sea `https://` y que ngrok no esté mostrando una pantalla de aviso que bloquee la redirección. |
| **3. Formato de fecha (Route)** | Aplica a APIs de envíos (arrival_date_time, etc.). En Checkout Pro con preferencia de pago **no se usan** esos campos; puedes ignorar este punto. |

Si en los logs ves **"URL de redirección: SANDBOX"** y **"Modo prueba: no se envía payer.email"**, la preferencia y las URLs están bien; el rechazo suele ser por **(1) cuentas incompatibles**.

**Comprueba:**

1. **Cuenta de prueba comprador correcta**  
   En [Tus integraciones](https://www.mercadopago.com.mx/developers/panel/app) → tu aplicación → **Cuentas de prueba** → pestaña **Comprador**. Usa exactamente el **usuario y contraseña** que aparecen ahí (o la cuenta de prueba creada para ese país). No uses otra cuenta de MP.

2. **Mismo navegador y sesión**  
   Inicia sesión en Mercado Pago (developers o mercadopago.com.mx) con ese comprador de prueba y, **en la misma ventana** (o pestaña), abre tu app y haz la compra. Así el checkout verá al test buyer como pagador.

3. **Datos del titular**  
   - Nombre y apellido: **APRO** (exactamente, para simular aprobado).  
   - Tipo y número de documento: el que pida el formulario (p. ej. RFC/identificación). Prueba con un número válido según el tipo (longitud y solo números si aplica).

4. **Tarjeta y vencimiento**  
   Usa una tarjeta de la [documentación de tarjetas de prueba (México)](https://www.mercadopago.com.mx/developers/es/docs/checkout-api/additional-content/your-integrations/test/cards) y vencimiento **11/30**.

Si tras esto sigue apareciendo el error al hacer clic en "Pagar", el fallo es del sandbox de MP. Puedes:

- Revisar el [Centro de soporte para desarrolladores](https://www.mercadopago.com.mx/developers/es/support/center) (busca "pruebas" o "cobros rechazados").  
- Abrir un ticket indicando: integración Checkout Pro, ambiente **sandbox**, que el error ocurre **al hacer clic en Pagar** en el checkout (no al crear la preferencia), y el **preference_id** que ves en tus logs (ej. `2691981774-605c8785-ecd1-4dee-ae27-5563cbea430c`).

### "¿Por qué no se procesó mi pago al probar la integración?" (tres casos de MP)

Según el soporte de Mercado Pago:

| Caso | Qué hacer |
|------|-----------|
| **Caso 1: Flujo de pruebas incorrecto** | MP pide: (1) En [Tus integraciones](https://www.mercadopago.com.mx/developers/panel/app) crear **dos** cuentas de prueba: **vendedor** y **comprador**. (2) Iniciar sesión en la cuenta de prueba del **vendedor** y crear/seleccionar la aplicación. (3) Usar el **access_token de producción** de la cuenta de prueba del vendedor para crear la preferencia (no el token de prueba). (4) Iniciar sesión en la cuenta de prueba del **comprador**. (5) Usar el **init_point de producción** (el que devuelve la API al crear la preferencia con ese token) para abrir el pago. (6) Completar el pago con datos de prueba. **En nuestra app:** hoy usamos el token que tienes en `MERCADOPAGO_ACCESS_TOKEN` (suele ser de **prueba**), por eso te redirigimos a **sandbox**. Si sigues el flujo oficial al pie de la letra, la aplicación debería estar bajo la **cuenta de prueba vendedor** y el secret debería ser el **Access Token de producción** de esa misma cuenta (en la app verías "Credenciales de producción" del vendedor de prueba). Así obtendrías `init_point` de producción y pagarías con el comprador de prueba. Si quieres probar ese flujo, en Tu app → Credenciales usa el token de **producción** del vendedor de prueba y ponlo en Supabase como `MERCADOPAGO_ACCESS_TOKEN`; nuestra Edge Function devolverá entonces la URL de producción (www.mercadopago.com.mx) y deberás pagar con el usuario comprador de prueba. |
| **Caso 2: Monto inferior al mínimo** | Ajusta el monto para que esté dentro de los valores permitidos por MP (por país puede haber un mínimo; si tu pack es muy bajo, sube el precio de prueba). |
| **Caso 3: El comprador no tiene medio de pago habilitado** | Asegúrate de que la **cuenta de prueba comprador** tenga al menos un medio de pago habilitado. En la cuenta de prueba comprador, entra a Mercado Pago (con esa sesión) y revisa en configuración o métodos de pago que no esté restringida; luego intenta de nuevo con la tarjeta de prueba en el checkout. |

## 5. Configurar servidor web para SPA routing

Cuando Mercado Pago redirige a `/comprar-tokens?success=1&...`, el servidor web debe servir `index.html` para todas las rutas (SPA routing).

### Apache (.htaccess)

Ya está incluido en `public/.htaccess` y se copiará automáticamente al build. Si tu servidor es Apache, debería funcionar automáticamente.

### Nginx

Si usas Nginx, agrega esta configuración a tu `server` block:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Otros servidores

- **Netlify**: Crea `public/_redirects` con: `/* /index.html 200`
- **Vercel**: Crea `vercel.json` con:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- **GitHub Pages**: Ya está configurado en `vite.config.ts` (copia `index.html` a `404.html`)

## Notas

- **Errores en la consola del navegador**: En la página del checkout de Mercado Pago (sandbox o producción) pueden aparecer en consola mensajes de **Content Security Policy (CSP)**, **404** en URLs tipo `/jms/lgz/background/session/...` o logs de "challenge-orchestrator". Son de la propia página de MP, no de tu app; no puedes corregirlos y no afectan al pago. Puedes ignorarlos.
- **Credenciales de prueba**: Las credenciales que tienes son de **prueba**. No se realizarán cobros reales.
- **Webhook pendiente**: El webhook de Mercado Pago (`webhook-mercadopago`) aún no está implementado. Los tokens se añadirán cuando implementes el webhook (Paso siguiente del plan).
- **Producción**: Cuando pases a producción, necesitarás:
  - Credenciales de producción de Mercado Pago
  - Actualizar el secret `MERCADOPAGO_ACCESS_TOKEN` con el token de producción
  - Configurar el webhook en Mercado Pago apuntando a tu Edge Function
  - Asegurarte de que el servidor web esté configurado para SPA routing (ver sección 5)
