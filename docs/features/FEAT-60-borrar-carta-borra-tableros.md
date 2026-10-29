# FEAT-60 — Borrar una carta que está en tableros borra los tableros

**Estado:** definida con Carlos el 2026-10-29 y construida el mismo día (US A1 a A3) y llevada a dev con el PR #85. Rama `feature/borrar-carta-borra-tableros` (creada el 2026-10-29 desde `dev`). Sin migraciones ni edge functions: todo es del navegador.

**Contexto.** Carlos encontró que, en una lotería con 24 cartas (el mínimo de Clásico) y tableros guardados, al borrar una carta los tableros seguían ahí con la carta borrada. Qué pasaba:

1. Con sesión, `CardRepository.deleteCard` saca la carta de los tableros en la base (`board_cards`), pero la página (U2) no vuelve a cargar los tableros: siguen mostrando la carta borrada y el PDF los imprime así.
2. Al recargar, cada tablero que la tenía queda con una casilla menos (15 de 16, u 8 de 9): nadie rellena el hueco.
3. Con tableros, la página dice «Lista para imprimir» aunque se haya bajado del mínimo (FEAT-36, decisión 22).
4. Lo mismo pasa al vaciar la lotería y al borrar las fotos de un invitado (FEAT-58, US A5), y sin sesión en C1: los tableros guardados en el navegador siguen apuntando a la carta borrada.

No pasa solo con 24 cartas: con cualquier cantidad, borrar una carta que está en un tablero lo deja incompleto.

**Cambia reglas de negocio:** §4 («Al borrar una carta…»), §15 y §21 («Qué hace el dueño») de `contexto-negocio.md`, y el caso 7 de `casos-de-uso.md`. Carlos aprobó el cambio el 2026-10-29 y quedó aplicado. **No cambia el índice de pantallas.**

## Decisiones tomadas con el usuario

1. **Al borrar una carta que está en algún tablero guardado, se borran todos los tableros de la lotería.** La confirmación de borrar lo avisa antes. La lotería pasa a «Faltan tableros» o, si bajó del mínimo, a «Faltan cartas». Si la carta no está en ningún tablero, los tableros se quedan. 2026-10-29. _(Descartados: rehacer los tableros solos con la misma cantidad; rellenar el hueco con otra carta al azar; no dejar borrar la carta hasta borrar los tableros.)_
2. **Vale también al vaciar la lotería y al borrar las fotos de un invitado** (§21). 2026-10-29. _(Descartado: dejar «Borrar fotos» de un invitado como estaba, con el hueco.)_
3. **Editar una carta (nombre, imagen, IA o volver a la foto) se ve en los tableros sin borrarlos**: siguen teniendo las mismas cartas. Carlos lo reportó al revisar esta feature y pidió que entrara aquí como US A3. 2026-10-29. _(Descartado: una feature aparte.)_ No cambia reglas de negocio: es un error frente a lo que ya dice §4 (los tableros se arman con las cartas de la lotería).

## User Stories

### US A1 — Borrar una carta que está en tableros borra los tableros   ·   Estado: hecha, en dev con el PR #85

- **Historia:** Como dueño de una lotería con tableros, quiero que al borrar una carta que está en ellos se borren los tableros, para nunca imprimir un tablero con una carta que ya no existe.
- **Entrega demostrable:** En U2, al borrar una carta que está en algún tablero, la confirmación dice que se borrarán los N tableros de la lotería. Al aceptar, la carta y los tableros desaparecen al momento y el aviso pasa a «Faltan tableros» (o «Faltan cartas» si bajó del mínimo). Si la carta no está en ningún tablero, la confirmación es la de siempre y los tableros se quedan. Lo mismo al borrar las fotos de un invitado. Las loterías que ya tienen tableros incompletos por borrados anteriores se quedan sin tableros al abrirlas.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** Abrir una lotería Clásico con 24 cartas y tableros → borrar una carta → la confirmación avisa «se borrarán los N tableros» → aceptar → la carta y los tableros desaparecen y el aviso dice «Te faltan 1 carta». Recargar → sigue sin tableros. Con 30 cartas y 2 tableros, borrar una carta que no está en ninguno → la confirmación de siempre y los tableros se quedan. Con un invitado que tiene cartas en tableros, «Borrar fotos» → los tableros desaparecen.
- **Escenarios cubiertos:** carta en tableros; carta fuera de los tableros; bajar del mínimo y quedarse arriba; borrar desde la carta y desde «Editar carta»; borrar las fotos de un invitado; lotería con tableros ya incompletos; falla la red al borrar los tableros (al recargar se borran).
- **Construido:** 2026-10-29. Las reglas están en `src/utils/boardIntegrity.ts` (`boardsWithCard`, `boardsHaveMissingCards`, `hasIncompleteBoard`, con pruebas). Al borrar una carta o vaciar la lotería, `useCards` llama a `BoardRepository.deleteIncompleteBoards`: si algún tablero quedó con menos cartas que casillas, borra todos los de la lotería; lo mismo hace «Borrar fotos» de un invitado (`InviteesList`). `getBoards` borra y no devuelve los tableros si alguno está incompleto, así se reparan los de borrados anteriores y los que quedaron si falló la red. En U2, `SetView` suelta los tableros de la pantalla (`useBoard().forgetBoards`) en cuanto alguno lleva una carta que ya no está, y pasa a cada carta en cuántos tableros está: la confirmación de borrar (`CardActionConfirm`) dice entonces «Esta carta está en N tableros. Si la borras, se borran todos los tableros de tu lotería…». La confirmación de «Borrar fotos» de un invitado también lo avisa. Sin migraciones.

