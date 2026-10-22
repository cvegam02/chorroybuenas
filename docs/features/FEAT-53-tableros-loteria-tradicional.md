# FEAT-53 — Arma tus tableros (tableros personalizados de lotería tradicional)

**Estado:** definida con Carlos el 2026-10-22; base de conocimiento actualizada ese día. Las US A1 a A5 se construyeron el 2026-10-22, y ese día se aplicó la migración 059 en el Supabase de dev, con permiso de Carlos. Carlos las revisó en su servidor local el 2026-10-22. Se trabaja en `feature/loteria-tradicional`, creada el 2026-10-22 desde `dev`, y llega a `dev` con el PR de esa rama, abierto el 2026-10-22. Falta que Carlos la pruebe en `dev` y aplicar la 059 en producción, con su confirmación, antes de pasar a `main`.

**Contexto.** En México mucha gente cree que jugar con un tablero propio, armado con sus cartas de la suerte, da buena suerte. La idea es que armen esos tableros personalizados en el sitio, con las 54 cartas tradicionales, y bajen el PDF para jugar con su baraja de siempre. _(Se definió primero, el mismo día, como «Lotería tradicional» para generar muchos tableros al azar; Carlos le cambió el giro antes de publicarse: decisiones 20 a 25.)_

**Cambia reglas de negocio.** Agrega una sección nueva, gratis, con sus reglas (ver «Decisiones»). No toca la baraja base privada del administrador (FEAT-50).

**Derechos de las imágenes.** Se usan los dibujos tradicionales de la baraja. Claude señaló el riesgo de derechos de autor (los dibujos de Pasatiempos Gallo tienen dueño, aunque no se cobre) y que chocaba con la regla de FEAT-33 para «¿Qué es la lotería?»; Carlos decidió asumir el riesgo (decisión 13).

## Decisiones tomadas con el usuario

Decisiones de Carlos con Claude (2026-10-22):

1. **Las cartas son las 54 tradicionales** que Carlos aporta. _(Descartado: una baraja nueva hecha con IA; solo nombre y número sin imagen.)_
2. **Es gratis.** _(Descartados: venderla como lotería temática; unos tableros gratis y el resto con pago o tokens.)_
3. **Es una sección aparte del recorrido «Tus cartas → Tableros → Descarga»**, con su propio editor de tableros. _(Descartados: un atajo dentro de «Crear» que llena las cartas con las 54; una página que solo pide cuántos tableros.)_
4. **No pide cuenta**: sin sesión, el trabajo se guarda en el navegador; con sesión, además se guarda en «Mi cuenta». _(Descartados: solo sin cuenta; obligar a tener cuenta.)_
5. **Dos tamaños: Clásico 4 × 4 y Kids 3 × 3**, los mismos modos del sitio. _(Descartados: solo 4 × 4; varios tamaños como 5 × 5.)_
6. **Cambiar una carta:** en computadora, arrastrar una carta de la baraja a una casilla o entre casillas del mismo tablero; en celular (y también en computadora), tocar la casilla y elegir la carta. Una carta no se repite en un tablero: si se suelta una que ya está en él, las dos casillas se intercambian. _(Descartados: solo arrastrar; solo tocar.)_
7. **Acciones:** arriba, «Agregar un tablero al azar», «Agregar varios», «Tablero vacío» y «Revolver todos»; en cada tablero, «Revolver este tablero», «Borrar» y «Fijar» en cada carta. Al revolver, las cartas fijadas se quedan en su casilla. Dos tableros nunca salen idénticos al generarse; si la persona deja dos iguales a mano, se le avisa pero no se le impide.
8. **No se descarga con casillas vacías:** «Descargar PDF» avisa cuántos tableros están incompletos y ofrece «Llenar al azar las vacías», que respeta lo ya puesto. _(Descartados: casillas en blanco en el PDF; llenarlas sin preguntar al descargar.)_
9. **El PDF trae solo los tableros**, sin la baraja para recortar. _(Descartados: casilla para incluir las 54; siempre tableros y baraja.)_
10. **Máximo 50 tableros.** Sugeridos: 27 en Clásico y 18 en Kids, con la regla actual de §4. _(Descartados: 30; 100.)_
11. **En «Mi cuenta», sección aparte «Mis tableros tradicionales»**, con varios juegos guardados. _(Descartados: como lotería dentro de «Mis loterías»; guardar solo el último juego.)_
12. **Las 54 imágenes son archivos fijos del sitio**, en dos versiones (ligera para pantalla, buena calidad para el PDF). Cambiar una carta requiere un despliegue. _(Descartado: hacer pública la baraja base del panel de administración.)_

