# FEAT-04 — Cobro de tokens de IA

**Prioridad:** Crítica · **Findings:** C2, H5, H8 · **Plan:** Tasks 4, 8, 11 y 12

**Objetivo:** que cada imagen generada con IA cueste un token, que el cobro lo decida el servidor y que el usuario no pague por transformaciones que fallaron.

**Contexto:** hoy `transform-loteria` solo verifica que haya sesión. El token lo descuenta el navegador después, llamando a `spend_tokens`; si esa llamada falla, solo se escribe en consola. Cualquier usuario registrado puede llamar la función directamente y generar imágenes sin límite a cuenta de la factura de Replicate.

---

## CYB-401 — El servidor cobra el token antes de generar

- **Tipo:** Bug de seguridad
- **Prioridad:** Crítica
- **Estado:** Hecho — validado en DEV con una transformación real y desplegado en PROD el 2026-10-06
- **Finding:** C2
- **Plan:** Task 4 (migración 023), Task 11
- **Depende de:** CYB-204, CYB-403

### Descripción

Como dueño del negocio, quiero que la edge function descuente el token antes de llamar a Replicate, para que nadie pueda generar imágenes sin pagar.

### Criterios de aceptación

- [x] `transform-loteria` llama a `spend_tokens_for_user` con service role antes de crear la predicción.
- [x] Sin saldo suficiente responde 402 `INSUFFICIENT_TOKENS` y no llama a Replicate.
- [x] Cada cobro deja una fila en `token_usage` con el usuario y, si aplica, el set.
- [x] El set solo se registra si pertenece al usuario; si no, queda en nulo.
- [x] `spend_tokens_for_user` solo es ejecutable por `service_role`.
- [x] Una transformación exitosa descuenta exactamente 1 token.

### Escenarios

**Escenario 1: usuario con saldo transforma una carta**
- Dado un usuario con 5 tokens
- Cuando transforma una imagen desde el editor
- Entonces recibe la imagen, su saldo queda en 4 y hay una fila nueva en `token_usage`

**Escenario 2: usuario sin saldo**
- Dado un usuario con 0 tokens
- Cuando intenta transformar una imagen
- Entonces ve "No tienes tokens suficientes" y no se crea ninguna predicción en Replicate

**Escenario 3: llamada directa a la función sin saldo**
- Dado un usuario con 0 tokens y su JWT
- Cuando hace `POST /functions/v1/transform-loteria` con una imagen válida
- Entonces recibe 402 y no se genera nada

**Escenario 4: `set_id` de otro usuario**
- Dado un usuario que envía el `set_id` de una lotería ajena
- Cuando se cobra el token
- Entonces el uso se registra con `set_id` nulo

**Escenario 5: petición sin sesión**
- Dado una petición sin header `Authorization`
- Cuando llega a la función
- Entonces responde 401 y no cobra

---

## CYB-402 — Reembolso automático cuando la IA falla

- **Tipo:** Historia
- **Prioridad:** Crítica
- **Estado:** En revisión — implementado y probado (`runCharged`, `refund_token_usage`); falta probarlo con una falla real de Replicate en dev
- **Finding:** C2
- **Plan:** Task 4 (`refund_token_usage`), Task 8 (`runCharged`), Task 11
- **Depende de:** CYB-401

### Descripción

Como usuario, quiero que se me devuelva el token si la imagen no se pudo generar, para pagar solo por resultados que recibí.

### Criterios de aceptación

- [x] Si Replicate falla, expira o bloquea el contenido, se llama a `refund_token_usage` con el id del cobro.
- [x] El reembolso devuelve los tokens y borra la fila de `token_usage`.
- [x] Reembolsar dos veces el mismo cobro no suma dos veces.
- [x] Si el cobro falla, no se ejecuta la IA ni se intenta reembolsar.
- [x] Si el reembolso falla, se registra en los logs y el usuario recibe el error original de la IA.
- [x] La UI refresca el saldo al terminar, haya éxito o error.

### Escenarios

**Escenario 1: Replicate devuelve error**
- Dado un usuario con 3 tokens
- Cuando la predicción termina en `failed`
- Entonces el usuario ve un mensaje de error y su saldo sigue en 3

**Escenario 2: la IA tarda más del tope**
- Dado un usuario con 3 tokens
- Cuando la predicción excede el tiempo máximo
- Entonces la predicción se cancela, el saldo sigue en 3 y el mensaje dice que no se cobró

**Escenario 3: filtro de contenido con reintentos**
- Dado una foto que dispara el filtro de contenido sensible en los prompts 0 y 1, y pasa en el 2
- Cuando el cliente reintenta con las tres variantes
- Entonces solo se cobra 1 token en total

**Escenario 4: reembolso duplicado**
- Dado un cobro ya reembolsado
- Cuando se vuelve a llamar `refund_token_usage` con el mismo id
- Entonces el saldo no cambia

**Escenario 5: la base falla al reembolsar**
- Dado que la IA falló y la RPC de reembolso devuelve error
- Cuando termina la petición
- Entonces el usuario recibe el error de la IA y en los logs queda el id del cobro pendiente de revisar

---

## CYB-403 — El saldo nunca es negativo

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** Hecho — validado en DEV con una transformación real y desplegado en PROD el 2026-10-06
- **Finding:** H5
- **Plan:** Task 4 (migración 023)
- **Depende de:** CYB-204
- **Responsable de datos:** Carlos (saldos negativos existentes)

