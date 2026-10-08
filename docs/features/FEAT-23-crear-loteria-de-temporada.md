# FEAT-23 — Crear una lotería de temporada con cartas ya terminadas

**Estado: 🟡 US A1, A2, A3 y A5 hechas y probadas por Carlos en local contra la base de pruebas (2026-10-07); a petición suya («hay que mandar esto a dev y prod») pasan a `dev` y a `main` sin demo previa en `dev.chorroybuenas.com.mx`. Falta US A4 (elegir las muestras): mientras tanto el paso 3 solo guarda el PDF y la ficha conserva sus muestras. Rama `feature/crear-loteria-temporada`. Sin migración ni edge function.**

**Contexto.** Hoy (FEAT-17) el administrador da de alta una lotería de temporada y le sube un PDF ya terminado, hecho fuera del sitio. Falta la herramienta para fabricar ese PDF dentro del sitio. Las cartas de temporada llegan ya diseñadas, con el nombre dibujado en la imagen: no hay que escribirles título ni pasarlas por la IA. Se suben las 54 de golpe, se generan los tableros y se arma el PDF, como en la lotería normal.

**Fuera de esta feature.** No cambia nada de lo que ve o paga el comprador (catálogo, detalle, cobro, descarga). No se guarda la lotería para editarla después. No usa la IA ni tokens. No toca la zona Crear de los usuarios. Subir un PDF hecho por fuera sigue funcionando igual.

**Clasificación:** pantalla nueva en la zona Administración, más un botón en la ficha de lotería de temporada (A1.7). No toca saldos, cobros ni pagos. No necesita migración ni edge function: usa el guardado de PDF y de muestras que ya existe y que ya está limitado a administradores. Estimado: 2 sesiones.

## Decisiones tomadas con el usuario (2026-10-07)

1. **La usa solo el administrador y el PDF se guarda directo en la ficha** de la lotería de temporada, sin descargarlo y volverlo a subir. _(Descartadas: que solo lo descargue y lo suba a mano; una página pública para cualquier usuario.)_
2. **La carta nunca se recorta.** Si la imagen no viene en proporción 2:3 se acomoda entera dentro de la carta, con una franja blanca, y la página marca cuáles son. _(Descartadas: rechazar las que no son 2:3; recortar al centro como en la lotería normal.)_
3. **54 cartas esperadas, con aviso.** La página muestra «N de 54» y avisa si faltan o sobran, pero deja continuar si alcanzan para generar tableros: el mismo mínimo de la lotería normal, 24 cartas en Clásico y 15 en Kids (`contexto-negocio.md` §4; precisado al construir US A2, por confirmar con Carlos). _(Descartadas: exigir exactamente 54; no mencionar el 54.)_
4. **Solo se guarda el PDF.** Las cartas y los tableros viven en el navegador mientras se trabaja; las imágenes limpias nunca quedan en el servidor. Para corregir una carta se vuelve a subir el lote y se genera otro PDF. _(Descartada: guardar cartas y tableros para editarlos otro día.)_
5. **Las cartas de muestra se eligen ahí mismo**, de entre las cartas cargadas; el sitio las reduce y les pone marca de agua como hoy. La portada se sigue subiendo aparte en la ficha. _(Descartadas: elegir también la portada ahí; dejar portada y muestras como hoy.)_
6. **Se entra desde la ficha**: junto a «Subir PDF» aparece «Crear el PDF con mis cartas». Al terminar se regresa a la ficha con el PDF, las muestras y los números de cartas y de tableros ya llenos. _(Descartada: un botón propio en la lista que cree la ficha.)_

7. **La ventana de la ficha se divide en pestañas** (2026-10-07, al probar US A3: «el modal quedó muy grande, hay que mejorarlo»): Datos, Precio y fechas, Archivos, con Cancelar y Guardar siempre visibles. Se anota como historia de esta feature (US A5). _(Descartadas: dejarla como un solo formulario más compacto; hacerla más ancha en dos columnas; una feature aparte.)_

**Propuesto al diseñar, por confirmar con Carlos:**

