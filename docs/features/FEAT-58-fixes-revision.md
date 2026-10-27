# FEAT-58 — Correcciones de seguridad y de lógica (revisión del 2026-10-25)

**Estado:** hallazgos de la revisión de código hecha por Claude el 2026-10-25 sobre `main` (producción, commit `50d0807`) y `dev` (commit `255ab5d`, con FEAT-55 y FEAT-56). Por definir con Carlos y por construir. Ningún hallazgo se probó en vivo: todos salen de leer el código. Base de conocimiento sin tocar: los cambios propuestos están en cada hallazgo y al final.

> Nota 2026-10-26: la revisión se escribió como «FEAT-57», pero ese número ya era de «una sola casa» (PR #75, ya en `dev` como `bb88182`); se renumeró a FEAT-58. Desde la revisión, `dev` incluye FEAT-57: las líneas citadas pueden haberse movido.

**Contexto.** La revisión buscó lo que puede hacer perder dinero o romper la app. Lo básico está bien: el precio nunca viene del navegador, el monto pagado se verifica contra Mercado Pago, cada pago se acredita una sola vez, el saldo no puede quedar negativo, las RPC de dinero son solo de `service_role` y las reglas de acceso de compras, PDFs y audios son correctas. Los huecos están en los bordes: tiempos límite, abusos repetibles, reglas que se validan en tokens y no en pesos, y la voz con IA nueva.

**Cómo usar este archivo (Claude Code).**
1. Una rama por fase (ver «Fases»), creada desde `dev`: `feature/fixes-revision-f1`, `-f2`, etc. Cada fase llega a `dev` con su propio PR.
2. Antes de construir una historia, cerrar con Carlos sus puntos de «Decisiones por tomar» y anotarlos en «Decisiones tomadas con el usuario», con fecha y descartadas.
3. Las historias marcadas **Pruebas primero** tocan saldos, cobros o permisos: se escribe primero la prueba que falla (`tests/` o `supabase/tests/`).
4. Los hallazgos H14 a H19 están solo en `dev` (migraciones 060 a 067, aún no en producción). Conviene corregirlos **antes** de aplicar esas migraciones en producción y pasar `dev` a `main`.
5. Las líneas citadas son de `origin/dev` al 2026-10-25; si el código cambió, buscar por el fragmento citado.

**Cambia reglas de negocio.** Sí, varias: §4 (tope de tableros y largo del título), §7 (tokens de bienvenida), §8 (mínimo en pesos), §9 (intentos de código), §18 (caducidad del pago pendiente), §20 (voz con IA) y §21 (invitados). Algunas reabren decisiones **DEFINIDAS** (§15): solo se cambian si Carlos lo pide explícitamente. Cada hallazgo lo indica.

## Resumen

| ID | Prioridad | Dónde | Qué | Historia |
|---|---|---|---|---|
| H1 | Alta | main | Reembolsos y contracargos no descuentan tokens ni quitan el PDF | US A8 |
| H2 | Alta | main | Tokens de bienvenida sin freno (cuentas en masa) | US A2 |
| H3 | Alta | main | La IA puede pasar el límite de 150 s: token sin devolver y predicción cobrando | US A1 |
| H4 | Media | main | El mínimo de compra se valida en tokens, no en pesos | US A6 |
| H5 | Media | main | Los códigos promocionales se pueden probar sin límite | US A9 |
| H6 | Media | main | Se cobra la IA aunque el resultado nunca se guarde | US A7 |
| H7 | Media | main | Regenerar tableros borra los anteriores antes de guardar los nuevos | US A10 |
| H8 | Media | main | Se pueden pedir cientos de miles de tableros | US A10 |
| H9 | Media | main | Un pago pendiente de temática puede bloquear la compra para siempre | US A11 |
| H10 | Baja | main | La verificación del monto de tokens deja pasar si falta el monto | US A6 |
| H11 | Baja | main | Webhook sin verificación de firma | US A12 |
| H12 | Baja | main | Los prompts de IA nombran la marca «Don Clemente Gallo» | US A12 |
| H13 | Baja (verificar) | main | Reintentos por filtro de contenido: hasta 5 predicciones por foto | US A12 |
| H14 | Alta | dev | Voz con IA gratis sin fin renombrando cartas; títulos sin límite de largo | US A3 |
| H15 | Alta | dev | Precio de la voz fijo sin importar el número de cartas; costo real con `eleven_v3` sin medir | US A4 |
| H16 | Alta | dev | Un invitado puede crear miles de cartas con una sola foto | US A5 |
| H17 | Media | dev | Devolución de la voz con carrera; la frase de arranque no cuenta | US A3 |
| H18 | Media | dev | Cupo mensual de ElevenLabs: al agotarse, la voz falla para todos | US A4 |
| H19 | Media | dev | Se regeneran audios idénticos (frase de arranque y títulos comunes) | US A4 |
| H20 | Baja | dev | Al borrar una lotería, solo se borran 1,000 audios | US A12 |
| H21 | Baja | dev | Los avisos en vivo de borrado de cartas llegan a cualquier suscrito | US A12 |
| H22 | Baja | dev | Comentario de `caller-voice` dice 5 tokens; se cobran 10 | US A12 |

## Fases

Acordadas con Carlos el 2026-10-26. Cada fase es una rama y un PR a `dev`, y se prueba antes de pasar a la siguiente.

| Fase | Qué entra | Decisiones que necesita | Rama | Estado |
|---|---|---|---|---|
| 1 — Arreglos sin decisiones (producción expuesta hoy) | A1; A8; de A6 solo H10; de A12 solo H20 y H22 | 13 (confirmada) | `feature/fixes-revision-f1` | construida; llevada a `dev` con el PR #76; Supabase dev desplegado; falta que Carlos la pruebe en dev |
| 2 — Cerrar los huecos de `dev` antes de producción | A3, A5, A4 | 6, 7, 8, 9, 10, 11, 12 | `feature/fixes-revision-f2` (sale de la rama de la fase 1) | A3 y A5 construidas y llevadas a `dev` con el PR #77; A4 construida en `feature/fixes-revision-f2-a4`, desplegada en Supabase dev y llevada a `dev` con el PR #78; falta probar |
| 3 — Abusos y cobros | A2, A9 y el resto de A6 (H4) | 1, 2, 3 | `feature/fixes-revision-f3` | por empezar |
| 4 — Robustez | A7, A10, A11 y el resto de A12 (H11, H12, H13, H21) | 4, 5 | `feature/fixes-revision-f4` | por empezar |

## Decisiones por tomar con Carlos

Una por una, antes de la historia que la necesita. Entre paréntesis, la recomendación de Claude.

1. **H2 — Freno a cuentas nuevas:** captcha de Supabase (Turnstile o hCaptcha) en registro e inicio de sesión; dar los tokens de bienvenida al confirmar el correo y no al crear la cuenta; bloquear dominios de correo desechable. (Las tres; mínimo el captcha.)
2. **H4 — Mínimo de compra:** el mínimo pasa a ser **$10.00 MXN del monto final, ya con la oferta**, además de los 5 tokens. ¿Qué pasa si una oferta deja un pack por debajo? (Rechazar la oferta al crearla en el panel si deja algún pack o la cantidad mínima por debajo de $10.)
3. **H5 — Intentos de código:** cuántos intentos fallidos por usuario y por hora. (10 por hora.)
4. **H8 — Tope de tableros:** reabre «No hay límite de tableros por lotería» (§4, DEFINIDO 2026-10-06). (200 por lotería, como 4 veces los 50 de «Arma tus tableros».)
5. **H9 — Pendiente que caduca:** a los cuántos días se libera un pago pendiente de temática sin aviso de Mercado Pago, o si se vuelve a consultar su estado. (Volver a consultarlo en Mercado Pago al intentar comprar otra vez, y liberarlo si ya no está pendiente.)
6. **H14 — Largo del título:** 50 caracteres en la base para todas las cartas, como ya tienen los invitados (§4). ¿Qué pasa con cartas guardadas más largas? (No se tocan; la regla aplica al crear o renombrar.)
7. **H14 — Regeneraciones de voz por renombrar:** reabre las decisiones 13 y 15 de FEAT-55. (Gratis hasta un tope por lotería igual a su número de cartas; después, la carta renombrada se canta con la voz del navegador. Más un límite de 20 audios por minuto por usuario.)
8. **H15 — Precio de la voz por tamaño:** reabre la decisión 11 de FEAT-55 («tenga las cartas que tenga»). Primero medir el consumo real (US A4, paso 1). (10 tokens cubren hasta 60 cartas; 1 token más por cada 10 cartas extra.)
9. **H16 — Tope de invitados:** reabre la decisión 5 de FEAT-56 («sin límite de fotos por invitado»). (60 cartas por invitado por lotería y 10 por minuto; cada carta con su propia imagen.)
10. **H17 — Devolución de la voz:** la frase de arranque cuenta como audio entregado. (Sí: con la frase ya generada no hay devolución.)
11. **H18 — Cupo agotado:** qué hacer cuando ElevenLabs se queda sin créditos. (Antes de cobrar, revisar el saldo de créditos y no ofrecer «Mejorar la voz» si no alcanza; alerta al administrador al bajar del 20 %; devolver los 10 tokens si no se pudo generar ninguna carta, como hoy.)
12. **H19 — Audios compartidos:** guardar el audio por voz + título normalizado y reutilizarlo entre usuarios (el usuario nunca ve los de otros; el servidor copia el archivo). (Sí, empezando por la frase de arranque: 8 audios fijos.)
13. **H1 — Reembolsos:** la regla ya está definida (§8 y §18). Solo falta construirla. Confirmar que se hace ahora.

## Decisiones tomadas con el usuario

- **2026-10-26 — Trabajo por fases.** Cuatro fases, cada una con su rama y su PR a `dev` (tabla «Fases»). Descartado: una sola rama y un solo PR con las 12 historias.
- **2026-10-26 — Decisión 13 (H1, reembolsos):** se construye ahora, en la fase 1, con la regla ya definida en §8 y §18. Confirmada al aprobar las fases.
- **2026-10-26 — Reembolso parcial (A8):** no se revierte nada automático; el pago sigue `approved` en Mercado Pago y, como solo Carlos puede iniciarlo, él ajusta los tokens a mano si hace falta. Descartado: descontar la parte proporcional de tokens.
- **2026-10-26 — Despliegue de la fase 1 en Supabase dev:** hecho el 2026-10-26: migración `068_payment_refunds.sql` (aplicada por la Management API, después de revisar que las tablas de dev coincidían con el repo) y las funciones `webhook-mercadopago`, `credit-payment-on-return`, `transform-loteria` y `generate-seasonal-card`. Producción: sin tocar. El código del sitio (etiqueta «Devuelto») llega a `dev.chorroybuenas.com.mx` con el PR #76.
- **2026-10-26 — Decisión 6 (H14, largo del título):** máximo 50 caracteres para todas las cartas, del dueño y de invitados, exigido en la base; el editor del dueño baja de 100 a 50. Las cartas guardadas con títulos más largos no se tocan: la regla aplica al crear o renombrar. Descartado: 100 para el dueño y 50 para invitados (lo que ya permitía el editor).
- **2026-10-26 — Decisión 7 (H14, regeneraciones de voz):** reabre las decisiones 13 y 15 de FEAT-55. Regenerar el audio de una carta renombrada o cambiada es gratis hasta **10 veces por lotería** (el primer audio de cada carta no cuenta); pasado el tope, esa carta se canta con la voz del navegador. Además, máximo **20 audios por minuto por usuario**. Descartados: tope igual al número de cartas de la lotería; tope de 20 o de 50; solo el límite por minuto. Precisado el mismo día al construir: (a) el tope se cuenta como total, **tantos audios como cartas tenga hoy la lotería, más 10**, para que borrar una carta y volver a crearla no dé audios gratis (para quien solo renombra es lo mismo); descartado contar solo los renombres; (b) el límite por minuto aplica **solo a las regeneraciones**, porque al pagar la voz se generan todas las cartas seguidas y una lotería de 54 pasaría de 20 en el primer minuto; descartado aplicarlo a todo con espera.
- **2026-10-26 — Decisión 10 (H17, devolución de la voz):** la frase de arranque cuenta como audio entregado: con la frase ya generada no hay devolución. Regla: «solo si no salió ninguna carta ni la frase de arranque se devuelven los 10 tokens». Descartado: que la frase no cuente.
- **2026-10-26 — Decisión 9 (H16, tope de invitados):** reabre la decisión 5 de FEAT-56. Cada invitado sube como máximo **60 cartas por lotería** y **10 por minuto**; cada carta con su propia imagen (que exista y que ninguna otra carta de la lotería use). Descartados: 30 por lotería; solo el límite por minuto. Al construir (mismo día): «Borrar sus fotos» va en el renglón de cada invitado de «Quiénes participan» (M18; M19 ya se retiró en FEAT-57), junto a «Quitar», con confirmación en el mismo renglón; descartado ponerlo como casilla dentro de «Quitar».
- **2026-10-26 — Medición de la voz (A4, paso 1):** con el historial de ElevenLabs (79 audios con `eleven_v3`, sin generar nada nuevo). `eleven_v3` cobra 0.4 créditos por carácter, **incluida la indicación de tono**: unos 26 créditos por carta (21 de la indicación, 5 del título) y 48 la frase de arranque. Una lotería de 54 cartas ≈ 1,450 créditos ≈ US$0.19 (unos $3.50 MXN) con el plan Starter (37,875 créditos al mes, sin opción de comprar más): unas **26 loterías al mes**. La decisión 29 de FEAT-55 estimaba 35; la revisión, 8. El factor 0.4 puede ser un precio temporal de `eleven_v3`: volver a medir si cambia.
- **2026-10-26 — Indicación de tono (H15):** se queda como está (FEAT-55, decisión 30). Descartados: probar una indicación corta («[pregonando]», ~10 créditos por carta); quitarla (~5 créditos).
- **2026-10-26 — Decisión 8 (H15, precio de la voz por tamaño):** reabre la decisión 11 de FEAT-55. **10 tokens cubren hasta 60 cartas; cada 10 cartas más cuestan 2 tokens** (54 → 10; 70 → 12; 100 → 18), proporcional al costo medido. Si después de pagar la lotería pasa de lo cubierto, las cartas de más se cantan con la voz del navegador y el cantador ofrece **«Ampliar la voz»** (2 tokens por cada 10 cartas más), que solo cobra si el usuario acepta. Descartados: +1 token por cada 10; 10 fijos; cobrar el bloque nuevo al abrir sin preguntar; que lo pagado cubra todo lo que se agregue.
- **2026-10-26 — Decisión 11 (H18, cupo de ElevenLabs):** antes de cobrar (al pagar la voz o al ampliarla), el servidor consulta los créditos que quedan en ElevenLabs; si no alcanzan para esa lotería, no cobra y el cantador dice que la voz con IA no está disponible por ahora (si la consulta falla, tampoco cobra). Al bajar del 20 % del cupo, correo de alerta al administrador (Resend, a la dirección fija de la alerta de §13), uno por mes. Descartados: solo revisar sin correo; solo la alerta.
- **2026-10-26 — Decisión 12 (H19, audios compartidos):** sí, frase y títulos. La frase de arranque se genera una sola vez por voz (8 audios); un título ya generado con la misma voz (sin importar mayúsculas ni espacios) se copia a la carpeta del usuario en lugar de generarse. Nadie ve los audios de otros. Se anota en §12 que el servidor reutiliza audios con el mismo texto entre cuentas. Descartados: solo la frase; nada compartido.
- **2026-10-26 — Base de conocimiento de la fase 2:** Carlos confirmó los cuatro grupos de cambios. Aplicados en `contexto-negocio.md` (§4 título de 50 y tope de invitados; §11 cuenta de audios y «Audio compartido»; §12 audios compartidos; §13 alerta de cupo de voz; §15 cuatro filas; §17 tres renglones de A4 por construir; §20 topes, devolución, precio por bloques, cupo y audios compartidos; §21 tope de invitados y «Borrar fotos»), `casos-de-uso.md` (casos 30, 32 y 33) y `diseno-mockups.md` (M18). U4 se actualiza al diseñar A4.
- **2026-10-26 — Despliegue de la fase 2 (A3 y A5) en Supabase dev:** hecho el 2026-10-26, a pedido de Carlos: migraciones `069_caller_voice_limits.sql` y `070_guest_card_limits.sql` por la Management API (antes se revisó que la base de dev coincidía con el repo y se respaldaron `refund_caller_voice` y `add_guest_card`); las dos voces ya pagadas empezaron con `generated_audios` igual a sus audios (24 y 31). Función `caller-voice` desplegada. Producción: sin tocar. El sitio (editor, invitados, «Borrar fotos») llega a `dev.chorroybuenas.com.mx` con el PR #77.
- **2026-10-26 — A4: base de conocimiento y despliegue en Supabase dev:** Carlos confirmó anotar lo construido: U4 en `diseno-mockups.md` (precio según las cartas, «Ampliar la voz», «no disponible»), §13 (alerta construida), §17 (los tres renglones de A4 quedan hasta publicarse en producción) y §20 (sin marcas «por construir»); el caso 30 conserva 🔧 porque la voz con IA aún no está en producción. Despliegue en dev, a su pedido: migración `071_caller_voice_blocks.sql` por la Management API (antes se revisó la base y se respaldaron `start_caller_voice` y `reserve_caller_audio`; las dos voces ya pagadas quedaron con 60 cartas cubiertas), función `caller-voice` y secret `ADMIN_ALERT_EMAIL` (la dirección de la alerta de la fase 3, confirmada por Carlos; no se escribe aquí). Producción: sin tocar.
- **2026-10-26 — Orden de las fases:** Carlos dejó la fase 1 sin subir mientras se cerraban las decisiones de la fase 2; ese mismo día pidió subirla (PR #76). La rama de la fase 2 sale de la de la fase 1.

## Hallazgos

### H1 — Reembolsos y contracargos no descuentan nada

- **Dónde:** `supabase/functions/webhook-mercadopago/index.ts:99` (un pago no aprobado solo se registra en logs), `supabase/functions/_shared/seasonal.ts:174-175` (`refunded` y `charged_back` no están en ninguna lista), `supabase/functions/_shared/paymentFlow.ts` (`findApprovedPayment` solo actúa con `approved`).
- **Qué pasa:** cuando Mercado Pago avisa que un pago se devolvió o el banco lo revirtió, el webhook lo ignora. Los tokens se quedan y la lotería temática sigue descargable.
- **Cómo afecta:** con una tarjeta robada o un «no reconozco el cargo», el comprador gasta los tokens en IA (que pagas a Replicate o ElevenLabs) y luego recupera su dinero. Pierdes el cobro, la comisión de contracargo de Mercado Pago y el costo de IA. Con las temáticas, descarga el PDF y pide reembolso.
- **Solución:** en el webhook, para `refunded`, `charged_back` (y `partially_refunded` según se decida), una RPC nueva que marque la compra como devuelta y descuente los tokens de esa compra sin dejar el saldo negativo (§8); para temáticas, marcar `refunded` (el estado ya existe en `seasonal_purchases`), lo que quita el acceso al PDF por las reglas de la migración 032. Idempotente por `payment_id`. Ver `docs/PENDIENTES.md`, punto 3.
- **Reglas de negocio:** ninguna nueva; §8 y §18 ya lo definen. Al construirlo, se retira el renglón de §17.

### H2 — Tokens de bienvenida sin freno

- **Dónde:** `supabase/migrations/024_initial_tokens_on_signup.sql:40` (`handle_new_user` da los tokens al crear la fila en `auth.users`); configuración de Auth en el panel de Supabase (no está en el repo).
- **Qué pasa:** cada cuenta nueva recibe los tokens de bienvenida (5 en producción) al crearse, sin captcha ni límite por IP. El trigger no distingue cuentas anónimas.
- **Cómo afecta:** con correos desechables o un script se crean cuentas en masa y cada una son 5 imágenes de IA que pagas tú. Si el **inicio de sesión anónimo** estuviera activado en Supabase, ni siquiera haría falta un correo.
- **Solución:** (1) verificar en el panel de los dos proyectos que el inicio de sesión anónimo esté apagado; (2) captcha de Supabase en registro e inicio de sesión (con el cambio en `AuthDialog`/`useEmailAuthForm` para mandar el token); (3) que `handle_new_user` no dé tokens y que se den al confirmar el correo (trigger sobre `email_confirmed_at`, o al primer inicio de sesión confirmado), con Google contando como confirmado; (4) opcional, lista de dominios desechables.
- **Reglas de negocio:** §7 «Tokens de bienvenida: cada cuenta nueva recibe…» → «cada cuenta recibe los tokens de bienvenida al confirmar su correo». §1/§2 no cambian (crear e imprimir sigue sin cuenta).

### H3 — La IA puede pasar el límite de tiempo de Supabase

- **Dónde:** `supabase/functions/_shared/replicate.ts:2` (`MAX_RETRY_WAIT_MS = 30_000`), `:30` (`maxRetries = 3`), `:63` (`timeoutMs: 120_000`); `supabase/functions/generate-seasonal-card/index.ts:26` (`timeoutMs: 140_000`).
- **Qué pasa:** con Replicate saturado (429), `createPrediction` espera hasta 3 × 30 s y después `waitForPrediction` espera hasta 120 s (140 s en temáticas). El propio código asume un límite de 150 s por función. Si Supabase corta la función, no corre el `catch` de `runCharged`.
- **Cómo afecta:** el token del usuario no se devuelve (rompe la garantía de §6) y la predicción sigue corriendo en Replicate y cobrándote, porque solo se cancela en el tope propio.
- **Solución:** un plazo total por llamada (por ejemplo 130 s desde que empieza la función) que reparta el tiempo entre reintentos y espera; al acercarse al plazo, cancelar la predicción y lanzar `AI_TIMEOUT` para que se devuelva el token. Bajar los reintentos por 429 (por ejemplo 1) y devolver `AI_BUSY` antes de cobrar si es posible: crear la predicción **antes** de `spend` no es seguro, así que lo más simple es el plazo total. Pruebas con `ReplicateDeps` (reloj falso), como las de `tests/functions/replicate.test.ts`.
- **Reglas de negocio:** ninguna; hace que §6 («si la imagen no se pudo generar, el token se devuelve») se cumpla siempre.

### H4 — El mínimo de compra se valida en tokens, no en pesos

- **Dónde:** `supabase/functions/_shared/validation.ts:26` (`MIN_CUSTOM_TOKENS = 5`), `supabase/functions/_shared/preference.ts:56` (solo exige monto > 0), el formulario de ofertas del panel (`src/components/AdminPanel/AdminOfferForm.tsx`) y los packs (`AdminPackForm.tsx`).
- **Qué pasa:** los 5 tokens se pensaron para que el pago fuera de $10.00 MXN. Con una oferta del 50 %, 5 tokens cuestan $5.00; un pack de $20 con 60 % queda en $8.00. Nada lo impide.
- **Cómo afecta:** Mercado Pago abre el checkout con el botón de pagar deshabilitado (lo que pasó con $2.00 el 2026-10-06). Venta perdida y usuario confundido.
- **Solución:** en `resolvePurchaseItem`, rechazar `amountCents < 1000` con un mensaje claro; en el panel, no dejar guardar una oferta (ni un pack) que deje algún precio por debajo de $10.00; en Comprar tokens, subir el mínimo de cantidad libre durante la oferta para que el monto llegue a $10.
- **Reglas de negocio:** §8 «Mínimo de compra: 5 tokens ($10.00 MXN)» → «el monto a pagar, ya con la oferta, nunca baja de $10.00 MXN». §9 (ofertas): una oferta no se puede crear si deja algún precio por debajo del mínimo.

### H5 — Los códigos promocionales se pueden probar sin límite

- **Dónde:** `supabase/migrations/025_promotions_privacy.sql:54` (`check_promo_code`, abierta a cualquier usuario con sesión, sin límite).
- **Qué pasa:** se puede llamar en bucle hasta dar con un código vigente. Un código corto («NAVIDAD») cae rápido. Se suma a la limitación conocida de usar un mismo código en dos checkouts abiertos (`docs/PENDIENTES.md`, punto 5).
- **Cómo afecta:** tokens de bono regalados a quien no debía tenerlos.
- **Solución:** tabla de intentos fallidos por usuario y una RPC que lance `RATE_LIMITED` al pasar el tope; `create-payment-preference` aplica el mismo conteo. Opcional: reservar el código al crear la preferencia para cerrar la limitación conocida.
- **Reglas de negocio:** §9, nueva viñeta: «Un usuario puede probar como máximo N códigos que no existen por hora».

### H6 — Se cobra la IA aunque el resultado nunca se guarde

- **Dónde:** `supabase/functions/transform-loteria/index.ts:77` (devuelve el enlace temporal de Replicate), `src/components/CardEditor/useCardAI.ts:58-70` (individual) y `:106-115` (lote); el aviso al cerrar la página solo existe para el lote (`:178`).
- **Qué pasa:** el servidor cobra y responde con la URL de Replicate, que caduca. El navegador la baja, la recorta (`adjustImageToCardAspectRatio`) y la sube. Si el usuario cierra la pestaña, se va la red o falla la subida, el resultado se pierde y no hay forma de recuperarlo.
- **Cómo afecta:** el usuario pagó por nada; quejas y devoluciones manuales. Contradice «solo se paga por resultados entregados» (§6).
- **Solución:** que `transform-loteria` baje la imagen y la guarde en `card-images`, en la carpeta del usuario (por ejemplo `<user>/ai/<usage_id>.webp`), y responda con esa ruta; el navegador la usa para la carta. Si no se puede guardar, se devuelve el token. Agregar el aviso al cerrar la página también a la transformación individual. Opcional: guardar en `token_usage` la ruta del resultado para recuperar resultados huérfanos.
- **Reglas de negocio:** ninguna nueva; cumple §6. Si se guarda la ruta en `token_usage`, se anota en §11.

### H7 — Regenerar tableros borra los anteriores antes de guardar los nuevos

- **Dónde:** `src/hooks/useBoard.ts:50` (borra todo antes de leer las cartas), `:84` (guarda uno por uno, dos peticiones por tablero), `:104`.
- **Qué pasa:** si falla la red a la mitad del guardado, la lotería queda con una parte de los tableros y los anteriores ya no existen. Si la lotería tiene menos cartas que el mínimo, primero borra y luego marca el error.
- **Cómo afecta:** el usuario pierde tableros ya impresos o repartidos; con muchos tableros, cientos de peticiones seguidas.
- **Solución:** una RPC `replace_set_boards(p_set_id, p_boards jsonb)` que valide el dueño, borre y guarde todo en una sola transacción; validar el número de cartas antes de borrar.
- **Reglas de negocio:** ninguna.

### H8 — Se pueden pedir cientos de miles de tableros

- **Dónde:** `src/utils/boardGeneration.ts:45` (`maxUniqueBoards` = la mitad de las combinaciones: con 24 cartas en Clásico, 367,735).
- **Qué pasa:** el selector acepta hasta ese número; un error de dedo (10000) genera, dibuja y guarda miles de tableros.
- **Cómo afecta:** el navegador se congela, el PDF no termina y la base se llena de filas (`boards` y `board_cards`).
- **Solución:** tope fijo de tableros por lotería en el selector y en la RPC de H7 (la base también lo exige).
- **Reglas de negocio:** **reabre una decisión DEFINIDA:** §4 y §15 (2026-10-06) «No hay límite de cartas por lotería, de loterías por usuario ni de tableros por lotería» → «máximo N tableros por lotería». Solo con el sí explícito de Carlos (decisión por tomar 4).

### H9 — Un pago pendiente de temática puede bloquear la compra para siempre

- **Dónde:** `supabase/functions/_shared/seasonal.ts:174-175`, `supabase/functions/create-seasonal-preference/index.ts` (rechaza con `PAYMENT_PENDING`), migración `033_seasonal_pending.sql`.
- **Qué pasa:** el pago en efectivo o transferencia queda como `pending` y solo se libera si llega el aviso de `rejected`/`cancelled`. Si ese aviso nunca llega o llega con otro estado (por ejemplo `expired`), la fila se queda.
- **Cómo afecta:** «Ya tienes un pago en proceso por esta lotería» para siempre: venta perdida.
- **Solución:** al intentar comprar con un pendiente, consultar ese pago en Mercado Pago; si ya no está pendiente, liberarlo (o entregarlo si se aprobó) y seguir. Agregar `expired` a los estados que liberan.
- **Reglas de negocio:** §18, «quien tiene un pago en proceso por ella no puede iniciar otro cobro» → agregar «si el pago ya no está en proceso en Mercado Pago, se libera al intentar comprar».

### H10 — La verificación del monto de tokens deja pasar si falta el monto

- **Dónde:** `supabase/functions/_shared/credit.ts:70` (`if (typeof paid === 'number' && …)`).
- **Qué pasa:** si el pago no trae `transaction_amount` como número, se acredita sin comparar. En las temáticas (`seasonal.ts`, `buildSeasonalDelivery`) se rechaza.
- **Cómo afecta:** hoy improbable, pero es la única puerta que falla abierta en el cobro.
- **Solución:** rechazar si `paid` no es número (igual que en temáticas). Una línea y su prueba en `tests/functions/credit.test.ts`.
- **Reglas de negocio:** ninguna; cumple §8 («no se acredita si el monto pagado es menor al esperado»).

### H11 — Webhook sin verificación de firma

- **Dónde:** `supabase/functions/webhook-mercadopago/index.ts:41`; falta el secret `MERCADOPAGO_WEBHOOK_SECRET` (`docs/PENDIENTES.md`, «Limpieza de configuración»).
- **Qué pasa:** no se puede falsificar un pago (cada aviso se vuelve a consultar en Mercado Pago), pero cualquiera puede llamar al webhook en bucle; cada aviso de `merchant_order` espera 3 s y hace varias consultas.
- **Cómo afecta:** se puede gastar el límite de consultas a la API de Mercado Pago y retrasar acreditaciones reales.
- **Solución:** configurar el secret en dev y producción y, con él puesto, exigir la firma en los avisos que la traen.
- **Reglas de negocio:** ninguna.

### H12 — Los prompts de IA nombran la marca

- **Dónde:** `supabase/functions/_shared/transform.ts:9` y `:19`; `src/services/AIService.ts:38-43` (copia del prompt, sin uso en la llamada).
- **Qué pasa:** el prompt pide «Traditional Don Clemente Gallo vintage lithograph», la marca con litigio activo.
- **Cómo afecta:** riesgo legal si se conoce cómo se generan las cartas; no aporta al resultado más que una descripción del estilo.
- **Solución:** describir el estilo sin la marca («1940s Mexican lotería lithograph…») y probar que el resultado no empeore; quitar la copia de `AIService.ts`.
- **Reglas de negocio:** ninguna (§6 sigue con un solo estilo).

### H13 — Reintentos por filtro de contenido (verificar)

- **Dónde:** `src/services/aiFallback.ts:12` (`MAX_NSFW_RETRIES = 2`) y los tres prompts.
- **Qué pasa:** una foto rechazada puede generar hasta 5 predicciones (2 reintentos por NSFW más los prompts 1 y 2). Al usuario se le devuelve cada token.
- **Cómo afecta:** si Replicate cobra las predicciones rechazadas, pagas hasta 5 veces por una foto que no se transformó. Verificar en la factura de Replicate.
- **Solución:** si se cobran, quitar los reintentos por NSFW (el mismo prompt suele rechazarse igual) y dejar solo el cambio de prompt.
- **Reglas de negocio:** ninguna.

### H14 — Voz con IA gratis sin fin renombrando cartas; títulos sin límite de largo

- **Dónde:** `supabase/functions/caller-voice/index.ts:69-73` (`needsAudio` regenera si el título cambió, gratis), `supabase/migrations/000_baseline_core_tables.sql:22` (`title text not null`, sin largo máximo; el tope de 50 solo está en `add_guest_card`, migración 064); FEAT-55, decisiones 13 y 15.
- **Qué pasa:** con la voz pagada, un script puede cambiar el título de una carta y pedir su audio en bucle, sin costo y sin límite por minuto. El título del dueño solo se valida en el navegador, así que por la API puede llevar miles de caracteres, y ElevenLabs cobra por carácter.
- **Cómo afecta:** con un plan de cupo fijo (Starter, 30 mil créditos), una sola persona agota los créditos del mes en minutos y la voz deja de funcionar para todos (H18), mientras se siguen cobrando los 10 tokens. Con un plan con excedentes, la factura crece sin tope.
- **Solución:** `check (char_length(title) <= 50)` en `cards` (como `not valid` para no tocar las guardadas, o validando en un trigger al insertar o cambiar el título); en `generate`, un tope de regeneraciones gratis por lotería y un límite de audios por minuto por usuario; rechazar con un código propio (`VOICE_LIMIT`).
- **Reglas de negocio:** §4, carta: «el título tiene máximo 50 caracteres» (hoy no hay tope escrito). §20 y FEAT-55 decisión 13 («a la voz no se le aplica el límite por minuto») y 15 («se generan sin cobrar») → tope de regeneraciones y límite por minuto. Reabre decisiones de FEAT-55 (decisiones por tomar 6 y 7).

### H15 — El precio de la voz no depende del número de cartas; costo real sin medir

- **Dónde:** `supabase/migrations/060_caller_voice.sql:97` (`v_price constant integer := 10`), `supabase/functions/_shared/callerVoice.ts:15` (`eleven_v3`) y `:17` (`CALL_TONE`); FEAT-55, decisión 11.
- **Qué pasa:** 10 tokens por lotería «tenga las cartas que tenga». La decisión 11 justifica el precio con «unos 2 pesos en Replicate», pero la voz ahora es ElevenLabs con `eleven_v3` (decisiones 29 y 30). Cada carta lleva la indicación «[pregonando, cantadito, alargando la última sílaba]» (unos 50 caracteres) más el título con la vocal alargada: unos 65 a 70 caracteres por carta. El cálculo de la decisión 29 («~35 loterías de 54 cartas al mes» con 30 mil créditos) corresponde a unos 16 caracteres por carta, de antes del tono.
- **Cómo afecta:** si la indicación se cobra como texto, una lotería de 54 cartas gasta unos 3,700 créditos: con el plan Starter alcanzan unas 8 loterías al mes, no 35. Quien paga 10 tokens y sube 1,000 cartas obtiene 1,000 audios. Con el pack de 50 (70 tokens por $100) la voz se cobra en unos $14 MXN; en un plan como el Creator (~22 US$ por 100 mil créditos) una lotería de 54 cartas cuesta algo parecido, sin margen.
- **Solución:** (1) medir en el panel de ElevenLabs los créditos de una lotería real de 54 cartas, y de una carta con y sin la indicación; (2) precio por bloques de cartas, cobrando en `start` según las cartas que tiene la lotería y, para las que se agreguen después, un cobro adicional al pasar del bloque; (3) si la indicación se cobra y hay forma de no mandarla en cada carta, quitarla del texto.
- **Reglas de negocio:** §20 y FEAT-55 decisión 11 → «10 tokens cubren hasta N cartas; cada bloque de M cartas más cuesta X tokens» y actualizar la justificación del precio con el costo de ElevenLabs. Reabre la decisión 11 (decisión por tomar 8).

### H16 — Un invitado puede crear miles de cartas con una sola foto

- **Dónde:** `supabase/migrations/064_loteria_guest_cards.sql:94-113` (`add_guest_card`): solo revisa que la ruta empiece con la carpeta del invitado, no que el archivo exista ni que no se haya usado; sin tope ni límite por minuto. FEAT-56, decisión 5.
- **Qué pasa:** un invitado sube una imagen y llama `add_guest_card` en bucle con títulos distintos y la misma ruta.
- **Cómo afecta:** la lotería del organizador se llena de miles de cartas (tableros, PDF y vista en vivo dejan de funcionar). Si el organizador pagó la voz, al abrir el cantador se genera audio gratis de cada carta nueva y se agota el cupo de ElevenLabs (H14, H18). El organizador tendría que borrarlas a mano.
- **Solución:** en `add_guest_card`: que exista el objeto en `storage.objects` (bucket `card-images`, esa ruta), que ninguna carta de la lotería use ya esa ruta, un tope de cartas por invitado por lotería y un límite por minuto. En la ventana «Invitados» (M19), un botón para borrar todas las fotos de un invitado.
- **Reglas de negocio:** §21 y FEAT-56 decisión 5 («sin límite de fotos por invitado») → «máximo N cartas por invitado por lotería y M por minuto; cada carta con su propia imagen». Reabre la decisión 5 (decisión por tomar 9).

### H17 — La devolución de la voz tiene una carrera; la frase de arranque no cuenta

- **Dónde:** `supabase/migrations/060_caller_voice.sql:142-151` (`refund_caller_voice` solo revisa `caller_audios`), `supabase/functions/caller-voice/index.ts:62` (la frase se guarda en `caller_voices.intro_path`, no en `caller_audios`).
- **Qué pasa:** (1) una generación que ya pasó la revisión de «voz pagada» termina después de la devolución y guarda su audio igual; (2) con solo la frase generada, la devolución procede, así que el ciclo pagar → generar frase → devolver se puede repetir.
- **Cómo afecta:** el usuario recupera sus 10 tokens y ya gastaste créditos de ElevenLabs; repetible con un script.
- **Solución:** que `refund_caller_voice` también falle si hay `intro_path`; que la devolución bloquee la fila de `caller_voices` (`for update`) y que `generate`, justo antes de guardar, confirme dentro de una RPC que la voz sigue pagada (si no, borra el archivo y no registra el audio).
- **Reglas de negocio:** FEAT-55 decisión 25 / §20: «solo si fallan todas se devuelven los 10 tokens» → «si no salió ninguna carta **ni la frase de arranque**» (decisión por tomar 10).

### H18 — Cupo mensual de ElevenLabs: al agotarse, la voz falla para todos

- **Dónde:** plan Starter de ElevenLabs (FEAT-55, decisión 29); `supabase/functions/caller-voice/index.ts` (`start` cobra sin revisar el cupo); FEAT-55 decisión 11 (si fallan algunas cartas no se devuelve nada).
- **Qué pasa:** cuando se acaban los créditos del mes, cada `generate` falla. Quien ya tenía alguna carta generada no recibe devolución (`AUDIOS_EXIST`).
- **Cómo afecta:** usuarios que pagan 10 tokens por una voz a medias; quejas y devoluciones manuales. El abuso de H14 y H16 lo provoca a voluntad.
- **Solución:** antes de cobrar en `start`, consultar los créditos restantes (`GET /v1/user/subscription` de ElevenLabs) y, si no alcanzan para las cartas de la lotería, responder `VOICE_UNAVAILABLE` sin cobrar; alerta al administrador (correo, como la de §13) al bajar de un umbral.
- **Reglas de negocio:** §20: «Mejorar la voz no se ofrece si el servicio no tiene cupo para la lotería». §13: alerta nueva al administrador «quedan pocos créditos de voz» (decisión por tomar 11).

### H19 — Se regeneran audios idénticos

- **Dónde:** `supabase/functions/_shared/callerVoice.ts:51` (`CALLER_INTRO_TEXT`), `supabase/functions/caller-voice/index.ts:62-73` (cada lotería genera su frase y cada título, aunque otro usuario ya tenga el mismo con la misma voz).
- **Qué pasa:** «Se va y se corre con…» se genera una vez por lotería, aunque es igual para todos; títulos comunes («La Mamá», «El Abuelo», «La Suegra», «El Gallo») se generan una y otra vez.
- **Cómo afecta:** se gasta el cupo (H18) y el margen (H15) en audios repetidos.
- **Solución:** un bucket o carpeta privada de audios compartidos por voz + texto normalizado (hash), escrita solo por el servidor. `generate` busca primero ahí y, si existe, copia el archivo a la carpeta del usuario sin llamar a ElevenLabs. La frase de arranque se genera una sola vez por voz (8 audios).
- **Reglas de negocio:** §20 / FEAT-55 decisión 23: la frase de arranque deja de generarse por lotería. Nota de privacidad en §5 o §12: el servidor reutiliza audios con el mismo texto entre cuentas, sin mostrar a nadie los de otros (decisión por tomar 12).

### H20 — Al borrar una lotería, solo se borran 1,000 audios

- **Dónde:** `src/services/CallerVoiceService.ts:58` (`list(folder, { limit: 1000 })`).
- **Qué pasa:** con más de 1,000 audios, los demás archivos se quedan en el bucket.
- **Cómo afecta:** espacio ocupado sin dueño (crece con H14 y H16).
- **Solución:** listar en páginas (`offset`) hasta vaciar la carpeta.
- **Reglas de negocio:** ninguna.

### H21 — Los avisos en vivo de borrado de cartas llegan a cualquier suscrito

- **Dónde:** `supabase/migrations/065_cards_realtime.sql:13`.
- **Qué pasa:** Supabase Realtime no aplica las reglas de acceso a los avisos de borrado; quien esté suscrito a cambios de `cards` recibe el identificador de cualquier carta borrada.
- **Cómo afecta:** solo se filtran identificadores, sin contenido. Riesgo bajo.
- **Solución:** aceptar el riesgo y anotarlo, o cambiar a canales de difusión por lotería (Realtime Broadcast con autorización) en lugar de `postgres_changes` sobre la tabla.
- **Reglas de negocio:** ninguna.

### H22 — Comentario desactualizado en `caller-voice`

- **Dónde:** `supabase/functions/caller-voice/index.ts:3` y `:6` («cobra 5 tokens», «devuelve los 5 tokens»).
- **Qué pasa:** la base cobra 10 (migración 060, línea 97).
- **Cómo afecta:** confusión al mantener el código.
- **Solución:** corregir el comentario.
- **Reglas de negocio:** ninguna.

## User Stories

Orden sugerido: A1, A2, A3, A4, A5 (antes de llevar 060–067 a producción), luego A6 a A12.

### US A1 — La IA nunca pasa del tiempo límite   ·   Estado: construida, falta probar en dev   ·   Pruebas primero

- **Historia:** Como usuario, quiero que si la IA no termina se me devuelva el token, para no pagar por nada.
- **Entrega demostrable:** `transform-loteria` y `generate-seasonal-card` respetan un plazo total menor a 150 s; al acercarse, cancelan la predicción y responden `AI_TIMEOUT` (la de usuarios, con el token devuelto). Resuelve H3.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** Pruebas en `tests/functions/replicate.test.ts` con reloj falso: 429 seguidos más espera larga → se cancela antes del plazo y se reembolsa. En dev, simular Replicate lento (variable de entorno de prueba o mock) → la carta muestra «La IA tardó demasiado» y el saldo no baja.
- **Escenarios cubiertos:** 429 repetidos; predicción lenta; ambas; respuesta normal sin cambios.
- **Construido:** 2026-10-26, rama `feature/fixes-revision-f1`. `_shared/replicate.ts`: plazo total `AI_DEADLINE_MS` (120 s desde que empieza la función, con margen bajo los 150 s para cancelar, reembolsar o guardar y responder); `createPrediction` recibe sus opciones como objeto (`maxRetries`, `path`, `deadlineAt`) y lanza `AI_BUSY` sin esperar si la espera de un 429 pasaría el plazo; `waitForPrediction` cancela en lo que llegue antes, su tope o el plazo, sin pasarse en la última espera. `transform-loteria` y `generate-seasonal-card` (antes 140 s solo de espera) usan el plazo. `transform-loteria` ahora responde `AI_BUSY` (503) en lugar de `AI_ERROR`, así el lote del editor reintenta como ya estaba previsto (`retryWhenBusy`). Pruebas en `tests/functions/replicate.test.ts` (plazo en 429, plazo en la espera, caso combinado con reembolso) y `transform.test.ts`. En dev no hay forma de simular a Replicate lento sin tocar código: el guion de demo en dev se reduce a transformar una carta y ver que sigue funcionando igual; el caso lento lo cubren las pruebas. `transform-loteria` y `generate-seasonal-card` desplegadas en Supabase dev el 2026-10-26; el sitio llega a dev con el PR #76.

### US A2 — Freno a las cuentas en masa   ·   Estado: por construir   ·   Pruebas primero (base)

- **Historia:** Como dueño del negocio, quiero que los tokens de bienvenida no se puedan sacar creando cuentas en masa, para no regalar IA.
- **Entrega demostrable:** captcha en registro e inicio de sesión; los tokens de bienvenida llegan al confirmar el correo (o al entrar con Google); inicio de sesión anónimo verificado apagado en dev y producción. Resuelve H2.
- **Depende de:** decisión por tomar 1.
- **Cómo se prueba (guion de demo):** Crear cuenta con correo → saldo 0 → confirmar el correo → saldo 5. Crear cuenta con Google → saldo 5. Intentar registrarse sin resolver el captcha → rechazado. Prueba en `supabase/tests/` del trigger nuevo.
- **Escenarios cubiertos:** correo, Google, correo sin confirmar, confirmar dos veces (no duplica), cuentas ya existentes (no cambian).
- **Construido:** —

### US A3 — Voz con IA: cerrar abusos   ·   Estado: construida, desplegada en Supabase dev y llevada a `dev` con el PR #77; falta probar en dev   ·   Pruebas primero

- **Historia:** Como dueño del negocio, quiero que la voz con IA no se pueda generar sin fin, para que el cupo alcance para quienes pagan.
- **Entrega demostrable:** títulos de máximo 50 caracteres en la base; tope de regeneraciones gratis por lotería y límite por minuto en `generate`; la devolución falla si ya hay frase o audios y no compite con una generación en curso. Resuelve H14 y H17.
- **Depende de:** decisiones por tomar 6, 7 y 10.
- **Cómo se prueba (guion de demo):** Pruebas en `supabase/tests/060_caller_voice.test.sql` y `tests/functions/callerVoice.test.ts`: renombrar y regenerar pasado el tope → `VOICE_LIMIT`; título de 51 caracteres → rechazado; con la frase generada, `refund` → `AUDIOS_EXIST`; generación que termina después de una devolución → no se registra. En dev: renombrar una carta y abrir el cantador → su audio se regenera; pasado el tope, se canta con la voz del navegador.
- **Escenarios cubiertos:** renombrar dentro y fuera del tope; ráfaga de llamadas; título largo por API; carrera devolución/generación; cartas guardadas con títulos largos (no se tocan).
- **Construido:** 2026-10-26, rama `feature/fixes-revision-f2`. Migración `069_caller_voice_limits.sql`: trigger `cards_title_length` (título de más de 50 caracteres → `TITLE_TOO_LONG`, solo al crear o cambiar el título); columna `caller_voices.generated_audios` (empieza con los audios que ya tiene cada voz) y tabla `caller_voice_regenerations` (solo servidor); RPC `reserve_caller_audio` (bloquea la voz, devuelve el título a decir o null si ya tiene su audio; `VOICE_LIMIT` al llegar a cartas + 10, `RATE_LIMITED` con 20 regeneraciones en el último minuto), `release_caller_audio` (si ElevenLabs o la subida fallan) y `save_caller_audio` (registra con la voz bloqueada; false si la voz se devolvió o la carta ya no existe); `refund_caller_voice` bloquea la voz y falla con la frase generada. `caller-voice` `generate` usa las tres RPC y borra el archivo si no se registró. Cantador: no pide devolución si salió la frase; la carta que pasó el tope se canta con la voz del navegador (como ya hacía con las que fallan). Editor: el título de las cartas baja de 100 a 50 caracteres (`CARD_TITLE_MAX_LENGTH` en `utils/cardTitle.ts`; al guardar ya se exigían 50). Pruebas: `supabase/tests/069_caller_voice_limits.test.sql` (35 aserciones), `tests/functions/callerVoice.test.ts`, `tests/src/callerAiVoice.test.ts`. 069 aplicada y `caller-voice` desplegada en Supabase dev el 2026-10-26; base de conocimiento actualizada ese día (ver «Decisiones tomadas»).

### US A4 — Voz con IA: precio y cupo con datos reales   ·   Estado: construida, desplegada en Supabase dev y llevada a `dev` con el PR #78; falta probar en dev   ·   Pruebas primero

- **Historia:** Como dueño del negocio, quiero que la voz con IA me deje margen y no se quede sin cupo, para poder venderla.
- **Entrega demostrable:** (1) medición anotada en FEAT-55 (créditos de una lotería de 54 cartas, con y sin la indicación de tono); (2) audios compartidos por voz + texto y frase de arranque fija por voz; (3) precio por bloques de cartas; (4) `start` revisa el cupo de ElevenLabs antes de cobrar y avisa al administrador si baja del umbral. Resuelve H15, H18 y H19.
- **Depende de:** A3; decisiones por tomar 8, 11 y 12.
- **Cómo se prueba (guion de demo):** Dos cuentas con la misma voz y una carta «La Mamá» → la segunda no gasta créditos (se ve en el panel de ElevenLabs). Lotería de 70 cartas → «Mejorar la voz» muestra el precio del bloque. Con el cupo simulado bajo → «Mejorar la voz» no se ofrece y llega la alerta. Pruebas del cálculo de precio y del cupo con dependencias inyectadas.
- **Escenarios cubiertos:** título repetido entre cuentas; mayúsculas y espacios; cartas agregadas después que cruzan de bloque; cupo insuficiente; ElevenLabs sin respuesta al consultar el cupo.
- **Notas para construir (2026-10-26):** (a) la medición quedó en «Decisiones tomadas», no en FEAT-55; (b) con el precio por bloques, el tope de A3 pasa a ser *cartas cubiertas por lo pagado* (mínimo entre cartas de la lotería y 60 + 10 por bloque) *más 10*; las cartas fuera de lo cubierto reciben `VOICE_LIMIT` y se cantan con la voz del navegador hasta «Ampliar la voz»; (c) un audio copiado de los compartidos no gasta créditos: no cuenta para el tope ni para el límite por minuto; (d) la revisión del cupo calcula ~26 créditos por carta que falte más 48 de la frase si no está compartida; (e) «Ampliar la voz» y «La voz con IA no está disponible por ahora» son UI nueva del cantador (U4 y la ventana de voces): seguir `docs/workflow-fe.md` y confirmar el diseño con Carlos.
- **Construido:** 2026-10-26, rama `feature/fixes-revision-f2-a4` (desde `dev`, ya con el PR #77). Migración `071_caller_voice_blocks.sql`: `caller_voice_price` y `caller_voice_coverage` (10 tokens hasta 60 cartas, 2 por cada 10 más); `caller_voices.covered_cards` (las voces ya pagadas cubren todas las cartas que tenían, mínimo 60); `start_caller_voice` cobra según las cartas; `expand_caller_voice` cobra los bloques sin cubrir y los suma al mismo renglón de `token_usage` (los reportes del panel siguen contando una voz por renglón); `reserve_caller_audio` gana `p_shared` (lo copiado no cuenta para el tope ni el límite por minuto) y `VOICE_NOT_COVERED` (una carta sin audio cuando ya hay tantos audios como cartas cubiertas); el tope pasa a *cartas cubiertas + 10*; tabla `voice_quota_alerts` con `claim_`/`release_voice_quota_alert`. `_shared/voiceQuota.ts`: consulta `GET /v1/user/subscription`, ~26 créditos por carta y 50 por la frase; sin cupo o sin respuesta → `VOICE_UNAVAILABLE` sin cobrar; bajo el 20 %, un correo por periodo (Resend, secret nuevo `ADMIN_ALERT_EMAIL`; si falla, se libera la marca). `caller-voice`: `start` revisa el cupo; acción nueva `expand`; `generate` copia de `caller-audio/shared/<voz>/<sha256 del texto normalizado>.mp3` si existe y, si no, genera y lo guarda ahí. Cantador: «Mejorar la voz · N tokens» y la ventana de voces con el precio según las cartas («Cuesta N tokens por tus X cartas…», «Si agregas más de M cartas, podrás ampliarla»); con cartas sin cubrir, «X cartas se cantarán con la voz del navegador» y «Ampliar la voz · N tokens» (`CallerVoiceExpand`), con el error de saldo (y «Comprar tokens») o de cupo; las cartas sin cubrir no se piden al servidor (`pendingAudioIds` con la cobertura). Diseño confirmado con Carlos el 2026-10-26. Pruebas: `supabase/tests/071_caller_voice_blocks.test.sql` (35 aserciones), `tests/functions/voiceQuota.test.ts`, `tests/functions/callerVoice.test.ts`, `tests/src/callerAiVoice.test.ts`. 071 aplicada, `caller-voice` desplegada y secret `ADMIN_ALERT_EMAIL` puesto en Supabase dev el 2026-10-26; base de conocimiento al día (ver «Decisiones tomadas»).

### US A5 — Invitados: tope y una imagen por carta   ·   Estado: construida, desplegada en Supabase dev y llevada a `dev` con el PR #77; falta probar en dev   ·   Pruebas primero (permisos)

- **Historia:** Como organizador, quiero que un invitado no pueda llenar mi lotería de cartas basura, para que mi lotería siga funcionando.
- **Entrega demostrable:** `add_guest_card` exige que la imagen exista y no se haya usado, aplica el tope por invitado y el límite por minuto; en M19, «Borrar sus fotos» por invitado. Resuelve H16.
- **Depende de:** decisión por tomar 9.
- **Cómo se prueba (guion de demo):** Pruebas en `supabase/tests/064_loteria_guest_cards.test.sql`: misma ruta dos veces → `INVALID_IMAGE`; ruta inexistente → `INVALID_IMAGE`; pasar el tope → `GUEST_LIMIT`; ráfaga → `RATE_LIMITED`. En dev, como invitado subir fotos hasta el tope → aviso claro. Como organizador, «Borrar sus fotos» → desaparecen las cartas y sus imágenes.
- **Escenarios cubiertos:** subida normal; misma foto repetida; tope; ráfaga; dos invitados a la vez; invitado quitado.
- **Construido:** 2026-10-26, rama `feature/fixes-revision-f2`. Migración `070_guest_card_limits.sql`: `add_guest_card` además exige que la imagen exista en `card-images` y que ninguna carta de la lotería la use (ni como original de una transformada) → `INVALID_IMAGE`; 60 cartas por invitado por lotería → `GUEST_LIMIT`; 10 por minuto por invitado, en todas sus loterías → `RATE_LIMITED`; índice `cards_uploaded_by_idx`. RPC `delete_guest_cards(set, invitado)`, solo de la dueña: saca las cartas de los tableros, las borra y devuelve sus imágenes. Página del invitado: no deja preparar más fotos de las que le caben y avisa «Ya subiste 60 fotos…» (`guestCardsLeft`, `GUEST_CARDS_PER_LOTERIA` en `utils/guestCards.ts`); si la base pide esperar por el límite por minuto, espera 15 s y reintenta con la misma imagen, hasta unos 2 minutos (`addRetryingWhenRateLimited`). M18, «Quiénes participan»: «Borrar fotos» en el renglón de cada invitado con fotos, con confirmación; borra cartas, imágenes y audios (`CardRepository.deleteGuestCards`; `CallerVoiceService.removeAudios` acepta varias cartas) y la lotería se vuelve a leer. Pruebas: `supabase/tests/070_guest_card_limits.test.sql` (18 aserciones), `tests/src/guestCards.test.ts`, `tests/src/callerVoiceRemoveAudios.test.ts`. 070 aplicada en Supabase dev el 2026-10-26; base de conocimiento actualizada ese día (ver «Decisiones tomadas»).

### US A6 — El cobro siempre llega al mínimo en pesos   ·   Estado: H10 construido (fase 1); H4 por construir (fase 3)   ·   Pruebas primero

- **Historia:** Como comprador, quiero que todo precio que veo se pueda pagar, para no atorarme en Mercado Pago.
- **Entrega demostrable:** el servidor rechaza montos menores a $10.00 MXN; el panel no deja guardar ofertas o packs que dejen un precio por debajo; la cantidad libre sube su mínimo durante la oferta; la verificación del monto de tokens falla cerrada. Resuelve H4 y H10.
- **Depende de:** decisión por tomar 2.
- **Cómo se prueba (guion de demo):** Pruebas en `tests/functions/preference.test.ts` y `credit.test.ts`. En dev, crear una oferta del 60 % → el panel avisa qué pack queda por debajo de $10. Con una oferta del 50 %, Comprar tokens no deja elegir menos de 10 tokens.
- **Escenarios cubiertos:** con y sin oferta; packs y cantidad libre; pago sin monto (rechazado).
- **Construido:** H10, 2026-10-26, rama `feature/fixes-revision-f1`: `buildCreditParams` (`_shared/credit.ts`) rechaza un pago sin `transaction_amount` numérico, igual que las temáticas; pruebas en `tests/functions/credit.test.ts`. Si un aviso de `merchant_order` llegara sin el monto, lo acredita el aviso de `payment`, que consulta el pago completo. H4: por construir.

### US A7 — El resultado de la IA se guarda en el servidor   ·   Estado: por construir   ·   Pruebas primero

- **Historia:** Como usuario, quiero que la carta que pagué con IA no se pierda aunque se me cierre la página, para no pagar dos veces.
- **Entrega demostrable:** `transform-loteria` guarda la imagen en `card-images` y responde con su ruta; si no puede guardarla, devuelve el token. La transformación individual avisa antes de cerrar la página. Resuelve H6.
- **Depende de:** A1.
- **Cómo se prueba (guion de demo):** Transformar una carta y cerrar la pestaña en cuanto empieza → al volver, el resultado ya pagado se puede recuperar (cómo se muestra —aplicado a la carta o como «resultado pendiente»— se decide con Carlos al empezar). Forzar una falla de guardado → el token se devuelve. Pruebas en `tests/functions/transform.test.ts`.
- **Escenarios cubiertos:** individual y lote; falla de descarga; falla de subida; usuario que cierra la página.
- **Construido:** —

### US A8 — Reembolsos y contracargos   ·   Estado: construida, falta probar en dev   ·   Pruebas primero

- **Historia:** Como dueño del negocio, quiero que un pago devuelto quite lo que se entregó, para no perder dos veces.
- **Entrega demostrable:** el webhook atiende `refunded` y `charged_back`: descuenta los tokens de esa compra (saldo mínimo 0) y la marca devuelta; en temáticas, marca `refunded` y se pierde el acceso al PDF. Resuelve H1 (`docs/PENDIENTES.md`, punto 3).
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En dev, comprar tokens con el comprador de prueba, gastar algunos y devolver el pago desde Mercado Pago → saldo baja (sin quedar negativo) y la compra sale como devuelta en el historial y en el panel. Comprar una temática y devolverla → ya no se descarga.
- **Escenarios cubiertos:** devolución total; tokens ya gastados; aviso repetido (idempotente); temática; reembolso parcial (según se decida).
- **Construido:** 2026-10-26, rama `feature/fixes-revision-f1`. Migración `068_payment_refunds.sql`: columnas `refund_reason`, `refunded_at` (y `refunded_tokens` en `token_purchases`) y la RPC `reverse_payment(provider, payment_id, reason)`, solo de `service_role`: en tokens descuenta lo de esa compra con el saldo en 0 como mínimo y deja la compra en `refunded`; en temáticas deja la compra en `refunded` (se pierde la descarga y se puede volver a comprar); un aviso repetido devuelve `repeated` sin descontar. `webhook-mercadopago`: si el pago consultado en Mercado Pago está en `refunded` o `charged_back`, llama a la RPC (`reversalReason` en `_shared/paymentFlow.ts`). Historial de compras de Mi cuenta: «Devuelto» (el panel ya decía «Devuelta»). Una devolución parcial deja el pago en `approved` en Mercado Pago y no se revierte nada (ver «Decisiones tomadas»). Pruebas: `supabase/tests/068_payment_refunds.test.sql` (20 aserciones) y `tests/functions/paymentFlow.test.ts`.

### US A9 — Códigos promocionales con límite de intentos   ·   Estado: por construir   ·   Pruebas primero

- **Historia:** Como dueño del negocio, quiero que los códigos no se puedan adivinar probando, para que solo los use quien los recibió.
- **Entrega demostrable:** `check_promo_code` y `create-payment-preference` cuentan los intentos con un código inexistente y responden `RATE_LIMITED` al pasar el tope. Resuelve H5.
- **Depende de:** decisión por tomar 3.
- **Cómo se prueba (guion de demo):** Prueba en `supabase/tests/`: 10 códigos falsos → el 11.º se rechaza aunque sea válido, hasta que pase la hora. En dev, Comprar tokens muestra «Demasiados intentos».
- **Escenarios cubiertos:** código válido a la primera; códigos falsos; código ya usado (no cuenta como intento fallido o sí, según se decida).
- **Construido:** —

### US A10 — Tableros: sin pérdidas y con tope   ·   Estado: por construir

- **Historia:** Como usuario, quiero que regenerar mis tableros no me deje sin ellos si algo falla, para no perder lo ya impreso.
- **Entrega demostrable:** una RPC reemplaza los tableros de la lotería en una sola transacción; se valida el número de cartas antes de borrar; tope de tableros por lotería en el selector y en la base. Resuelve H7 y H8.
- **Depende de:** decisión por tomar 4 (reabre una regla DEFINIDA).
- **Cómo se prueba (guion de demo):** En U2 con 30 tableros, cortar la red a mitad de «Generar» → siguen los 30 de antes. Escribir 10000 en el selector → no deja pasar del tope. Prueba en `supabase/tests/` de la RPC (dueño, tope, todo o nada).
- **Escenarios cubiertos:** generación normal; falla a la mitad; menos cartas que el mínimo; tope; visitante sin sesión (sin cambios).
- **Construido:** —

### US A11 — Compras temáticas pendientes que no bloquean   ·   Estado: por construir   ·   Pruebas primero

- **Historia:** Como comprador, quiero poder volver a comprar una temática si mi pago en efectivo ya no sigue en proceso, para no quedarme sin ella.
- **Entrega demostrable:** `create-seasonal-preference`, ante un pendiente, consulta ese pago en Mercado Pago y lo libera (o lo entrega) si ya no está en proceso; `expired` libera. Resuelve H9.
- **Depende de:** decisión por tomar 5.
- **Cómo se prueba (guion de demo):** En dev, iniciar un pago en efectivo y dejarlo vencer sin que llegue el aviso (borrar el aviso en el simulador o con un pago de prueba) → al volver a comprar, se abre el checkout. Pruebas en `tests/functions/seasonal.test.ts`.
- **Escenarios cubiertos:** pendiente vigente (sigue bloqueando); vencido; aprobado sin aviso (se entrega); rechazado.
- **Construido:** —

### US A12 — Correcciones menores   ·   Estado: H20 y H22 construidos (fase 1); el resto por construir (fase 4)

- **Historia:** Como dueño del negocio, quiero cerrar los detalles sueltos de la revisión, para que no crezcan.
- **Entrega demostrable:** secret de firma del webhook configurado y exigido (H11); prompts sin la marca (H12); reintentos por NSFW revisados contra la factura de Replicate (H13); borrado de audios en páginas (H20); decisión anotada sobre los avisos de borrado en vivo (H21); comentario de `caller-voice` corregido (H22).
- **Depende de:** —
- **Cómo se prueba (guion de demo):** Pago de prueba en dev con el secret puesto → se acredita; aviso con firma falsa → 401. Transformar una foto → el estilo sigue igual. Borrar una lotería con más de 1,000 audios (en prueba) → la carpeta queda vacía.
- **Escenarios cubiertos:** cada punto por separado.
- **Construido:** 2026-10-26, rama `feature/fixes-revision-f1`. H20: `CallerVoiceService.removeAudios` lista y borra en páginas de 1,000 (prueba en `tests/src/callerVoiceRemoveAudios.test.ts`). H22: comentario de `caller-voice` con 10 tokens. H11, H12, H13 y H21: por construir.

## Base de conocimiento (propuesta; lo de la fase 2 ya se aplicó el 2026-10-26)

Pendiente del «sí» de Carlos, uno por uno, con los cuatro puntos de CLAUDE.md:

- `docs/contexto-negocio.md`:
  - §4: tope de tableros por lotería (reabre DEFINIDO de 2026-10-06) y largo máximo del título (50).
  - §7: tokens de bienvenida al confirmar el correo.
  - §8: mínimo de $10.00 MXN sobre el monto final; §9: ofertas que no dejen precios por debajo y límite de intentos de código.
  - §11: entidades nuevas (intentos de código, audios compartidos; ruta del resultado en `token_usage` si se hace).
  - §13: alerta al administrador por cupo bajo de voz.
  - §17: retirar «Descontar tokens ante reembolso o contracargo» y «Quitar el acceso a una lotería temática…» al construir A8.
  - §18: liberar un pendiente que ya no está en proceso.
  - §20: tope de regeneraciones, límite por minuto, precio por bloques, devolución con la frase, cupo y audios compartidos (reabre decisiones 11, 13, 15 y 25 de FEAT-55).
  - §21: tope de cartas por invitado y una imagen por carta (reabre decisión 5 de FEAT-56).
  - §15: una fila del día en que se decidan, con las descartadas.
- `docs/casos-de-uso.md`: casos de compra, IA, cantador e invitados afectados (revisar al definir).
- `docs/diseno-mockups.md`: captcha en M1; aviso de mínimo en U3 y en A1.2a; «Borrar sus fotos» en M19; precio por bloques y «voz no disponible» en el cantador.
