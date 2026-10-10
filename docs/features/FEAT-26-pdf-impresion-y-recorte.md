# FEAT-26 — El PDF se imprime en hoja carta y es fácil de recortar

**Estado: en curso. Las cuatro historias (US A1 a US A4) construidas el 2026-10-09, por probar por Carlos. Rama `feature/pdf-impresion-y-recorte`, creada desde `dev` el 2026-10-09.**

**Contexto.** Segunda de las cuatro features que salieron de la revisión del PDF del 2026-10-09 (la primera es [FEAT-25](FEAT-25-pdf-sin-cartas-danadas.md)). Reúne los puntos 5 a 8 de esa revisión, los de impresión y recorte:

5. La hoja del PDF es A4 y en México se imprime en carta. Al imprimir, la impresora suele encoger la página cerca de 6 % y el tablero deja de medir 14 × 21 cm. `contexto-negocio.md` §5 ya dice que los tableros van «en tamaño carta»: es una regla definida que el sitio no cumple.
6. No hay guías de corte. El fondo crema del tablero sobresale unos 7 mm del área que se recorta, así que no queda claro por dónde cortar.
7. Los nombres largos se achican hasta letra de 6 puntos y después se cortan con «…». Seis puntos es demasiado chico para leerse impreso.
8. La baraja se centra a lo ancho pero no a lo alto: sus páginas quedan cargadas hacia arriba.

**Fuera de esta feature.** Velocidad y peso del archivo ([FEAT-27](FEAT-27-pdf-velocidad-y-peso.md)) y detalles menores ([FEAT-28](FEAT-28-pdf-detalles-menores.md)). No cambia el contenido del PDF (tableros y baraja), ni las medidas del tablero (14 × 21 cm), ni ninguna pantalla del sitio.

**Clasificación:** cambios en el dibujo del PDF (`src/services/PDFService.ts` y `src/services/pdf/`). Afecta a los tres lugares que generan PDF: la vista previa (C3), la lotería guardada (U2) y el armado de loterías temáticas en administración (A1.7a), cuyo PDF es el que se vende. No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones. Estimado: 2 sesiones.

**Datos ya calculados (para no rehacerlos).**

- Hoja carta: 21.59 × 27.94 cm (612 × 792 puntos). Hoja A4: 21 × 29.7 cm.
- El tablero con su encabezado y el fondo crema mide unos 25.4 cm de alto: cabe en carta, con cerca de 1.3 cm de margen arriba y abajo.
- La baraja va acostada, 10 cartas por hoja (5 × 2). En A4 cada carta mide 5.2 × 7.8 cm; en carta, con los márgenes de hoy, quedaría en unos 4.8 × 7.3 cm.
- Las medidas viven en `src/services/pdf/constants.ts` (hoja, tablero y cuánto sobresale el fondo crema) y en `deckGridLayout`, de `src/services/pdf/layout.ts` (baraja).

- Nombre de la carta: letra normal de 10 puntos en tableros y baraja; hoy baja hasta 6. La franja mide 19 puntos, cerca del 13 % del alto de una carta de tablero 4 × 4; con dos renglones pasaría a cerca del 20 %.
- Letras y espacios que caben en un renglón (Helvetica Bold, mayúsculas), según el tamaño de letra:

  | Tamaño | Tablero 4 × 4 | Tablero 3 × 3 | Baraja en carta |
  |---|---|---|---|
  | 6 pt | 24 | 33 | 36 |
  | 7 pt | 20 | 28 | 30 |
  | 8 pt | 18 | 25 | 26 |
  | 9 pt | 15 | 22 | 23 |
  | 10 pt | 14 | 19 | 21 |

## Decisiones tomadas con el usuario (2026-10-09)

