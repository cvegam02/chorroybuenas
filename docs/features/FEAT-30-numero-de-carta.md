# FEAT-30 — Número de carta

**Estado: construida el 2026-10-09 (US A1 y A2). Carlos vio el número en el PDF y lo dio por bueno. Llegó a `dev` con el PR #48; Carlos siguió ahí los guiones de demo y el 2026-10-10 confirmó que todo se ve bien. Falta pasar a `main`, cuando Carlos lo pida. Sin decisiones pendientes. Rama creada desde `dev` con FEAT-29 ya fusionada.**

**Contexto.** Salió el 2026-10-09 al definir [FEAT-29](FEAT-29-pdf-aspecto-de-las-cartas.md): el diseño de carta que trajo Carlos lleva un número en la esquina superior izquierda. Se dejó para una feature aparte porque no es solo aspecto: es una regla de negocio nueva (FEAT-29, decisión 4).

**Lo que Carlos pidió en su diseño del 2026-10-09** (punto de partida; el punto 2 cambió al definir la feature, ver decisión 2).

1. Cada carta lleva un número único dentro de su lotería, asignado solo (1, 2, 3…) en el orden en que se suben las fotos.
2. El usuario puede editarlo, y no se permiten números repetidos dentro de la misma lotería.
3. La misma carta lleva el mismo número en todos los tableros y en la baraja.
4. Se dibuja en la esquina superior izquierda, sobre la foto, con la misma letra del nombre: unos 110 px en una carta de 1000 × 1500, a unos 35 px del marco.

**Fuera de esta feature.** Que la IA pinte el nombre o el número dentro de la ilustración, y un límite de largo para el nombre: las dos ideas se descartaron el 2026-10-09 (FEAT-29, decisión 14).

**Clasificación:** regla de negocio nueva sobre las cartas, que se ve en el PDF y en las pantallas que muestran cartas. No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones (decisión 3). Estimado: 1 a 2 sesiones.

**Qué toca de lo ya decidido.** Es una regla nueva: hay que agregarla a `docs/contexto-negocio.md` (reglas de las cartas) y anotar en `docs/diseno-mockups.md` que las cartas muestran su número, siguiendo la regla de sincronizar la base de conocimiento. Hecho el 2026-10-09 con la confirmación de Carlos: un renglón bajo «Carta» en la §4 y una fila en la §15 de `contexto-negocio.md`, y la mención del número en C1, C3, U2, M9 y M10 de `diseno-mockups.md`. `casos-de-uso.md` no se toca: no cambia ningún flujo.

**Punto de partida (para no rehacerlo).**

- El lugar del número ya está calculado: `cardComposeLayout` (`src/services/cardCompose/layout.ts`) devuelve `number` con su posición y tamaño, y hoy nadie lo dibuja. Falta pasar el número a `composeCard` (`src/services/cardCompose/compose.ts`, vía `composeInputFor` en `input.ts`); con eso sale en el PDF y en todas las pantallas que ya usan la carta compuesta.
- El almacén de cartas compuestas (`src/services/cardCompose/composedCards.ts`) decide si vuelve a componer por nombre, foto y tipo de carta: hay que agregarle el número.
- Con sesión, las cartas se leen ordenadas por fecha de creación (`src/repositories/CardRepository.ts`); sin sesión viven en el navegador, en el orden de la lista. `Card` (`src/types/index.ts`) no tiene campo de número.
- Las cartas de loterías temáticas ya traen todo dibujado y no pasan por la pieza: no deberían cambiar.

## Decisiones tomadas con el usuario

Todas del 2026-10-09.

1. **Al borrar una carta, las siguientes se renumeran solas**: nunca quedan huecos y los números van siempre de 1 al total de cartas. Carlos lo eligió sabiendo que, si se borra una carta después de imprimir, las siguientes ya no coinciden con lo impreso. _(Descartadas: dejar el hueco y que lo ocupe la siguiente carta que se suba; dejar el hueco para siempre.)_
2. **El número no se edita a mano**: se asigna solo al subir la carta. Cambia lo que venía en su diseño («el usuario puede editarlo; validar que no se repitan»): como no se edita y no hay huecos, no puede haber números repetidos ni hay nada que validar. _(Descartadas: intercambiar el número con la carta que ya lo tiene; recorrer las cartas de en medio.)_
3. **El número es el lugar de la carta en el orden de subida y no se guarda: se calcula.** La primera carta subida es la 1. Por eso no hay migración, y las loterías que ya existen quedan numeradas solas. Aprobado por Carlos al presentarle el diseño.
4. **Lo llevan las cartas con foto normal y las convertidas con IA** (encima, igual que el nombre). Las cartas de loterías temáticas no: ya vienen terminadas.
5. **Se ve en todos lados donde ya se muestra la carta compuesta**: tableros y baraja del PDF, editor de cartas, vista previa, lotería guardada y carta ampliada. La misma carta lleva el mismo número en todos.

## Diseño

- **De dónde sale el número.** Del orden de la lista de cartas de la lotería: con sesión, por fecha de creación (`CardRepository.getCards`); sin sesión, el orden de la lista guardada en el navegador. Una función pura numera la lista (1, 2, 3…) y `Card` lleva un campo `number` solo en memoria; no se guarda en la base ni en el navegador.
- **Cómo llega a la carta.** `composeInputFor` (`src/services/cardCompose/input.ts`) pasa el número a `composeCard`, que lo dibuja en el lugar que ya calcula `cardComposeLayout` (arriba a la izquierda), con la misma letra, contorno y sombra del nombre.
- **PDF.** `generatePDF` numera con la lista de la baraja y le pone a cada carta de cada tablero el número que le toca por su identificador, así tableros y baraja siempre coinciden. Las loterías temáticas no se numeran.
- **Pantallas.** `useCards` entrega las cartas ya numeradas; los tableros toman el número de esa misma lista al tomar la imagen. El almacén de cartas compuestas vuelve a componer una carta si cambia su número (por ejemplo, al borrar una anterior).

