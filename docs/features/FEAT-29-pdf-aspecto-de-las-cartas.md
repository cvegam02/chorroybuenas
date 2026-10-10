# FEAT-29 — Aspecto de las cartas en el PDF: nombre dentro de la imagen y marcos disparejos

**Estado: construida el 2026-10-09 (US A1 a A5). Carlos la revisó en local ese día y la dio por buena. Va a `dev` con el PR de la rama `feature/pdf-aspecto-de-las-cartas`; ahí falta seguir los guiones de demo y comparar el peso del PDF con el de FEAT-27. Sin decisiones pendientes. Rama creada desde `dev` con FEAT-28 ya fusionada.**

**Contexto.** Salió el 2026-10-09 mientras Carlos probaba [FEAT-27](FEAT-27-pdf-velocidad-y-peso.md): al ver la baraja del PDF notó dos cosas del aspecto de las cartas y decidió tratarlas en una feature aparte.

1. **Las imágenes se ven con borde a los lados pero no arriba.** Revisado en el PDF que descargó (lotería de 24 cartas de la base de pruebas): el borde no lo pone el PDF, viene pintado dentro de la ilustración. Las cartas con IA de febrero de 2026 traen su propio marco (una orilla clara y una línea oscura). El PDF acomoda la imagen llenando la casilla y recortando lo que sobra arriba y abajo, así que el marco de arriba se pierde y el de los lados se queda. Falta comprobar si las cartas con IA actuales también traen marco.
2. **El nombre no le gusta en su franja blanca al pie.** Carlos quiere que el nombre quede incorporado a la imagen.

**Fuera de esta feature.** Peso y velocidad del PDF (FEAT-27), y nombre del archivo y limpieza (FEAT-28). El número de carta (decisión 4), el nombre y el número pintados por la IA en las cartas convertidas (decisión 5): cada uno se define en su propia feature. La subida de cartas por lote no cambia.

**Clasificación:** aspecto de las cartas en el PDF y en las pantallas que las muestran: tableros (C3, M9, U2) y cartas sueltas (C1, la lista de U2 y M10). No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones. Estimado: 3 a 4 sesiones (se hizo en una, a pedido de Carlos).

**Qué toca de lo ya decidido.** Cambia la decisión 5 de [FEAT-26](FEAT-26-pdf-impresion-y-recorte.md) (un solo renglón, en su franja): la franja desaparece y el nombre puede ir en dos renglones como último recurso. La decisión 6 (la letra no baja de 8 puntos) se conserva. En FEAT-27 cambia un escenario: las fotos que ya eran JPEG ahora sí se vuelven a comprimir una vez, al componer la carta. `docs/contexto-negocio.md` no describe la franja ni el aspecto de la carta (revisado el 2026-10-09). `docs/diseno-mockups.md` tampoco lo describía: el 2026-10-09, con la confirmación de Carlos, se anotó en C1, C3, U2, M9 y M10 que las cartas se muestran como salen impresas, y se corrigió que M9 también se usa en U2.

**Punto de partida (para no rehacerlo).**

- La carta se dibuja en `drawCardOnPage` (`src/services/pdf/draw.ts`): imagen recortada a la casilla, franja blanca con el nombre al pie y borde negro al final. El acomodo de la imagen está en `placeImageInCard` y el alto de la franja en `titleSpaceFor` (`src/services/pdf/layout.ts`).
- Las cartas de loterías temáticas ya traen su nombre dibujado y van enteras, sin franja (FEAT-23): no deberían cambiar.
- El mismo dibujo se usa en tableros y en baraja: lo que se decida aplica a los dos, salvo que se defina otra cosa.

## Decisiones tomadas con el usuario

Todas del 2026-10-09.

