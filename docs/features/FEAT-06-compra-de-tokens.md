# FEAT-06 — Compra de tokens

**Prioridad:** Alta · **Findings:** H7, M1, M4 · **Plan:** Tasks 6, 7 y 9

**Objetivo:** que la creación de la preferencia de pago valide lo que recibe, use el modo de Mercado Pago correcto y solo redirija a sitios propios.

**Contexto:** `create-payment-preference` acepta `custom_tokens` sin revisar el tipo, decide si está en modo prueba con una condición que siempre es verdadera, y toma del cliente la URL a la que Mercado Pago regresa al usuario.

---

## CYB-601 — Validar la solicitud de compra

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** En revisión — implementado y probado (`parsePreferenceRequest`, `resolvePurchaseItem`); falta probar en dev (FEAT-12)
- **Finding:** H7
- **Plan:** Task 6 (`validation.ts`), Task 9
- **Depende de:** CYB-201

### Descripción

Como dueño del negocio, quiero que la función rechace solicitudes de compra mal formadas, para no crear preferencias con montos inválidos ni tokens fraccionarios.

### Criterios de aceptación

- [x] La solicitud debe traer `pack_id` o `custom_tokens`, exactamente uno.
- [x] `pack_id` debe ser un UUID.
- [x] `custom_tokens` debe ser un número entero entre 1 y 500.
- [x] `promo_code` es opcional; si viene debe ser texto de máximo 64 caracteres. Se normaliza a mayúsculas sin espacios; vacío equivale a no enviarlo.
- [x] El monto calculado debe ser un entero de centavos mayor a 0.
- [x] Toda solicitud inválida responde 400 con un mensaje claro y no llama a Mercado Pago.
- [x] Solo se aceptan peticiones `POST`.

### Escenarios

**Escenario 1: compra de un pack válido**
- Dado un usuario autenticado y un pack activo
- Cuando envía `{ "pack_id": "<uuid>" }`
- Entonces recibe 200 con la URL de pago

**Escenario 2: tokens fraccionarios**
- Dado un usuario autenticado
- Cuando envía `{ "custom_tokens": 1.5 }`
- Entonces recibe 400 "custom_tokens debe ser un entero entre 1 y 500"

**Escenario 3: tokens como texto**
- Cuando envía `{ "custom_tokens": "5" }`
- Entonces recibe 400

**Escenario 4: fuera de rango**
- Cuando envía `{ "custom_tokens": 0 }` o `{ "custom_tokens": 501 }`
- Entonces recibe 400

**Escenario 5: pack y cantidad a la vez**
- Cuando envía `{ "pack_id": "<uuid>", "custom_tokens": 5 }`
- Entonces recibe 400

**Escenario 6: pack inexistente o inactivo**
- Cuando envía el UUID de un pack desactivado
- Entonces recibe 400 "Pack no encontrado o inactivo"

**Escenario 7: cuerpo que no es JSON**
- Cuando envía texto plano
- Entonces recibe 400 "Body inválido"

**Escenario 8: sin sesión**
- Cuando envía una solicitud válida sin `Authorization`
- Entonces recibe 401

---

## CYB-602 — Modo sandbox o producción explícito

- **Tipo:** Bug
- **Prioridad:** Media
- **Estado:** En revisión — implementado y probado; faltan los secrets: `MP_USE_SANDBOX_CHECKOUT=true` en dev y eliminar `MP_USE_PRODUCTION_CHECKOUT` en ambos
- **Finding:** M1
- **Plan:** Task 7 (`checkout.ts`), Task 9, Task 15
- **Depende de:** CYB-201

### Descripción

Como dueño del negocio, quiero que el checkout sea de producción salvo que yo indique lo contrario, para que un secret faltante no mande a clientes reales al sandbox.

Hoy `isTestMode` es verdadero siempre (los tokens de producción también empiezan con `APP_USR-`), por lo que nunca se envía el correo del comprador, y se prefiere el `sandbox_init_point` si no existe un secret.

### Criterios de aceptación

- [x] El modo es producción por defecto.
- [x] El modo es sandbox solo si `MP_USE_SANDBOX_CHECKOUT` vale exactamente `true`.
- [x] En producción se usa `init_point` y se envía el correo del comprador a Mercado Pago.
- [x] En sandbox se usa `sandbox_init_point` (o `init_point` si no viene) y no se envía el correo.
- [ ] El secret `MP_USE_PRODUCTION_CHECKOUT` deja de usarse y se elimina de ambos entornos.
- [ ] El entorno de dev tiene `MP_USE_SANDBOX_CHECKOUT=true`.

### Escenarios

**Escenario 1: producción sin secret**
- Dado que `MP_USE_SANDBOX_CHECKOUT` no está definido
- Cuando un usuario inicia una compra
- Entonces es redirigido al checkout de producción y la preferencia incluye su correo

