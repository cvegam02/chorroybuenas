# FEAT-67 — Fondo de los tableros (U2)

**Estado:** US A1, A2, A4 y A5 construidas y probadas por Carlos en local (contra la base de dev, en computadora y teléfono) el 2026-11-21, y llevadas a `dev` con el PR de `feature/fondo-tableros` a `dev` del 2026-11-21; falta que Carlos las pruebe en `dev.chorroybuenas.com.mx`. A3 por hacer. Rama `feature/fondo-tableros` (creada el 2026-11-21 desde `dev`). Migraciones 077 a 080 aplicadas en Supabase dev el 2026-11-21; producción todavía no.

**Contexto.** Hoy todos los tableros del PDF llevan el mismo fondo crema detrás del encabezado (logo y «TABLERO N») y de las cartas (`CUT_AREA_BLEED_PT` en `src/services/pdf/constants.ts`). Carlos propuso que se pueda elegir el fondo.

**Sí cambia reglas de negocio** (`docs/contexto-negocio.md` §4) **y el índice de pantallas** (`docs/diseno-mockups.md`: U2, una ventana nueva y una pestaña de Administración). Carlos confirmó los cambios el 2026-11-21 y quedaron aplicados ese día: §4, §11, §15 y §17 de `contexto-negocio.md`, y U2 y la ventana nueva M22 en `diseno-mockups.md`. El 2026-11-21 también se aplicaron la posición del logo (A4), la pestaña «Fondos» de Administración (A1.8, §10) y el color propio (A5), este último en §4, §15 y M22.

## Decisiones tomadas con el usuario

Todas el 2026-11-21, con Carlos.

