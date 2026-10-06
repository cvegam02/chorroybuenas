# Fase 1 — Reglas que el sitio contradice hoy

**Estado: 🚧 en curso** (A1 hecha el 2026-10-06; A2 construida, falta la demo; falta B1)

**Contexto.** El 2026-10-06 Carlos definió reglas que el sitio todavía no cumple (`contexto-negocio.md` §17). Tres de ellas se arreglan sin construir nada nuevo por debajo: el mínimo de cartas en Clásico, el mínimo de compra, y que el saldo aparezca al volver de pagar. Las tres las ve el usuario hoy: puede generar tableros con menos cartas de las debidas, puede llegar a un pago que Mercado Pago no le deja completar, y puede ver "pago exitoso" con su saldo viejo.

**Clasificación:** toca cinco pantallas (P1 Inicio, C1 Cartas, C2 Cantidad de tableros, U2 Lotería guardada y U3 Comprar tokens), una función del servidor (la que inicia la compra) y los textos en español e inglés. No toca la base de datos ni el diseño. Estimado: 2 sesiones.

## Decisiones tomadas con el usuario (2026-10-06)

1. **En modo Clásico se necesitan al menos 24 cartas para generar tableros.** Primero se fijó en 20 y ese mismo día se subió a 24, tras simular 4,000 partidas por caso con 10 jugadores: a tablero lleno, con 20 cartas el 54 % de las partidas terminaba en empate; con 24, el 44 %. _(Descartadas: 16, porque todos los tableros tendrían las mismas cartas; 20, por los empates; 30, que baja los empates a un tercio pero deja fuera a quien tiene pocas fotos; mínimo de 20 con recomendación de 30.)_ 
2. **En modo Kids se necesitan al menos 15 cartas.** Estaba en 12. En la misma simulación, Kids con 12 daba 52 % de empates, igual que Clásico con 20; con 15 baja a 40 %, parejo con Clásico en 24. _(Descartadas: dejarlo en 12; 18, demasiado para un modo pensado como sencillo.)_
3. **El mínimo de compra en cantidad libre es de 5 tokens ($10.00 MXN).** _(Descartadas: 1 token, porque Mercado Pago no permite pagar $2.00; 10 tokens, porque duplica al paquete más chico.)_
5. **La historia A1 incluye todos los lugares donde estaba escrito el mínimo, no solo las dos pantallas previstas.** Al empezar a construir aparecieron tres más: la pantalla de lotería guardada (U2), que aceptaba 16 y 12; el texto de la página de inicio, que decía "Mínimo 20 cartas para empezar"; y un valor interno de 20 que nadie usaba. El texto de inicio pasa a "Mínimo 24 cartas para empezar (15 en modo Kids)". _(Descartadas: cambiar solo las dos pantallas previstas y dejar lo demás como pendiente; que Carlos redactara el texto de inicio.)_
4. **Al volver de un pago aprobado, el sitio acredita en ese momento, sin esperar al aviso de Mercado Pago.** Aceptada al aprobar el plan de fases. _(Descartada: dejarlo como hoy, donde solo acredita el aviso y el saldo puede tardar.)_

## Diseño

**Mínimo de cartas (A1).** Hoy el mínimo está escrito en dos lugares con valores distintos, y ninguno es el correcto: la pantalla de cartas (C1) exige 20 en Clásico y la de tableros (C2) acepta 16. Debe quedar en un solo lugar, usado por las dos pantallas: Clásico 24, Kids 15. En Kids las dos pantallas piden hoy 12.

Una lotería ya guardada en Clásico con 20 a 23 cartas, o en Kids con 12 a 14, no podrá generar tableros nuevos hasta completar el mínimo; sus tableros ya generados y su PDF se conservan. El mensaje de "te faltan N cartas" de C2 debe usar el mismo número.

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