**Escenario 2: dev con sandbox**
- Dado `MP_USE_SANDBOX_CHECKOUT=true`
- Cuando un usuario inicia una compra
- Entonces es redirigido al checkout de sandbox y la preferencia no incluye correo

**Escenario 3: valor distinto de `true`**
- Dado `MP_USE_SANDBOX_CHECKOUT=false` o `1`
- Cuando un usuario inicia una compra
- Entonces se usa producción

**Escenario 4: Mercado Pago no devuelve URL**
- Dado que la respuesta de MP no trae `init_point`
- Cuando se procesa
- Entonces la función responde 502 "No se recibió URL de pago"

---

## CYB-603 — URL de retorno solo a sitios propios

- **Tipo:** Bug de seguridad
- **Prioridad:** Media
- **Estado:** En revisión — implementado y probado; falta configurar `ALLOWED_ORIGINS` en dev y prod
- **Finding:** M4
- **Plan:** Task 7 (`checkout.ts`), Task 9, Task 15
- **Depende de:** CYB-201

### Descripción

Como comprador, quiero que después de pagar siempre regrese al sitio de chorroybuenas, para que nadie pueda usar el flujo de pago para llevarme a otra página.

### Criterios de aceptación

- [x] La URL de retorno enviada por el cliente solo se usa si su origen está en `ALLOWED_ORIGINS`.
- [x] Se usa únicamente el origen; se descartan ruta y parámetros.
- [x] Si no viene, no es una URL válida o no está permitida, se usa `APP_URL` o `https://chorroybuenas.com.mx`.
- [ ] `ALLOWED_ORIGINS` está configurado en dev (localhost y ngrok) y en prod (dominio con y sin `www`).

### Escenarios

**Escenario 1: origen permitido**
- Dado `ALLOWED_ORIGINS` con `https://chorroybuenas.com.mx`
- Cuando el cliente envía `app_url: "https://chorroybuenas.com.mx"`
- Entonces las URLs de retorno apuntan a `https://chorroybuenas.com.mx/comprar-tokens`

**Escenario 2: origen ajeno**
- Cuando el cliente envía `app_url: "https://evil.test"`
- Entonces las URLs de retorno apuntan al sitio por defecto

**Escenario 3: dominio parecido**
- Cuando el cliente envía `app_url: "https://chorroybuenas.com.mx.evil.test"`
- Entonces se usa el sitio por defecto

**Escenario 4: valor que no es URL**
- Cuando el cliente envía `app_url: "javascript:alert(1)"`
- Entonces se usa el sitio por defecto

**Escenario 5: desarrollo con ngrok**
- Dado que la URL de ngrok está en `ALLOWED_ORIGINS` de dev
- Cuando se compra desde esa URL
- Entonces el retorno vuelve a ngrok

---

## CYB-604 — Detectar bien la primera compra

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** En revisión — implementado (lecturas con service role); falta probar una segunda compra en dev
- **Finding:** hallazgo nuevo al preparar el plan
- **Plan:** Task 9
- **Depende de:** CYB-601

### Descripción

Como dueño del negocio, quiero que la promoción de primera compra solo se ofrezca a quien realmente no ha comprado, para que el bono mostrado al pagar coincida con el que se acredita.

Hoy la función cuenta las compras con un cliente sin el JWT del usuario; RLS devuelve 0 filas y toda compra parece la primera. El bono solo se corrige al acreditar, así que el cobro en Mercado Pago muestra un bono que luego no llega.

### Criterios de aceptación

- [x] El conteo de compras del usuario se hace con service role.
- [x] Un usuario con al menos una compra no recibe la promoción de primera compra en la preferencia.
- [x] El título y la descripción del cobro en Mercado Pago reflejan los tokens que realmente se acreditarán.
- [x] Si falla la consulta de compras, la función responde error y no crea la preferencia.

### Escenarios

**Escenario 1: primera compra**
- Dado un usuario sin compras y una promoción de primera compra del 20 %
- Cuando compra el pack de 10 tokens
- Entonces el cobro dice "+ 2 de promoción" y se le acreditan

**Escenario 2: segunda compra**
- Dado un usuario con una compra previa
- Cuando compra el pack de 10 tokens sin código
- Entonces el cobro no menciona promoción y no se acredita bono

**Escenario 3: dos preferencias antes de pagar**
- Dado un usuario sin compras que abre dos checkouts con bono de primera compra
- Cuando paga los dos
- Entonces el bono se acredita solo en el primero que se procesa

**Escenario 4: falla la lectura de compras**
- Dado que la consulta a `token_purchases` devuelve error
- Cuando el usuario inicia la compra
- Entonces recibe "No se pudo preparar la compra. Intenta de nuevo." y no se crea preferencia
