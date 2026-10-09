# FEAT-25 — El PDF no sale con cartas dañadas

**Estado: en curso. Las cuatro historias (US A1 a US A4) construidas el 2026-10-09 en la rama `feature/pdf-sin-cartas-danadas` (creada desde `dev`), por probar por Carlos.**

**Contexto.** Carlos pidió el 2026-10-09 revisar la generación del PDF. La revisión (solo lectura de `src/services/PDFService.ts` y `src/services/pdf/`) encontró catorce puntos, que Carlos repartió en cuatro features. Esta es la primera: los cuatro errores.

1. Una carta que no se puede dibujar sale como un recuadro gris con la palabra «Error» (o como un hueco en blanco, si no tiene imagen), y el PDF se descarga como si todo estuviera bien.
2. Un nombre de carta con emojis o letras de otro alfabeto rompe esa carta: la tipografía del PDF no puede dibujarlos y la carta cae en el recuadro gris del punto 1.
3. En los tableros se ve una franja color crema entre la foto y el nombre, porque el fondo blanco del nombre mide menos que el espacio reservado para él.
4. La misma imagen se lee, o se descarga de Supabase, una vez por cada tablero en que aparece.

**Fuera de esta feature.** Los otros diez puntos de la revisión van en tres features aparte, con sus historias en borrador y decisiones por tomar: impresión y recorte ([FEAT-26](FEAT-26-pdf-impresion-y-recorte.md): hoja A4 en vez de carta, guías de corte, nombres largos, centrado de la baraja), velocidad y peso del archivo ([FEAT-27](FEAT-27-pdf-velocidad-y-peso.md)) y detalles menores ([FEAT-28](FEAT-28-pdf-detalles-menores.md)). Sobre la hoja: `contexto-negocio.md` §5 ya dice que los tableros van en tamaño carta y el código usa A4; se corrige en la feature de impresión, no aquí. No cambia el diseño del PDF ni el de ninguna pantalla, salvo los avisos de error que se describen abajo.

**Clasificación:** corrección de errores en la generación del PDF (zonas Crear, Mi cuenta y Administración) y una regla nueva para el nombre de la carta (pantalla C1). No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones. Estimado: 2 sesiones.

## Decisiones tomadas con el usuario (2026-10-09)

1. **Si una o más cartas no se pueden dibujar, el PDF no se descarga.** Aparece un aviso con las cartas que fallaron y la persona puede reintentar. Vale también en administración: nunca se guarda para venta un PDF incompleto. _(Descartadas: avisar y dejar elegir entre reintentar o descargar de todos modos; descargar como hoy y avisar después.)_
2. **El nombre de la carta no admite emojis ni letras de otros alfabetos.** Solo letras (con acentos, ñ y ü), números, espacios y signos de puntuación comunes. El sitio lo rechaza al escribirlo, igual que el título repetido. Es una regla de negocio nueva, confirmada por Carlos y anotada en `contexto-negocio.md` §4 y §15 y en los casos de uso 6 y 7. _(Descartadas: quitarlos solo en el PDF y dejar el nombre intacto en el sitio; quitarlos en el PDF y avisar con una nota en el editor.)_
3. **La regla del nombre se valida solo en el navegador**, sin cambio en la base. Las cartas ya guardadas con emojis no se tocan: el PDF limpia el nombre al dibujarlo, y al editar una de esas cartas el sitio pide corregirlo.
4. **Los puntos 3 y 4 (franja y lectura repetida) entran como historias propias**, sin decisión de negocio.
5. **Rama `feature/pdf-sin-cartas-danadas`**, creada desde `dev`.

**Propuesto al diseñar y confirmado por Carlos el 2026-10-09 («confirmo las cinco»):**

- El aviso de cartas fallidas aparece en el mismo lugar y con el mismo estilo en que cada pantalla ya muestra sus errores, y sustituye a la ventana emergente del navegador que hoy usa la vista previa (C3). Dice cuántas cartas fallaron y sus nombres; para reintentar se vuelve a pulsar el botón de descargar (o de guardar, en administración).
- Texto del aviso: «No se pudo crear el PDF: N cartas no cargaron (nombre, nombre…). Revisa tu conexión e inténtalo de nuevo.», en español e inglés.
- Texto del rechazo del nombre: «El nombre no puede llevar emojis ni letras de otros alfabetos.», en español e inglés, bajo el campo, con el mismo estilo que el aviso de título repetido.
- Los signos admitidos son los que la tipografía del PDF sabe dibujar: punto, coma, punto y coma, dos puntos, admiración e interrogación de apertura y cierre, comillas, apóstrofo, guion, paréntesis, &, /, #, % y +.
- En las loterías temáticas las cartas no llevan nombre visible; en el aviso se identifican por el nombre de su archivo.

