# Guía para Diagnosticar Errores de MercadoPago

## Problema: "No pudimos procesar tu pago"

Este error puede ocurrir en diferentes momentos del flujo de pago. Esta guía te ayudará a identificar dónde está el problema.

## Pasos de Diagnóstico

### 1. Verificar Logs de la Edge Function

Los logs mejorados ahora muestran información detallada sobre cada paso del proceso.

#### Opción A: Desde el Dashboard de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Edge Functions** → **create-payment-preference**
3. Haz clic en **Logs** o **View Logs**
4. Busca los logs más recientes cuando intentaste hacer una compra

#### Opción B: Desarrollo local (logs en la terminal)

El CLI de Supabase **no tiene** un comando para ver logs de funciones en producción. Para ver los `console.log` en la terminal debes ejecutar la función en local:

```bash
# Iniciar las Edge Functions en local (los logs aparecen en esta terminal)
npx supabase functions serve
```

Luego en otro terminal o en tu app, apunta las llamadas a la función local (por ejemplo `http://127.0.0.1:54321/functions/v1/create-payment-preference` si usas Supabase local). Cada invocación mostrará los logs ahí.

**En producción**, los logs solo se ven en el **Dashboard** (Opción A).

### 2. Qué Buscar en los Logs

#### ✅ Si la preferencia se crea correctamente:
```
Usuario validado correctamente: [user-id]
Creando preferencia en Mercado Pago: { items: [...], amountCents: ..., ... }
Respuesta de Mercado Pago - Status: 201, StatusText: Created
Preferencia creada exitosamente: { preferenceId: ..., initPoint: ... }
```

**Si ves esto**, el problema está en MercadoPago después de crear la preferencia (ver paso 3).

#### ❌ Si hay error al crear la preferencia:

**Error de autenticación:**
```
Error Mercado Pago - Status: 401
```
- **Causa**: Token de MercadoPago inválido o expirado
- **Solución**: Verificar que `MERCADOPAGO_ACCESS_TOKEN` esté configurado correctamente

**Error de validación:**
```
Error Mercado Pago - Status: 400
Error Mercado Pago - Detalles: { message: "...", error: "..." }
```
- **Causa**: Datos inválidos en la preferencia (precio, moneda, URLs, etc.)
- **Solución**: Revisar los detalles del error en los logs

**Error de red:**
```
Error al crear preferencia: [error details]
```
- **Causa**: Problema de conexión con la API de MercadoPago
- **Solución**: Verificar conectividad y que la API esté disponible

### 3. Verificar en la Consola del Navegador

Abre las **Herramientas de Desarrollador** (F12) y ve a la pestaña **Console**:

1. Intenta hacer una compra
2. Busca estos mensajes:

**Si la preferencia se crea:**
```
Refrescando sesión antes de crear preferencia de pago...
Token obtenido después de refrescar: ...
Enviando request a Edge Function con token: ...
Redirigiendo a Mercado Pago: https://www.mercadopago.com.mx/checkout/v1/redirect...
```

**Si hay error:**
```
Error desde Edge Function: { status: ..., error: ..., message: ..., details: ... }
Error al crear preferencia: { ... }
```

### 4. Verificar Configuración de MercadoPago

#### Verificar Token de Acceso

El token debe ser de **prueba** (empieza con `APP_USR-`) y estar configurado como secret:

```bash
# Verificar que el secret esté configurado
npx supabase secrets list

# Deberías ver:
# MERCADOPAGO_ACCESS_TOKEN
```

#### Verificar URLs de Retorno

Las URLs de retorno deben ser accesibles públicamente. Verifica en los logs:

```
successUrl: https://chorroybuenas.com.mx/comprar-tokens?success=1&payment_id={payment_id}
failureUrl: https://chorroybuenas.com.mx/comprar-tokens?cancel=1
pendingUrl: https://chorroybuenas.com.mx/comprar-tokens?pending=1&payment_id={payment_id}
```

**Problemas comunes:**
- URLs con `localhost` (MercadoPago no puede redirigir a localhost)
- URLs con puertos no estándar
- URLs que no son HTTPS en producción

### 5. Verificar Datos de Prueba de MercadoPago

Si el error ocurre **después** de redirigir a MercadoPago (en la página de pago):

