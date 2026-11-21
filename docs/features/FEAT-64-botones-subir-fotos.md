# FEAT-64 — Una sola forma de subir fotos: el recuadro «Sube las fotos de tu lotería» (U2 y C1)

**Estado:** construida el 2026-11-16 (US A1 a A3). Rama `feature/subir-fotos-u2` (creada el 2026-11-16 desde `dev`); llevada a `dev` junto con FEAT-65 con el PR #93 (2026-11-21); falta probar en dev. Sin migraciones ni edge functions: todo es del navegador.

**Contexto.** En la página de una lotería (U2), mientras faltan cartas había hasta cuatro botones que hacían lo mismo (abrir el selector de fotos que lleva a M6): «Agregar fotos» en el encabezado, «Agregar fotos» en el aviso ámbar, «Subir fotos» en «Cartas» y, sin cartas, el recuadro grande; además un espacio punteado por cada carta que falta. En teléfono quedaban apilados uno tras otro, y la casilla «Agregar» de la cuadrícula subía una sola foto (M4) mientras los espacios punteados de al lado suben varias. C1 (sin sesión) tenía lo mismo: «Subir fotos», el recuadro para arrastrar (solo en computadora) y la casilla «Agregar imagen» (solo en teléfono, M4).

**No cambia reglas de negocio.** Sí cambia el índice de pantallas (`docs/diseno-mockups.md`: U2, C1, M4 y M6), confirmado por Carlos y aplicado el 2026-11-16.

## Decisiones tomadas con el usuario

1. **Primera versión: un solo nombre, «Subir fotos»; sin botón en el encabezado; la casilla de teléfono sube varias.** Carlos aceptó la recomendación el 2026-11-16. Quedó superada por la decisión 2 el mismo día, al verla en la página.
2. **Solo queda el recuadro «Sube las fotos de tu lotería», en todos lados.** Se quitan los botones «Subir fotos» y «Agregar fotos», los espacios punteados y la casilla de teléfono. 2026-11-16. _(Descartado: dejar el botón de «Cartas» junto al recuadro; quitar solo el botón del aviso.)_
3. **Con cartas, el recuadro va arriba de la cuadrícula, más bajito, sin espacios punteados.** 2026-11-16. _(Descartados: arriba conservando los punteados; al final de las cartas.)_
4. **C1 cambia igual que U2.** M4 («Agregar una carta», una sola foto) deja de abrirse desde U2 y C1; sigue en la página del invitado (U5). 2026-11-16. _(Descartado: dejar C1 como está.)_

## User Stories

### US A1 — En U2, el recuadro es la única forma de subir fotos   ·   Estado: hecha, sin probar en dev

- **Historia:** Como dueño de una lotería, quiero un solo lugar para subir fotos, para no dudar cuál usar.
- **Entrega demostrable:** En la página de una lotería, el encabezado y el aviso ámbar ya no tienen botón para subir; «Cartas» solo tiene «Transformar con IA» y «Ajustes». Sin cartas, el recuadro grande «Sube las fotos de tu lotería»; con cartas, el mismo recuadro más bajito arriba de la cuadrícula, sin espacios punteados.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En dev, con sesión, abrir una lotería sin cartas → arriba solo «Cantar», «Invitar a subir fotos» y «⋮»; el aviso ámbar solo muestra el avance; en «Cartas», el recuadro → tocarlo → elegir varias fotos → «Nombra tus fotos». Con unas cartas → el recuadro bajito arriba de ellas, sin espacios punteados. Arrastrar fotos sobre la sección → «Nombra tus fotos». Repetir en teléfono.
- **Escenarios cubiertos:** sin cartas; con algunas cartas; con cartas suficientes y con tableros (el recuadro sigue arriba); arrastrar fotos; computadora y teléfono; español e inglés.
- **Construido:** 2026-11-16. `SetHeader` y `SetStatusNotice` ya no reciben `onAddPhotos`. `SetCardsSection` muestra siempre el recuadro (`set-cards__dropzone--compact` con cartas) y ya no tiene el botón, la casilla ni los espacios punteados; se quitaron `missingCardNumbers` (y sus pruebas) y los textos `setView.addPhotos` y `setView.addCardSlot`.

### US A2 — En C1, lo mismo   ·   Estado: hecha, sin probar en dev

- **Historia:** Como visitante sin cuenta, quiero subir mis fotos igual que en una lotería guardada, para no aprender dos formas.
- **Entrega demostrable:** En «Crea tu lotería» sin sesión, la columna izquierda ya no tiene «Subir fotos»; arriba de las cartas está el recuadro «Sube las fotos de tu lotería», también en teléfono, donde ya no sale la casilla «Agregar imagen».
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En dev, sin sesión, entrar a «Crear → Tu lotería con fotos» → arriba de las cartas, el recuadro → tocarlo → varias fotos → «Nombra tus fotos». Arrastrar fotos al recuadro → lo mismo. En teléfono, el recuadro también está y la cuadrícula empieza con las cartas.
- **Escenarios cubiertos:** sin cartas; con cartas; arrastrar fotos; computadora y teléfono.
- **Construido:** 2026-11-16. En `CardEditor` el recuadro pasó arriba de la cuadrícula y se ve en todos los tamaños; se quitaron el botón (`deck__add`) y la casilla. El título `cardEditor.deck.dropTitle` ahora es «Sube las fotos de tu lotería»; se quitó `cardEditor.deck.uploadPhotos`.

### US A3 — Sin el código que ya no se usa   ·   Estado: hecha

- **Historia:** Como quien mantiene el sitio, quiero quitar lo que ya no se abre, para no cuidar código muerto.
- **Entrega demostrable:** Las pruebas, `typecheck` y `lint` pasan sin la casilla «Agregar» ni M4 dentro del editor de cartas.
- **Depende de:** US A1, US A2.
- **Cómo se prueba (guion de demo):** `npm run typecheck`, `npm run lint`, `npm test`.
- **Escenarios cubiertos:** U5 (invitado) sigue usando M4 sin cambios.
- **Construido:** 2026-11-16. Se borró `CardUploadThumb`; `useDeckEditing` ya no tiene `openSingleUpload` ni `handleCardAdd`, y `DeckDialogs` ya no monta `CardUploadModal` (U5 lo sigue montando).
