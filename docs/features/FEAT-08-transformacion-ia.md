# FEAT-08 — Transformación con IA

**Prioridad:** Alta · **Findings:** H8, M6 · **Plan:** Tasks 6, 8, 11 y 12

**Objetivo:** que la transformación de imágenes tenga límites claros, no finja éxitos y le diga al usuario qué pasó cuando falla.

**Contexto:** `transform-loteria` reintenta sin tope ante un 429, espera indefinidamente a que termine la predicción y acepta cualquier texto como imagen. En el cliente, si no hay sesión o el servicio no está configurado, se devuelve la foto original como si la IA la hubiera transformado, y un bloqueo NSFW se reintenta sin fin.

---

## CYB-801 — Validar la imagen recibida

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** En revisión — implementado y probado dentro de FEAT-04 (`validation.ts`, `transform.ts`); falta probar en dev
- **Finding:** H8
- **Plan:** Task 6 (`validateImageDataUri`), Task 11
- **Depende de:** CYB-201

### Descripción

Como dueño del negocio, quiero que la función solo procese imágenes con el formato y tamaño esperados, para no enviar a Replicate contenido arbitrario ni pagar por entradas enormes.

### Criterios de aceptación

- [x] La imagen debe ser un data URI base64 de tipo PNG, JPEG o WebP.
- [x] El tamaño máximo es de 3,000,000 de caracteres.
- [x] Una imagen inválida responde 400 antes de cobrar el token.
- [x] `model` solo admite `gpt-image` o `flux`; cualquier otro valor usa `gpt-image`.
- [x] `prompt_variant` solo admite 0, 1 o 2; otro valor usa 0.
- [x] `prompt_strength` fuera de 0–1 o no numérico usa 0.5.
- [x] `set_id` que no es UUID se ignora.

### Escenarios

**Escenario 1: imagen JPEG normal**
- Dado una foto redimensionada a 768 px por el cliente
- Cuando se envía a la función
- Entonces se acepta y se procesa

**Escenario 2: URL en lugar de imagen**
- Cuando se envía `"image": "https://example.com/a.jpg"`
- Entonces responde 400 y el saldo no cambia

**Escenario 3: SVG**
- Cuando se envía un data URI `image/svg+xml`
- Entonces responde 400

**Escenario 4: imagen demasiado grande**
- Cuando se envía un data URI de 5 millones de caracteres
- Entonces responde 400 "La imagen es demasiado grande"

**Escenario 5: sin imagen**
- Cuando el cuerpo no trae `image`
- Entonces responde 400

**Escenario 6: parámetros fuera de rango**
- Cuando se envía `prompt_variant: 9` y `prompt_strength: 5`
- Entonces se procesan con los valores por defecto

---

## CYB-802 — Topes de tiempo y reintentos con Replicate

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** En revisión — implementado y probado dentro de FEAT-04 (`replicate.ts`); falta probar en dev
- **Finding:** H8
- **Plan:** Task 8 (`replicate.ts`), Task 11
- **Depende de:** CYB-201

### Descripción

Como dueño del negocio, quiero que la función deje de esperar y de reintentar después de un límite razonable, para que una predicción atorada no consuma tiempo de cómputo ni siga facturando.

### Criterios de aceptación

- [x] Ante un 429 se reintenta como máximo 3 veces.
- [x] La espera entre reintentos respeta `retry_after`, con tope de 30 segundos.
- [x] Si se agotan los reintentos, la función responde error sin quedarse esperando.
- [x] El polling de la predicción tiene un tope de 120 segundos.
- [x] Al exceder el tope se cancela la predicción en Replicate y se responde 504 `AI_TIMEOUT`.
- [x] Un estado `canceled` se trata como terminado, sin seguir esperando.
- [x] Una salida vacía se trata como error.

### Escenarios

**Escenario 1: predicción normal**
- Dado una predicción que termina en 40 segundos
- Cuando la función hace polling cada 3 segundos
- Entonces devuelve la imagen

**Escenario 2: Replicate saturado momentáneamente**
- Dado que la primera petición devuelve 429 con `retry_after: 5`
- Cuando la función reintenta
- Entonces espera 5 segundos y la segunda petición crea la predicción

**Escenario 3: Replicate saturado de forma sostenida**
- Dado que Replicate devuelve 429 cuatro veces seguidas
- Cuando se agotan los reintentos
- Entonces la función responde error y se reembolsa el token

**Escenario 4: predicción atorada**
- Dado una predicción que sigue en `processing` tras 120 segundos
- Cuando se alcanza el tope
- Entonces se llama a `/predictions/<id>/cancel`, se responde 504 y se reembolsa el token

**Escenario 5: `retry_after` excesivo**
- Dado un 429 con `retry_after: 999`
- Cuando la función reintenta
- Entonces espera 30 segundos, no 999

**Escenario 6: predicción sin salida**
- Dado una predicción `succeeded` con `output` vacío
- Cuando se procesa
- Entonces se responde error y se reembolsa

---

## CYB-803 — No fingir éxito cuando no hubo transformación

- **Tipo:** Bug
- **Prioridad:** Media
- **Estado:** En revisión — implementado (`AIService` sin mock); falta probar en el navegador como invitado y con sesión expirada
- **Finding:** M6
- **Plan:** Task 12 (`AIService.ts`)
- **Depende de:** CYB-401

### Descripción

Como usuario, quiero que la app me avise cuando la IA no pudo transformar mi foto, en lugar de devolverme la misma foto como si ya estuviera lista.

### Criterios de aceptación

- [x] Sin sesión, la transformación lanza `NOT_LOGGED_IN` en vez de devolver la imagen original.
- [x] Si el servicio no está configurado, lanza `AI_NOT_CONFIGURED`.
- [x] `transformToLoteria` nunca devuelve la imagen de entrada.
- [ ] Una carta cuya transformación falló no queda marcada como "generada con IA".
- [x] Se eliminan el retraso simulado y la ruta de "mock".