- El modo (Clásico 4×4 o Kids 3×3) se toma de la ficha; no se vuelve a preguntar.
- El número de tableros lo elige el administrador, con el mismo selector de la lotería normal.
- El PDF tiene lo mismo que el de la lotería normal: los tableros y después la baraja completa para recortar, sin nombres escritos por el sitio.
- Las cartas se guardan en el PDF con más detalle que en la lotería normal (hasta 1000 × 1500 px en vez de 512 × 768), porque es un producto que se vende y se imprime. El PDF sigue con el tope de 50 MB.
- Si la ficha ya tenía PDF o muestras, la página avisa que se van a reemplazar. Reemplazar el PDF de una lotería con ventas ya está permitido (§18).
- Si se cierra la pestaña a medio trabajo, se pierde lo cargado y hay que volver a subir el lote.
- La pantalla es de pantalla completa, fuera del panel con pestañas, en `/admin/temporada/:id/crear`, con un botón para volver a la ficha.

## Diseño

### Recorrido

Administración → De Temporada → ficha de una lotería → «Crear el PDF con mis cartas» →

1. **Cartas.** Un área para arrastrar o elegir muchas imágenes a la vez. Cada carta aparece completa, sin campo de nombre. Arriba, el contador «48 de 54». Las que no vienen en 2:3 llevan una marca y se listan en un aviso. Se puede quitar una carta o agregar más.
2. **Tableros.** Se elige cuántos y se generan; se pueden ver y volver a generar.
3. **Muestras y guardar.** Se marcan las cartas que serán muestras y se pulsa «Guardar en la ficha». El sitio arma el PDF, lo sube, guarda las muestras con marca de agua y llena los números de cartas y de tableros. Regresa a la ficha.

### Qué se reutiliza

- La generación de tableros y el PDF de la lotería normal (`useBoard`, `PDFService`), con una opción para no escribir nombres.
- El guardado de PDF y de muestras de FEAT-17 (`SeasonalRepository.uploadPdf`, `uploadPreview`, `savePreviews`, `createProtectedPreview`).
- Los componentes y colores del sistema de diseño; nada de colores sueltos.

### Qué es nuevo

- Preparar la imagen de una carta sin recortarla (acomodarla entera en 2:3) y detectar si su proporción es otra.
- La pantalla de tres pasos y el botón en la ficha.

## Cambios en la base de conocimiento

**Aplicados el 2026-10-07, con la confirmación de Carlos («aplica los cambios»).**

- `docs/contexto-negocio.md` §18, «Qué se vende» y «Vista previa»: el PDF puede subirse ya hecho o armarse en el sitio con las cartas del administrador; las muestras pueden elegirse de esas cartas.
- `docs/casos-de-uso.md`, caso 28 (Gestionar loterías de temporada): flujo alterno para armar el PDF en el sitio.
- `docs/diseno-mockups.md`: pantalla nueva en Administración y el botón nuevo en A1.7.

## US A1 — Subir las cartas por lote, completas y sin nombre   ·   Estado: ✅ hecha — Carlos la probó el 2026-10-07 («ya las pude subir, todo se ve bien»)

- **Historia** — Como administrador, quiero subir de una vez las cartas ya diseñadas de una lotería de temporada, para no cargarlas una por una ni escribirles nombre.
- **Entrega demostrable** — Desde la ficha se abre la página nueva; al soltar un lote de imágenes aparecen todas completas, con el contador «N de 54» y el aviso de las que no vienen en 2:3.
- **Construido** — 2026-10-07, en la rama `feature/crear-loteria-temporada`. Pantalla nueva en `/admin/temporada/:id/crear` (`src/components/AdminPanel/SeasonalBuilder/`), solo para administradores; botón «Crear el PDF con mis cartas» en la ficha, activo cuando la ficha ya está guardada; al volver, el panel abre en la pestaña De Temporada. Las reglas (proporción, acomodo sin recorte, conteo frente a 54, archivos aceptados) viven en `src/utils/seasonalCards.ts`, con 16 pruebas en `tests/src/seasonalCards.test.ts`. Las cartas se preparan a 1000 × 1500 px como máximo, sin agrandar las pequeñas, y se ordenan por nombre de archivo. Se aceptan PNG, JPG y WebP de hasta 15 MB. Textos solo en español, como el resto de Administración. Sin migración ni edge function. Corregido al construir US A2: el mínimo para continuar es el de la lotería normal (24 cartas en Clásico, 15 en Kids, `contexto-negocio.md` §4), no las casillas de un tablero.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Entra como administrador → Administración → De Temporada → abre la ficha de una lotería → pulsa «Crear el PDF con mis cartas» → debería abrirse una página a pantalla completa con el nombre de la lotería y el paso 1, «Cartas» → arrastra 54 imágenes → deberían verse las 54 completas, sin campo de nombre, y el contador «54 de 54» → agrega una imagen cuadrada → debería verse entera, con franjas blancas, marcada, y un aviso que la nombra → quítala → el aviso desaparece.
- **Escenarios cubiertos**:
  - [x] Una imagen 2:3 se conserva completa. (Prueba automática.)
  - [x] Una imagen de otra proporción se acomoda entera, sin recortar, y se marca. (Prueba automática.)
  - [x] El contador avisa si faltan o sobran respecto a 54, sin bloquear. (Prueba automática.)
  - [x] Con menos cartas que el mínimo para generar tableros (24 en Clásico, 15 en Kids) no se puede continuar. (Prueba automática.)
  - [ ] Archivo que no es imagen: se rechaza con aviso y lo demás se carga. (Demo.)
  - [ ] Un usuario que no es administrador no puede abrir la página. (Demo.)
  - [ ] Se ve bien en teléfono. (Demo.)

