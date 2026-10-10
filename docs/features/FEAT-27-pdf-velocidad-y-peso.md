# FEAT-27 — El PDF se genera más rápido, pesa menos y muestra su avance

**Estado: construida el 2026-10-09 y probada por Carlos en local. Va a `dev` con el PR de la rama `feature/pdf-velocidad-y-peso`; ahí falta seguir los guiones de demo. Hechas: US A1, A3, A5, A6 y A7. Descartadas: US A2 y A4. Sin decisiones pendientes. Rama: `feature/pdf-velocidad-y-peso`, creada desde `dev` con FEAT-25 y FEAT-26 ya fusionadas.**

**Contexto.** Tercera de las cuatro features que salieron de la revisión del PDF del 2026-10-09 (la primera es [FEAT-25](FEAT-25-pdf-sin-cartas-danadas.md)). Reúne los puntos 9 a 11 de esa revisión:

9. Cada imagen da vueltas de más: pasa de archivo a texto (base64) y de vuelta a bytes, y además se carga en el navegador solo para medirla, medida que después no se usa (`src/services/pdf/images.ts`).
10. Las imágenes PNG y WebP engordan el PDF: las WebP se convierten a PNG, que no comprime fotos. Convertirlas a JPEG daría archivos bastante más ligeros.
11. No hay avance visible: con muchos tableros la pantalla se queda en «generando» sin decir cuánto falta.

**Fuera de esta feature.** Impresión y recorte ([FEAT-26](FEAT-26-pdf-impresion-y-recorte.md)) y detalles menores ([FEAT-28](FEAT-28-pdf-detalles-menores.md)). No cambia cómo se ve el PDF, salvo las guías de corte de la baraja (US A7, agregada el 2026-10-09). Mover la generación fuera del hilo principal del navegador (para que la página no se trabe) queda fuera: es un cambio grande y solo se plantea si, después de esta feature, sigue haciendo falta.

**Clasificación:** rendimiento de la generación del PDF y un aviso de avance en las pantallas que lo generan (C3, U2 y A1.7a). No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones. Estimado: 2 sesiones.

**Punto de partida (para no rehacerlo).**

- FEAT-25 (US A4) ya dejó que cada imagen se lea una sola vez por PDF (`src/services/pdf/loadOnce.ts`). Esta feature se construye encima; conviene que FEAT-25 esté en `dev` antes de abrir la rama.
- Las fotos que sube el usuario ya se guardan como JPEG de hasta 768 px de ancho, y las cartas de loterías temáticas como JPEG de hasta 1000 px. PNG y WebP llegan sobre todo por otras vías (por ejemplo, las imágenes transformadas con IA); hay que comprobar cuáles antes de estimar el ahorro.
- No hay ninguna medición de tiempo ni de peso. La primera tarea de la feature es medir, para poder demostrar la mejora.

## Decisiones tomadas con el usuario

