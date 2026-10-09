# FEAT-26 — El PDF se imprime en hoja carta y es fácil de recortar

**Estado: por definir. Historias en borrador; faltan 4 decisiones de Carlos (sección «Preguntas por resolver») antes de construir. Sin rama todavía.**

**Contexto.** Segunda de las cuatro features que salieron de la revisión del PDF del 2026-10-09 (la primera es [FEAT-25](FEAT-25-pdf-sin-cartas-danadas.md)). Reúne los puntos 5 a 8 de esa revisión, los de impresión y recorte:

5. La hoja del PDF es A4 y en México se imprime en carta. Al imprimir, la impresora suele encoger la página cerca de 6 % y el tablero deja de medir 14 × 21 cm. `contexto-negocio.md` §5 ya dice que los tableros van «en tamaño carta»: es una regla definida que el sitio no cumple.
6. No hay guías de corte. El fondo crema del tablero sobresale unos 7 mm del área que se recorta, así que no queda claro por dónde cortar.
7. Los nombres largos se achican hasta letra de 6 puntos y después se cortan con «…».
8. La baraja se centra a lo ancho pero no a lo alto: sus páginas quedan cargadas hacia arriba.

**Fuera de esta feature.** Velocidad y peso del archivo ([FEAT-27](FEAT-27-pdf-velocidad-y-peso.md)) y detalles menores ([FEAT-28](FEAT-28-pdf-detalles-menores.md)). No cambia el contenido del PDF (tableros y baraja), ni las medidas del tablero (14 × 21 cm), ni ninguna pantalla del sitio, salvo que se decida dejar elegir el tamaño de hoja (pregunta 1).

**Clasificación:** cambios en el dibujo del PDF (`src/services/PDFService.ts` y `src/services/pdf/`). Afecta a los tres lugares que generan PDF: la vista previa (C3), la lotería guardada (U2) y el armado de loterías temáticas en administración (A1.7a), cuyo PDF es el que se vende. No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones. Estimado: 2 sesiones.

**Datos ya calculados (para no rehacerlos).**

- Hoja carta: 21.59 × 27.94 cm (612 × 792 puntos). Hoja A4: 21 × 29.7 cm.
- El tablero con su encabezado y el fondo crema mide unos 25.4 cm de alto: cabe en carta, con cerca de 1.3 cm de margen arriba y abajo.
- La baraja va acostada, 10 cartas por hoja (5 × 2). En A4 cada carta mide 5.2 × 7.8 cm; en carta, con los márgenes de hoy, quedaría en unos 4.8 × 7.3 cm.
- Las medidas viven en `src/services/pdf/constants.ts` (hoja y tablero) y dentro de `generatePDF` (baraja).

## Preguntas por resolver con Carlos antes de construir

Una por turno, como pide el método de trabajo. Las recomendaciones son propuestas, no decisiones.

1. **Tamaño de hoja.** (a) Carta siempre — recomendada: es lo que ya dice el documento de negocio y no agrega ninguna pantalla. (b) Dejar elegir entre carta y A4 al descargar: agrega un control en C3 y U2 y es un cambio a la base de conocimiento.
2. **PDF de loterías temáticas ya guardados.** Los que el administrador ya armó quedaron en A4. (a) Se quedan así hasta que el administrador los vuelva a armar — recomendada. (b) Volver a armarlos todos al publicar esta feature (hay que tener las cartas a la mano: el sitio no las guarda).
3. **Guías de corte.** (a) Marcas en las cuatro esquinas del área a recortar — recomendada: es lo habitual en imprenta y no ensucia el tablero. (b) Línea punteada alrededor. (c) Las dos. Decidir también si el fondo crema sigue sobresaliendo o termina justo en el corte.
4. **Nombres largos.** (a) Partirlos en dos líneas antes de achicar la letra — recomendada. (b) Dejarlos como hoy. Si es (a): la franja del nombre crece para las cartas de dos líneas, o todas las cartas del tablero usan la franja alta para verse parejas.

**Pendiente de documentación, a confirmar con Carlos:** anotar en `contexto-negocio.md` §17 que la regla «tableros en tamaño carta» (§5) todavía no se cumple, y retirarla al publicar esta feature.

## Grupo A — Impresión y recorte (borrador)

### US A1 — El PDF sale en hoja tamaño carta   ·   Estado: por definir (pregunta 1 y 2)