## US A2 — Generar los tableros   ·   Estado: ✅ hecha — Carlos la probó el 2026-10-07 («funcionan»)

- **Historia** — Como administrador, quiero generar los tableros con las cartas cargadas, para armar la lotería igual que una normal.
- **Entrega demostrable** — En el paso 2 se elige cuántos tableros, se generan en el modo de la ficha y se pueden ver y volver a generar.
- **Construido** — 2026-10-07, en la rama `feature/crear-loteria-temporada`. Paso 2 de la pantalla (`SeasonalBuilderBoards.tsx`): campo de cuántos tableros con la cantidad sugerida ya puesta, «Generar tableros» / «Volver a generar» y la lista de tableros con las cartas tal cual, sin nombres. La generación y las fórmulas de cantidad sugerida y máxima se movieron sin cambios a `src/utils/boardGeneration.ts`, que ahora usan también la lotería normal (`useBoard`, `BoardCountSelector`); 8 pruebas en `tests/src/boardGeneration.test.ts`. No se reutilizó `useBoard` tal cual porque borra y guarda los tableros de la lotería abierta del usuario. Los tableros viven solo en el navegador; si se cambian las cartas, se descartan. «Siguiente» lleva al paso 3, que por ahora solo dice que no está construido (US A3).
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Con las cartas cargadas → pulsa «Siguiente» → debería verse el paso 2, «Tableros», con el selector de cuántos → elige 10 y genera → deberían verse 10 tableros de 4×4 con tus cartas, sin nombres agregados → pulsa «Volver a generar» → deberían cambiar.
- **Escenarios cubiertos**:
  - [ ] Los tableros usan el modo de la ficha (4×4 o 3×3). (Demo.)
  - [x] Ningún tablero repite una carta y no salen dos tableros iguales. (Prueba automática.)
  - [x] No se pueden pedir más tableros distintos de los que permiten las cartas. (Prueba automática del máximo; demo del aviso.)
  - [ ] Los tableros no muestran nombres escritos por el sitio. (Demo.)

## US A3 — Armar el PDF y guardarlo en la ficha   ·   Estado: ✅ hecha — Carlos la probó el 2026-10-07 («sí funciona»)

- **Historia** — Como administrador, quiero que el PDF quede guardado en la ficha al terminar, para no descargarlo y volverlo a subir.
- **Entrega demostrable** — «Guardar en la ficha» arma el PDF (tableros y baraja, sin nombres), lo sube y llena el número de cartas y de tableros; se regresa a la ficha con todo puesto.
- **Construido** — 2026-10-07, en la rama `feature/crear-loteria-temporada`. Paso 3 (`SeasonalBuilderSave.tsx`): arma el PDF con el generador de la lotería normal, al que se le agregó la opción `finishedCards` (cartas enteras y sin título, en tableros y en la baraja; el acomodo vive en `src/services/pdf/layout.ts`); lo sube con `SeasonalRepository.uploadPdf`, guarda el número de cartas y de tableros con `withBuiltCounts` y regresa al panel con la ficha de esa lotería abierta. El archivo se llama como la lotería (`halloween-2026.pdf`). Las cartas entran al PDF con los mismos bytes con que se prepararon, una sola vez cada una. 6 pruebas en `tests/src/seasonalBuild.test.ts`. El aviso de reemplazo es un texto en el paso 3, no una ventana de confirmación, y no distingue si la lotería tiene ventas. Las muestras llegan con US A4. Sin migración ni edge function.
- **Depende de** — US A2.
- **Cómo se prueba (guion de demo)** — Con los tableros generados → pulsa «Siguiente» y luego «Guardar en la ficha» → debería verse el avance y después la ficha, con el PDF ya puesto y los números de cartas y de tableros llenos → descarga el PDF desde la ficha → deberían verse los tableros y después la baraja para recortar, con las cartas completas, nítidas y sin nombres encimados.
- **Escenarios cubiertos**:
  - [x] En el PDF una carta terminada cabe entera en su casilla, sin recorte. (Prueba automática del acomodo.)
  - [ ] El PDF no lleva nombres escritos por el sitio. (Demo: el dibujo del PDF no tiene prueba automática.)
  - [x] El número de cartas y de tableros de la ficha coincide con lo generado, y el resto de la ficha no cambia. (Prueba automática.)
  - [ ] Si la ficha ya tenía PDF, se avisa antes de reemplazarlo. (Demo.)
  - [ ] Si falla la subida, se avisa y no se pierde lo cargado. (Demo.)
  - [x] Un PDF de más de 50 MB se rechaza con aviso. (Regla ya probada en FEAT-17; aquí se aplica antes de subir.)