13. **Se usan los dibujos tradicionales, asumiendo el riesgo de derechos de autor.** Es una excepción a FEAT-33: «¿Qué es la lotería?» sigue sin mostrarlos. _(Descartados: dibujos propios de las 54 hechos con IA; tradicionales solo como provisionales en dev.)_
14. **La página se llama «Lotería tradicional»**, en `/loteria-tradicional` (P8), zona Pública, con un sexto enlace en la barra. Cambiar de modo con tableros armados pide confirmación, y al iniciar sesión se ofrece guardar en la cuenta lo armado sin sesión. Propuesto por Claude y aceptado por Carlos.
15. **Las imágenes salen de la baraja base de dev** (FEAT-50) y se copian al sitio como archivos fijos (decisión 12). Revisadas el 2026-10-22: la carta 1 de la baraja base es la portada de la marca («GALLO de DON CLEMENTE», con «MR»), así que **la carta 1 se sustituye por El Gallo propio del sitio** (`public/media/que-es-la-loteria/carta-01-el-gallo.jpg`), para no mostrar un logotipo registrado. La carta 17 (El Bandolón) está a 202 × 320 px y **Carlos sube una versión más grande** en «Baraja base» antes de copiarla. _(Descartado: conseguir otra carta 1 tradicional sin logotipo.)_ El mismo día Carlos la cambió por su propia versión de El Gallo (`el gallo.webp`, con «chorroybuenas.com.mx» arriba y sin el letrero de la marca); se recorta un 2.5 % por lado para igualar la proporción de las demás. Claude avisó que su escudo con monograma y «SEMPER PARAVIT» se parece al emblema de la carta de Don Clemente.

16. **Con sesión se guarda solo, sin botón «Guardar».** La página trabaja sobre un «juego actual» que se crea al agregar el primer tablero, con el nombre «Lotería tradicional · <fecha>», y cada cambio se guarda en la cuenta. Decidido con Carlos el 2026-10-22, al empezar US A5. _(Descartado: un botón «Guardar» explícito, distinto del resto del sitio y fácil de olvidar.)_
17. **Varios juegos:** arriba, el nombre del juego con lápiz para cambiarlo y «Nuevo juego», que empieza uno vacío sin borrar el anterior. Abrir un juego desde «Mis tableros tradicionales» regresa a esta página con ese juego.
18. **Al iniciar sesión con tableros hechos sin cuenta**, la página pregunta «¿Guardar estos N tableros en tu cuenta?» con «Guardar» (crea un juego nuevo con ellos) y «Descartar». _(Descartado: pasarlos solos a la cuenta, que podría llenarla de juegos no queridos.)_

19. **«Crear lotería» se vuelve un menú** con «Con tus fotos» y «Lotería tradicional», en lugar de un sexto enlace en la barra, que la amontonaba (Carlos, al revisar US A1). Sin sesión, en la barra ancha, ese menú lo abre el botón naranja «Crear mi lotería gratis ▾» y «Crear lotería» no se repite entre los enlaces; en el menú del celular salen las dos opciones; el pie de página suma «Lotería tradicional». _(Descartados: sacar «¿Qué es la lotería?» de la barra; pasar a la barra compacta desde 1400 px; quitar «Lotería tradicional» de la barra; sin sesión, quitar «Crear lotería» sin que el botón naranja abra el menú, porque dejaba la página sin entrada en pantalla ancha.)_

**Cambio de giro (2026-10-22, antes de publicarse).** Carlos aclaró que la sección no es para crear una lotería, sino tableros personalizados que dan buena suerte. Reemplazan a las decisiones 10 (en lo de la cantidad sugerida), 14 y 17 (en el nombre del juego nuevo), y a la 19 en los nombres del menú:

20. **Se llama «Arma tus tableros».** _(Descartados: «Tableros de la suerte», elegido primero y cambiado por Carlos; «Tableros personalizados»; «Lotería tradicional».)_ Pendiente aparte: U2 usa «Arma tus tableros» en otro sentido, en el aviso de una lotería con fotos.
21. **La página empieza con un tablero vacío**, para elegir las cartas a mano. Cada tablero tiene «Llenar al azar» (solo sus vacías) además de «Revolver» y «Borrar»; se agregan más con «Agregar tablero vacío» o «Agregar tablero al azar», hasta 50. Salen «Agregar varios» y la cantidad sugerida. Cambiar de modo sin cartas puestas no pregunta. _(Descartados: empezar con un tablero al azar; dejarla como estaba cambiando solo los textos.)_
22. **En el menú, el grupo se llama «Crear ▾»**, con «Tu lotería con fotos» («Para tu fiesta, con tus propias cartas») y «Arma tus tableros» («Elige tus cartas de la suerte»); el pie dice «Arma tus tableros». _(Descartados: un enlace propio en la barra; dejar «Crear lotería ▾».)_
23. **La dirección es `/arma-tus-tableros`** (y `/arma-tus-tableros/:id`), sin redirección desde `/loteria-tradicional`, porque nada se había publicado. _(Descartado: dejar `/loteria-tradicional`.)_
24. **En Mi cuenta, «Mis tableros de la suerte»; un juego nuevo se llama «Mis tableros · <fecha>»** y se crea al poner la primera carta (no al tener un tablero, porque la página ya empieza con uno vacío). _(Descartados: «Mis tableros armados»; «Mis tableros».)_
25. **Los textos** del encabezado y de buscadores hablan de tableros personalizados y de la suerte.

Base de conocimiento: propuesto con los cuatro puntos y confirmado por Carlos («sí, aplícalo») el 2026-10-22; se reescribieron §1, §19 (y los nombres en §11, §12 y §17) y se agregó una fila en §15 de `docs/contexto-negocio.md`, el caso 29 de `docs/casos-de-uso.md`, y P8, la barra, su menú de celular, el pie y U1 en `docs/diseno-mockups.md`.

**Base de conocimiento.** Propuesto con los cuatro puntos, confirmado por Carlos («si, aplicalo») y aplicado el 2026-10-22: `docs/contexto-negocio.md` §1, §15 (fila del 2026-10-22), §17 y §19 (nueva); `docs/casos-de-uso.md` bloque 7, CU 29; `docs/diseno-mockups.md` P8, barra de navegación y U1, marcados «por construir (FEAT-53)». Con la decisión 19, confirmado por Carlos («sí, aplica las dos»), se actualizaron en `docs/diseno-mockups.md` la barra de navegación, su menú de celular y el pie de página. El mismo día, también con confirmación de Carlos («si aplícalo»), se agregó en §19 la excepción de la carta 1 (decisión 15); y con US A5, confirmado por Carlos («sí, aplica las dos»), la entidad en §11, su permiso en §12 y en §19 el guardado automático, «Nuevo juego» y el aviso al iniciar sesión (decisiones 16 a 18).

## User Stories

### US A1 — Armar tableros: empezar, agregar, revolver y borrar   ·   Estado: hecha, revisada por Carlos en local; falta probarla en `dev`