- **Historia** — Como persona que imprime su lotería en México, quiero que el PDF venga en hoja carta, para que el tablero salga a su tamaño real sin que la impresora lo encoja.
- **Entrega demostrable** — Los tableros y la baraja del PDF vienen en hoja carta. El tablero impreso al 100 % mide 14 × 21 cm.
- **Construido** — —
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Descarga un PDF → ábrelo y revisa en sus propiedades el tamaño de página → debería decir carta (21.59 × 27.94 cm; 8.5 × 11 pulgadas) → imprime un tablero al 100 %, sin «ajustar a la página» → mídelo con regla → debería medir 14 cm de ancho por 21 cm de alto, sin contar el encabezado.
- **Escenarios cubiertos**:
  - [ ] Las páginas de tableros miden carta en vertical y las de la baraja, carta acostada. (Prueba automática.)
  - [ ] El tablero y la baraja caben completos en la hoja, con margen imprimible. (Prueba automática de las medidas.)
  - [ ] El tablero impreso al 100 % mide 14 × 21 cm. (Demo.)
  - [ ] El PDF de una lotería temática armado en administración también sale en carta. (Demo.)

### US A2 — Guías para recortar el tablero   ·   Estado: por definir (pregunta 3)

- **Historia** — Como persona que recorta sus tableros, quiero ver por dónde cortar, para que todos me queden del mismo tamaño.
- **Entrega demostrable** — Cada página de tablero trae guías de corte que marcan el área a recortar.
- **Construido** — —
- **Depende de** — US A1 (las guías se colocan sobre la hoja nueva).
- **Cómo se prueba (guion de demo)** — Descarga un PDF → abre un tablero → deberían verse las guías alrededor del tablero y su encabezado → imprime y recorta siguiéndolas → el tablero debería quedar con el encabezado completo y sin borde crema disparejo.
- **Escenarios cubiertos**:
  - [ ] Las guías coinciden con el área de corte. (Prueba automática de las medidas.)
  - [ ] Se ven en tableros de 4 × 4 y de 3 × 3. (Demo.)

### US A3 — Los nombres largos se leen completos   ·   Estado: por definir (pregunta 4)

- **Historia** — Como persona que puso nombres largos a sus cartas, quiero que se lean completos y con letra legible en el PDF.
- **Entrega demostrable** — Un nombre que no cabe en una línea se parte en dos antes de achicar la letra; solo se corta con «…» si tampoco cabe en dos.
- **Construido** — —
- **Depende de** — nada. Usa la franja del nombre que dejó FEAT-25 (US A3).
- **Cómo se prueba (guion de demo)** — Crea cartas con nombres de una palabra, de tres palabras y de seis palabras → descarga el PDF → el de una palabra debería verse igual que hoy; el largo, en dos líneas centradas y legible; ninguno debería tapar la foto de más ni salirse de la carta.
- **Escenarios cubiertos**:
  - [ ] Un nombre que cabe en una línea no cambia. (Prueba automática.)
  - [ ] Un nombre largo se parte por un espacio, en dos líneas que caben en el ancho de la carta. (Prueba automática.)
  - [ ] Una sola palabra muy larga, que no se puede partir, se achica como hoy. (Prueba automática.)
  - [ ] Se ve bien en tableros de 4 × 4, de 3 × 3 y en la baraja. (Demo.)

### US A4 — La baraja queda centrada en la hoja   ·   Estado: por hacer (sin decisiones pendientes)

- **Historia** — Como persona que imprime la baraja, quiero que las cartas queden centradas en la hoja, para que ningún borde quede demasiado cerca de la orilla.
- **Entrega demostrable** — En las páginas de la baraja, la cuadrícula de cartas queda centrada también a lo alto, debajo del título de la página.
- **Construido** — —
- **Depende de** — US A1 (las medidas de la baraja cambian con la hoja).
- **Cómo se prueba (guion de demo)** — Descarga un PDF → ve a las páginas de «Baraja Completa» → el espacio libre arriba (bajo el título) y abajo de las cartas debería ser parecido; a los lados, igual que hoy.
- **Escenarios cubiertos**:
  - [ ] La cuadrícula queda centrada a lo ancho y a lo alto del espacio disponible. (Prueba automática de las medidas.)
  - [ ] Una última página con menos de 10 cartas se acomoda desde arriba a la izquierda, como hoy. (Demo.)