1. **El PDF sale siempre en hoja carta.** Sin control para elegir tamaño. _(Descartada: dejar elegir entre carta y A4 al descargar.)_
2. **Los PDF de loterías temáticas ya armados se quedan en A4** hasta que el administrador vuelva a armar cada una. _(Descartada: volver a armarlos todos al publicar esta feature.)_
3. **Guías de corte: marcas en las cuatro esquinas y, además, línea punteada alrededor del área a recortar.** _(Descartadas: solo marcas en las esquinas; solo línea punteada.)_
4. **El fondo crema sigue sobresaliendo del corte**, y la línea punteada se dibuja encima: si la tijera se desvía, la orilla sale crema y no blanca. _(Descartada: que el crema termine justo en el corte.)_
5. **El nombre se queda en un solo renglón**: partirlo en dos le quita demasiado espacio a la foto. _(Descartadas: dos renglones con franja alta en todo el tablero; dos renglones con franja alta solo en las cartas largas.)_
6. **La letra del nombre no baja de 8 puntos** (antes 6). Lo que no quepa a 8 puntos se corta con «…», como hoy. _(Descartadas: 7 puntos; 9 puntos; dejarlo en 6.)_
7. **La línea de corte pasa separada 3 mm del tablero y su encabezado**, no pegada. Pegada caería sobre el borde negro de las cartas de la orilla: no se vería a los lados ni abajo, y un corte desviado dejaría ese borde disparejo. El tablero recortado queda con un marco crema parejo de 3 mm: las cartas siguen ocupando 14 × 21 cm y la pieza mide 14.6 × 24.6 cm con el encabezado. El crema pasa unos 4 mm de la línea. Decidido al construir US A2. _(Descartada: línea pegada al borde del tablero, con pieza de 14 × 24 cm exactos.)_

**Documentación.** Confirmado por Carlos el 2026-10-09: `contexto-negocio.md` §17 ya anota que la regla «tableros en tamaño carta» (§5) todavía no se cumple. Ese renglón se retira al publicar esta feature.

## Grupo A — Impresión y recorte

### US A1 — El PDF sale en hoja tamaño carta   ·   Estado: construida el 2026-10-09, por probar por Carlos

