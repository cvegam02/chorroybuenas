# FEAT-03 — Acreditación de pagos

**Prioridad:** Crítica · **Findings:** C3, M3 · **Plan:** Tasks 3, 6, 7 y 10

**Objetivo:** que cada pago aprobado de Mercado Pago acredite tokens exactamente una vez, por el monto correcto, y que un fallo temporal no deje un pago sin acreditar.

**Contexto:** hoy `webhook-mercadopago` y `credit-payment-on-return` preguntan "¿ya existe este `payment_id`?" y, si no, acreditan. No hay restricción única en la tabla, y Mercado Pago avisa del mismo pago por varias vías casi al mismo tiempo (notificación `payment`, notificación `merchant_order` y el regreso del usuario a la página de éxito).

---

## CYB-301 — Un pago se acredita una sola vez

- **Tipo:** Bug
- **Prioridad:** Crítica
- **Estado:** Hecho — validado en DEV con un pago de prueba real y desplegado en PROD el 2026-10-06
- **Finding:** C3
- **Plan:** Task 3 (migración 022), Task 10
- **Depende de:** CYB-204, CYB-305

### Descripción

Como dueño del negocio, quiero que un mismo pago nunca sume tokens dos veces, para no regalar saldo cuando Mercado Pago notifica el pago por más de un canal.

### Criterios de aceptación

- [x] `token_purchases` tiene un índice único sobre `(payment_provider, payment_id)` para filas con `payment_id` no nulo.
- [x] `add_tokens_after_purchase` registra primero la compra y solo suma saldo si la fila se insertó.
- [x] Si el pago ya estaba registrado, la función no falla y devuelve el saldo actual.
- [x] La función rechaza un `payment_id` nulo o vacío.
- [x] La función solo es ejecutable por `service_role`.
- [x] El webhook y la función de retorno llaman a la misma RPC, sin su propio chequeo previo de existencia.

### Escenarios

**Escenario 1: webhook y retorno llegan a la vez**
- Dado un pago aprobado de un pack de 10 + 2 tokens
- Cuando el webhook y `credit-payment-on-return` procesan el mismo `payment_id` en paralelo
- Entonces el saldo del usuario sube 12 y existe una sola fila en `token_purchases`

**Escenario 2: Mercado Pago reenvía la notificación**
- Dado un pago que ya fue acreditado
- Cuando llega otra vez la notificación del mismo pago
- Entonces el webhook responde 200 y el saldo no cambia

**Escenario 3: notificación `payment` y `merchant_order` del mismo pago**
- Dado un pago aprobado
- Cuando llegan ambas notificaciones
- Entonces solo la primera acredita

**Escenario 4: un usuario intenta llamar la RPC directamente**
- Dado un usuario autenticado con su JWT
- Cuando invoca `add_tokens_after_purchase` desde el cliente
- Entonces recibe un error de permisos y su saldo no cambia

**Escenario 5: llamada sin `payment_id`**
- Dado el rol de servicio
- Cuando se llama la RPC con `p_payment_id` nulo
- Entonces la función lanza `p_payment_id is required` y no acredita

---

## CYB-302 — Reintento de Mercado Pago ante fallos temporales

- **Tipo:** Bug
- **Prioridad:** Media
- **Estado:** Hecho — validado en DEV con un pago de prueba real y desplegado en PROD el 2026-10-06
- **Finding:** M3
- **Plan:** Task 10
- **Depende de:** CYB-301

### Descripción

Como comprador, quiero que mi pago se acredite aunque el servidor haya tenido un fallo momentáneo, para no pagar y quedarme sin tokens.

Hoy el webhook responde 200 ante cualquier excepción, así que Mercado Pago da la notificación por entregada y no la reintenta.

### Criterios de aceptación

- [x] Ante un error inesperado (base de datos, red, API de MP) el webhook responde 500.
- [x] Cuando no hay nada que acreditar (pago no aprobado, tema desconocido, pago ya acreditado) responde 200.
- [x] El error completo queda en los logs de la función; la respuesta no incluye detalles internos.
- [x] Un reintento posterior del mismo pago acredita correctamente (gracias a CYB-301).

### Escenarios

**Escenario 1: la base de datos falla al acreditar**
- Dado un pago aprobado
- Cuando la RPC de acreditación devuelve error
- Entonces el webhook responde 500 y Mercado Pago reintenta más tarde

**Escenario 2: el reintento llega cuando el servicio ya se recuperó**
- Dado que el primer intento falló con 500
- Cuando Mercado Pago reenvía la notificación
- Entonces el pago se acredita una vez y el webhook responde 200

**Escenario 3: pago aún pendiente**
- Dado un pago en estado `pending`
- Cuando llega su notificación
- Entonces el webhook responde 200 sin acreditar

**Escenario 4: la API de Mercado Pago no responde**
- Dado que la consulta del pago a MP devuelve 5xx
- Cuando el webhook procesa la notificación
- Entonces responde 500 para que se reintente

---

## CYB-303 — Verificar la firma de las notificaciones

- **Tipo:** Historia (seguridad)
- **Prioridad:** Media
- **Estado:** En revisión — implementado y probado; falta crear el secret `MERCADOPAGO_WEBHOOK_SECRET` en dev y prod
- **Finding:** M3
- **Plan:** Task 7 (`mpSignature.ts`), Task 10
- **Depende de:** nada

### Descripción

Como dueño del negocio, quiero que el webhook rechace notificaciones con firma inválida, para que un tercero no pueda hacerse pasar por Mercado Pago.