- **2026-10-09 — Cómo se mide (US A1).** Con un medidor dentro del sitio que solo escribe al correrlo en la máquina de Carlos (`npm run dev`): al generar un PDF deja en la consola del navegador el tiempo total y por etapa, el peso del PDF y cuántas imágenes entraron de cada formato. Carlos genera los casos y pega las líneas. El mismo medidor sirve para la tabla «después» y se quita al cerrar la feature. Descartadas: que Claude mida en Chrome (gasta más y necesita la sesión de Carlos) y medir a mano con cronómetro (impreciso y no confirma los formatos).
- **2026-10-09 — El aviso de espera perdido entra en esta feature (US A5).** Al medir, Carlos vio que en el flujo de Crear no aparece ningún aviso mientras se generan los tableros o el PDF, y le salió un error 403 al generar tableros. Decidió arreglarlo aquí y de inmediato, como historia nueva. Descartadas: una feature aparte en su propia rama, y dejarlo anotado en pendientes.
- **2026-10-09 — Imágenes que no son JPEG (pregunta 1, US A3).** Todas se convierten a JPEG de alta calidad antes de entrar al PDF, con fondo blanco donde haya transparencia. Decidido con la tabla «antes» de la US A1 a la vista (19 WebP llevaban un PDF de 24 cartas a 75 MB). El logo del sitio no entra en la conversión. Descartada: convertir solo las WebP y dejar las PNG como están.
- **2026-10-09 — El PDF sin baraja entra en esta feature (US A6).** Al medir el segundo caso, el PDF de una lotería recién creada salió sin las cartas para recortar. Carlos decidió arreglarlo aquí y de inmediato. Descartadas: una feature aparte y urgente en su propia rama, y dejarlo anotado en pendientes.
- **2026-10-09 — Guías de corte también en la baraja (US A7).** Al probar, Carlos vio que las guías de FEAT-26 solo salen en los tableros y pidió ponerlas en las páginas de la baraja, en esta feature. Forma elegida: una línea punteada por en medio de cada espacio entre cartas y otra alrededor del grupo, a 2 mm de las cartas, con marcas cortas en los extremos; un corte recto separa dos cartas y cada una queda con un marco blanco de 2 mm. No pueden ser como las del tablero (a 3 mm) porque entre cartas solo hay 4 mm. Descartadas: un recuadro punteado por carta (dos cortes entre vecinas) y solo marcas en la orilla de la hoja. Es el único cambio de esta feature en cómo se ve el PDF.
- **2026-10-09 — El aspecto de las cartas va en otra feature.** El marco disparejo de las ilustraciones y el nombre dentro de la imagen quedaron en borrador en [FEAT-29](FEAT-29-pdf-aspecto-de-las-cartas.md).
- **2026-10-09 — La US A2 se descarta.** La medición de la US A1 mostró que no vale la pena: con 54 cartas JPEG el PDF completo sale en 0.59 s y leer las imágenes toma 0.08 s, así que quitar las vueltas de más ahorraría décimas de segundo. A cambio había que rehacer el recorrido de las imágenes por toda la generación, y la carga «solo para medir» sirve hoy de filtro contra imágenes dañadas (FEAT-25). Descartada: construirla de todos modos.
- **2026-10-09 — La US A4 se descarta (pregunta 2).** Desde la US A5 el aviso «Generando PDF…» ya cubre la pantalla, y la espera normal es de menos de un segundo (0.59 s con 54 cartas y 20 tableros en computadora): un paso a paso no se alcanzaría a leer. Si más adelante aparecen esperas largas en teléfonos, se retoma con una medición. Descartadas: texto de avance dentro del aviso actual, barra de avance, y medir primero en teléfono.

## Preguntas por resolver con Carlos antes de construir

Las dos quedaron resueltas el 2026-10-09.

1. ~~**Imágenes que no son JPEG.**~~ Resuelta el 2026-10-09 (ver «Decisiones tomadas con el usuario»). Opciones que se plantearon: (a) Convertirlas a JPEG de alta calidad con fondo blanco donde haya transparencia — recomendada: es lo que más baja el peso y una carta impresa no necesita transparencia. (b) Dejar las PNG como están y convertir solo las WebP. Decidir con las mediciones de la US A1 a la vista.
2. ~~**Cómo se muestra el avance.**~~ Resuelta el 2026-10-09: la US A4 se descartó (ver «Decisiones tomadas con el usuario»). Opciones que se plantearon: (a) Un texto junto al botón, «Preparando imágenes…» y luego «Tablero 3 de 10» — recomendada: no agrega componentes nuevos. (b) Una barra de avance. En cualquier caso, revisar `docs/diseno-mockups.md` y `docs/sistema-diseno.md` antes de diseñarlo, y confirmar el texto en español e inglés.

## Grupo A — Velocidad y peso (borrador)

### US A1 — Saber cuánto tarda y cuánto pesa hoy el PDF   ·   Estado: hecha (2026-10-09)

