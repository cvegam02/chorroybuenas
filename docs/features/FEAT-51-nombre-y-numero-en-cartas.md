# FEAT-51 — Nombre y número en las cartas

**Estado:** definida con Carlos el 2026-10-20. El cambio en la base de conocimiento se confirmó y se aplicó el mismo día. Se trabaja en `feature/nombre-numero-cartas`, creada el 2026-10-20 desde `dev`. Las US A1 y A2 se construyeron el 2026-10-20, y ese mismo día se aplicó la migración 058 en el Supabase de dev. Carlos lo revisó el 2026-10-20 y confirmó que funciona. Llega a `dev` con el PR de `feature/nombre-numero-cartas`, abierto el 2026-10-20. Falta aplicar la migración 058 en producción, con su confirmación, antes de pasar a `main`.

**Contexto.** Algunos usuarios suben fotos de cartas de lotería que ya traen su número y su nombre. Hoy el sitio les dibuja encima el título y el número (FEAT-29 y FEAT-30), así que salen repetidos. Con esta feature, cada lotería puede elegir qué se dibuja en sus cartas.

**Sí cambia reglas de negocio** (§4 de `contexto-negocio.md`) y el índice de pantallas (C1 y C3). Ver «Cambio en la base de conocimiento».

## Decisiones tomadas con el usuario

Decisiones de Carlos con Claude (2026-10-20):

1. **Hay cuatro opciones:** nombre y número, solo nombre, solo número o nada.
2. **Un solo ajuste para toda la lotería.** _(Descartados: elegir carta por carta, porque hay que ajustar cada una y el mazo queda disparejo; y un ajuste de la lotería con excepciones por carta, porque es más trabajo sin una necesidad clara.)_
3. **Dónde se cambia:** en la pantalla de cartas (C1), en la columna izquierda, debajo de «Tipo de lotería». Al cambiarlo, la cuadrícula se redibuja en el momento. _(Descartados: en la vista previa (C3), porque las cartas de C1 seguirían mostrando nombre y número; y en las dos pantallas.)_
4. **Se guarda con la lotería**, igual que el tipo de lotería. Con sesión va en la base de datos; sin sesión, en el navegador, y al crear cuenta pasa con las cartas. _(Descartado: que solo dure mientras se arma la lotería, porque era fácil descargar un PDF distinto del que se quería.)_
5. **Empieza en «nombre y número»**, tanto en las loterías nuevas como en las que ya existen, así que nada cambia hasta que el usuario lo elija.
6. **A qué aplica:** a las cartas con foto y a las convertidas con IA, en la cuadrícula de C1, en la vista previa (C3) y en el PDF (tableros y baraja para recortar). Las cartas de loterías temáticas no cambian.
7. **El título sigue siendo obligatorio** y no se puede repetir en la misma lotería, aunque no se imprima.

## Cambio en la base de conocimiento

Se propuso con los cuatro puntos, Carlos lo confirmó («si») y se aplicó el 2026-10-20:

- `docs/contexto-negocio.md`: en §4, la viñeta del número ahora depende del ajuste y hay una viñeta nueva, «Qué se ve en las cartas». También se agregaron la decisión del 2026-10-20 en §15 y el renglón en §17, que se quita al publicarse.
- `docs/diseno-mockups.md`: C1 (el ajuste) y C3 (respeta el ajuste). Se marcaron «Por construir (FEAT-51)» y la marca se quitó al construirlas, el 2026-10-20.

## Notas técnicas

