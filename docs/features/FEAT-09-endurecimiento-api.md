# FEAT-09 — Endurecimiento de la API

**Prioridad:** Media · **Findings:** M5, M8 · **Plan:** Tasks 7, 9, 10, 11 y 12

**Objetivo:** que las edge functions solo respondan a los sitios propios y no revelen detalles internos cuando fallan.

**Contexto:** las cuatro funciones responden con `Access-Control-Allow-Origin: *`, y varias devuelven al cliente el texto crudo de errores de Mercado Pago, Replicate o Postgres.

---

## CYB-901 — CORS por lista blanca

- **Tipo:** Bug de seguridad
- **Prioridad:** Media
- **Estado:** En revisión — implementado y probado (`cors.ts` en FEAT-03; guardas en `hardening.test.ts`); falta crear `ALLOWED_ORIGINS` y comprobar las cabeceras reales en dev
- **Finding:** M8
- **Plan:** Task 7 (`cors.ts`), Tasks 9, 10, 11 y 15
- **Depende de:** CYB-201

### Descripción

Como dueño del negocio, quiero que solo mi frontend pueda llamar a las funciones desde un navegador, para que otro sitio no pueda usar la sesión de mis usuarios contra mi API.

### Criterios de aceptación

- [x] Las funciones llamadas desde el navegador (`create-payment-preference`, `credit-payment-on-return`, `transform-loteria`) usan la lista `ALLOWED_ORIGINS`.
- [x] Un origen permitido recibe su propio origen en `Access-Control-Allow-Origin`.
- [x] Un origen no permitido recibe el primer origen de la lista, de modo que el navegador bloquea la respuesta.
- [x] Si la lista está vacía no se emite `Access-Control-Allow-Origin`.
- [x] Las respuestas incluyen `Vary: Origin`.
- [x] `webhook-mercadopago` no emite cabeceras CORS (lo llama un servidor, no un navegador).
- [x] Ninguna función responde con `*`.
- [x] Los orígenes se comparan sin diagonal final.

### Escenarios

**Escenario 1: petición desde el sitio de producción**
- Dado `ALLOWED_ORIGINS=https://chorroybuenas.com.mx`
- Cuando el navegador llama desde ese origen
- Entonces la respuesta trae `Access-Control-Allow-Origin: https://chorroybuenas.com.mx` y la petición funciona

**Escenario 2: petición desde otro sitio**
- Cuando una página en `https://evil.test` llama a la función
- Entonces la cabecera no coincide con su origen y el navegador bloquea la respuesta

**Escenario 3: preflight**
- Cuando el navegador envía `OPTIONS` desde un origen permitido
- Entonces recibe 200 con las cabeceras CORS correctas

**Escenario 4: desarrollo local**
- Dado `ALLOWED_ORIGINS` de dev con `http://localhost:5173`
- Cuando se llama desde `npm run dev`
- Entonces la petición funciona

**Escenario 5: secret sin configurar**
- Dado que `ALLOWED_ORIGINS` no está definido
- Cuando el navegador llama a la función
- Entonces la respuesta no trae `Access-Control-Allow-Origin` y el navegador la bloquea

**Escenario 6: llamada servidor a servidor**
- Dado Mercado Pago llamando al webhook sin cabecera `Origin`
- Cuando llega la notificación
- Entonces se procesa con normalidad

---

## CYB-902 — Errores sin detalles internos

- **Tipo:** Bug de seguridad
- **Prioridad:** Media
- **Estado:** En revisión — implementado en las cuatro funciones y en `PurchaseService`, con guardas de regresión; falta comprobar una respuesta de error real en dev
- **Finding:** M5
- **Plan:** Tasks 9, 10, 11 y 12 (`PurchaseService.ts`)
- **Depende de:** nada

### Descripción

Como dueño del negocio, quiero que los errores que ve el cliente sean genéricos y que el detalle quede solo en los logs, para no revelar información de mis proveedores ni de mi base de datos.

### Criterios de aceptación

- [x] Ninguna respuesta de error incluye el campo `details`.
- [x] Ninguna respuesta incluye el texto crudo de Mercado Pago, Replicate o Postgres.
- [x] Cada error lleva un código estable (`error`) y un mensaje en español (`message`).
- [x] El detalle completo se escribe con `console.error` en la función.
- [x] `PurchaseService` ya no concatena "Detalles: …" al mensaje mostrado al usuario.
- [x] Los errores de proveedor externo responden 502; los de configuración, 500.
- [x] El mensaje de sesión inválida no reenvía el texto del proveedor de autenticación.

### Escenarios

**Escenario 1: Mercado Pago rechaza la preferencia**
- Dado que MP responde 400 con un JSON de error
- Cuando la función responde al cliente
- Entonces el cuerpo es `{ "error": "MP_ERROR", "message": "Mercado Pago rechazó la solicitud. Intenta de nuevo." }` y el JSON de MP solo está en los logs

**Escenario 2: falla una RPC**
- Dado que `add_tokens_after_purchase` devuelve un error de Postgres
- Cuando `credit-payment-on-return` responde
- Entonces el mensaje es genérico y no contiene nombres de tablas ni funciones

**Escenario 3: Replicate devuelve un error**
- Dado que Replicate responde 422 con detalle técnico
- Cuando `transform-loteria` responde
- Entonces el cliente recibe `AI_ERROR` con mensaje genérico

**Escenario 4: lo que ve el usuario al fallar la compra**
- Dado un error de Mercado Pago
- Cuando la página de compra muestra el aviso
- Entonces el texto no contiene "Detalles:" ni JSON

**Escenario 5: falta un secret**
- Dado que falta `MERCADOPAGO_ACCESS_TOKEN`
- Cuando se llama la función
- Entonces responde 500 "Error de configuración del servidor." sin decir qué secret falta
