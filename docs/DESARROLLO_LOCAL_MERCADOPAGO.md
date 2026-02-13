# Desarrollo Local con Mercado Pago

Mercado Pago necesita una URL pública para redirigir después del pago. Para desarrollo local, usa una de estas opciones:

## Opción 1: Usar ngrok (Recomendado)

### 1. Instalar ngrok

Descarga desde: https://ngrok.com/download

O con Chocolatey (Windows):
```powershell
choco install ngrok
```

### 2. Iniciar tu app local

```bash
npm run dev
```

Tu app estará en `http://localhost:5173`

### 3. Exponer localhost con ngrok

En otra terminal:
```bash
ngrok http 5173
```

Ngrok te dará una URL pública como: `https://abc123.ngrok.io`

### 4. Configurar VITE_APP_URL en tu .env

Las URLs de retorno las toma el frontend de **VITE_APP_URL**. En tu `.env` o `.env.local` pon la URL que te da ngrok:

```env
VITE_APP_URL=https://abc123.ngrok.io
```

(Sustituye `abc123` por la URL que te dé ngrok.) Cada vez que reinicies ngrok y cambie la URL, actualiza esta variable y reinicia `npm run dev`. No hace falta tocar Supabase.

### 5. Redesplegar la Edge Function (solo si cambiaste su código)

```bash
npx supabase functions deploy create-payment-preference
```

### 6. Probar

1. Ve a `http://localhost:5173/comprar-tokens`
2. Haz clic en "Comprar"
3. Completa el pago en Mercado Pago
4. Serás redirigido a `https://abc123.ngrok.io/comprar-tokens?success=1&...`
5. Ngrok redirigirá automáticamente a tu localhost

## Opción 2: Probar directamente en producción

Si tu app ya está desplegada en producción (`https://chorroybuenas.com.mx`):

1. Asegúrate de que `APP_URL` esté configurado en Supabase:
   ```bash
   npx supabase secrets set APP_URL=https://chorroybuenas.com.mx
   ```

2. Prueba directamente en producción:
   - Ve a `https://chorroybuenas.com.mx/comprar-tokens`
   - Haz clic en "Comprar"
   - Completa el pago
   - Serás redirigido correctamente

## Opción 3: Modificar Edge Function para desarrollo (Avanzado)

Puedes modificar la Edge Function para aceptar un parámetro `app_url` en el request body cuando estés en desarrollo. Esto requiere cambios en el código.

## Notas

- **ngrok gratuito**: Tiene límites de conexiones y la URL cambia cada vez que reinicias
- **ngrok pagado**: Puedes usar dominios personalizados y URLs fijas
- **Alternativas a ngrok**: 
  - [localtunnel](https://localtunnel.github.io/www/): `npx localtunnel --port 5173`
  - [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
  - [serveo](https://serveo.net/): `ssh -R 80:localhost:5173 serveo.net`