- **Historia** — Como responsable del sitio, quiero conocer el tiempo y el peso actuales del PDF con una lotería de ejemplo, para comprobar que los cambios de esta feature de verdad mejoran.
- **Entrega demostrable** — Una tabla en este archivo con el tiempo de generación y el peso del PDF para dos casos (por ejemplo: 24 cartas con 8 tableros, y 54 cartas con 10 tableros), medidos antes de tocar nada, y la lista de qué formato de imagen llega por cada vía (subida, IA, temáticas).
- **Construido** — (2026-10-09) Tabla «antes» con dos casos medidos por Carlos, usando un medidor temporal conectado a `generatePDF` que escribía en la consola el tiempo por etapa, el peso y las imágenes por formato; el medidor se quitó al cerrar la feature. Queda `src/services/pdf/imageFormat.ts`, que reconoce el formato por los primeros bytes (prueba en `tests/src/pdfImageFormat.test.ts`) y que usa la US A3.
- **Depende de** — FEAT-25 en `dev`.
- **Cómo se midió** — Con el medidor temporal (ya retirado) y el sitio corriendo en local (`npm run dev`) y la consola del navegador abierta, se generaba el PDF y aparecían cuatro líneas que empezaban con `[PDF medición]`. Cada caso se generó dos veces y se anotó la segunda (la primera incluye la descarga de imágenes que luego quedan guardadas en el navegador).
- **Cómo se prueba (guion de demo)** — Carlos genera los dos PDF de ejemplo en `dev` y compara el peso de los archivos con la tabla; deberían coincidir de forma aproximada.
- **Formatos por vía de entrada** (2026-10-09):

  | Vía | Formato que llega al PDF |
  |---|---|
  | Foto subida y recortada | JPEG |
  | Carta de lotería temática | JPEG |
  | Carta transformada con IA | JPEG de 512 × 768: la IA devuelve WebP, pero el sitio la convierte antes de guardarla (`adjustImageToCardAspectRatio` en `src/components/CardEditor/useCardAI.ts`) |
  | Carta con IA anterior a esa conversión | WebP de unos 740 KB, guardada tal cual. En la base de pruebas son 41 cartas, todas del 7 al 10 de febrero de 2026; las 46 cartas con IA posteriores son JPEG de unos 170 KB. Antes de la US A3 se convertían a PNG al entrar al PDF |
  | Logo del sitio en cada tablero | PNG de 171 KB, incrustado una vez por PDF |

- **Tabla «antes»** (medida por Carlos en local, base de pruebas, 2026-10-09):

  | Caso | Imágenes de entrada | Tiempo total | Leer imágenes | Tableros | Baraja | Guardar | Peso del PDF |
  |---|---|---|---|---|---|---|---|
  | 24 cartas, 10 tableros | 19 WebP (13.91 MB) · 5 JPEG (0.30 MB) | 15.44 s | 0.10 s | 8.05 s | 0.00 s | 7.28 s | 75.22 MB |
  | 54 cartas, 20 tableros (sin baraja, ver nota) | 54 JPEG (6.13 MB) | 0.59 s | 0.08 s | 0.38 s | 0.00 s | 0.13 s | 6.35 MB |

  Lectura: las 19 cartas con IA de esa lotería son de febrero de 2026, anteriores a la conversión al guardar, y entran como WebP de unos 730 KB cada una y, al convertirse a PNG, llevan el PDF a 75 MB. Casi todo el tiempo se va en convertirlas e incrustarlas («tableros») y en escribir el archivo («guardar»); leer las imágenes casi no cuenta. La mejora grande, en peso y en tiempo, está en la US A3. El segundo caso lo confirma por el otro lado: con 54 cartas, todas JPEG, el PDF sale en menos de un segundo y pesa 6 MB; el problema son solo las imágenes que no son JPEG, y lo que la US A2 puede ahorrar es poco.

  **Tabla «después»** (US A3, 2026-10-09): la misma lotería de 24 cartas (19 WebP · 5 JPEG), descargada por Carlos en local con 12 tableros, pesa **13.76 MB** (antes 75.22 MB con 10 tableros; los tableros repiten las mismas imágenes, así que el número de tableros casi no cambia el peso). Peso tomado del archivo descargado; el tiempo «después» no se anotó.

  Nota del segundo caso: el medidor marcó «0 cartas en la baraja» aunque los tableros usaron 54 cartas, es decir, ese PDF salió sin las páginas de «Baraja Completa». Se generó desde la vista previa (C3). Es la falla que arregla la US A6.