## Grupo A — Número de carta

### US A1 — El número sale en las cartas del PDF   ·   Estado: hecha, probada por Carlos en `dev` (confirmado el 2026-10-10)

- **Historia** — Como persona que imprime su lotería, quiero que cada carta lleve su número, para cantarla y encontrarla como en una lotería de verdad.
- **Entrega demostrable** — En los tableros y en la baraja del PDF, cada carta con foto normal o convertida con IA lleva su número arriba a la izquierda, sobre la imagen, con la misma letra del nombre. La misma carta lleva el mismo número en todos los tableros y en la baraja. Las loterías temáticas no cambian.
- **Construido** — 2026-10-09. `withCardNumbers` y `withNumbersFrom` (`src/utils/cardNumbers.ts`) numeran una lista y le pasan esos números a las copias de un tablero. `Card` (`src/types/index.ts`) lleva `number`, solo en memoria. `generatePDF` (`src/services/PDFService.ts`) numera la lista de la baraja y, con ella, las cartas de cada tablero; con `finishedCards` no numera. `composeInputFor` pasa el número y `composeCard` (`src/services/cardCompose/compose.ts`) lo dibuja en `layout.number`, alineado a la izquierda, con el mismo contorno y sombra del nombre. Pruebas: `tests/src/cardNumbers.test.ts`, `tests/src/pdfCardNumbers.test.ts` y un caso en `tests/src/pdfPrepareCards.test.ts`. El dibujo del número no tiene prueba automática ni se ha visto en pantalla: se comprueba en la demo. En las pantallas todavía no sale: es la US A2.
- **Depende de** — nada (usa la carta compuesta de FEAT-29).
- **Cómo se prueba (guion de demo)** — Descarga el PDF de una lotería con fotos normales y cartas con IA → en la baraja, las cartas van numeradas 1, 2, 3… en el orden en que las subiste → busca una carta en dos tableros distintos → lleva el mismo número que en la baraja → el número se lee bien sobre fotos claras y oscuras y no estorba al nombre. Arma el PDF de una lotería temática en administración → sus cartas salen como antes, sin número.
- **Escenarios cubiertos**:
  - [x] Las cartas se numeran 1, 2, 3… en el orden de la lista. (Prueba automática.)
  - [x] La misma carta lleva el mismo número en los tableros y en la baraja. (Prueba automática.)
  - [x] Las cartas de una lotería temática no se numeran. (Prueba automática.)
  - [x] El número se ve bien en el PDF, en tableros 4 × 4, 3 × 3 y baraja, con uno y dos dígitos. (Demo. en `dev`, confirmada el 2026-10-10.)

### US A2 — El número se ve en las pantallas   ·   Estado: hecha, probada por Carlos en `dev` (confirmado el 2026-10-10)

- **Historia** — Como persona que arma su lotería, quiero ver el número de cada carta desde que la subo, para saber cómo va a quedar.
- **Entrega demostrable** — En el editor de cartas, la vista previa de tableros, la lotería guardada y la carta ampliada, cada carta muestra su número. Al subir una carta recibe el siguiente número; al borrar una, las siguientes bajan un número en pantalla. `docs/contexto-negocio.md` y `docs/diseno-mockups.md` quedaron al día el 2026-10-09, con la confirmación de Carlos.
- **Construido** — 2026-10-09. `useCards` (`src/hooks/useCards.ts`) entrega las cartas ya numeradas con `withCardNumbers`; el número se recalcula cada vez que cambia la lista, así que subir o borrar una carta actualiza los demás. En la vista previa (`src/AppRouter.tsx`) y en la lotería guardada (`src/components/SetView/SetView.tsx`), las cartas de los tableros toman su número de esa lista con `withNumbersFrom`, igual que ya tomaban su imagen. El almacén de cartas compuestas (`src/services/cardCompose/composedCards.ts`) y `useComposedCard` cuentan el número, para volver a componer la carta cuando cambia. `BoardThumbnail` usa ahora los datos actuales de cada carta del tablero (antes se quedaba con los del momento en que se abrió, y el número llegaba tarde). Pruebas: un caso nuevo en `tests/src/composedCards.test.ts`; lo de los tableros lo cubre `tests/src/cardNumbers.test.ts`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En el editor de cartas sube tres fotos → llevan 1, 2 y 3 → borra la 2 → la que era 3 pasa a ser 2 → sube otra → recibe el 3. Sube varias en lote → se numeran en el orden de los archivos. Genera tableros → en la vista previa cada carta lleva el mismo número que en el editor. Abre una lotería guardada → cartas y tableros llevan su número, igual que en su PDF.
- **Escenarios cubiertos**:
  - [x] Si cambia el número de una carta, se vuelve a componer. (Prueba automática.)
  - [x] Las cartas de los tableros en pantalla llevan el número de la lista de cartas. (Prueba automática.)
  - [x] Al subir y borrar cartas los números se actualizan en el editor. (Demo. en `dev`, confirmada el 2026-10-10.)
  - [x] La subida por lote numera en el orden de los archivos. (Demo. en `dev`, confirmada el 2026-10-10.)
  - [x] Pantalla y PDF muestran el mismo número para cada carta. (Demo. en `dev`, confirmada el 2026-10-10.)