## US A4 — Elegir las cartas de muestra   ·   Estado: ⬜ por hacer

- **Historia** — Como administrador, quiero marcar las muestras entre las cartas que ya subí, para no subirlas otra vez en la ficha.
- **Entrega demostrable** — En el paso 3 se marcan cartas como muestra; al guardar quedan en la ficha, reducidas y con marca de agua.
- **Construido** — —
- **Depende de** — US A3.
- **Cómo se prueba (guion de demo)** — En el paso 3 → marca cinco cartas como muestra → pulsa «Guardar en la ficha» → en la ficha deberían verse esas cinco muestras con marca de agua → abre la lotería en «De Temporada» → deberían verse las mismas cinco.
- **Escenarios cubiertos**:
  - [ ] Las muestras guardadas miden como máximo 600 px por lado y llevan marca de agua. (Ya cubierto por FEAT-17; demo.)
  - [ ] Sin muestras marcadas, las muestras que ya tenía la ficha se conservan. (Demo.)
  - [ ] Con muestras marcadas, se avisa que reemplazan a las anteriores. (Demo.)

## US A5 — La ventana de la ficha en pestañas   ·   Estado: ✅ hecha — Carlos la probó el 2026-10-07 («me gusta»)

- **Historia** — Como administrador, quiero que la ventana de la ficha no ocupe toda la pantalla ni obligue a recorrerla, para encontrar rápido lo que busco.
- **Entrega demostrable** — La ventana de «Nueva lotería» / «Editar lotería» tiene tres pestañas (Datos, Precio y fechas, Archivos), una altura fija y los botones Cancelar y Guardar siempre a la vista.
- **Construido** — 2026-10-07, en la rama `feature/crear-loteria-temporada`. Cambios en `AdminSeasonalLoteriaForm.tsx` y `AdminSeasonal.css`: los tres grupos del formulario pasan a ser pestañas (los campos siguen todos en el mismo formulario, así que se guarda todo junto como antes); altura de 600 px como máximo; pie fijo; descripciones de 3 renglones. Si al guardar hay un error en otra pestaña, se abre esa pestaña y las que tienen errores llevan una marca (`tabsWithErrors` en `src/utils/seasonalLoteria.ts`, 3 pruebas en `tests/src/seasonalLoteria.test.ts`). Al volver de armar el PDF, la ficha abre en Archivos. Las pestañas se recorren con las flechas del teclado.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Administración → De Temporada → abre la ficha de una lotería → debería verse una ventana más baja, con tres pestañas arriba y Cancelar y Guardar abajo → pulsa «Precio y fechas» y «Archivos» → la ventana no cambia de tamaño y lo escrito en las otras pestañas se conserva → en «Datos» borra el nombre, ve a «Archivos» y pulsa Guardar → debería regresarte a «Datos», con el aviso en el campo y una marca en esa pestaña.
- **Escenarios cubiertos**:
  - [x] Un error de un campo marca la pestaña a la que pertenece. (Prueba automática.)
  - [ ] Cambiar de pestaña no pierde lo escrito. (Demo.)
  - [ ] Guardar con un error en otra pestaña lleva a esa pestaña. (Demo.)
  - [ ] Cancelar y Guardar se ven siempre, también en teléfono. (Demo.)
  - [ ] Al volver de armar el PDF, la ficha abre en Archivos. (Demo.)
