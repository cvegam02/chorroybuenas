# FEAT-40 — Menos botones en la pantalla de cartas (C1)

**Estado: definida con Carlos el 2026-10-12, en la rama `feature/cartas-menos-botones`, creada desde `dev`. Construida su única historia (US A1) ese mismo día y fusionada a `dev` en un merge directo, sin PR, porque Carlos lo pidió así. Se publica en dev.chorroybuenas.com.mx al subir `dev` a GitHub. Falta la demo de Carlos con el guion de la historia. A producción pasa después, con el PR de `dev` a `main`, cuando Carlos confirme lo probado en dev.**

**Contexto.** Carlos pidió el 2026-10-12 aligerar la columna izquierda de la pantalla de cartas: sin sesión, la tarjeta «Conviértelas en cartas con IA» carga mucho la página y suma botones (Google y crear cuenta); y junto a «Subir fotos» sobra «Agregar una carta», porque en computadora ya está el recuadro para subir y en teléfono la casilla «Agregar» de la cuadrícula.

**Es solo interfaz.** No cambia cómo se valida, recorta, comprime ni guarda una carta, ni nada de tokens, cobros o permisos. Sí cambia una regla ya definida sobre qué ve el visitante (decisión 1).

**Archivos.** `src/components/CardEditor/CardEditor.tsx` y `CardEditorDeck.css`; textos en `src/locales/es` y `src/locales/en`.

## Decisiones tomadas con el usuario

Respuestas de Carlos (2026-10-12):

1. **La tarjeta «Conviértelas en cartas con IA» se quita del todo.** Sin sesión, la pantalla de cartas ya no menciona la IA ni invita a crear cuenta. Reabre la decisión 74 de FEAT-34 (2026-10-11), que la conservaba «porque es una invitación, no una acción»; Carlos lo confirmó sabiendo que cambia la regla de `docs/contexto-negocio.md` §6. _(Descartadas: dejar solo un renglón de texto con un enlace a crear cuenta; no quitarla.)_
2. **«Agregar una carta» se quita para todos, con y sin sesión;** queda solo «Subir fotos». Carlos lo pidió como «Subir todos» y «agregar carta»: en la pantalla solo existían «Subir fotos» y «Agregar una carta». _(Descartada: quitarlo solo sin sesión, porque la pantalla quedaría distinta según haya sesión o no.)_
3. **Va como feature nueva, FEAT-40**, con su rama. _(Descartada: una historia más en FEAT-34, que ya está fusionada en `dev`.)_
4. **La base de conocimiento se actualiza con esta feature:** `docs/contexto-negocio.md` (§6), `docs/casos-de-uso.md` (la excepción «sin sesión» de transformar con IA) y `docs/diseno-mockups.md` (C1 y M4).

Consecuencias, avisadas a Carlos antes de construir:

5. **En computadora, una sola foto pasa por «Nombra tus fotos»** (M6), que ya aceptaba una sola. La ventana «Agregar una carta» (M4) queda solo en teléfono, desde la casilla «Agregar» de la cuadrícula.
6. **Con sesión, el panel «Cartas con IA»** (saldo, comprar y «Transformar las que faltan») no se toca.

## User Stories

### US A1 — C1 con un solo botón para subir y sin tarjeta de IA para el visitante   ·   Estado: construida el 2026-10-12, pendiente de la demo de Carlos

- **Historia** — Como persona que arma su lotería, quiero una columna izquierda con menos botones, para ver de un vistazo qué sigue.
- **Entrega demostrable** — En C1, debajo del avance queda un solo botón, «Subir fotos», con y sin sesión. Sin sesión, después de ese botón siguen los consejos y los enlaces de abajo: ya no está la tarjeta con las dos fotos, «Conviértelas en cartas con IA» y los botones de cuenta.
- **Construido** — 2026-10-12. En `CardEditor.tsx` se quitaron el botón «Agregar una carta» y la tarjeta de invitación, con lo que solo ellos usaban (los tokens de bienvenida y los botones de cuenta en esta pantalla). En `CardEditorDeck.css`, los estilos del botón secundario y del par de fotos. En los textos (es y en), las claves `addOne`, `aiTitle`, `aiGift`, `aiNoGift`, `aiBeforeAlt`, `aiAfterAlt` y `google` de `cardEditor.deck`. La casilla «Agregar» de teléfono, el recuadro para arrastrar y el panel con sesión quedaron igual.
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — Sin sesión, en computadora, entra a crear cartas: a la izquierda, bajo el avance, solo está «Subir fotos»; no hay tarjeta de IA ni botones de Google o de crear cuenta → toca «Subir fotos» y elige una sola foto: se abre «Nombra tus fotos» y la carta se agrega → arrastra dos fotos al recuadro de la derecha: lo mismo → en el teléfono, sin sesión: la cuadrícula empieza con la casilla «Agregar», que abre «Agregar una carta» → inicia sesión y vuelve a cartas: sigue el panel «Cartas con IA» con tu saldo y solo el botón «Subir fotos».
- **Escenarios cubiertos**:
  - [ ] Sin sesión no aparece la tarjeta «Conviértelas en cartas con IA» ni sus botones.
  - [ ] Con y sin sesión hay un solo botón para subir: «Subir fotos».
  - [ ] «Subir fotos» con una sola foto la agrega pasando por «Nombra tus fotos».
  - [ ] En teléfono, la casilla «Agregar» sigue abriendo «Agregar una carta».
  - [ ] Con sesión, el panel «Cartas con IA» se ve y funciona igual que antes.