- **Historia** — Como persona que imprime su lotería en México, quiero que el PDF venga en hoja carta, para que el tablero salga a su tamaño real sin que la impresora lo encoja.
- **Entrega demostrable** — Los tableros y la baraja del PDF vienen en hoja carta. El tablero impreso al 100 % mide 14 × 21 cm.
- **Construido** — La hoja pasó de A4 a carta (612 × 792 puntos) en `src/services/pdf/constants.ts`; el tablero conserva sus 14 × 21 cm y queda centrado, con cerca de 1.3 cm libres arriba y abajo del fondo crema. Las medidas de la baraja salieron de `generatePDF` a `deckGridLayout` (`src/services/pdf/layout.ts`), sin cambiar su acomodo: 10 cartas por hoja acostada, ahora de 4.8 × 7.3 cm. Vale para los tres lugares que generan PDF, porque todos usan el mismo servicio. Pruebas en `tests/src/pdfPageSize.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Descarga un PDF → ábrelo y revisa en sus propiedades el tamaño de página → debería decir carta (21.59 × 27.94 cm; 8.5 × 11 pulgadas) → imprime un tablero al 100 %, sin «ajustar a la página» → mídelo con regla → debería medir 14 cm de ancho por 21 cm de alto, sin contar el encabezado.
- **Escenarios cubiertos**:
  - [x] Las páginas de tableros miden carta en vertical y las de la baraja, carta acostada. (Prueba automática.)
  - [x] El tablero y la baraja caben completos en la hoja, con margen imprimible. (Prueba automática de las medidas.)
  - [ ] El tablero impreso al 100 % mide 14 × 21 cm. (Demo.)
  - [ ] El PDF de una lotería temática armado en administración después de publicar también sale en carta. Los armados antes siguen en A4 hasta que se vuelvan a armar. (Demo.)

### US A2 — Guías para recortar el tablero   ·   Estado: construida el 2026-10-09, por probar por Carlos

- **Historia** — Como persona que recorta sus tableros, quiero ver por dónde cortar, para que todos me queden del mismo tamaño.
- **Entrega demostrable** — Cada página de tablero trae una línea punteada alrededor del tablero y su encabezado, separada 3 mm de ellos, y marcas de corte en sus cuatro esquinas. El fondo crema sigue pasando un poco de la línea.
- **Construido** — `cutGuides` (`src/services/pdf/layout.ts`) calcula la línea y las marcas; `drawBoardOnPage` las dibuja en gris, sobre el fondo crema y debajo de las cartas. Cada esquina lleva dos marcas cortas, una hacia arriba o abajo y otra hacia el lado, que empiezan donde termina el crema. Medidas en `src/services/pdf/constants.ts`. Pruebas en `tests/src/pdfCutGuides.test.ts`.
- **Depende de** — US A1 (las guías se colocan sobre la hoja nueva).
- **Cómo se prueba (guion de demo)** — Descarga un PDF → abre un tablero → debería verse una línea punteada alrededor del tablero y su encabezado, separada unos 3 mm de las cartas y con el fondo crema pasando un poco de ella, y dos marcas cortas en cada esquina, ya sobre el blanco de la hoja → imprime y recorta por la línea → el tablero debería quedar con el encabezado completo y un marco crema parejo de unos 3 mm, sin blanco.
- **Escenarios cubiertos**:
  - [x] La línea punteada rodea el tablero y su encabezado, separada 3 mm por los cuatro lados. (Prueba automática de las medidas.)
  - [x] Las marcas de las esquinas están alineadas con la línea de corte, fuera del fondo crema y dentro de lo que la impresora alcanza. (Prueba automática de las medidas.)
  - [x] El fondo crema sobresale de la línea de corte por los cuatro lados. (Prueba automática de las medidas.)
  - [x] Los tableros de 4 × 4 y de 3 × 3 llevan la línea punteada y las ocho marcas. (Prueba automática.)
  - [ ] Se ven bien, impresas, en tableros de 4 × 4 y de 3 × 3. (Demo.)

### US A3 — Los nombres largos no se achican de más   ·   Estado: construida el 2026-10-09, por probar por Carlos

- **Historia** — Como persona que puso nombres largos a sus cartas, quiero que en el PDF la letra del nombre nunca quede tan chica que no se lea.
- **Entrega demostrable** — El nombre sigue en un solo renglón y su letra no baja de 8 puntos. Si a 8 puntos no cabe, se corta con «…». La franja del nombre y la foto no cambian de tamaño.
- **Construido** — El tamaño mínimo de letra del nombre pasó de 6 a 8 puntos (`MIN_TITLE_SIZE_PT`, en `src/services/pdf/constants.ts`), y `drawCardOnPage` lo usa en tableros y baraja. El corte con «…» y la franja no se tocaron. Pruebas en `tests/src/pdfCardTitle.test.ts`.
- **Depende de** — nada. Usa la franja del nombre que dejó FEAT-25 (US A3).
- **Cómo se prueba (guion de demo)** — Crea cartas con nombres de una palabra, de tres palabras y de seis palabras → descarga el PDF → el de una palabra debería verse igual que hoy; el de tres, un poco más chico pero legible; el de seis, cortado con «…» y con letra legible, no diminuta. La foto debería ocupar lo mismo en todas.
- **Escenarios cubiertos**:
  - [x] Un nombre que cabe a tamaño normal no cambia. (Prueba automática.)
  - [x] Un nombre que no cabe se achica solo hasta 8 puntos. (Prueba automática.)
  - [x] Un nombre que no cabe a 8 puntos se corta con «…» en un solo renglón, sin salirse de la carta. (Prueba automática.)
  - [ ] Se ve bien en tableros de 4 × 4, de 3 × 3 y en la baraja. (Demo.)

### US A4 — La baraja queda centrada en la hoja   ·   Estado: construida el 2026-10-09, por probar por Carlos

- **Historia** — Como persona que imprime la baraja, quiero que las cartas queden centradas en la hoja, para que ningún borde quede demasiado cerca de la orilla.
- **Entrega demostrable** — En las páginas de la baraja, la cuadrícula de cartas queda centrada también a lo alto, debajo del título de la página.
- **Construido** — `deckGridLayout` (`src/services/pdf/layout.ts`) reparte por igual, arriba y abajo de la cuadrícula, el espacio que sobra entre el título y el margen inferior: las cartas bajan cerca de 2 cm respecto a antes. A lo ancho no cambia. Pruebas en `tests/src/pdfDeckLayout.test.ts`.
- **Depende de** — US A1 (las medidas de la baraja cambian con la hoja).
- **Cómo se prueba (guion de demo)** — Descarga un PDF → ve a las páginas de «Baraja Completa» → el espacio libre arriba (bajo el título) y abajo de las cartas debería ser parecido; a los lados, igual que hoy.
- **Escenarios cubiertos**:
  - [x] La cuadrícula queda centrada a lo ancho y a lo alto del espacio disponible. (Prueba automática de las medidas.)
  - [ ] Una última página con menos de 10 cartas se acomoda desde arriba a la izquierda, como hoy. (Demo.)