- Revisado en el código el 2026-10-20: todas las cartas se componen en `src/services/cardCompose/`. `composeInputFor` (`input.ts`) arma la entrada con `name` y `number`, y la usan tanto la pantalla (`useComposedCard`, `useCardPreview`) como el PDF (`services/pdf/prepareCards.ts`). El ajuste entra por ahí: sin número no se dibuja el número (eso ya funciona), y hace falta que el compositor acepte también ir sin nombre.
- **Base de datos:** una columna nueva en `loteria_sets`, junto a `grid_size`, con los cuatro valores permitidos y `nombre y número` por defecto. Será la migración 058, con su prueba en `supabase/tests/`. Se aplica en dev y, con la confirmación de Carlos, en producción antes de pasar a `main`.
- **Sin sesión:** se guarda en el navegador como el tipo de lotería. Al crear cuenta, `visitorTransfer` lo pasa a la lotería nueva, igual que hace con `setGridSize`.
- Las cartas compuestas en caché (`composedCards.ts`) tienen que tomar en cuenta el ajuste, para que al cambiarlo no aparezca una versión vieja.
- El selector usa solo los colores de la paleta (`docs/sistema-diseno.md`) y sigue `docs/workflow-fe.md`.

## User Stories

### US A1 — Elegir qué se ve en las cartas desde C1   ·   Estado: hecha, revisada por Carlos

- **Historia:** Como usuario que sube fotos de cartas que ya traen nombre y número, quiero elegir qué dibuja el sitio encima, para que no salgan repetidos.
- **Entrega demostrable:** En C1, debajo de «Tipo de lotería», está el ajuste «Qué se ve en las cartas». Al elegir «Nada», las cartas de la cuadrícula se ven sin nombre ni número. Al recargar la página, o al abrir la lotería otro día, el ajuste sigue igual.
- **Construido:** El 2026-10-20, en la rama `feature/nombre-numero-cartas`. Primero se escribieron las pruebas, que fallaron sin el código:
  - `supabase/tests/058_card_labels.test.sql`, con 9 aserciones: empieza en `both`; la dueña elige cada opción; el ajuste no cambia el de otra lotería; no acepta una opción inexistente ni un valor vacío; otra usuaria no lo cambia.
  - `tests/src/cardLabels.test.ts`: las cuatro opciones, el valor por defecto y qué quita cada opción sin cambiar la carta original.
  - Pruebas nuevas en `tests/src/composedCards.test.ts`: al cambiar el ajuste, la carta se vuelve a componer, y al regresar al anterior se reutiliza la que ya estaba.
  - Pruebas nuevas en `tests/src/visitorTransfer.test.ts`: el ajuste del visitante pasa a la lotería de la cuenta, nueva o existente, y si no lo cambió, la lotería queda como estaba.

  Código:
  - La migración `supabase/migrations/058_card_labels.sql` agrega la columna `card_labels` a `loteria_sets`, con `both` por defecto y solo las cuatro opciones.
  - `src/utils/cardLabels.ts` tiene las opciones y `labeledForCompose`, que deja el título vacío o quita el número antes de componer la carta.
  - `src/contexts/CardLabelsContext.tsx` hace que `useComposedCard` y `useCardPreview` dibujen con el ajuste. Fuera de Crear no hay proveedor, así que todo sigue como antes.
  - `src/hooks/useCardLabelsChoice.ts` lee y guarda el ajuste: en la lotería con sesión y en el navegador sin sesión. Si falla el guardado, regresa al valor anterior.
  - El selector `CardLabelsSelector` está en C1, debajo de «Tipo de lotería». Muestra un aviso si no se pudo guardar.
  - El traspaso de visitante (`visitorTransfer`, `SyncService`) lleva el ajuste a la cuenta.
  - Hay textos nuevos en español e inglés.

  Como C2 y C3 usan el mismo proveedor, sus cartas en pantalla ya respetan el ajuste. El PDF todavía no: llega con A2.

  Typecheck, lint, las 1389 pruebas y las 626 aserciones de base pasan. El 2026-10-20 se revisó el Supabase de dev en modo solo lectura: `loteria_sets` no tiene la columna, y su regla de acceso y sus permisos coinciden con los del repo. La migración 058 se aplicó en el Supabase de **dev** el 2026-10-20, con permiso de Carlos, por la Management API y dentro de `begin; … commit;`. Se comprobó que las 20 loterías quedaron en `both` y que la columna solo acepta las cuatro opciones. Falta aplicarla en producción.