### US A1 — Mínimos de cartas: 24 en Clásico y 15 en Kids   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como persona que arma una lotería, quiero que el sitio me pida suficientes cartas antes de generar tableros (24 en Clásico, 15 en Kids), para que mis tableros salgan distintos entre sí y haya menos empates al jugar.
- **Entrega demostrable** — Con menos de 24 cartas en Clásico, o menos de 15 en Kids, ni la pantalla de cartas ni la de tableros dejan generar, y las dos dicen cuántas faltan.
- **Construcción (propuesta)** — Un solo lugar con los mínimos por modo (Clásico 24, Kids 15), usado por `src/components/CardEditor/CardEditor.tsx` y `src/components/BoardGenerator/BoardCountSelector.tsx` (hoy cada uno tiene su número en Clásico, 20 y 16, y los dos piden 12 en Kids). Sin cambios de servidor. Ampliada el 2026-10-06 (decisión 5): también `src/components/SetView/SetView.tsx`, el texto de inicio en los dos idiomas y quitar el valor sin uso de `src/hooks/useCards.ts`.
- **Construido** — 2026-10-06, en la rama `feature/fase-1-reglas`. Los mínimos viven en un solo lugar, `src/utils/gridRules.ts` (Clásico 24, Kids 15), y lo usan las tres pantallas que antes tenían su propio número: cartas (C1), cantidad de tableros (C2) y lotería guardada (U2). El texto de inicio (P1) dice "Mínimo 24 cartas para empezar (15 en modo Kids)" en español y su equivalente en inglés. Se quitó de `useCards` el mínimo de 20 que nadie usaba. Verificado con revisión de tipos, lint y pruebas automáticas en verde (259, incluidas 3 nuevas que fijan los dos números). Carlos la probó en su máquina el 2026-10-06 y confirmó que funciona. Está en `dev`; todavía no en `main`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — (1) Abre la página de inicio: en los pasos debería decir "Mínimo 24 cartas para empezar (15 en modo Kids)". (2) Sin iniciar sesión → Crear lotería → modo Clásico → sube 20 cartas. La pantalla de cartas debería decir que faltan 4 y no dejarte continuar. Sube 4 más → ahora sí deja pasar a tableros y generar. (3) Repite en modo Kids: con 12 cartas debería decir que faltan 3; con 15 deja generar. (4) Con sesión, abre desde Mi cuenta una lotería guardada en Clásico que tenga menos de 24 cartas: debería avisar que faltan cartas en vez de ofrecer generar tableros.
- **Escenarios cubiertos**:
  - [x] Clásico con 24 cartas o más: genera tableros.
  - [x] Clásico con 20 a 23 cartas (lo que antes bastaba): no genera y dice cuántas faltan para 24.
  - [ ] Clásico con menos de 20 cartas: no genera y dice cuántas faltan para 24.
  - [x] Kids con 15 cartas o más: genera tableros.
  - [x] Kids con 12 a 14 cartas (lo que antes bastaba): no genera y dice cuántas faltan para 15.
  - [ ] Cambiar de Clásico a Kids, o al revés, con las cartas ya subidas: el mínimo y el mensaje cambian al del modo elegido.
  - [ ] Abrir directamente la dirección de la pantalla de tableros con menos cartas del mínimo: tampoco deja generar.
  - [x] La pantalla de una lotería guardada (U2) aplica el mismo mínimo que las otras dos.
  - [x] El texto de la página de inicio menciona 24 y 15, en español y en inglés.
  - [ ] Una lotería guardada con menos cartas que el mínimo nuevo (Clásico con 20 a 23, Kids con 12 a 14): conserva sus tableros y su PDF, pero pide completar el mínimo para generar otros.

### US A2 — Mínimo de compra de 5 tokens   ·   Estado: 🚧 construida, falta la demo de Carlos

- **Historia** — Como comprador, quiero que el sitio no me deje iniciar una compra que Mercado Pago no me va a dejar pagar, para no llegar a un botón de pagar deshabilitado.
- **Entrega demostrable** — En la página de compra, la cantidad libre no acepta menos de 5 tokens y lo explica; el servidor rechaza cualquier intento por debajo de 5.
- **Construcción (propuesta)** — Prueba primero en `tests/functions/preferenceRequest.test.ts`; cambiar `MIN_CUSTOM_TOKENS` a 5 en `supabase/functions/_shared/validation.ts`; `CUSTOM_MIN` a 5 en `src/components/BuyTokens/BuyTokensPage.tsx`; texto del mínimo en `src/locales/es/translation.json` y `src/locales/en/translation.json`. Publicar la función de compra en dev, probar, y luego en producción.
- **Construido** — 2026-10-06, en la rama `feature/fase-1-reglas`. Se empezó por las pruebas: cinco nuevas fallaron (el servidor aceptaba de 1 a 4 tokens) y pasaron tras el cambio. El servidor rechaza una cantidad libre menor a 5 (`supabase/functions/_shared/validation.ts`); la página toma el mínimo y el máximo de `src/utils/purchaseRules.ts`, y una prueba comprueba que coincidan con los del servidor. El texto bajo el campo dice "Mínimo 5 tokens · Máximo 500 tokens", armado con esos números, en los dos idiomas. La función de compra se publicó en el Supabase de **dev** y se comprobó ahí contra el servidor real, con un usuario temporal ya borrado: 1 y 4 tokens, rechazados; 5 y 500, abren el pago; 501, rechazado; el paquete más chico, abre el pago. Revisión de tipos, lint y pruebas en verde (264). **No hecho:** no se publicó en producción y la página no se abrió en el navegador; falta la demo de Carlos.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Inicia sesión → Comprar tokens. Bajo el campo de cantidad libre debería decir "Mínimo 5 tokens · Máximo 500 tokens". Escribe 3: el botón Comprar queda deshabilitado, y al salir del campo la cantidad se ajusta sola a 5. Con 5 → Comprar → debería abrirse Mercado Pago por $10.00 (no hace falta pagar).
- **Escenarios cubiertos**:
  - [ ] Cantidad libre de 5 tokens: abre el pago por $10.00.
  - [ ] Cantidad libre de 1 a 4: la página no deja comprar y muestra el mínimo.
  - [x] Petición directa al servidor con 4 tokens (saltándose la página): el servidor la rechaza. (Comprobado en dev el 2026-10-06.)
  - [x] Cantidad libre de 500: sigue permitida. De 501: rechazada. (Comprobado en dev contra el servidor.)
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