## Grupo A — Errores del PDF

### US A1 — Si una carta falla, el PDF no se descarga y el sitio avisa cuáles fueron   ·   Estado: construida el 2026-10-09, por probar por Carlos

- **Historia** — Como persona que descarga su lotería, quiero que el sitio me avise si alguna carta no se pudo poner en el PDF, para no imprimir una lotería con cartas dañadas o faltantes.
- **Entrega demostrable** — Cuando alguna carta no se puede dibujar (su imagen no cargó o no tiene imagen), no se descarga ningún archivo y aparece un aviso con el número y los nombres de las cartas que fallaron. Al volver a pulsar el botón se intenta de nuevo. En administración, el PDF no se guarda en la ficha. Desaparecen el recuadro gris con «Error» y el hueco en blanco.
- **Construido** — 2026-10-09, en la rama `feature/pdf-sin-cartas-danadas`. Al dibujar, cada carta avisa si no se pudo poner (sin imagen, o la imagen no cargó); la generación junta las que fallaron —cada una una sola vez, aunque esté en varios tableros— y, si hay alguna, no entrega PDF (`src/services/pdf/failedCards.ts`). El aviso sale sobre los botones, en la vista previa (C3) y en la lotería guardada (U2), con el recuadro de avisos que U2 ya usaba; en administración, en el renglón rojo de errores del paso de guardar. En C3 y U2 sustituye a la ventana emergente del navegador, también para cualquier otro fallo al crear el PDF. Si fallan más de 8 cartas, el aviso da el total y nombra las primeras 8, seguidas de «…». Pruebas automáticas en `tests/src/pdfFailedCards.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Inicia sesión en una ventana privada (para que las imágenes no estén guardadas en ese navegador), abre una lotería guardada, corta la conexión y pulsa descargar el PDF → no debería descargarse nada y debería aparecer el aviso con las cartas que no cargaron → vuelve a conectar y pulsa descargar otra vez → debería bajar el PDF completo. Luego, con conexión, descarga desde la vista previa del recorrido de crear → debería bajar igual que siempre.
- **Escenarios cubiertos**:
  - [x] La generación reporta qué cartas no se pudieron dibujar, en vez de dibujar el recuadro gris. (Prueba automática.)
  - [x] Una carta sin imagen cuenta como fallida. (Prueba automática.)
  - [ ] Con una carta fallida no se descarga nada y aparece el aviso, en la vista previa (C3) y en la lotería guardada (U2). (Demo.)
  - [ ] Al reintentar con conexión, el PDF baja completo. (Demo.)
  - [ ] En administración (A1.7a), con una carta fallida no se guarda el PDF en la ficha y aparece el aviso. (Demo.)
  - [ ] Sin fallos, la descarga funciona igual que antes. (Demo.)

### US A2 — El nombre de la carta no admite emojis   ·   Estado: construida el 2026-10-09, por probar por Carlos

- **Historia** — Como persona que arma su lotería, quiero que el sitio me diga al momento si el nombre de una carta lleva algo que no se puede imprimir, para corregirlo antes de llegar al PDF.
- **Entrega demostrable** — En la pantalla de cartas (C1), al agregar una carta, al subir varias y al editar una, un nombre con emojis o letras de otro alfabeto muestra el aviso bajo el campo y no deja guardar. Las cartas que ya tenían emojis salen en el PDF con el nombre limpio (sin esos caracteres) en vez de dañadas.
- **Construido** — 2026-10-09, en la rama `feature/pdf-sin-cartas-danadas`. La regla vive en `src/utils/cardTitle.ts`. El aviso sale bajo el campo del nombre, junto al de título repetido, al agregar una carta, al subir varias y al editar; mientras está a la vista, el botón de guardar (o de siguiente) queda apagado. Al editar una carta guardada antes con emojis, el aviso aparece desde que se abre. El PDF dibuja el nombre sin lo que no admite la regla. Además de los signos confirmados se admiten las variantes que escriben solos los teclados —comillas y apóstrofo curvos, comillas angulares y rayas— y las letras latinas con otros acentos (à, ç, ö): la tipografía del PDF las dibuja todas. Pruebas automáticas en `tests/src/cardTitle.test.ts`, incluida una que dibuja con la tipografía del PDF cada carácter admitido.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En Cartas, agrega una carta y escribe «Abuelita ❤️» como nombre → debería aparecer el aviso en rojo bajo el campo y el botón de guardar no debería funcionar → borra el corazón → el aviso desaparece y la carta se guarda. Prueba «El Niño», «Ñoño» y «¡Lotería!» → deberían aceptarse. Repite lo del emoji al subir varias cartas a la vez y al editar el nombre de una carta que ya existe → mismo aviso.
- **Escenarios cubiertos**:
  - [x] Un nombre con emojis o letras de otro alfabeto se reconoce como no válido; uno con acentos, ñ, ü, números y signos comunes, como válido. (Prueba automática.)
  - [x] Para el PDF, el nombre se limpia de lo que no se puede dibujar; si queda vacío, la carta sale sin nombre. (Prueba automática.)
  - [ ] El aviso aparece y no deja guardar al agregar una carta, al subir varias y al editar. (Demo.)
  - [ ] Una carta guardada antes con emojis sale en el PDF con el nombre limpio. (Demo.)
  - [x] Al cumplirse, la regla se retira de `contexto-negocio.md` §17. (Retirada el 2026-10-09, con la confirmación de Carlos.)

### US A3 — Sin franja crema entre la foto y el nombre   ·   Estado: construida el 2026-10-09, por probar por Carlos

- **Historia** — Como persona que imprime sus tableros, quiero que cada carta se vea limpia, sin una raya de otro color entre la foto y el nombre.
- **Entrega demostrable** — En los tableros del PDF, el fondo blanco del nombre llega hasta donde termina la foto, también en las cartas de nombre largo (que usan letra más chica).
- **Construido** — 2026-10-09, en la rama `feature/pdf-sin-cartas-danadas`. El fondo blanco del nombre mide ahora lo mismo que el espacio reservado para el nombre, con cualquier tamaño de letra. Como la franja ya no se encoge con los nombres largos, el nombre se centra a lo alto dentro de ella (antes iba pegado abajo): en una carta normal queda unos 3 puntos —cerca de 1 mm— más arriba que antes. Aplica a los tableros y a la baraja. Pruebas automáticas en `tests/src/seasonalBuild.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Arma una lotería en la que una carta tenga un nombre muy largo → descarga el PDF → abre un tablero y acerca la vista a la unión entre la foto y el nombre, en una carta de nombre corto y en la de nombre largo → debería verse blanco continuo, sin franja crema.
- **Escenarios cubiertos**:
  - [x] El fondo del nombre mide lo mismo que el espacio reservado para el nombre, sea cual sea el tamaño de letra, y el nombre queda centrado en él. (Prueba automática de las medidas; que el fondo las use se comprueba en la demo.)
  - [ ] En el PDF no se ve la franja, en tableros de 4 × 4 y de 3 × 3. (Demo.)