- **Depende de:** Nada.
- **Cómo se prueba (guion de demo):** En dev, con sesión, abre una lotería en «Cartas» → debajo de «Tipo de lotería» mira el ajuste en «Nombre y número» → elige «Solo nombre» y las cartas pierden el número → elige «Solo número» y pierden el nombre → elige «Nada» y quedan solo con la foto → recarga y sigue en «Nada» → cierra sesión, crea cartas como visitante, elige «Solo número», recarga y sigue igual → crea una cuenta y la lotería que pasa a tu cuenta conserva «Solo número».
- **Escenarios cubiertos:**
  - [x] Una lotería nueva o ya existente empieza en «nombre y número».
  - [x] Cada opción dibuja lo que dice, en las cartas con foto y en las convertidas con IA.
  - [x] Con sesión, el ajuste se guarda en la lotería y no se mezcla con otra lotería del mismo usuario.
  - [x] Sin sesión, se guarda en el navegador y pasa a la cuenta al registrarse.
  - [x] Al cambiar el ajuste no se queda una carta dibujada con el ajuste anterior.
  - [x] Los títulos repetidos se siguen rechazando aunque no se impriman.

### US A2 — La vista previa y el PDF respetan el ajuste   ·   Estado: hecha, revisada por Carlos

- **Historia:** Como usuario, quiero que los tableros y el PDF salgan con lo que elegí en mis cartas, para imprimir la lotería tal como la vi.
- **Entrega demostrable:** Con el ajuste en «Solo nombre», la vista previa (C3) y el PDF descargado muestran las cartas sin número, tanto en los tableros como en la baraja para recortar.
- **Construido:** El 2026-10-20, en la rama `feature/nombre-numero-cartas`. Primero se escribió la prueba `tests/src/pdfCardLabels.test.ts`, que falló sin el código. Comprueba que:
  - sin ajuste, la carta sale con nombre y número;
  - con «solo nombre», «solo número» y «nada», tableros y baraja salen con lo que corresponde;
  - una carta que no se pudo dibujar se reporta con su nombre aunque no se imprima;
  - las cartas temáticas no se componen.

  Código:
  - `createCardPreparer` (`src/services/pdf/prepareCards.ts`) compone con `labeledForCompose`. Solo la imagen lleva el ajuste; la carta conserva su nombre.
  - `generatePDF` recibe `cardLabels`. Lo pasan las tres descargas: la vista previa (`AppRouter`, con el ajuste de la lotería activa o el del visitante), la pantalla de la lotería (`SetView`) y la descarga desde Mi cuenta (`setPdf`, `useSetPdfDownload`, con el ajuste guardado en la lotería).
  - La pantalla en pantalla de C2 y C3 ya respetaba el ajuste desde A1.
  - Agregado al construir: la pantalla de una lotería guardada (`/loteria/:id`) también dibuja sus cartas con su ajuste, para que coincidan con el PDF que descarga ahí.

  Typecheck, lint y las 1395 pruebas pasan.
- **Depende de:** US A1.
- **Cómo se prueba (guion de demo):** En dev, en «Cartas», elige «Solo nombre» → «Siguiente: tableros» → elige la cantidad → en la vista previa, las cartas de los tableros no llevan número → abre un tablero con la lupa y tampoco → «Descargar PDF», y en el PDF ni los tableros ni la baraja llevan número → vuelve a «Cartas», elige «Nada» y descarga otra vez: las cartas salen solo con la foto → abre una lotería temática y sale igual que antes.
- **Escenarios cubiertos:**
  - [x] Las cuatro opciones se respetan en los tableros de la vista previa.
  - [x] Las cuatro opciones se respetan en el PDF: tableros y baraja.
  - [x] Volver a descargar la lotería desde «Mis loterías» usa el ajuste guardado.
  - [x] Las loterías temáticas no cambian.