### Escenarios

**Escenario 1: invitado intenta usar la IA**
- Dado un visitante sin sesión
- Cuando pide transformar una carta
- Entonces ve "Inicia sesión para transformar imágenes con IA" y la carta conserva su foto original sin marca de IA

**Escenario 2: servicio sin configurar**
- Dado un entorno sin `REPLICATE_API_TOKEN`
- Cuando un usuario pide transformar
- Entonces ve un mensaje de error y la carta no cambia

**Escenario 3: sesión expirada a mitad del uso**
- Dado un usuario cuya sesión venció
- Cuando pide transformar
- Entonces recibe el mensaje de iniciar sesión y no se le cobra

---

## CYB-804 — Mensajes de error que dicen qué pasó

- **Tipo:** Historia
- **Prioridad:** Media
- **Estado:** En revisión — implementado y probado el mapeo de códigos (`aiErrorToI18nKey`); falta ver los mensajes en el navegador en ambos idiomas
- **Findings:** M6, M5
- **Plan:** Task 12 (`aiFallback.ts`, `CardEditor.tsx`, textos)
- **Depende de:** CYB-803

### Descripción

Como usuario, quiero entender por qué falló la transformación y qué puedo hacer, en lugar de ver siempre "contacta al administrador".

### Criterios de aceptación

- [x] Cada código tiene su mensaje: saldo insuficiente, sin sesión, demasiadas solicitudes, tiempo agotado.
- [x] Cualquier otro error muestra el mensaje genérico existente.
- [x] Los mensajes existen en español y en inglés.
- [x] El mensaje de tiempo agotado aclara que no se cobró el token.
- [x] Los mismos mensajes se usan en la transformación individual y en la de lote.
- [x] La función responde con códigos de error fijos y mensajes genéricos, sin texto interno de Replicate ni de la base.
- [x] El saldo en pantalla se refresca después de un error.

### Escenarios

**Escenario 1: sin tokens**
- Dado un usuario con 0 tokens
- Cuando transforma una carta
- Entonces ve "No tienes tokens suficientes. Compra más para seguir usando la IA."

**Escenario 2: tiempo agotado**
- Dado que la IA excede el tope
- Cuando termina la petición
- Entonces ve "La IA tardó demasiado. No se te cobró el token; intenta de nuevo."

**Escenario 3: error desconocido**
- Dado que Replicate devuelve un error interno
- Cuando termina la petición
- Entonces ve el mensaje genérico y el detalle solo queda en los logs del servidor

**Escenario 4: interfaz en inglés**
- Dado el idioma de la app en inglés
- Cuando ocurre un error de saldo
- Entonces el mensaje aparece en inglés

**Escenario 5: lote que se queda sin saldo**
- Dado un lote de 5 cartas y un usuario con 2 tokens
- Cuando el lote llega a la tercera carta
- Entonces el lote se detiene mostrando el mensaje de saldo insuficiente y las dos primeras cartas quedan transformadas

---

## CYB-805 — Reintentos del cliente con límite

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** En revisión — implementado y probado (`aiFallback.ts`, 29 tests, 100 % de cobertura)
- **Finding:** hallazgo nuevo al preparar el plan; L3
- **Plan:** Task 12 (`aiFallback.ts`)
- **Depende de:** CYB-201

### Descripción

Como usuario, quiero que la app deje de intentar cuando mi foto es rechazada repetidamente, para no quedarme con un indicador de carga eterno.

Hoy un `NSFW_FILTER` se reintenta con el mismo prompt sin límite. La estrategia de reintentos se extrae además a un módulo propio con tests, lo que reduce `transformToLoteria` de ~110 líneas a ~25.

### Criterios de aceptación

- [x] Un bloqueo NSFW se reintenta como máximo 2 veces.
- [x] Ante contenido sensible se prueban los prompts 0, 1 y 2 en orden, y FLUX como último recurso.
- [x] Si FLUX también falla, el error es `SENSITIVE_PHOTO_NOT_SUPPORTED`.
- [x] Saldo insuficiente, sin sesión, límite de solicitudes, servicio no configurado y tiempo agotado no se reintentan.
- [x] Con `VITE_REPLICATE_USE_FLUX=true` se prueba FLUX primero y se cae a GPT-Image si falla por una causa reintentable.
- [x] La estrategia vive en `src/services/aiFallback.ts`, con cobertura de tests ≥ 80 %.

### Escenarios

**Escenario 1: foto bloqueada siempre por NSFW**
- Dado una foto que el filtro NSFW rechaza en cada intento
- Cuando el usuario pide transformarla
- Entonces se hacen 3 intentos en total y luego se muestra el error

**Escenario 2: foto sensible que pasa con el prompt 2**
- Dado una foto rechazada con los prompts 0 y 1
- Cuando se prueba el prompt 2
- Entonces se devuelve la imagen

**Escenario 3: foto sensible en todos los prompts**
- Dado una foto rechazada con los tres prompts
- Cuando se prueba FLUX y funciona
- Entonces se devuelve la imagen de FLUX

**Escenario 4: saldo agotado a mitad de los reintentos**
- Dado un usuario cuyo saldo llega a 0 entre reintentos
- Cuando el siguiente intento devuelve `INSUFFICIENT_TOKENS`
- Entonces se detiene de inmediato con ese error

**Escenario 5: FLUX primero y falla por saldo**
- Dado `VITE_REPLICATE_USE_FLUX=true` y un usuario sin tokens
- Cuando pide transformar
- Entonces se hace un solo intento y se muestra el error de saldo