### Descripción

Como dueño del negocio, quiero que sea imposible gastar más tokens de los que se tienen, aunque lleguen varias peticiones al mismo tiempo.

Hoy `spend_tokens` lee el saldo y luego lo actualiza en dos pasos, y la tabla no tiene restricción: dos llamadas simultáneas pueden pasar ambas la validación.

### Criterios de aceptación

- [x] El descuento es un solo `UPDATE … WHERE balance >= monto`.
- [x] `user_tokens.balance` tiene `check (balance >= 0)`.
- [ ] Antes de migrar se consultaron los saldos negativos existentes en dev y prod, y se corrigieron.
- [x] La migración 023 se detiene con un mensaje claro si hay saldos negativos.
- [x] Un monto de 0 o negativo se rechaza.

### Escenarios

**Escenario 1: dos peticiones simultáneas con 1 token**
- Dado un usuario con 1 token
- Cuando llegan dos transformaciones al mismo tiempo
- Entonces una se cobra y la otra recibe `INSUFFICIENT_TOKENS`; el saldo queda en 0

**Escenario 2: intento de dejar el saldo negativo**
- Dado el rol de servicio
- Cuando se ejecuta `update user_tokens set balance = -1`
- Entonces Postgres rechaza el cambio por la restricción

**Escenario 3: migración con saldos negativos**
- Dado que existe un usuario con saldo -2
- Cuando se aplica la migración 023
- Entonces falla con "user_tokens tiene saldos negativos" y no cambia nada

**Escenario 4: usuario sin fila de saldo**
- Dado un usuario que no tiene fila en `user_tokens`
- Cuando intenta transformar
- Entonces recibe `INSUFFICIENT_TOKENS`

---

## CYB-404 — Límite de transformaciones por minuto

- **Tipo:** Historia
- **Prioridad:** Alta
- **Estado:** En revisión — límite implementado y probado en SQL; el mensaje propio en la UI llega con FEAT-08 (CYB-804)
- **Finding:** H8
- **Plan:** Task 4 (migración 023), Task 11, Task 12
- **Depende de:** CYB-401

### Descripción

Como dueño del negocio, quiero limitar cuántas transformaciones puede pedir un usuario por minuto, para acotar el gasto en Replicate si una cuenta se usa de forma automatizada.

### Criterios de aceptación

- [x] Un usuario puede tener como máximo 10 usos registrados en los últimos 60 segundos.
- [x] Al exceder el límite la función responde 429 `RATE_LIMITED` sin cobrar ni llamar a Replicate.
- [x] La UI muestra "Vas muy rápido. Espera un minuto e intenta de nuevo." (hecho en FEAT-08, CYB-804)
- [x] El cliente no reintenta automáticamente ante `RATE_LIMITED`.
- [x] La transformación por lote (secuencial, ~45 s por imagen) no alcanza el límite en uso normal.

### Escenarios

**Escenario 1: uso normal en lote**
- Dado un usuario que transforma 20 cartas en lote
- Cuando el lote corre de forma secuencial
- Entonces ninguna petición es rechazada por el límite

**Escenario 2: ráfaga automatizada**
- Dado un script que envía 15 peticiones en 10 segundos
- Cuando llega la petición 11
- Entonces recibe 429 y no se le cobra

**Escenario 3: pasa el minuto**
- Dado un usuario que alcanzó el límite
- Cuando pasan 60 segundos desde su primer uso
- Entonces puede volver a transformar

**Escenario 4: los intentos fallidos no cuentan**
- Dado que 5 transformaciones fallaron y fueron reembolsadas
- Cuando se evalúa el límite
- Entonces esos 5 intentos no cuentan como usos

---

## CYB-405 — Quitar el cobro del navegador

- **Tipo:** Tarea técnica
- **Prioridad:** Crítica
- **Estado:** Hecho — validado en DEV con una transformación real y desplegado en PROD el 2026-10-06
- **Finding:** C2
- **Plan:** Task 4 (drop de `spend_tokens`), Task 5 (`TokenRepository`), Task 12 (`AIService`)
- **Depende de:** CYB-401

### Descripción

Como dueño del negocio, quiero eliminar del cliente todo el código que cobra tokens, para que exista un solo lugar donde se decide el cobro.

### Criterios de aceptación

- [x] Las funciones SQL `spend_tokens(integer)` y `spend_tokens(integer, uuid)` ya no existen.
- [x] `TokenRepository` no tiene `spendTokens`.
- [x] `AIService` no llama a ninguna RPC de cobro; solo invalida la caché del saldo al terminar.
- [x] El frontend envía `set_id` a la función para que el servidor registre el uso.
- [ ] Un navegador con el frontend viejo en caché no provoca doble cobro.

### Escenarios

**Escenario 1: llamada a la RPC eliminada**
- Dado un usuario con sesión
- Cuando ejecuta `supabase.rpc('spend_tokens', { p_amount: 1 })` desde la consola
- Entonces recibe "Could not find the function"

**Escenario 2: frontend viejo en caché tras el deploy**
- Dado un navegador que aún tiene el bundle anterior
- Cuando transforma una imagen
- Entonces el servidor cobra 1 token y la llamada vieja a `spend_tokens` falla en silencio; el total cobrado es 1

**Escenario 3: saldo actualizado en pantalla**
- Dado un usuario con 5 tokens visibles en la barra
- Cuando termina una transformación exitosa
- Entonces la barra muestra 4 sin recargar la página