1. **Tipos de fondo: un catálogo de fondos ya hechos y una imagen propia, los dos gratis.** Se descartó por ahora el fondo hecho con IA pagado con tokens.
2. **Un fondo para toda la lotería**, que llevan todos sus tableros. Se descartaron un fondo por tablero y un fondo general con excepciones.
3. **Solo en las loterías propias y solo con sesión.** No aplica a «Arma tus tableros» (§19) ni a las loterías temáticas, y tampoco al visitante sin cuenta.
4. **Se elige con un botón «Fondo» en la sección «Tableros» de U2**, junto a «Revolver tableros» y «Borrar tableros». Se descartó ponerlo en «Ajustes» (M20).
5. **Las cartas no cambian de tamaño:** el fondo sustituye al crema de siempre, en el mismo espacio (encabezado, orillas y la separación de 1.5 mm entre cartas). Se descartó agrandar el marco y la separación entre cartas.
6. **Catálogo: fondos fijos que vienen en el sitio, más los que agregue el administrador** (por ejemplo, de temporada). El crema sigue siendo el fondo de entrada.
7. **Imagen propia: interruptor «Aclarar la imagen», encendido de entrada**, que le pone encima un velo blanco semitransparente para que el logo y «TABLERO N» se lean. Se descartaron el velo siempre puesto y la foto sin velo.
8. **Si el administrador quita un fondo del catálogo, las loterías que ya lo tenían lo conservan:** ya no se le ofrece a nadie más, pero se sigue imprimiendo en esas loterías. Se descartaron regresarlas al crema y no dejar quitarlo mientras esté en uso.
9. **El fondo se ve en el PDF y en los tableros en pantalla** (miniaturas de «Tableros» en U2 y su vista previa). Se descartó mostrarlo solo en el PDF.
10. **La imagen propia es de la lotería:** a lo más una por lotería; si se sube otra, reemplaza a la anterior, y al borrar la lotería se borra también la imagen. Se descartó «Mis fondos», reutilizable entre loterías.
11. **Vista previa fiel al elegir:** al tocar un fondo (o subir una imagen, o mover «Aclarar la imagen»), se ve al momento un tablero real de la lotería tal cual saldría impreso con ese fondo, en computadora y en teléfono, para probar y cambiar antes de guardar. Pedido por Carlos el 2026-11-21. Acomodo confirmado por Carlos el 2026-11-21: en computadora, la vista previa a la izquierda y las opciones a la derecha; en teléfono, la vista previa arriba, las opciones debajo y «Guardar» fijo abajo.
12. **Posición del logo: izquierda, centro o derecha**, una para toda la lotería, elegida en la misma ventana «Fondo» y visible en la vista previa. Empieza en «centro» (como hoy). Solo se mueve el logo; «TABLERO N» se queda centrado abajo, entre sus dos líneas, y el encabezado no cambia de alto. Se descartó poner logo y texto lado a lado en un renglón. Pedido por Carlos el 2026-11-21; va como US A4.
13. **Los fondos del administrador van en una pestaña nueva «Fondos»** del panel (A1.8), después de Temáticas. Se descartó ponerlos dentro de «Temáticas».
14. **La imagen propia acepta lo mismo que las cartas:** PNG, JPEG o WebP de hasta 5 MB (§5). Sin reglas nuevas.
15. **Catálogo fijo (A1), aprobado por Carlos el 2026-11-21:** colores lisos claros de la paleta —crema (el de siempre y el de entrada), rosa mexicano claro, azul cielo, lila, amarillo maíz y turquesa claro— y tres patrones suaves sobre crema, dibujados con figuras en el sitio para que salgan nítidos: papel picado, talavera y greca.
16. **Color propio con selector de color (US A5).** En M22, al final del catálogo, «Tu color» abre un selector de color y la vista previa cambia al moverlo. El color se usa tal cual; si es oscuro —el título «TABLERO N» (casi negro) no alcanza un contraste de 4.5 a 1 sobre él—, sale el aviso «Con un color oscuro, el logo y el título pueden no leerse y se gasta más tinta», sin impedir guardarlo. Se guarda en la misma columna como `color-rrggbb`. Pedido por Carlos el 2026-11-21; se descartaron aclarar el color solo y cambiar el texto a blanco.
17. **M22 en cuatro pestañas, en computadora y en teléfono:** «Catálogo», «Color», «Imagen» y «Logo», una a la vez; abre en la del fondo guardado. «Tu color» sale del catálogo a su pestaña. Pedido por Carlos el 2026-11-21, porque en teléfono se amontonaba todo y con imagen sobraban los colores; se descartaron las secciones que se abren y se cierran, y las pestañas solo en teléfono. Aplicado en `diseno-mockups.md` (M22) ese día, con su confirmación. Ese día también se arregló «Aclarar la imagen», que en teléfono no respondía al tocarlo: la casilla ahora cubre todo el renglón.
18. **«TABLERO N» también se mueve, por su lado (cambia la decisión 12).** Izquierda, centro o derecha, aparte del logo; empieza en centro. A los lados se alinea con la orilla de las cartas y lleva una sola línea, del lado libre. La pestaña «Logo» de M22 pasa a «Encabezado», con una barra para el logo y otra para el título. Pedido por Carlos el 2026-11-21; se descartó que logo y título se movieran juntos con un solo control. Columna `board_title_position` (migración 080). Aplicado en `contexto-negocio.md` (§4, §11 y §15) y en `diseno-mockups.md` (M22) el 2026-11-21, con su confirmación.

## US A1 — Elegir un fondo del catálogo fijo   ·   Estado: hecha, probada en local (2026-11-21); en `dev`