- **Historia:** Como visitante, quiero armar mis propios tableros con las cartas tradicionales, para jugar con mi baraja de siempre.
- **Entrega demostrable:** La página «Arma tus tableros», que empieza con un tablero vacío; el modo (Clásico o Kids), «Agregar tablero vacío», «Agregar tablero al azar» y «Revolver todos»; cada tablero tiene «Llenar al azar» (si tiene vacías), «Revolver» y «Borrar». Lo armado sigue ahí al recargar. _(Antes del cambio de giro: «Agregar varios» con 27 sugeridos.)_
- **Construido:** El 2026-10-22. Primero se escribieron las pruebas, que fallaron sin el código: `tests/src/traditionalBoards.test.ts` (16 casos: sugeridos 27 y 18, sin cartas repetidas, sin tableros iguales, tope de 50, revolver uno o todos, borrar, rutas de las imágenes y lo guardado en el navegador, dañado o con más de 50).

  Imágenes: las 54 de la baraja base de dev, con El Gallo propio del sitio en la carta 1 (decisión 15), en `public/media/loteria-tradicional/pantalla/` (240 × 380, 1.2 MB en total) y `…/impresion/` (para el PDF de US A4; primero a 646 × 1024, y el 2026-10-22 bajadas a 450 × 713, calidad 82, 3.5 MB en total, porque un PDF de 3 tableros pesaba 5.3 MB: ver US A4). La carta 17 sigue siendo la pequeña, ampliada.

  Código:
  - Reglas en `src/utils/traditionalBoards.ts`; estado y guardado en el navegador en `src/hooks/useTraditionalBoards.ts` (se lee al montar, para que el prerender no falle).
  - Página en `src/components/TraditionalBoards/`: héroe, tipo de lotería (el mismo selector de C1), «Agregar varios» con − y + (empieza en el sugerido), «Agregar un tablero al azar», «Revolver todos», la cuenta «N tableros de 50 como máximo», estado vacío y la lista de hojas como en C3, cada una con «Revolver» y «Borrar». Cambiar de modo con tableros pide confirmación con la ventana de advertencia que ya existía.
  - Ruta `/loteria-tradicional`, título y descripción para buscadores (entra al prerender y al sitemap). Textos en español e inglés.
  - Cambio de giro (2026-10-22, decisiones 20 a 25): la página empieza con un tablero vacío (`startingTraditionalState`); «Llenar al azar» por tablero (`fillBoardEmptyCells`); el juego de la cuenta se crea al poner la primera carta (`hasPlacedCards`); salen «Agregar varios» y los sugeridos; ruta `/arma-tus-tableros`; nombres y textos nuevos. 5 casos más en `tests/src/traditionalBoards.test.ts` (y se quitó el de los sugeridos).
  - Imagen del héroe (2026-10-22, pedido de Carlos): `TraditionalHeroArt`, a partir de su diseño `hero-tableros.html`, con las cartas de la sección elegidas fijas (no al azar, para que la página prerenderizada y la del navegador coincidan), los colores del diseño pasados a tokens y una línea punteada naranja, con borde blanco, de la carta flotante a la casilla vacía de la tercera fila (Carlos notó que la flecha original, primero en blanco, no se veía ni llegaba a la casilla). A pedido de Carlos se dejó más chica: hasta 400 px de ancho (280 px en celular).
  - Inicio y buscadores (2026-10-22, pedido de Carlos, agregado a esta historia con su confirmación): tercera tarjeta en «Más formas de crear tu lotería» de P1 («Arma tus tableros de la suerte», con `TraditionalHeroArt`, «Gratis» y «Armar mis tableros →»); en P8, debajo de las herramientas, `TraditionalSeoContent` con tres pasos, un párrafo y seis preguntas frecuentes (con `FAQPage`); título y descripción para buscadores dirigidos a «generar / crear tableros de lotería» («Generador de tableros de lotería gratis para imprimir»). Textos revisados por Carlos antes de ponerlos. Pruebas en `tests/src/publicPagesPrerender.test.ts` (título y descripción, un solo `h1`, los textos, las seis preguntas en `FAQPage` y la tarjeta de Inicio). Guion: sin sesión, abre Inicio → en «Más formas de crear tu lotería» está «Arma tus tableros de la suerte» con «Gratis» → tócala y abre la página → baja: tres pasos, el párrafo y las seis preguntas, que se abren al tocarlas → la pestaña dice «Generador de tableros de lotería gratis para imprimir».
  - Entrada en la navegación (ajuste del 2026-10-22, decisiones 19 y 22; primero fue un sexto enlace): «Crear ▾» abre «Tu lotería con fotos» y «Arma tus tableros» (`NavGroup`, `CREATE_GROUP` y `barLinksFor` en `src/components/Navbar/`); sin sesión lo abre el botón naranja en la barra ancha; en el menú del celular van como dos renglones; enlace en el pie de página. Pruebas en `tests/src/navbar.test.ts` (cinco entradas, el grupo se marca en sus dos páginas y en un juego guardado, y sin sesión la barra ancha no repite «Crear lotería»).

  Typecheck, lint y las 1411 pruebas pasan.