- **Escenarios cubiertos**:
  - [x] Tabla «antes» escrita en este archivo, con cómo se midió.
  - [x] Lista de formatos de imagen por vía de entrada. (Comprobada el 2026-10-09 con la medición y con los archivos guardados en la base de pruebas; las temáticas quedan según el código.)

### US A2 — Las imágenes llegan al PDF sin vueltas de más   ·   Estado: descartada el 2026-10-09 (no se construyó)

- **Historia** — Como persona que descarga una lotería grande, quiero que el PDF se genere sin demoras innecesarias ni trabar mi teléfono.
- **Entrega demostrable** — Cada imagen pasa directo de archivo a bytes, sin convertirse a texto ni cargarse en el navegador solo para medirla. El PDF resultante es idéntico al de antes y el tiempo de generación baja respecto a la tabla de la US A1.
- **Construido** — No se construyó: descartada (ver «Decisiones tomadas con el usuario»). De esta historia solo quedó `imageFormatOfBytes`, que usa la US A3.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Genera en `dev` el caso grande de la US A1 → el PDF debería verse igual que antes, carta por carta → el tiempo anotado en la tabla «después» debería ser menor que el de «antes».
- **Escenarios cubiertos**:
  - [ ] Una imagen JPEG o PNG se reconoce por sus primeros bytes sin pasar por base64. (Prueba automática.)
  - [ ] El PDF se ve igual que antes. (Demo.)
  - [ ] Tabla «después» escrita en este archivo.

### US A3 — El PDF pesa menos   ·   Estado: hecha en local (2026-10-09, marcada como completa por Carlos); falta verla en `dev`

- **Historia** — Como persona que descarga o comparte su lotería desde el teléfono, quiero que el archivo no pese de más.
- **Entrega demostrable** — Las imágenes que no son JPEG se convierten antes de entrar al PDF, según lo decidido en la pregunta 1. El peso del PDF baja respecto a la tabla de la US A1 en las loterías que traían esas imágenes, sin pérdida visible al imprimir.
- **Construido** — (2026-10-09) `src/services/pdf/jpeg.ts`: lo que no es JPEG se convierte en el navegador a JPEG de calidad 0.92 sobre fondo blanco; lo que ya es JPEG pasa tal cual (prueba en `tests/src/pdfJpeg.test.ts`). `embedImageInPDF` (`src/services/pdf/images.ts`) ya solo incrusta JPEG; se quitó la conversión a PNG. El logo sigue su propio camino, sin convertir. Si una imagen no se puede convertir, la carta cuenta como fallida y aplica el aviso de FEAT-25.
- **Depende de** — US A1 y US A2.
- **Cómo se prueba (guion de demo)** — Genera un PDF con cartas transformadas con IA → compara su peso con el de la tabla «antes» → debería ser menor → imprime una página y compárala con una impresa antes → no debería notarse diferencia de calidad.
- **Escenarios cubiertos**:
  - [x] Una imagen con transparencia sale con fondo blanco, no negro. (Demo. Dado por bueno por Carlos el 2026-10-09 sin probarlo aparte: hoy no hay cartas guardadas con transparencia; el fondo blanco está en el código de la conversión.)
  - [x] Una imagen que ya era JPEG no se vuelve a comprimir. (Prueba automática.)
  - [x] Peso «después» anotado en la tabla.
  - [x] El PDF de una lotería temática armado en administración conserva su calidad. (Demo. Dado por bueno por Carlos el 2026-10-09 sin probarlo aparte: las cartas temáticas son JPEG y pasan sin volver a comprimirse, según la prueba automática.)

### US A4 — Ver el avance mientras se arma el PDF   ·   Estado: descartada el 2026-10-09 (no se construyó)