1. **Diseño de la carta (lo trajo Carlos).** Carta 2:3 vertical. La foto llena la carta dentro de un margen crema delgado (`#F4EAD4`, cerca del 4 % del ancho) y un marco negro fino (unos 5 px en una carta de 1000 × 1500). Nombre centrado al pie y número en la esquina superior izquierda, los dos sobre la foto. Letra Arvo Bold (Google Fonts, licencia OFL), blanca, con contorno `#14100A` de 7 a 9 % del tamaño de la letra y, detrás, una sombra negra difuminada (cerca de 60 % de opacidad, un poco hacia abajo). Nombre en mayúsculas con las reglas de `es-MX`. Tamaños de referencia en 1000 × 1500: nombre de 120 px como máximo, número de 110 px, a unos 35 px del marco. La carta se compone como imagen (foto + marco + texto) antes de entrar al PDF, en una pieza reutilizable.
2. **El nombre va en letras con contorno, sin fondo.** _(Descartadas: etiqueta blanca al pie; banda translúcida de lado a lado.)_
3. **Nombre largo: un renglón; se achica hasta 8 puntos y, solo si ni así cabe, se parte en dos renglones. Nunca se corta.** Cambia la decisión 5 de FEAT-26 (un solo renglón) y conserva la 6 (mínimo de 8 puntos). Los 8 puntos se miden en la carta más chica que se imprime, la del tablero 4 × 4. _(Descartadas: cortar con «…» como hoy —elegida primero y cambiada al revisar el diseño—; achicar sin límite; dos renglones desde que no cabe a tamaño normal.)_
4. **El número de carta va en una feature aparte.** Es una regla de negocio nueva (guardarlo, editarlo, validar repetidos, pantalla de cartas). Aquí solo se deja previsto su lugar. _(Descartadas: número automático sin edición en esta feature; todo en esta feature.)_
5. **El diseño nuevo aplica solo a las cartas con foto normal.** Las cartas ya convertidas con IA no llevan margen crema ni marco nuevo: su nombre y su número vendrán pintados por la IA, en una feature siguiente.
6. **Mientras esa feature llega, las cartas con IA van enteras, sin franja, con el nombre encima** en la misma letra blanca con contorno. Así su marco pintado sale parejo en los cuatro lados (observación 1). _(Descartadas: dejarlas como hoy; enteras y sin nombre.)_
7. **Además del PDF, la vista previa de tableros (C3) muestra el aspecto nuevo.** _(Descartadas: solo el PDF; todas las pantallas con cartas.)_

**Comprobado, sin pregunta.** Las ilustraciones con IA son 2:3, igual que la carta de la baraja; en los tableros, sin franja, se recorta menos de 0.2 mm por lado. Las fotos se guardan a 768 px de ancho, más de 300 dpi en la carta más grande que se imprime (baraja, 5 × 7.5 cm), y el PDF ya usa JPEG de calidad 92 (FEAT-27). Cada carta se compone una vez y se reutiliza, así que el peso casi no cambia; la foto sí se vuelve a comprimir una vez al componerla.

8. **Se quita la franja blanca del pie en el PDF.** Carlos pidió que se le preguntara antes; confirmado. Ningún tipo de carta la usa ya.
9. **El crema, el negro del contorno y la letra Arvo son de la carta impresa, no del sitio.** No entran a la paleta ni a la tipografía del sistema de diseño; viven como constantes de la pieza que compone la carta, y `docs/sistema-diseno.md` lo anota al construir la US A1.
10. **Los tableros de la lotería guardada (U2) también cambian**, porque sus miniaturas y su tablero ampliado son la misma pieza que usa C3. La lista de cartas de U2 no cambia. _(Descartada: separar las piezas para que U2 se quede como está.)_
11. **Todas las cartas llevan el borde negro grueso del PDF por fuera**, también las del marco nuevo. Salió de la demo de la US A1: yo lo había quitado solo en las cartas con marco nuevo y Carlos vio que unas lo traían y otras no. _(Descartadas: quitarlo en todas; dejarlo solo en las cartas con IA y las temáticas.)_
12. **Un nombre que no cabe ni en dos renglones a 8 puntos se corta con «…» al final del segundo renglón**, mientras no exista un límite de largo al escribir el nombre. Ese límite es lo que Carlos eligió como solución de fondo y va en una feature aparte (ver los pendientes, al final). Matiza el «nunca se corta» de la decisión 3: vale para todo lo que cabe en dos renglones. _(Descartada: achicar la letra por debajo de 8 puntos.)_
13. **El aspecto nuevo va también a las pantallas donde las cartas se ven sueltas**: el editor de cartas (C1), la lista de cartas de la lotería guardada (U2) y la carta ampliada (M10). Salió de la demo de la US A4: Carlos vio el cambio en los tableros y lo echó de menos en las cartas. Amplía la decisión 7 y quita ese punto de los pendientes. Mientras una carta se convierte con IA se ve como antes. _(Descartadas: solo el editor de cartas; dejarlo para otra feature.)_

## Diseño