- **Depende de:** Que Carlos suba la carta 17 más grande en la baraja base de dev (decisión 15). Se puede empezar antes con la actual y cambiarla después.
- **Cómo se prueba (guion de demo):** Sin sesión, abre el menú «Crear» (o el botón naranja) → «Arma tus tableros» → debería verse un tablero vacío de 4 × 4 → pulsa «Llenar al azar» y se llena → pulsa «Agregar tablero al azar» y aparece un segundo, distinto → revuelve uno y solo ese cambia → borra uno → recarga la página y siguen ahí → cambia a Kids, confirma, y vuelve a haber un tablero vacío de 3 × 3.
- **Escenarios cubiertos:** Ningún tablero repite carta; dos tableros generados nunca son idénticos; no deja pasar de 50; cambiar de modo con cartas puestas pide confirmación y sin cartas no; «Llenar al azar» solo toca las vacías de ese tablero.

### US A2 — Cambiar cartas arrastrando o tocando   ·   Estado: hecha, revisada por Carlos en local; falta probarla en `dev`

- **Historia:** Como visitante, quiero cambiar las cartas de un tablero, para dejarlo a mi gusto.
- **Entrega demostrable:** En computadora, la baraja de 54 a un lado; arrastrar una carta a una casilla la reemplaza y arrastrar entre casillas las intercambia. Tocar una casilla abre la baraja para elegir la carta (en celular es la única forma).
- **Construido:** El 2026-10-22. Primero se escribieron las pruebas, que fallaron sin el código: 6 casos más en `tests/src/traditionalBoards.test.ts` (reemplazar, intercambiar si la carta ya está, misma carta en su casilla, intercambiar dos casillas, valores fuera de rango y avisar tableros iguales aunque estén en otro orden).

  Código:
  - `placeCard`, `swapCells` y `duplicateBoardNumbers` en `src/utils/traditionalBoards.ts`.
  - Cada casilla es un botón: tocarla abre «Casilla N del tablero M» con las 54 cartas; la actual dice «Aquí» y las que ya están en el tablero, «En el tablero». En celular la ventana sale como hoja desde abajo; se cierra con Esc, con ✕ o tocando fuera.
  - En computadora (1024 px o más y con mouse), la baraja se queda pegada a la derecha mientras se baja por los tableros. Se arrastra una carta a una casilla, o una casilla a otra del mismo tablero; la casilla de destino se resalta en turquesa. Soltar sobre otro tablero no hace nada.
  - Un tablero igual a otro muestra «Es igual al tablero N» debajo de su hoja.
  - Textos en español e inglés.

  Typecheck, lint y las 1417 pruebas pasan.
- **Depende de:** US A1.
- **Cómo se prueba (guion de demo):** En computadora, arrastra «La Luna» de la baraja a una casilla → la reemplaza → arrastra una carta que ya está en ese tablero sobre otra casilla → las dos se intercambian → en el celular, toca una casilla → elige una carta → la casilla cambia.
- **Escenarios cubiertos:** Una carta repetida en el tablero se intercambia en vez de duplicarse; dejar dos tableros iguales muestra el aviso.

### US A3 — Tablero vacío y cartas fijas   ·   Estado: hecha, revisada por Carlos en local; falta probarla en `dev`

- **Historia:** Como visitante, quiero empezar un tablero desde cero y fijar cartas, para diseñar los tableros a mano sin perder lo que elegí al revolver.
- **Entrega demostrable:** «Tablero vacío» agrega un tablero sin cartas. Cada carta tiene «Fijar»; al revolver uno o todos, las fijadas no se mueven.
- **Construido:** El 2026-10-22. Primero se escribieron las pruebas, que fallaron sin el código: 10 casos más en `tests/src/traditionalBoards.test.ts` (tablero vacío y su tope, llenar y mover en casillas vacías, fijar y soltar, revolver uno o todos respetando fijadas y llenando vacías, todas fijas no cambia, la fijada reemplazada se suelta y la movida sigue fijada, vacíos no cuentan como iguales, y leer lo guardado con y sin fijadas).

  Código:
  - Los tableros admiten casillas vacías y guardan sus cartas fijadas (`fixed`, por número de carta: la fijada sigue fijada si se cambia de casilla y se suelta si se reemplaza). Lo guardado antes, sin fijadas, se sigue leyendo. `addEmptyBoard` y `toggleFixed` en `src/utils/traditionalBoards.ts`.
  - «Tablero vacío» junto a «Agregar un tablero al azar». Las casillas vacías se ven punteadas con un «+»; se llenan tocándolas o arrastrando cartas.
  - Para fijar: tocar la casilla y, en la ventana de la baraja, «Fijar El Gallo» (o «Quitar el fijado de…»). La carta fijada lleva marco turquesa y un candado.
  - Textos en español e inglés.

  Typecheck, lint y las 1427 pruebas pasan.