- **Historia** — Como dueño de una lotería, quiero elegir el fondo de mis tableros entre varios ya hechos, para que mi lotería se vea a mi gusto.
- **Entrega demostrable** — En U2, «Tableros» trae «Fondo»; abre una ventana con el catálogo fijo (crema y otros 5 a 7, entre colores de la paleta y patrones mexicanos claros) y la vista previa del tablero 1 de la lotería tal cual se imprime, que cambia al momento con cada fondo que se toca (decisión 11); al guardar, las miniaturas y el PDF lo llevan. Cerrar sin guardar deja el fondo anterior.
- **Construido:** 2026-11-21. Catálogo y patrones en `src/utils/boardBackgrounds.ts` (cada patrón son figuras SVG medidas en puntos, las mismas para el PDF y la pantalla). PDF: `drawBoardBackground` (`src/services/pdf/background.ts`) sustituye al rectángulo crema en `drawBoardOnPage`; `generatePDF` recibe `boardBackground` y lo pasan U2 (`SetView`) y Mi cuenta (`setPdf.ts`). Base: columna `loteria_sets.board_background` (migración 077, `'crema'` de entrada, solo se limita la forma del id para dejar lugar a A3). Pantalla: `BoardBackgroundLayer` (una sola imagen SVG por fondo, armada una vez y reusada en todas las miniaturas; antes eran cientos de figuras por tablero y el selector de color iba lento, 2026-11-21) dibuja el fondo detrás de las miniaturas (`BoardThumbnail`) y del tablero grande (`BoardModal`, con un margen alrededor de las cartas); los visitantes no lo pasan y se ven como antes. M22: `SetBoardBackgroundDialog`, con `BoardSheetPreview`, que dibuja el tablero 1 con las medidas de su página del PDF (`src/services/pdf/sheetGeometry.ts`): fondo, línea de corte, logo, «TABLERO 1» en Arvo y cartas compuestas. `AuthDialog` suma la variante `wide`. Pruebas: `tests/src/boardBackgrounds.test.ts` y `supabase/tests/077_board_background.test.sql`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En dev, abre una lotería con tableros → en «Tableros», toca «Fondo» → elige uno que no sea el crema → la vista previa debería cambiar → guarda → las miniaturas deberían llevar el fondo → descarga el PDF → todos los tableros deberían tenerlo, con las cartas del mismo tamaño que antes → recarga la página → el fondo debería seguir elegido.
- **Escenarios cubiertos**:
  - [x] La vista previa es igual al tablero 1 del PDF (mismas cartas, tamaños, logo y «TABLERO 1») y cambia al tocar cada fondo, sin guardar. (Probado por Carlos en local, contra la base de dev, el 2026-11-21.)
  - [x] Cerrar la ventana sin guardar no cambia el fondo. (Probado por Carlos en local, contra la base de dev, el 2026-11-21.)
  - [x] En teléfono, la vista previa y el botón «Guardar» se ven sin tener que bajar hasta el final. (Probado por Carlos el 2026-11-21.)
  - [x] Una lotería sin fondo elegido sale con el crema, igual que hoy. (Prueba automática: mismo color; la base empieza en `crema`.)
  - [x] El fondo elegido se guarda en la lotería y vale para todos sus tableros. (Prueba de base 077; el PDF usa uno para todas las páginas.)
  - [x] Revolver o volver a armar los tableros no cambia el fondo. (Revisión: el fondo vive en la lotería, no en los tableros.)
  - [x] El logo y «TABLERO N» se leen con cada fondo del catálogo. (Probado por Carlos en local, contra la base de dev, el 2026-11-21.)
  - [x] «Arma tus tableros» y las temáticas no cambian. (Revisión: no pasan fondo y salen con el crema.)
  - [x] Se ve bien en computadora y en teléfono. (Probado por Carlos el 2026-11-21.)

## US A2 — Usar una imagen propia de fondo   ·   Estado: hecha, probada en local (2026-11-21); en `dev`

