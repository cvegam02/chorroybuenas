# Fase 1 — Reglas que el sitio contradice hoy

**Estado: 🔲 pendiente**

**Contexto.** El 2026-10-06 Carlos definió reglas que el sitio todavía no cumple (`contexto-negocio.md` §17). Tres de ellas se arreglan sin construir nada nuevo por debajo: el mínimo de cartas en Clásico, el mínimo de compra, y que el saldo aparezca al volver de pagar. Las tres las ve el usuario hoy: puede generar tableros con menos cartas de las debidas, puede llegar a un pago que Mercado Pago no le deja completar, y puede ver "pago exitoso" con su saldo viejo.

**Clasificación:** toca tres pantallas (C2 Cantidad de tableros, C1 Cartas y U3 Comprar tokens), una función del servidor (la que inicia la compra) y los textos en español e inglés. No toca la base de datos ni el diseño. Estimado: 2 sesiones.

## Decisiones tomadas con el usuario (2026-10-06)

1. **En modo Clásico se necesitan al menos 20 cartas para generar tableros.** _(Descartada: 16, el mínimo matemático, porque todos los tableros tendrían las mismas cartas.)_
2. **El mínimo de compra en cantidad libre es de 5 tokens ($10.00 MXN).** _(Descartadas: 1 token, porque Mercado Pago no permite pagar $2.00; 10 tokens, porque duplica al paquete más chico.)_
3. **Al volver de un pago aprobado, el sitio acredita en ese momento, sin esperar al aviso de Mercado Pago.** Aceptada al aprobar el plan de fases. _(Descartada: dejarlo como hoy, donde solo acredita el aviso y el saldo puede tardar.)_

## Diseño

**Mínimo de cartas (A1).** Hoy el mínimo está escrito en dos lugares con valores distintos: la pantalla de cartas (C1) exige 20 en Clásico y la de tableros (C2) acepta 16. Debe quedar en un solo lugar, usado por las dos pantallas: Clásico 20, Kids 12. El mensaje de "te faltan N cartas" de C2 debe usar el mismo número.

**Mínimo de compra (A2).** El límite vive en dos lados y deben coincidir:
- En el servidor, la función que inicia la compra rechaza una cantidad libre menor a 5 con un mensaje claro. Es la que manda: aunque alguien salte la página, no puede iniciar el pago.
- En la página (U3), el campo de cantidad libre no acepta menos de 5 y explica el mínimo.
- El máximo sigue en 500. Los paquetes no cambian.

**Acreditar al volver (B1).** Cuando Mercado Pago regresa al usuario a U3 con un pago aprobado, la página pide al servidor que acredite ese pago y luego muestra el saldo. La función del servidor ya existe y ya está publicada; solo falta que la página la llame. Es seguro llamarla aunque el aviso de Mercado Pago ya haya acreditado: un pago se acredita una sola vez (`contexto-negocio.md` §8).

Estados de la pantalla al volver:
- **Acreditando:** mensaje breve mientras responde el servidor.
- **Acreditado:** el mensaje de éxito de hoy, con el saldo ya actualizado.
- **Aún no acreditado** (el servidor responde que el pago no está aprobado todavía): mensaje de que el pago se está procesando y los tokens aparecerán en unos minutos. No es un error.
- **Fallo de conexión:** el mismo mensaje de "se está procesando"; el aviso de Mercado Pago acreditará de todos modos.

Los textos nuevos van en español y en inglés.

---

## Grupo A — Límites

### US A1 — Mínimo de 20 cartas en Clásico al generar tableros   ·   Estado: 🔲 pendiente