- **Depende de:** US A2.
- **Cómo se prueba (guion de demo):** Pulsa «Agregar tablero vacío» → aparece un tablero con casillas vacías → llena tres casillas tocándolas → fija dos cartas de otro tablero → pulsa «Revolver todos» → las fijadas siguen en su lugar y las demás cambiaron.
- **Escenarios cubiertos:** Revolver un tablero con casillas vacías las llena; fijar todas las cartas deja el tablero igual al revolver.

### US A4 — Descargar el PDF   ·   Estado: hecha, revisada por Carlos en local; falta probarla en `dev`

- **Historia:** Como visitante, quiero bajar mis tableros en PDF, para imprimirlos.
- **Entrega demostrable:** «Descargar PDF» genera un PDF solo con los tableros. Si hay casillas vacías, avisa «Faltan cartas en N tableros» y ofrece «Llenar al azar las vacías».
- **Construido:** El 2026-10-22. Primero se escribieron las pruebas, que fallaron sin el código: 5 casos más en `tests/src/traditionalBoards.test.ts` (qué tableros están incompletos, llenar las vacías respetando todo lo puesto, sin vacías no cambia nada, tableros para el PDF con nombre e imagen de impresión, y no armar el PDF con vacías) y `tests/src/pdfWithoutDeck.test.ts` (sin la baraja, una hoja por tablero; por defecto la baraja sigue).

  Código:
  - El PDF del sitio acepta no llevar la baraja para recortar (`includeDeck`, por defecto sí: lo demás no cambia).
  - `incompleteBoardNumbers`, `fillEmptyCells` y `traditionalPdfBoards` en `src/utils/traditionalBoards.ts`; `useTraditionalPdf` arma y baja el PDF con el mismo dibujo de tableros que C3 (logo, «TABLERO N», guías de corte, hoja carta). Las cartas van enteras, con su nombre ya dibujado, desde las imágenes de impresión; cada imagen se mete una sola vez aunque salga en muchos tableros. El archivo se llama `loteria-tradicional.pdf`.
  - «Descargar PDF», primer botón de la fila de acciones. Con casillas vacías avisa «Faltan cartas en N tableros» con sus números y ofrece «Llenar al azar las vacías» o «Las lleno yo»; al llenarlas no se descarga solo, para que la persona vea cómo quedaron y vuelva a pulsar. Mientras se arma sale «Preparando tu PDF…»; si falla, un aviso con el motivo.
  - Textos en español e inglés.

  Typecheck, lint y las 1434 pruebas pasan. No se probó en el navegador cuánto tarda con 50 tableros en un celular.

  Peso del PDF (2026-10-22): Carlos notó que 3 tableros pesaban 5.3 MB. El PDF mete cada carta distinta una sola vez, así que el peso crece con las cartas distintas (hasta 54), no con los tableros; cada imagen de impresión pesaba unos 139 KB a 646 × 1024 (~480 ppp en una casilla de Clásico). Se volvieron a exportar a 450 × 713, calidad 82 (~62 KB; ~340 ppp en Clásico y ~250 en Kids): unos 2.4 MB con 3 tableros y 3.3 MB como máximo. _(Descartado: 400 × 634, que bajaba a 1.8 MB pero se empezaba a notar en Kids.)_