Las notificaciones IPN antiguas (`?topic=…&id=…`) no vienen firmadas y se siguen aceptando; no es un riesgo porque el webhook nunca confía en el cuerpo recibido: siempre consulta el pago en la API de MP.

### Criterios de aceptación

- [ ] Existe el secret `MERCADOPAGO_WEBHOOK_SECRET` en dev y prod.
- [x] Si la notificación trae `x-signature` y la firma no coincide, el webhook responde 401 y no procesa nada.
- [x] La firma se calcula como HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` y se compara en tiempo constante.
- [x] El `data.id` se normaliza a minúsculas antes de firmar.
- [x] Una notificación sin `x-signature` se procesa con normalidad.

### Escenarios

**Escenario 1: firma válida**
- Dado una notificación con `x-signature` correcta
- Cuando llega al webhook
- Entonces se procesa con normalidad

**Escenario 2: firma alterada**
- Dado una notificación cuyo `data.id` fue modificado después de firmar
- Cuando llega al webhook
- Entonces responde 401 y no consulta ni acredita nada

**Escenario 3: header mal formado**
- Dado una notificación con `x-signature: hola`
- Cuando llega al webhook
- Entonces responde 401

**Escenario 4: notificación IPN sin firma**
- Dado una notificación `?topic=merchant_order&id=123` sin `x-signature`
- Cuando llega al webhook
- Entonces se procesa, consultando la orden en la API de MP

---

## CYB-304 — Validar monto y datos del pago antes de acreditar

- **Tipo:** Historia (seguridad)
- **Prioridad:** Alta
- **Estado:** Hecho — validado en DEV con un pago de prueba real y desplegado en PROD el 2026-10-06
- **Findings:** C3, M5
- **Plan:** Task 6 (`credit.ts`), Task 10
- **Depende de:** nada

### Descripción

Como dueño del negocio, quiero que solo se acrediten tokens cuando el pago corresponde a la preferencia que generó mi servidor y por el monto esperado, para que nadie reciba tokens por un pago menor o con datos manipulados.

### Criterios de aceptación

- [x] Los tokens a acreditar salen únicamente de la metadata de la preferencia creada por el servidor.
- [x] No se acredita si el monto pagado es menor al `amount_cents` de la preferencia.
- [x] No se acredita si la metadata tiene cantidades negativas, fraccionarias o no numéricas.
- [x] No se acredita si el total de tokens es 0.
- [x] En `credit-payment-on-return`, el `external_reference` del pago debe ser el usuario de la sesión; si no, responde 403.
- [x] `payment_id` debe ser numérico; cualquier otro valor se rechaza con 400.
- [x] Las respuestas de error no incluyen mensajes internos de la base de datos.

### Escenarios

**Escenario 1: pago por el monto exacto**
- Dado una preferencia de $20.00 MXN y un pago aprobado de $20.00
- Cuando se procesa
- Entonces se acreditan los tokens de la preferencia

**Escenario 2: pago por un monto menor**
- Dado una preferencia de $20.00 MXN y un pago aprobado de $1.00
- Cuando se procesa
- Entonces no se acredita nada y queda registrado en los logs

**Escenario 3: pago de otra cuenta**
- Dado el usuario A con sesión iniciada
- Cuando envía a `credit-payment-on-return` el `payment_id` de un pago del usuario B
- Entonces recibe 403 y ningún saldo cambia

**Escenario 4: `payment_id` con caracteres no numéricos**
- Dado un usuario autenticado
- Cuando envía `payment_id: "123/../../x"`
- Entonces recibe 400 y no se consulta la API de MP

**Escenario 5: preferencia sin metadata**
- Dado un pago cuya preferencia no tiene metadata
- Cuando se procesa
- Entonces no se acredita y la respuesta indica `invalid_metadata`

---

## CYB-305 — Corregir pagos duplicados existentes antes de migrar

- **Tipo:** Tarea técnica (datos)
- **Prioridad:** Crítica
- **Estado:** Por hacer — de Carlos: correr la consulta de duplicados en dev y prod. La guarda de la migración ya está implementada y verificada.
- **Finding:** C3
- **Plan:** Task 3, Step 5
- **Depende de:** nada
- **Responsable:** Carlos (decisión caso por caso)

### Descripción

Como dueño del negocio, quiero saber si ya hubo pagos acreditados más de una vez y corregirlos, para que el índice único se pueda crear y los saldos queden correctos.

### Criterios de aceptación

- [ ] Se ejecutó la consulta de duplicados en dev y en prod.
- [ ] Para cada duplicado se conservó la compra más antigua, se borraron las demás y se restaron del saldo los tokens de más.
- [x] La migración 022 se detiene con un mensaje claro si quedan duplicados. (verificado: aborta sin crear el índice ni cambiar la función)
- [ ] Después de la corrección, la consulta de duplicados no devuelve filas.

### Escenarios

**Escenario 1: no hay duplicados**
- Dado que la consulta no devuelve filas
- Cuando se aplica la migración 022
- Entonces se crea el índice único sin errores

**Escenario 2: hay duplicados sin corregir**
- Dado que existe un `payment_id` con dos compras
- Cuando se intenta aplicar la migración 022
- Entonces falla con el mensaje "token_purchases tiene payment_id duplicados" y no cambia nada

**Escenario 3: el usuario ya gastó los tokens de más**
- Dado un duplicado cuyo usuario tiene saldo menor a los tokens a restar
- Cuando se revisa el caso
- Entonces Carlos decide si deja el saldo en 0 o lo absorbe, y la decisión queda anotada