- **Historia** — Como dueño de una lotería, quiero usar una imagen mía como fondo de los tableros, para personalizarlos todavía más.
- **Entrega demostrable** — En la ventana «Fondo», «Subir imagen» con el interruptor «Aclarar la imagen» (encendido de entrada); la imagen se ve en la vista previa, en las miniaturas y en el PDF.
- **Construido:** 2026-11-21. Columnas `board_background_image_path` y `board_background_lighten` (migración 079; la ruta tiene que estar en la carpeta de la dueña y llamarse `board-bg-…`); el fondo elegido vale `imagen`. La imagen va al almacenamiento privado `card-images` (`BoardBackgroundRepository`); los invitados de una lotería colectiva no la leen, porque su regla solo abre las imágenes de cartas. M22: `OwnImagePicker` («Tu imagen»: «Subir imagen» o «Cambiar imagen», el cuadrito «Mi imagen» para escogerla y el interruptor «Aclarar la imagen»); el archivo se ve desde el navegador y solo se sube al «Guardar». `saveBoardLook` (`src/services/boardLook.ts`) sube la nueva, guarda la lotería y borra la anterior; si guardar falla, borra la recién subida. Al borrar la lotería se borra también su imagen (`deleteSetWithImages`). Pantalla: `useBoardBackground` pide la dirección firmada de la imagen; `BoardBackgroundLayer` la pinta con el velo encima. PDF: la imagen llena el área recortada y, aclarada, lleva un velo blanco al 55 %; si no carga, el PDF sale con crema y queda anotado. Pruebas en `tests/src/boardBackgroundImage.test.ts` y `supabase/tests/079_board_background_image.test.sql`.
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — En dev, abre «Fondo» → sube una foto oscura → con «Aclarar la imagen» encendido, la vista previa debería verse clara y con el texto legible → apágalo → la foto debería verse tal cual → guarda y descarga el PDF → los tableros deberían llevarla → sube otra imagen → debería reemplazar a la anterior → elige un fondo del catálogo → la imagen propia ya no se usa.
- **Escenarios cubiertos**:
  - [x] Solo el dueño puede ver y cambiar la imagen de su lotería. (Prueba de base 079; reglas del almacenamiento revisadas en dev.)
  - [x] Subir otra imagen reemplaza a la anterior (no se quedan guardadas las viejas). (Prueba automática.)
  - [x] Al borrar la lotería se borra su imagen de fondo. (Revisión de `deleteSetWithImages`.)
  - [x] Se rechazan archivos que no son PNG, JPEG o WebP, o que pasan de 5 MB, con un mensaje claro. (Prueba automática.)
  - [x] Subir la imagen y mover «Aclarar la imagen» se reflejan al momento en la vista previa, antes de guardar. (Probado por Carlos en local, contra la base de dev, el 2026-11-21.)
  - [x] El interruptor se guarda con la lotería. (Probado por Carlos en local, contra la base de dev, el 2026-11-21.)

## US A3 — El administrador agrega fondos al catálogo   ·   Estado: por hacer

- **Historia** — Como administrador, quiero agregar y quitar fondos del catálogo, para ofrecer fondos de temporada sin cambiar el código.
- **Entrega demostrable** — En Administración, pestaña «Fondos» (A1.8), subir un fondo con su nombre, ordenarlos y quitarlos; los nuevos aparecen en la ventana «Fondo» después de los fijos.
- **Construido:** —
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — En dev, como administrador, sube un fondo «Navidad» → en una lotería, abre «Fondo» → debería aparecer → elígelo y guarda → como administrador, quítalo → en otra lotería ya no debería salir en el catálogo → en la primera, las miniaturas y el PDF lo siguen llevando.
- **Escenarios cubiertos**:
  - [ ] Solo un administrador puede agregar o quitar fondos.
  - [ ] Un fondo quitado deja de ofrecerse, pero las loterías que lo tenían lo conservan.
  - [ ] Los fondos fijos no se pueden quitar desde Administración.

## US A4 — Elegir la posición del logo y del título   ·   Estado: hecha, probada en local (2026-11-21); en `dev`

