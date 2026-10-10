# FEAT-31 — Encabezado del tablero en el PDF

**Estado: construida el 2026-10-09 (US A1). Carlos vio las capturas ese día y las dio por buenas, con el logo de 2.3 cm. Llegó a `dev` con el PR #49; Carlos la probó ahí el 2026-10-09 y dijo «se ve bien». Falta pasar a `main`, cuando Carlos lo pida. Sin decisiones pendientes. Rama `feature/pdf-encabezado-tablero`, creada desde `dev` y puesta al día con `dev` cuando entró FEAT-30 (PR #48).**

**Contexto.** Hasta FEAT-30, cada página de tablero del PDF lleva «Tablero N» en letra chica arriba a la izquierda y el logo, pequeño, arriba a la derecha. Carlos pidió el 2026-10-09 un encabezado centrado, con el logo más grande y el título en la letra de las cartas. Es solo aspecto del PDF: no cambia ninguna regla de negocio ni ninguna pantalla, así que no toca la base de conocimiento.

## Decisiones tomadas con el usuario

Todas del 2026-10-09.

1. **Feature aparte.** Va como FEAT-31, en su propia rama. _(Descartada: meterla como una historia más de FEAT-30.)_
2. **Logo** centrado arriba, dentro del área color crema, más grande que antes: unos 2.5–3 cm de alto en la hoja impresa.
3. **Título** «TABLERO N» en mayúsculas, centrado debajo del logo, en Arvo Bold (la letra de las cartas), color casi negro `#1A120E`, de 16–18 pt.
4. **Líneas.** A cada lado del título, una línea horizontal fina (1–1.5 pt, mismo color) desde la orilla de la cuadrícula de cartas hasta unos 0.4 cm antes del texto, alineadas con el ancho de la cuadrícula.
5. **Se quitan** el «Tablero N» de la esquina izquierda y el logo de la esquina derecha.
6. **Espacios.** Poco espacio entre logo y título, y unos 0.4 cm entre el título y la cuadrícula. Si no cabe, se reduce primero el espacio vacío de arriba; las cartas no cambian de tamaño.
7. **Lo demás queda igual:** líneas de corte, fondo crema, cartas, baraja. Aplica a tableros de 4 × 4 y de 3 × 3.
8. **El logo se queda en unos 2.3 cm de alto**, un poco menos que los 2.5 cm pedidos. El encabezado puede medir a lo más 3.19 cm sin que las marcas de corte de arriba entren en la franja que una impresora casera no imprime (FEAT-26, US A2); con el título de 16 pt y sus 0.4 cm hasta la cuadrícula, eso deja 2.3 cm para el logo. Carlos lo vio en las capturas y dijo «se ve bien». _(Descartada: subirlo a 2.5 cm comiéndose unos 2 mm del margen de arriba, con el riesgo de que las marcas de corte de arriba salgan recortadas.)_

## Diseño

- **Medidas** (`src/services/pdf/constants.ts`). El encabezado mide 3.19 cm de alto (antes 3 cm), el tope que respeta el margen de impresión. De abajo hacia arriba: 0.4 cm de aire sobre la cuadrícula, el título de 16 pt, 0.1 cm de aire y el logo, que ocupa lo que queda (unos 2.3 cm). Como el tablero con su encabezado sigue centrado en la hoja, la cuadrícula baja cerca de 1 mm; las cartas miden lo mismo.
- **Logo.** `logo.png` trae orillas transparentes: la parte visible es cerca del 62 % del alto de la imagen. Los 2.3 cm son de la parte visible; la imagen se dibuja más grande y sus orillas transparentes caen sobre el fondo crema.
- **Letra.** Arvo Bold se incrusta en el PDF con `@pdf-lib/fontkit` (dependencia nueva), que se descarga solo al armar un PDF para no engordar la carga inicial del sitio. Si la letra no se puede cargar, el título sale en Helvetica Bold en vez de quedarse sin título.
- **Líneas.** A media altura de las mayúsculas, de 1.25 pt, desde la orilla de fuera del borde negro de las cartas hasta 0.4 cm del texto.

## Grupo A — Encabezado

### US A1 — Encabezado centrado en los tableros del PDF   ·   Estado: hecha, probada por Carlos en `dev` el 2026-10-09

- **Historia** — Como persona que imprime su lotería, quiero que cada tablero lleve el logo grande y su título centrado, con la letra de las cartas, para que se vea como un tablero de lotería terminado.
- **Entrega demostrable** — En cada página de tablero del PDF, de 4 × 4 y de 3 × 3, el logo va centrado arriba y, debajo, «TABLERO N» en Arvo Bold entre dos líneas que llegan a las orillas de la cuadrícula. Ya no hay título a la izquierda ni logo a la derecha. Líneas de corte, fondo crema, cartas y baraja no cambian.
- **Construido** — 2026-10-09. Las medidas del encabezado están en `src/services/pdf/constants.ts` (alto de 3.19 cm, título de 16 pt, espacios y la parte visible de `logo.png`). `boardPageTitle`, `boardTitleLayout` y `boardLogoBox` (`src/services/pdf/layout.ts`) calculan el texto, dónde va con sus dos líneas y la caja del logo. `drawBoardOnPage` (`src/services/pdf/draw.ts`) dibuja el logo, el título y las líneas en casi negro; ya no dibuja el título ni el logo de las esquinas. `getBoardTitleFont` (`src/services/pdf/titleFont.ts`, nuevo) incrusta Arvo Bold una vez por PDF con `@pdf-lib/fontkit` (dependencia nueva, cargada solo al armar el PDF) y cae a Helvetica Bold si falla. Pruebas: `tests/src/pdfBoardHeader.test.ts` (nueva) y ajustes en `tests/src/pdfCutGuides.test.ts` y `tests/src/pdfCardDraw.test.ts`. Se sacaron capturas de un tablero de 4 × 4 y uno de 3 × 3 con cartas de relleno.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Descarga el PDF de una lotería con tableros de 4 × 4 → en cada tablero, el logo está centrado arriba y debajo dice «TABLERO 1», «TABLERO 2»… en la misma letra que el nombre de las cartas → a cada lado del título sale una línea fina que empieza en la orilla de las cartas y se detiene poco antes del texto → no queda nada en las esquinas de arriba. Repite con una lotería de tableros de 3 × 3 → el encabezado se ve igual. Imprime una hoja → la línea punteada y las marcas de corte salen completas y el tablero mide 14 × 21 cm.
- **Escenarios cubiertos**:
  - [x] El título dice «TABLERO N» en mayúsculas, centrado, a 0.4 cm de la cuadrícula. (Prueba automática.)
  - [x] Las líneas van de la orilla de la cuadrícula a 0.4 cm del texto, a la misma altura. (Prueba automática.)
  - [x] El logo queda centrado, arriba del título y dentro del área de recorte. (Prueba automática.)
  - [x] Se dibuja igual en tableros de 16 y de 9 cartas, con Arvo Bold y el color pedido. (Prueba automática.)
  - [x] Las marcas de corte siguen dentro de lo que la impresora alcanza y las cartas no cambian de tamaño. (Pruebas automáticas de FEAT-26.)
  - [x] El encabezado se ve bien en el PDF, en tableros de 4 × 4 y de 3 × 3. (Capturas aprobadas y demo en `dev` el 2026-10-09.)