- **Historia** — Como persona que arma una lotería en modo Clásico, quiero que el sitio me pida 20 cartas antes de generar tableros, para que mis tableros salgan distintos entre sí.
- **Entrega demostrable** — Con 16 a 19 cartas en Clásico, la pantalla de tableros no deja generar y dice cuántas faltan para 20.
- **Construcción (propuesta)** — Un solo lugar con los mínimos por modo (Clásico 20, Kids 12), usado por `src/components/CardEditor/CardEditor.tsx` y `src/components/BoardGenerator/BoardCountSelector.tsx` (hoy cada uno tiene su número: 20 y 16). Sin cambios de servidor.
- **Construido** — (se llena al terminar)
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre el sitio sin iniciar sesión → Crear lotería → modo Clásico → sube 16 cartas → intenta pasar a tableros. Debería avisarte que faltan 4 y no dejarte generar. Sube 4 más → ahora sí deja generar.
- **Escenarios cubiertos**:
  - [ ] Clásico con 20 cartas o más: genera tableros.
  - [ ] Clásico con 16 a 19 cartas: no genera y dice cuántas faltan para 20.
  - [ ] Kids con 12 cartas: genera tableros (no cambia).
  - [ ] Kids con 11 cartas: no genera y dice que falta 1.
  - [ ] Abrir directamente la dirección de la pantalla de tableros con menos cartas del mínimo: tampoco deja generar.

### US A2 — Mínimo de compra de 5 tokens   ·   Estado: 🔲 pendiente

- **Historia** — Como comprador, quiero que el sitio no me deje iniciar una compra que Mercado Pago no me va a dejar pagar, para no llegar a un botón de pagar deshabilitado.
- **Entrega demostrable** — En la página de compra, la cantidad libre no acepta menos de 5 tokens y lo explica; el servidor rechaza cualquier intento por debajo de 5.
- **Construcción (propuesta)** — Prueba primero en `tests/functions/preferenceRequest.test.ts`; cambiar `MIN_CUSTOM_TOKENS` a 5 en `supabase/functions/_shared/validation.ts`; `CUSTOM_MIN` a 5 en `src/components/BuyTokens/BuyTokensPage.tsx`; texto del mínimo en `src/locales/es/translation.json` y `src/locales/en/translation.json`. Publicar la función de compra en dev, probar, y luego en producción.
- **Construido** — (se llena al terminar)
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En el sitio de dev, inicia sesión → Comprar tokens → en cantidad libre escribe 3. Debería marcar que el mínimo es 5 y no dejarte comprar. Escribe 5 → Comprar → debería abrirse Mercado Pago con $10.00.
- **Escenarios cubiertos**:
  - [ ] Cantidad libre de 5 tokens: abre el pago por $10.00.
  - [ ] Cantidad libre de 1 a 4: la página no deja comprar y muestra el mínimo.
  - [ ] Petición directa al servidor con 4 tokens (saltándose la página): el servidor la rechaza.
  - [ ] Cantidad libre de 500: sigue permitida. De 501: rechazada.
  - [ ] Compra de un paquete: funciona igual que antes.

---

## Grupo B — Pago

### US B1 — El saldo aparece al volver del pago   ·   Estado: 🔲 pendiente

- **Historia** — Como comprador, quiero ver mis tokens en cuanto regreso de pagar, para no dudar de si mi compra funcionó.
- **Entrega demostrable** — Al volver de un pago aprobado, la página muestra un momento "acreditando", y enseguida el éxito con el saldo ya sumado.
- **Construcción (propuesta)** — Función nueva en `src/services/PurchaseService.ts` que llama a la función del servidor `credit-payment-on-return` con el identificador del pago; en `src/components/BuyTokens/BuyTokensPage.tsx`, el paso de regreso (hoy solo refresca el saldo) la llama antes de refrescar; textos nuevos en los dos idiomas. Sin cambios de servidor.
- **Construido** — (se llena al terminar)
- **Depende de** — nada. Conviene hacerla después de A2 para probar las dos con una sola compra.
- **Cómo se prueba (guion de demo)** — En el sitio de dev, anota tu saldo → compra el paquete de 10 tokens con el comprador de prueba y la tarjeta de prueba → al regresar al sitio debería verse "acreditando" un instante y luego el éxito, con el saldo 12 tokens más alto, sin recargar la página.
- **Escenarios cubiertos**:
  - [ ] Pago aprobado: al volver, el saldo ya incluye los tokens.
  - [ ] El aviso de Mercado Pago llegó antes que el usuario: no se suma dos veces.
  - [ ] Pago pendiente (efectivo o transferencia): mensaje de que se acreditará al confirmarse; no es error.
  - [ ] Pago cancelado: el mensaje de cancelado de hoy; no se llama al servidor.
  - [ ] Falla la llamada al servidor: mensaje de "se está procesando"; los tokens llegan por el aviso.
  - [ ] Volver con el pago de otra cuenta en la dirección: no acredita nada.