- **Una pieza que compone la carta**, en el navegador y fuera de `src/services/pdf/` para que la usen el PDF y las pantallas (por ejemplo `src/services/cardCompose/`). Recibe la foto y el nombre y devuelve la carta como imagen JPEG de calidad 92, en 2:3, al tamaño de la foto guardada (768 × 1152). Dos variantes: **con marco** (foto normal: margen crema, marco negro fino alrededor de la foto, nombre encima) y **sin marco** (carta con IA: la ilustración entera y el nombre encima). El lugar del número queda reservado y vacío.
- **Las medidas y el acomodo del nombre son cálculo puro**, separado del dibujo: todo sale del ancho de la carta, con las proporciones de la decisión 1, y el ajuste del nombre (un renglón → achicar hasta 8 puntos → dos renglones) recibe la función que mide el texto. Eso es lo que llevan las pruebas automáticas; el dibujo en sí (contorno, sombra) se comprueba en la demo.
- **Arvo Bold** se guarda en el proyecto con su licencia OFL y se carga en el navegador antes de componer. Como el texto va dentro de la imagen, no hace falta incrustar la letra en el PDF ni agregar dependencias.
- **En el PDF**, `drawCardOnPage` deja de reservar la franja: la carta compuesta llena la casilla. Las cartas de loterías temáticas siguen como hoy (enteras, sin nombre). Cada carta se compone una sola vez por PDF y se reutiliza en tableros y baraja.
- **En pantalla**, `BoardThumbnail` y `BoardCell` muestran la carta compuesta y dejan de escribir el nombre debajo.
- **Borde negro del PDF:** todas las cartas lo conservan (decisión 11).

## Grupo A — Aspecto de las cartas

### US A1 — Las cartas con foto normal salen con el diseño nuevo en el PDF   ·   Estado: construida, falta la demo en `dev`

- **Historia** — Como persona que imprime su lotería, quiero que cada carta con foto traiga su marco y su nombre dentro de la imagen, para que se vea como una carta de lotería y no como una foto con un letrero.
- **Entrega demostrable** — En tableros y baraja, las cartas con foto normal llevan margen crema, marco negro fino y el nombre en Arvo Bold blanca con contorno y sombra, sobre la foto. Ya no hay franja blanca. Un nombre que no cabe se achica hasta 8 puntos; lo que ni así quepa se corta con «…» hasta que llegue la US A3. Las cartas con IA y las temáticas no cambian en esta historia.
- **Construido** — 2026-10-09. La pieza que compone la carta vive en `src/services/cardCompose/`: `constants.ts` (colores, letra y proporciones), `layout.ts` (medidas de la carta y ajuste del nombre, cálculo puro), `font.ts` (carga Arvo Bold, guardada en `src/fonts/` con su licencia) y `compose.ts` (dibuja foto, marco y nombre en un lienzo de 768 × 1152 y entrega un JPEG de calidad 92). `createCardPreparer` (`src/services/pdf/prepareCards.ts`) compone cada carta una sola vez por PDF y `generatePDF` la usa para tableros y baraja. `drawCardOnPage` (`src/services/pdf/draw.ts`) ya no dibuja franja ni nombre: se borraron el título, su letra y `titleSpaceFor`. Todas las cartas conservan el borde negro grueso del PDF (decisión 11). `docs/sistema-diseno.md` anota la decisión 9. Pruebas: `tests/src/cardComposeLayout.test.ts`, `tests/src/pdfPrepareCards.test.ts`, `tests/src/pdfCardDraw.test.ts`; `tests/src/pdfCardTitle.test.ts` se borró con la franja. El dibujo en el lienzo (contorno, sombra, letra) no tiene prueba automática ni se ha visto en pantalla: se comprueba en la demo.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Arma una lotería con fotos normales, unas claras y otras oscuras, y descarga el PDF → en los tableros y en la baraja cada carta debería verse con su margen crema, su marco y el nombre en letras blancas con orilla negra sobre la foto → el nombre debería leerse igual de bien en las fotos claras que en las oscuras → no debería quedar franja blanca al pie → imprime una página y revisa que las letras salgan nítidas.
- **Escenarios cubiertos**:
  - [x] Las medidas de la carta (margen, marco, tamaño y posición del nombre, lugar del número) salen del ancho de la carta. (Prueba automática.)
  - [x] El nombre se escribe en mayúsculas respetando acentos y Ñ. (Prueba automática.)
  - [x] Un nombre que no cabe se achica solo hasta 8 puntos, medidos en la carta del tablero 4 × 4. (Prueba automática.)
  - [x] Cada carta se compone una sola vez por PDF. (Prueba automática.)
  - [x] Una foto que no se puede componer cuenta como carta fallida, con el aviso de FEAT-25. (Prueba automática.)
  - [ ] Las cartas se ven con el diseño nuevo en tableros 4 × 4, 3 × 3 y baraja, y se leen en fotos claras y oscuras. (Demo.)
  - [ ] El peso del PDF no sube de forma apreciable frente a FEAT-27. (Demo: comparar el peso de una misma lotería. Ojo: las fotos se guardan con calidad 70 a 80 y la carta compuesta sale con calidad 92, así que puede pesar más que la foto sola; si sube mucho, se decide con Carlos si se baja la calidad.)