### US A2 — Sin sesión (C1), lo mismo con los tableros guardados en el navegador   ·   Estado: hecha, en dev con el PR #85

- **Historia:** Como visitante sin cuenta, quiero que al borrar una carta que está en mis tableros se borren, para no bajar un PDF con una carta que ya no está.
- **Entrega demostrable:** En C1, con tableros ya armados, borrar una carta que está en ellos avisa en la confirmación y borra los tableros guardados en el navegador. Al volver a la vista previa no aparecen los tableros viejos: hay que armarlos otra vez.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** Sin sesión, subir 24 cartas → armar tableros → regresar a «Cartas» → borrar una carta → la confirmación avisa → aceptar → ir hacia adelante con la flecha del navegador hasta la vista previa → regresa a «Cartas». Vaciar la lotería con tableros armados → igual.
- **Escenarios cubiertos:** carta en tableros; carta fuera de los tableros; vaciar la lotería; regresar a la vista previa con la flecha del navegador.
- **Construido:** 2026-10-29. En C1, `CardEditor` lee los tableros guardados en el navegador (`loadBoardsCollection`) para el aviso de la confirmación; al borrar o vaciar, `useCards` llama a `forgetBoardsWithMissingCards` (`src/utils/storage.ts`), que los borra si alguno lleva una carta que ya no está. `AppRouter` suelta los tableros de la vista previa al entrar a «Cartas»; al volver a la vista previa se cargan otra vez del navegador si siguen ahí y, si no, regresa a «Cartas».

### US A3 — Editar una carta se ve en los tableros y en el PDF   ·   Estado: hecha, en dev con el PR #85

- **Historia:** Como dueño de una lotería con tableros, quiero que al cambiarle el nombre, la imagen o la IA a una carta los tableros la muestren así, para no imprimir la versión vieja.
- **Entrega demostrable:** En U2, al editar una carta que está en tableros (nombre, foto, transformarla con IA o volver a la foto), sus casillas en los tableros cambian al momento y el PDF sale con la carta nueva. Los tableros no se borran. Lo mismo en la vista previa de la creación.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** Abrir una lotería con tableros → abrir un tablero y ubicar una carta → cerrar, editar esa carta: cambiarle el nombre y la foto → guardar → abrir el tablero: la casilla ya muestra el nombre y la foto nuevos. Bajar el PDF sin recargar → la carta sale nueva, no en blanco ni con el nombre viejo. Transformarla con IA y luego volver a la foto → el tablero sigue cada cambio.
- **Escenarios cubiertos:** cambiar el nombre; cambiar la foto; transformar con IA; volver a la foto; PDF sin recargar; recargar.
- **Construido:** 2026-10-29. Los tableros guardan una copia de sus cartas de cuando se cargaron; antes, la pantalla solo tomaba de la carta actual la imagen y el número (el nombre y la IA se quedaban viejos) y el PDF de U2 usaba la copia completa, con la imagen anterior, que ya se borró al editar. Ahora `withLiveCards` (`src/utils/boardIntegrity.ts`, con pruebas) arma cada casilla con la carta como está en la lotería (nombre, imagen, IA y número), y `SetView` la usa para la pantalla y el PDF; `AppRouter` para la vista previa. Sin migraciones.