- **Depende de:** US A3.
- **Cómo se prueba (guion de demo):** Con un tablero incompleto, pulsa «Descargar PDF» → sale el aviso → pulsa «Llenar al azar las vacías» → se llenan sin tocar lo ya puesto → descarga → el PDF trae los tableros y no trae la baraja.
- **Escenarios cubiertos:** Con 50 tableros el PDF se arma en un celular normal; las imágenes del PDF son las de buena calidad.

### US A5 — Guardar en «Mi cuenta»   ·   Estado: hecha, revisada por Carlos en local; falta probarla en `dev`

- **Historia:** Como usuario con sesión, quiero guardar mis tableros de la suerte, para volver a imprimirlos o editarlos.
- **Entrega demostrable:** Con sesión, lo armado se guarda en la cuenta. En «Mi cuenta», la sección «Mis tableros de la suerte» lista los juegos (nombre, modo, número de tableros) con abrir, cambiar nombre, descargar PDF y eliminar.
- **Construido:** El 2026-10-22, con las decisiones 16 a 18. Primero se escribieron las pruebas, que fallaron sin el código: `supabase/tests/059_traditional_games.test.sql` (19 aserciones: guardar y leer, varios juegos, nombre y tableros, fecha de cambio, modo 9 o 16, lista de hasta 50, nombre de 1 a 80 letras, no a nombre de otra persona, otra usuaria no ve ni cambia ni borra, sin sesión no hay acceso) y `tests/src/traditionalGames.test.ts` (leer una fila validando sus tableros, y la cola de guardado que guarda uno a la vez sin perder el último cambio ni atorarse si uno falla).

  Base: migración `059_traditional_games.sql`, tabla `traditional_games` (dueño, nombre, modo, tableros en JSON, fechas) con una sola regla de acceso: cada quien sus juegos. Revisado el Supabase de dev en solo lectura el 2026-10-22: no tenía la tabla. Aplicada en **dev** el 2026-10-22, con permiso de Carlos, por la Management API dentro de `begin; … commit;`; se comprobó que la regla de acceso existe, que sin sesión no se puede leer y que con sesión se puede guardar. Falta aplicarla en producción.

  Código:
  - `TraditionalGameRepository`; `useTraditionalStore` decide dónde viven los tableros: sin sesión en el navegador, con sesión en el juego abierto (`/loteria-tradicional/:id`). Un juego nuevo se crea al agregar el primer tablero, con el nombre «Lotería tradicional · 22 oct», y la dirección cambia a la del juego; cada cambio se guarda en orden.
  - Con sesión, arriba de las herramientas: el nombre del juego con lápiz (la misma ventana de «Cambiar nombre» de Mi cuenta), «Cada cambio se guarda en tu cuenta» (o el aviso si falló), «Nuevo juego» y «Mis juegos guardados →». Un juego que no existe o no es de la cuenta muestra un aviso con «Nuevo juego».
  - Al entrar con sesión y tableros del navegador: «¿Guardar estos N tableros en tu cuenta?» con «Guardar» (juego nuevo con ellos; se borran del navegador) y «Descartar».
  - Mi cuenta (U1): «Mis tableros tradicionales», junto a «Mis temáticas»: cada juego con nombre (abre el juego), «Clásico · 27 tableros · fecha», PDF (o «Faltan cartas», que abre el juego), cambiar nombre y eliminar con confirmación. Con sesión, el PDF lleva el nombre del juego como título y nombre de archivo.
  - Textos en español e inglés.

  Typecheck, lint, las 1441 pruebas y las 645 aserciones de base pasan.
- **Depende de:** US A4.
- **Cómo se prueba (guion de demo):** Con sesión, abre «Arma tus tableros» → pon una carta → el juego se llama «Mis tableros · <fecha>» y la dirección cambia a la del juego → abre «Mi cuenta» → el juego aparece en «Mis tableros de la suerte» → ábrelo y sigue igual → crea otro con «Nuevo juego» → aparecen los dos → elimina uno → cierra sesión, arma un tablero, vuelve a entrar y en la página sale «¿Guardar este tablero en tu cuenta?».
- **Escenarios cubiertos:** Un usuario no ve ni cambia los juegos de otro (se prueba primero en `supabase/tests/`); lo armado sin sesión se ofrece guardar al entrar.