#### Tarjetas de Prueba Correctas

**Tarjeta Aprobada:**
- Número: `5031 7557 3453 0604`
- CVV: `123`
- Vencimiento: `11/25` (cualquier fecha futura)
- Nombre: Cualquiera
- Documento: Cualquiera

**Tarjeta Rechazada (para probar errores):**
- Número: `5031 4332 1540 6351`

#### Errores Comunes en MercadoPago

**"No pudimos procesar tu pago"** puede deberse a:

1. **Token de prueba inválido**
   - Verifica que el token empiece con `APP_USR-`
   - Verifica que sea de la cuenta correcta

2. **URLs de retorno inválidas**
   - MercadoPago valida que las URLs sean accesibles
   - Deben ser HTTPS (excepto en desarrollo local con ngrok)

3. **Datos de la preferencia inválidos**
   - Precio debe ser > 0
   - Moneda debe ser válida (`MXN`)
   - `unit_price` debe estar en pesos, no centavos

4. **Problemas con el email del pagador**
   - Si `user.email` es `null`, puede causar problemas
   - Verifica que el usuario tenga email válido

### 6. Verificar Respuesta de la API de MercadoPago

Si los logs muestran un error de MercadoPago, revisa la respuesta completa:

```javascript
// En los logs verás algo como:
Error Mercado Pago - Respuesta completa: {
  "message": "...",
  "error": "...",
  "status": 400,
  "status_detail": "...",
  "cause": [...]
}
```

**Errores comunes y soluciones:**

| Error | Causa | Solución |
|-------|-------|----------|
| `invalid_access_token` | Token inválido | Verificar `MERCADOPAGO_ACCESS_TOKEN` |
| `invalid_back_urls` | URLs inválidas | Verificar que las URLs sean HTTPS y accesibles |
| `invalid_item_price` | Precio inválido | Verificar que `unit_price` sea > 0 y en formato correcto |
| `invalid_currency_id` | Moneda inválida | Verificar que sea `MXN` |
| `invalid_payer_email` | Email inválido | Verificar que el usuario tenga email |

### 7. Probar con cURL (Debugging Avanzado)

Puedes probar directamente la API de MercadoPago:

```bash
# Reemplaza YOUR_ACCESS_TOKEN con tu token de prueba
curl -X POST \
  'https://api.mercadopago.com/checkout/preferences' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer APP_USR-2419090923672573-020902-5155f5eba9e00547f91f2a2cee11d6b3-2691981774' \
  -d '{
    "items": [
      {
        "title": "Tokens de IA - 10 tokens",
        "description": "Pack de 10 tokens",
        "quantity": 1,
        "unit_price": 20.00,
        "currency_id": "MXN"
      }
    ],
    "back_urls": {
      "success": "https://chorroybuenas.com.mx/comprar-tokens?success=1&payment_id={payment_id}",
      "failure": "https://chorroybuenas.com.mx/comprar-tokens?cancel=1",
      "pending": "https://chorroybuenas.com.mx/comprar-tokens?pending=1&payment_id={payment_id}"
    },
    "auto_return": "approved",
    "external_reference": "test-user-id"
  }'
```

Si esto funciona, el problema está en la Edge Function. Si no funciona, el problema está en la configuración de MercadoPago.

## Checklist de Verificación

- [ ] Token de MercadoPago configurado como secret en Supabase
- [ ] Token es de prueba (empieza con `APP_USR-`)
- [ ] URLs de retorno son HTTPS y accesibles públicamente
- [ ] Usuario tiene email válido
- [ ] Precio es > 0 y está en formato correcto (pesos, no centavos)
- [ ] Moneda es `MXN`
- [ ] Edge Function está desplegada con los secrets correctos
- [ ] Logs muestran que la preferencia se crea correctamente
- [ ] Tarjeta de prueba es correcta (5031 7557 3453 0604)

## Próximos Pasos

1. **Revisa los logs** siguiendo el paso 1
2. **Identifica el error** usando los pasos 2-6
3. **Aplica la solución** según el error encontrado
4. **Vuelve a probar** la compra

Si después de seguir estos pasos el problema persiste, comparte:
- Los logs de la Edge Function
- El error completo de la consola del navegador
- El error que muestra MercadoPago (si es visible)
