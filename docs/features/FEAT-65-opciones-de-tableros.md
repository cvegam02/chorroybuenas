# FEAT-65 — Las opciones de los tableros van en su sección (U2)

**Estado:** construida el 2026-11-21 (US A1). Rama `feature/menu-tableros` (creada el 2026-11-21 desde `dev`); llevada a `dev` junto con FEAT-64 con el PR #93 (2026-11-21); falta probar en dev. Sin migraciones ni edge functions: todo es del navegador.

**Contexto.** En la página de una lotería (U2), el menú «⋮» traía «Cambiar nombre», «Revolver tableros», «Borrar tableros» y «Eliminar lotería». Las dos de en medio son de los tableros y la sección «Tableros» ya tenía su propio «Revolver tableros». Carlos pidió que las opciones de tableros estén en su sección.

**No cambia reglas de negocio.** Sí cambia el índice de pantallas (`docs/diseno-mockups.md`, U2), confirmado por Carlos y aplicado el 2026-11-21.

## Decisiones tomadas con el usuario

1. **El «⋮» se queda con «Cambiar nombre» y «Eliminar lotería»; «Borrar tableros» pasa a «Tableros», junto a «Revolver tableros».** Carlos aceptó la propuesta el 2026-11-21. Borrar tableros sigue pidiendo confirmación; sin tableros no sale ninguno de los dos botones. El «⋮» de cada lotería en Mi cuenta (U1) no cambia: no tiene opciones de tableros.

## US A1 — Las opciones de tableros, en «Tableros»   ·   Estado: hecha, sin probar en dev

- **Historia** — Como dueño de una lotería, quiero encontrar lo que se hace con los tableros en la sección «Tableros», para no buscarlo en el menú de la lotería.
- **Entrega demostrable** — En U2, el «⋮» solo trae «Cambiar nombre» y «Eliminar lotería»; la sección «Tableros» trae «Revolver tableros» y «Borrar tableros».
- **Construido:** 2026-11-21. `SetMenu` ya no recibe `hasBoards`, `onShuffle` ni `onClearBoards`, y `SetHeader` ya no los pasa. `SetBoardsSection` recibe `onClear` y muestra «Borrar tableros» junto a «Revolver tableros» (`set-boards__actions`); abre la misma confirmación que antes abría el menú.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En dev, abre una lotería con tableros → abre el «⋮» del encabezado → debería traer solo «Cambiar nombre» y «Eliminar lotería» → baja a «Tableros» → junto al título deberían estar «Revolver tableros» y «Borrar tableros» → toca «Borrar tableros» → debería pedir confirmación y, al aceptar, quedar el bloque punteado con «Armar tableros» y sin esos dos botones → en teléfono, el «⋮» abre la hoja de abajo con las mismas dos opciones.
- **Escenarios cubiertos**:
  - [x] El «⋮» ya no trae opciones de tableros, con tableros o sin ellos. (Revisión.)
  - [x] «Borrar tableros» en «Tableros» pide confirmación y borra. (Revisión: usa la misma confirmación de antes.)
  - [x] Sin tableros, «Tableros» no muestra «Revolver» ni «Borrar». (Revisión.)
  - [ ] Se ve bien en computadora y en teléfono. (Demo de Carlos en dev.)