- **Historia** — Como persona que espera su PDF, quiero ver cuánto falta, para saber que el sitio sigue trabajando y no cerrar la página.
- **Entrega demostrable** — Mientras se genera el PDF, la pantalla muestra en qué paso va, en la vista previa (C3), en la lotería guardada (U2) y en el armado de loterías temáticas (A1.7a).
- **Construido** — No se construyó: descartada (ver «Decisiones tomadas con el usuario»). El aviso de espera que sí existe es el de la US A5.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En la vista previa, con 10 tableros, pulsa descargar → junto al botón debería verse el avance cambiando hasta terminar → al terminar, baja el PDF y el avance desaparece. Repite desde una lotería guardada.
- **Escenarios cubiertos**:
  - [ ] La generación informa su avance paso por paso (imágenes, cada tablero, baraja). (Prueba automática.)
  - [ ] El avance se ve en C3, U2 y A1.7a, en español e inglés. (Demo.)
  - [ ] Si la generación falla, el avance desaparece y queda el aviso de error de FEAT-25. (Demo.)

### US A5 — El aviso de espera se ve y no se puede lanzar dos veces   ·   Estado: hecha en local (2026-10-09); falta verla en `dev`

- **Historia** — Como persona que genera sus tableros o descarga su PDF en el flujo de Crear, quiero ver que el sitio está trabajando y que no pase nada raro si vuelvo a pulsar el botón.
- **Origen** — Encontrado por Carlos el 2026-10-09 al medir para la US A1. Dos fallas: (1) en C2 y C3 el aviso «Generando…» se dibuja sin estilos, como texto suelto debajo del pie de página: sus estilos se perdieron en el rediseño de enero de 2026; (2) nada impide lanzar la generación de tableros dos veces, y la segunda borra los tableros que la primera acababa de crear, de modo que la primera falla al guardar sus cartas (error 403 en `board_cards`). La causa de (2) es la que encaja con lo observado; no se reprodujo. Los permisos y reglas de acceso de la base de pruebas se revisaron y están bien.
- **Entrega demostrable** — En C2 y C3 el aviso de espera cubre la pantalla, igual que el que ya existe en una lotería guardada (U2). Una segunda pulsación mientras se generan los tableros o el PDF no lanza otra generación.
- **Construido** — (2026-10-09) Estilos del aviso en `src/App.css` (`.app__loading`), con el mismo aspecto que el de U2 y solo colores de la paleta. Una generación a la vez con `src/utils/singleFlight.ts` (prueba en `tests/src/singleFlight.test.ts`), usado en `src/hooks/useBoard.ts`, que cubre C2 y la regeneración desde U2; la descarga del PDF en C3 ignora una segunda pulsación (`src/AppRouter.tsx`).
- **Depende de** — nada. La US A4 se construye sobre este aviso.
- **Cómo se prueba (guion de demo)** — En `dev`, con sesión iniciada, abre una lotería → llega a «Cantidad de tableros» → pulsa «Generar» → debería verse la pantalla cubierta con el círculo girando y «Generando tableros…» hasta llegar a la vista previa, sin ningún aviso de error → en la vista previa pulsa descargar → debería verse el mismo aviso con el texto del PDF hasta que baje el archivo.
- **Escenarios cubiertos**:
  - [x] Una segunda llamada mientras la primera sigue en curso no lanza otra: comparte el resultado de la primera. (Prueba automática.)
  - [x] El aviso de espera se ve al generar tableros en C2. (Demo: Carlos lo vio en local el 2026-10-09.)
  - [x] El aviso de espera se ve al descargar el PDF en C3. (Demo: Carlos lo vio en local el 2026-10-09.)
  - [x] Generar tableros con sesión iniciada ya no muestra el error. (Demo: Carlos generó 20 tableros en local el 2026-10-09 sin el 403.)

### US A6 — El PDF de una lotería recién creada trae su baraja   ·   Estado: hecha en local (2026-10-09, marcada como completa por Carlos); falta verla en `dev`