- **Historia** — Como dueño de una lotería, quiero poner el logo y «TABLERO N» del tablero a la izquierda, al centro o a la derecha, cada uno por su lado, para que combinen con el fondo que elegí.
- **Entrega demostrable** — En la ventana «Fondo», pestaña «Encabezado», una barra para el logo y otra para el título, con tres opciones cada una (izquierda, centro, derecha), empezando en centro; la vista previa y el PDF las respetan, y las miniaturas el título (no llevan logo).
- **Construido:** 2026-11-21. Columna `loteria_sets.board_logo_position` (migración 078: `left`, `center` o `right`; `center` de entrada). `boardLogoBox` recibe la posición: a los lados, la parte visible del logo se alinea con la orilla de fuera del borde de las cartas; la altura y el tamaño no cambian. `drawBoardOnPage` recibe ahora `look` (fondo y posición del logo) en lugar del fondo solo; `generatePDF` recibe `boardLogoPosition`, y lo pasan U2 y Mi cuenta. En M22, «Logo» con tres botones en una barra, debajo del catálogo; se guarda junto con el fondo en un solo «Guardar». Las miniaturas y el tablero grande no llevan logo, así que no cambian. Pruebas en `tests/src/boardBackgrounds.test.ts` y `supabase/tests/078_board_logo_position.test.sql`. Desde la decisión 18 (2026-11-21): columna `board_title_position` (migración 080); `boardTitleLayout` recibe la posición y a los lados deja una sola línea; `drawBoardOnPage` la toma de `look.titlePosition` y `generatePDF` de `boardTitlePosition`; la pestaña «Logo» pasa a «Encabezado» con dos barras (`PositionBar`); las miniaturas (`BoardThumbnail`) mueven sus líneas igual.
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — En dev, abre «Fondo» → en «Logo», toca «Izquierda» → en la vista previa el logo debería pasar a la izquierda y «TABLERO 1» seguir centrado → guarda → las miniaturas y el PDF deberían llevarlo así en todos los tableros → vuelve a «Centro» → debería quedar como hoy.
- **Escenarios cubiertos**:
  - [x] Una lotería sin posición elegida sale con el logo al centro, igual que hoy. (Prueba automática y de base.)
  - [x] En las tres posiciones el logo queda dentro del área de corte y el encabezado no cambia de alto. (Prueba automática: alineado con las cartas, misma altura.)
  - [x] La posición se guarda con la lotería y vale para todos sus tableros. (Prueba de base 078; el PDF usa una para todas las páginas.)
  - [x] «TABLERO N» se mueve por su lado: a los lados se alinea con las cartas, lleva una sola línea y no cambia de altura. (Prueba automática y de base 080.)

## US A5 — Elegir un color propio   ·   Estado: hecha, probada en local (2026-11-21); en `dev`

- **Historia** — Como dueño de una lotería, quiero escoger cualquier color de fondo con un selector, para no quedarme solo con los del catálogo.
- **Entrega demostrable** — En M22, «Tu color» al final del catálogo abre el selector; la vista previa cambia mientras se mueve; con un color oscuro sale el aviso; al guardar, las miniaturas y el PDF lo llevan.
- **Construido:** 2026-11-21. `boardBackgroundOrDefault` lee también `color-rrggbb` (`customColorId`, `isCustomColorId`); `isDarkBackground` mide el contraste de «TABLERO N» (#1A120E) contra el fondo y avisa debajo de 4.5 a 1. En M22, `CustomColorSwatch` («Tu color», con el selector del navegador sobre el cuadrito; sin color elegido se ve un círculo de colores de la paleta con un gotero) y el aviso debajo del catálogo. Sin migración nueva: el id cabe en la regla de la 077. Pruebas en `tests/src/boardBackgrounds.test.ts`.
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — En dev, abre «Fondo» → toca «Tu color» → elige un verde claro → la vista previa debería cambiar al momento, sin aviso → elige un azul marino → debería salir el aviso y la vista previa verse oscura → guarda → las miniaturas y el PDF deberían llevar el azul marino → vuelve a abrir «Fondo» → «Tu color» debería estar marcado con ese azul.
- **Escenarios cubiertos**:
  - [x] Un color claro no muestra aviso; uno oscuro sí, y aun así se puede guardar. (Prueba automática del aviso; «Guardar» no depende de él.)
  - [x] El color se guarda como `color-rrggbb` y se lee igual en la pantalla y en el PDF. (Prueba automática.)
  - [x] Un valor guardado que no es un color válido se toma como crema. (Prueba automática.)
  - [x] El selector funciona en computadora y en teléfono. (Probado por Carlos el 2026-11-21.)