### US A4 — Cada imagen se lee una sola vez por PDF   ·   Estado: construida el 2026-10-09, por probar por Carlos

- **Historia** — Como persona que descarga una lotería con muchos tableros, quiero que el PDF no tarde de más ni gaste datos de más por pedir la misma imagen varias veces.
- **Entrega demostrable** — Al generar un PDF, la imagen de cada carta se lee (o se descarga) una sola vez, aunque la carta aparezca en varios tableros y en la baraja. El PDF resultante es idéntico al de antes.
- **Construido** — 2026-10-09, en la rama `feature/pdf-sin-cartas-danadas`. Las peticiones de una misma carta comparten una sola lectura (`src/services/pdf/loadOnce.ts`); si esa lectura falla, no se queda guardada. Pruebas automáticas en `tests/src/pdfLoadOnce.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — A simple vista no cambia nada, así que lo demuestra la prueba automática. Para comprobar que nada se rompió: descarga un PDF con 10 tableros → debería bajar completo, con todas las cartas en su lugar, igual que antes.
- **Escenarios cubiertos**:
  - [x] Una carta que aparece en varios tableros se lee una sola vez, también cuando las peticiones salen al mismo tiempo. (Prueba automática.)
  - [x] Si la lectura de una imagen falla, el fallo no se queda guardado: al reintentar se vuelve a pedir. (Prueba automática.)
  - [ ] El PDF con muchos tableros sale completo. (Demo.)