### US A2 — Las cartas con IA salen enteras, con el nombre encima   ·   Estado: construida, falta la demo en `dev`

- **Historia** — Como persona que convirtió sus cartas con IA, quiero que la ilustración salga completa, para que su marco se vea parejo en los cuatro lados.
- **Entrega demostrable** — En tableros y baraja, las cartas convertidas con IA van enteras, sin franja y sin margen ni marco nuevo, con el nombre encima en la misma letra de la US A1.
- **Construido** — 2026-10-09. La carta marcada como convertida con IA (`isAiGenerated`) se compone con la misma pieza en su variante sin marco (`framed: false`): la ilustración llena toda la carta y el nombre va encima, en el mismo lugar que en las cartas con marco. En el PDF llena la casilla. Las cartas de loterías temáticas no pasan por la pieza. Pruebas: las mismas de la US A1, más el recorte por casilla en `tests/src/seasonalBuild.test.ts`.
- **Depende de** — US A1 (usa la misma pieza, en su variante sin marco).
- **Cómo se prueba (guion de demo)** — Descarga el PDF de la lotería de 24 cartas de la base de pruebas (la de las ilustraciones de febrero) → el marco pintado de cada ilustración debería verse completo arriba, abajo y a los lados → el nombre debería ir sobre la ilustración, al pie, sin franja blanca. Descarga una lotería que mezcle fotos normales y cartas con IA → las primeras llevan el marco nuevo y las segundas no.
- **Escenarios cubiertos**:
  - [x] Una carta marcada como convertida con IA se compone sin margen ni marco nuevo. (Prueba automática.)
  - [x] La ilustración llena la casilla sin recorte apreciable en tableros 4 × 4, 3 × 3 y baraja. (Prueba automática.)
  - [ ] El marco pintado se ve parejo en los cuatro lados. (Demo.)
  - [ ] Las cartas de loterías temáticas siguen saliendo como antes. (Demo.)

### US A3 — Los nombres largos pasan a dos renglones   ·   Estado: construida, falta la demo en `dev`

- **Historia** — Como persona que le puso un nombre largo a una carta, quiero que salga completo y legible, para no verlo cortado.
- **Entrega demostrable** — Un nombre que no cabe en un renglón a 8 puntos se parte en dos renglones, por un espacio, lo más parejo posible. Ninguna letra baja de 8 puntos, y solo se corta con «…» lo que no cabe ni en dos renglones (decisión 12). Aplica a las cartas con foto normal y a las cartas con IA.
- **Construido** — 2026-10-09. `fitCardName` (`src/services/cardCompose/layout.ts`) devuelve los renglones y el tamaño: un renglón a tamaño normal; si no cabe, un renglón más chico sin bajar de 8 puntos; si ni así, dos renglones a 8 puntos, partidos por el espacio que los deja más parejos; lo que tampoco cabe llena el primer renglón y corta el segundo con «…». Una sola palabra que no cabe se queda en un renglón, cortada. Los dos renglones se dibujan con la letra más chica para tapar lo menos posible de la foto (elección mía). `compose.ts` los dibuja de abajo hacia arriba. Pruebas en `tests/src/cardComposeLayout.test.ts`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Crea tres cartas: una llamada «El Gallo», otra con un nombre mediano que apenas no quepa a tamaño normal y otra con un nombre largo de varias palabras → descarga el PDF → la primera sale en un renglón a tamaño normal, la segunda en un renglón con la letra más chica, la tercera en dos renglones → ninguna termina en «…». Prueba además un nombre exagerado, de más de 30 letras → el segundo renglón debería terminar en «…».
- **Escenarios cubiertos**:
  - [x] Un nombre que cabe a tamaño normal no cambia. (Prueba automática.)
  - [x] Un nombre que cabe entre el tamaño normal y 8 puntos va en un renglón. (Prueba automática.)
  - [x] Un nombre que no cabe a 8 puntos se parte en dos renglones por un espacio, lo más parejo posible. (Prueba automática.)
  - [x] Un nombre que no cabe ni en dos renglones se corta con «…» al final del segundo. (Prueba automática.)
  - [x] Una sola palabra que no cabe se queda en un renglón, cortada con «…». (Prueba automática.)
  - [ ] Los dos renglones se leen bien y no tapan de más la foto. (Demo.)