- **Historia** — Como persona con sesión iniciada que acaba de crear su lotería, quiero que el PDF que descargo desde la vista previa traiga también las cartas para recortar, no solo los tableros.
- **Origen** — Encontrado por Carlos el 2026-10-09 al medir para la US A1: 54 cartas, 20 tableros y un PDF sin «Baraja Completa». En el flujo de Crear con sesión, la lista de cartas para la baraja se cargaba una sola vez al abrir la lotería (`useCards` en `src/AppRouter.tsx`) y no veía las cartas agregadas después en C1, que lleva su propia lista. En una lotería nueva la baraja salía vacía; en una que ya tenía cartas, sin las agregadas en esa visita. No pasaba al descargar desde U2 ni sin sesión. Comprobado en la base de pruebas: lotería, cartas y tableros se crearon en la misma visita.
- **Entrega demostrable** — Al descargar desde C3 con sesión iniciada, la baraja se arma con las cartas que la lotería tiene en ese momento.
- **Construido** — (2026-10-09) `handlePreviewConfirm` en `src/AppRouter.tsx` lee las cartas de la lotería al momento de descargar (`CardRepository.getCards`) en lugar de usar la lista cargada al abrirla.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Con sesión iniciada, crea una lotería nueva → agrega sus cartas → genera los tableros → en la vista previa descarga el PDF, sin recargar la página en ningún momento → después de los tableros deberían venir las páginas de «Baraja Completa» con todas las cartas. Luego vuelve a cartas, agrega una más, regenera y descarga → la carta nueva debería estar en la baraja.
- **Escenarios cubiertos**:
  - [x] Una lotería creada en la misma visita descarga su PDF con la baraja completa. (Demo: Carlos lo confirmó en local el 2026-10-09.)
  - [x] Una carta agregada en la misma visita aparece en la baraja. (Demo. Dado por bueno por Carlos el 2026-10-09 sin probarlo aparte: usa la misma lectura de cartas que el escenario anterior.)
  - [x] Sin sesión, el PDF sigue saliendo con su baraja. (Demo. Dado por bueno por Carlos el 2026-10-09 sin probarlo aparte: ese camino no se tocó.)

### US A7 — Guías para recortar la baraja   ·   Estado: hecha en local (2026-10-09, marcada como completa por Carlos); falta verla en `dev`

- **Historia** — Como persona que recorta su baraja, quiero ver por dónde cortar, para que todas las cartas me queden del mismo tamaño.
- **Entrega demostrable** — Cada página de «Baraja Completa» trae líneas punteadas por en medio de los espacios entre cartas y alrededor del grupo, a 2 mm de las cartas, con una marca corta en cada extremo. Las cartas no cambian de tamaño ni de lugar.
- **Construido** — (2026-10-09) `deckCutGuides` (`src/services/pdf/layout.ts`) calcula las líneas y las marcas a partir del acomodo de la baraja; `drawDeckCutGuides` (`src/services/pdf/draw.ts`) las dibuja en el mismo gris y punteado que las del tablero, debajo de las cartas, y `generatePDF` la llama en cada página de la baraja. Las marcas de arriba y abajo miden lo mismo que las del tablero; las de los lados son más cortas (poco más de 1 mm) porque la baraja queda a 1 cm de la orilla y más allá la impresora no alcanza. Pruebas en `tests/src/pdfDeckCutGuides.test.ts`.
- **Depende de** — nada (usa el acomodo de la baraja de FEAT-26).
- **Cómo se prueba (guion de demo)** — Descarga un PDF → ve a las páginas de «Baraja Completa» → entre carta y carta debería verse una sola línea punteada gris, y otra alrededor de todo el grupo, sin tocar los bordes negros → en una última página con pocas cartas, las líneas deberían rodear solo las cartas que hay → imprime y corta por las líneas → cada carta queda con un marco blanco parejo de unos 2 mm.
- **Escenarios cubiertos**:
  - [x] Cada línea pasa a media distancia entre dos cartas, y las de la orilla a esa misma distancia del grupo. (Prueba automática de las medidas.)
  - [x] Las líneas van de lado a lado del grupo y las marcas quedan en sus extremos, dentro de lo que la impresora alcanza. (Prueba automática de las medidas.)
  - [x] Una página con pocas cartas solo lleva líneas alrededor de las que tiene. (Prueba automática.)
  - [x] Las guías se ven en la baraja y no tapan las cartas. (Demo. Dado por bueno por Carlos el 2026-10-09; revisado en una página de muestra con rectángulos en lugar de cartas, no con un PDF real.)