### US A4 — La vista previa muestra las cartas igual que el PDF   ·   Estado: construida, falta la demo en `dev`

- **Historia** — Como persona que revisa sus tableros antes de descargar, quiero verlos como van a salir impresos, para no llevarme sorpresas en el PDF.
- **Entrega demostrable** — En la vista previa (C3), las miniaturas y el tablero ampliado (M9) muestran cada carta compuesta, igual que en el PDF, y ya no escriben el nombre debajo. Por compartir pieza, pasa lo mismo en los tableros de la lotería guardada (U2). `docs/diseno-mockups.md` quedó al día el 2026-10-09, con la confirmación de Carlos.
- **Construido** — 2026-10-09. `useComposedCard` (`src/hooks/useComposedCard.ts`) entrega la carta compuesta para una carta en pantalla; se apoya en `createComposedCardStore` (`src/services/cardCompose/composedCards.ts`), que compone cada carta una vez, la reutiliza entre tableros y la vuelve a componer si cambian su nombre o su foto; al salir de la pantalla se vacía. La lectura de la imagen guardada (copia local → Storage → la que trae la carta) salió de `PDFService.ts` a `src/services/cardImage.ts` para compartirla con el PDF. `BoardThumbnail` y `BoardCell` muestran la carta compuesta y, cuando la hay, ya no escriben el nombre aparte; mientras se compone o si falla, muestran la foto con su nombre, como antes. En pantalla la casilla conserva su orilla de siempre: el borde negro grueso es solo del PDF. Pruebas: `tests/src/composedCards.test.ts`.
- **Depende de** — US A1, A2 y A3.
- **Cómo se prueba (guion de demo)** — Crea una lotería con fotos normales y genera tableros → en la vista previa cada carta debería verse con su marco y su nombre sobre la foto → abre un tablero en grande → igual → descarga el PDF y compáralo con la pantalla: deberían coincidir. Abre una lotería guardada → sus tableros se ven igual; su lista de cartas no cambia.
- **Escenarios cubiertos**:
  - [x] Cada carta se compone una vez y se reutiliza entre tableros en pantalla. (Prueba automática.)
  - [x] Si cambia el nombre o la foto de una carta, se vuelve a componer. (Prueba automática.)
  - [x] Una carta que no se puede componer no rompe la pantalla y se puede reintentar. (Prueba automática.)
  - [ ] Mientras la carta se compone, o si no se puede componer, la casilla muestra la foto como hoy. (Demo.)
  - [ ] Miniaturas y tablero ampliado coinciden con el PDF, en teléfono y en escritorio. (Demo.)
  - [x] Las cartas de una lotería temática no reciben el diseño nuevo. (Revisión del 2026-10-09: las loterías temáticas no pasan por estas pantallas; su armado en administración usa otras piezas.)

### US A5 — Las cartas sueltas se ven como salen impresas   ·   Estado: construida, falta la demo en `dev`

Agregada el 2026-10-09 con la confirmación de Carlos (decisión 13).

- **Historia** — Como persona que arma su lotería, quiero ver cada carta como va a salir impresa desde que la subo, para no esperar al PDF para saber cómo queda.
- **Entrega demostrable** — En el editor de cartas (C1), en la lista de cartas de la lotería guardada (U2) y en la carta ampliada (M10), cada carta se muestra compuesta, con su marco y su nombre dentro de la imagen, y ya no se escribe el nombre debajo. Mientras una carta se convierte con IA se ve la foto, como antes. Las cartas de muestra de una lotería temática (P6) no cambian.
- **Construido** — 2026-10-09. `CardPreview` (C1), `CardPreviewModal` (M10) y el nuevo `SetCardThumb` (lista de U2, `src/components/SetView/`) usan `useComposedCard`. El almacén compone primero con la imagen que la pantalla ya muestra, si vive en el navegador, y solo si no sirve o es remota lee la copia guardada: así una carta recién subida o recién editada no sale con la foto anterior. `CardPreviewModal` recibe `finishedCard` para las muestras de loterías temáticas, que no se componen. En la lista de U2 la casilla de la carta pasó de cuadrada a 2:3, para que quepa la carta entera. La subida por lote no se tocó. Pruebas: `tests/src/composedCards.test.ts`.
- **Depende de** — US A4 (usa la misma pieza).
- **Cómo se prueba (guion de demo)** — En el editor de cartas sube una foto con su nombre → la carta debería aparecer con su marco crema y el nombre sobre la foto, sin el nombre debajo → cámbiale el nombre → la carta debería actualizarse → conviértela con IA → mientras se convierte se ve la foto con el aviso de siempre y, al terminar, la ilustración entera con el nombre encima. En el teléfono, abre la carta en grande desde su menú → se ve igual. Abre una lotería guardada → la lista de cartas muestra las cartas compuestas, completas → pulsa una → se ve en grande igual. Abre la ficha de una lotería temática y pulsa una carta de muestra → se ve como antes.
- **Escenarios cubiertos**:
  - [x] Una imagen que ya está en el navegador se compone tal cual, sin leer la copia guardada. (Prueba automática.)
  - [x] Si la imagen del navegador ya no sirve, se usa la copia guardada. (Prueba automática.)
  - [x] Si cambia el nombre o la foto de una carta, se vuelve a componer. (Prueba automática.)
  - [ ] En C1 la carta se ve compuesta y se actualiza al editarla, convertirla con IA o restaurarla. (Demo.)
  - [ ] En U2 la lista de cartas y la carta ampliada muestran la carta compuesta. (Demo.)
  - [ ] Las cartas de muestra de una lotería temática se ven como antes. (Demo.)
  - [ ] Los botones de cada carta en C1 (convertir, restaurar, borrar) siguen en su lugar y funcionan. (Demo.)

## Pendientes que salieron de aquí: features por escribir

Anotadas el 2026-10-09 a pedido de Carlos, para que no se olviden. Ninguna tiene archivo todavía; cada una se define con Carlos antes de construirla. Al crear el archivo de una, tacharla aquí y enlazarla.

- [ ] **Número de carta.** Lo que Carlos ya pidió en su diseño: cada carta lleva un número único dentro de su lotería, asignado solo (1, 2, 3…) en el orden en que se suben las fotos; el usuario puede editarlo y no se permiten repetidos; la misma carta lleva el mismo número en todos los tableros y en la baraja. Se dibuja en la esquina superior izquierda, sobre la foto, con la misma letra del nombre (unos 110 px en una carta de 1000 × 1500, a unos 35 px del marco); FEAT-29 deja ese lugar reservado. Es una regla de negocio nueva: toca base de datos, la pantalla de cartas (C1) y los tres documentos de la base de conocimiento. Por definir, entre otras cosas: qué pasa con los números al borrar o reordenar cartas, y qué número reciben las cartas de las loterías que ya existen.
- [ ] **Nombre y número pintados por la IA en las cartas convertidas.** Las cartas convertidas con IA deben traer su nombre y su número dentro de la ilustración, hechos por la IA (decisión 5). Cuando exista, esas cartas dejan de recibir el nombre encima que les pone la US A2. Toca la función que transforma las fotos (hoy la instrucción a la IA pide «sin texto, sin bordes») y, por usar la IA, hay que revisar si afecta el cobro de tokens. Depende de la feature del número. Por definir: qué pasa con las cartas ya convertidas, que no traen nombre ni número pintados.
- [x] ~~**El aspecto nuevo en las demás pantallas con cartas.**~~ Ya no hace falta otra feature: se hizo aquí, en la US A5 (decisión 13). Lo único que quedó igual es la subida de cartas por lote.
- [ ] **Límite de largo del nombre de la carta.** Elegido por Carlos el 2026-10-09 como solución de fondo para los nombres que no caben ni en dos renglones (decisión 12): que el sitio no deje guardar un nombre más largo de lo que cabe en la carta. Es una regla de negocio nueva: toca la pantalla de cartas (C1, también la subida por lote) y `contexto-negocio.md` §4, donde está la regla del nombre. Por definir: el límite exacto (a 8 puntos caben cerca de 14 letras por renglón, según la letra), si se mide en letras o en lo que de verdad ocupa, y qué pasa con las cartas ya guardadas que lo rebasan.
