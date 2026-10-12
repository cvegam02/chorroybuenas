# FEAT-36 — Rediseño de la página de una lotería (U2)

**Estado: definida con Carlos el 2026-10-11 y construidas sus seis historias (US A1 a A6) ese mismo día, en la rama `feature/rediseno-pagina-loteria`, creada desde `dev`. Fusionada a `dev` el 2026-10-11 con un merge directo, sin PR, porque Carlos lo pidió así; se publica en dev.chorroybuenas.com.mx cuando `dev` se sube a GitHub. Falta la demo de Carlos ahí. A producción pasa después, con el PR de `dev` a `main`.**

**Contexto.** Carlos pidió el 2026-10-11 rediseñar la página de una lotería guardada (U2, `/loteria/:setId`) para que quede como las maquetas `docs/design/Loteria.dc.html` (lista para imprimir, escritorio), `LoteriaMobile.dc.html` (lista, celular de 768 px o menos), `LoteriaEnProgreso.dc.html` (faltan cartas) y `LoteriaVentanas.dc.html` (menú «⋮», aviso sin tableros, confirmaciones, preparando el PDF y ver carta grande). Las maquetas son referencia visual: no se copia su HTML y sus imágenes `/_blob/` son de ejemplo; la página muestra las cartas y los tableros reales.

**Es diseño, textos y datos que ya existen.** No cambian reglas de negocio, cobros, tokens ni la forma de guardar, generar tableros o armar el PDF. Todo lo que hoy funciona se conserva: la carga de cartas y tableros, renombrar, descargar el PDF con su manejo de errores, ver un tablero grande (`BoardModal`) y los tokens usados. Lo único nuevo en esta página es eliminar la lotería, con la misma lógica y la misma ventana del panel de Mi cuenta. Cambia la descripción de U2 en `docs/diseno-mockups.md`: se le presentan a Carlos los cuatro puntos antes de editarla (US A6).

## Decisiones tomadas con el usuario

Del pedido de Carlos (2026-10-11):

1. **Encabezado blanco.** Enlace «← Mis loterías» que va a `/dashboard#mis-loterias` (hoy va al inicio), el nombre con su lápiz para renombrar (misma lógica de hoy) y las etiquetas: modo («Clásico 4×4» o «Niños 3×3», según el modo guardado), N cartas, N tableros (si hay) y tokens usados (si son más de 0).
2. **Botones del encabezado según el estado.** Con tableros: «Descargar PDF» (principal), «Editar cartas» y «⋮». Sin cartas suficientes: «Agregar fotos» (va a las cartas) y «⋮».
3. **Un aviso de estado debajo del encabezado**, uno de tres: verde «Lista para imprimir» (con tableros); naranja «¡Ya tienes N cartas! Arma tus tableros» con el botón «Armar tableros» (cartas suficientes, sin tableros); ámbar con barra de avance «N de mínimo» y «Te faltan X cartas» (faltan cartas).
4. **El mínimo de cartas sale de `minCardsForGrid`.** No se escribe ningún número fijo.
5. **Primero Cartas, después Tableros.**
6. **Cartas: se muestran todas.** Se quitan el corte de 24 y el «+N». Las transformadas llevan la etiqueta «IA» y junto al título va el conteo «N · M con IA». En celular, 4 columnas. Cuando faltan cartas, cada carta que falta es un espacio punteado numerado que lleva a las cartas.
7. **Tableros.** Cuadrícula de miniaturas con el botón «Revolver tableros», que es el «Generar nuevos tableros» de hoy con su confirmación. En celular, una fila que se desliza a los lados. Si faltan cartas, el bloque bloqueado «Los tableros se arman cuando tengas N cartas» con el botón deshabilitado.
8. **Menú «⋮»:** Cambiar nombre, Revolver tableros, Borrar tableros (sale del frente) y Eliminar lotería. Eliminar usa la lógica y la ventana del panel de Mi cuenta y al terminar regresa a Mi cuenta. En celular, hoja inferior como en el panel.
9. **Confirmaciones de revolver y de borrar** con los textos de la maqueta.
10. **Al generar el PDF**, la ventana «Preparando tu PDF…» sustituye al velo de hoy.
11. **Ver carta grande** gana flechas de anterior y siguiente, «9 de 24» y el botón «Editar esta carta».
12. **Textos nuevos en español y en inglés.**

Respuestas de Carlos a los choques con el código (2026-10-11):

13. **Colores:** los de la maqueta que no están en la paleta (el borde `#fde4cc`, el verde del aviso, el ámbar, el rojo `#b91c1c`, el morado de «Niños» y el fondo `#fffbf0`) se cambian por su equivalente de la paleta, como en FEAT-35. La miniatura de tablero se deja como está: ya tiene papel crema y título en Arvo desde FEAT-34 y la comparte el flujo de crear. _(Descartada: escribir los colores sueltos de la maqueta.)_
14. **La barra de «Preparando tu PDF…» es animada y sin porcentaje.** El generador de PDF no informa cuánto lleva, así que el 62 % de la maqueta no sería real. _(Descartada: un porcentaje inventado.)_
15. **La ventana de carta grande cambia de aspecto en los tres lugares que la usan** (esta página, el editor de cartas y el detalle de una temática): fondo café y botón redondo de cerrar. Las flechas, el contador y «Editar esta carta» salen solo en esta página. _(Descartada: dos aspectos distintos de la misma ventana.)_
16. **Con cartas suficientes y sin tableros, el encabezado lleva «Editar cartas» y «⋮».** «Armar tableros» ya está en el aviso naranja y en la sección Tableros. _(Descartada: repetirlo también en el encabezado.)_
17. **Sin tableros, el menú «⋮» solo trae «Cambiar nombre» y «Eliminar lotería».** «Revolver tableros» y «Borrar tableros» no se muestran.
18. **«Revolver» conserva el comportamiento de hoy:** al confirmar se borran los tableros y se pasa a elegir cuántos se quieren. Si la persona sale de ahí sin generarlos, la lotería queda sin tableros.
19. **«Editar cartas» dentro de la sección Cartas solo sale cuando faltan cartas**, como dibuja la maqueta de ese estado: ahí el encabezado solo trae «Agregar fotos». En los demás estados el botón vive en el encabezado.
20. **«Niños 3×3» y «Clásico 4×4» se usan en esta página**, igual que en las tarjetas de Mi cuenta. Las pantallas que dicen «Kids» no se tocan.
21. **«Editar esta carta» se construye completo.** Abrir el editor en una carta concreta resultó sencillo: la ruta de cartas ya recibe datos al navegar. Toca `CardEditor.tsx`, que no estaba en la lista del pedido.

Ajustes de Claude al construir la US A1 (2026-10-11), avisados a Carlos al entregar:

22. **Con tableros guardados la página dice «Lista para imprimir», aunque después se le hayan quitado cartas.** Es el orden del pedido (primero «con tableros») y conserva lo de hoy: el PDF se puede bajar siempre que hay tableros. En ese caso raro la tarjeta de Mi cuenta dice «Te faltan N cartas», porque `setStatusOf` mira primero las cartas; por eso la página usa su propia regla, `setViewStateOf`.
23. **Equivalentes de color usados:** bordes y etiquetas en el naranja más claro de la paleta con letra en naranja oscuro; «Niños 3×3» con el morado de IA, como en Mi cuenta; aviso verde en turquesa claro con letra café (la paleta no tiene verde oscuro); aviso ámbar en el amarillo claro rebajado con blanco.
24. **El error del PDF se muestra debajo del aviso de estado**, cerca del botón que lo provoca; antes salía en la sección Tableros.
25. **Se quitan de las secciones lo que pasó al encabezado o al aviso:** «Descargar PDF» en Tableros, el recuadro gris de «cartas insuficientes» y los tokens usados junto a «Cartas».
26. **Un solo texto para escritorio y celular** en el aviso verde y en la etiqueta de tokens («N tokens usados»); la maqueta de celular los acorta. Con un solo tablero el aviso dice «tu tablero».
27. **Radio de los avisos: el mediano del sistema** (16 px; la maqueta dibuja 18).

Ajustes de Claude al construir la US A2 (2026-10-11), avisados a Carlos al entregar:

28. **Sin cartas con IA, el conteo solo dice el número de cartas** («24»), sin «· 0 con IA».
29. **Una sola nota al pie para escritorio y celular** («Toca una carta para verla grande…»); la maqueta de celular la acorta.
30. **Mientras una carta todavía no se ve como sale impresa**, se muestra la foto con su nombre debajo, como hoy; la etiqueta «IA» sale desde el principio.
31. **El botón «Editar cartas» que estaba al pie de la sección se quita**: queda el del encabezado y, cuando faltan cartas, el de la sección (decisión 19).

Ajustes de Claude al construir la US A3 (2026-10-11), avisados a Carlos al entregar:

32. **La carta grande va sin marco blanco cuando ya se ve como sale impresa**, como en la maqueta. Mientras se arma, y en las temáticas, sigue en su marco con el nombre debajo, como hoy.
33. **La carta crece hasta donde quepa** (360 px de ancho como máximo), dejando sitio al contador y al botón; antes medía 320.
34. **Si la carta se está transformando con IA, «Editar esta carta» lleva a las cartas sin abrir su ventana**: es la regla que ya tiene el editor.
35. **Si la carta ya no existe al llegar al editor**, no se abre nada y el editor se ve normal.

Ajustes de Claude al construir la US A4 (2026-10-11), avisados a Carlos al entregar:

36. **Con cartas suficientes y sin tableros, la sección muestra el mismo bloque punteado**, con «Aún no hay tableros» y el botón «Armar tableros» activo. La maqueta solo dice que la sección lleva ese botón.
37. **Los tableritos del bloque se dibujan 3×3 o 4×4** según el modo de la lotería.
38. **«Revolver tableros» dice lo mismo en celular** (la maqueta lo acorta a «Revolver»). «Borrar tableros» sigue a su lado hasta la US A5.
39. **La nota al pie cambia en celular** a «Desliza para ver los N. Toca uno para verlo grande.»; con un solo tablero, «Toca el tablero para verlo grande.».
40. **Se quita de esta página el velo «Generando tableros…»**: nunca aparecía aquí, porque los tableros se generan en otra pantalla.
41. **Con el movimiento reducido activado en el dispositivo**, la barra de «Preparando tu PDF…» queda fija en lugar de moverse.
42. **La ventana del PDF muestra las tres primeras cartas de la lotería**, como salen impresas.

Ajustes de Claude al construir la US A5 (2026-10-11), avisados a Carlos al entregar:

43. **En celular el «⋮» va arriba, frente a «← Mis loterías»**, como en la maqueta; en computadora, junto a los botones.
44. **La hoja inferior muestra la primera carta de la lotería, su nombre y «N cartas · N tokens usados»**, como la del panel.
45. **Con un solo tablero o una sola carta las confirmaciones hablan en singular** («¿Revolver tu tablero?», «Tu carta se queda»).
46. **Mientras se borra o se revuelve, la confirmación no se puede cerrar** y sus botones quedan apagados. Si algo falla, sale el mismo aviso de error de hoy.
47. **Tras eliminar se llega a la sección «Mis loterías» de Mi cuenta** y el botón de regresar del navegador no vuelve a la lotería eliminada.
48. **Si se baja el PDF desde la ventana de eliminar, «Preparando tu PDF…» se ve encima** y al terminar se regresa a la ventana de eliminar.
49. **Mientras carga, el encabezado dice «Lotería»** en lugar del identificador interno que se alcanzaba a ver al entrar por enlace directo.

## Decisiones pendientes

Se le preguntan a Carlos, una por una, al empezar la historia que las necesita.

| Historia | Pregunta |
|---|---|
| Todas | Un color de la maqueta que no tenga equivalente en la paleta. |
| Todas | Lo que aparezca al construir y pida un comportamiento que hoy no existe. |

## Diseño

- **Estado de la lotería.** Sale de una función propia de la página, `setViewStateOf`, con las cartas y los tableros ya cargados: con tableros, lista; sin tableros y con el mínimo de cartas, faltan los tableros; si no, faltan cartas (decisión 22). Una lotería sin ninguna carta se muestra como «faltan cartas», con la barra en 0. Lleva prueba.
- **Modo.** El modo guardado de la lotería; si no lo tiene, el de sus tableros; si tampoco, Clásico. Es la regla de hoy y no cambia.
- **Todas las cartas.** Cada carta se arma una sola vez (foto, marco, nombre y número) y se reutiliza; las que están en tableros ya se arman hoy en esta página. No se agrega paginación.
- **Espacios punteados.** Tantos como cartas falten para el mínimo, numerados a partir de la siguiente carta. Todos llevan a las cartas de la lotería.
- **Menú «⋮».** Una pieza nueva de esta página que reutiliza los estilos del menú y de la hoja inferior del panel (`LoteriaMenu.css`). El menú del panel no se modifica.
- **Eliminar.** La ventana `DeleteLoteriaDialog` del panel, tal cual, con su sugerencia de descargar el PDF antes cuando la lotería está lista. Al terminar se refresca la lista de loterías y se va a `/dashboard#mis-loterias`.
- **Confirmaciones de revolver y borrar.** Una ventana de esta página con el aspecto de las ventanas del panel (`LoteriaDialogs.css`) y los textos de la maqueta, con el número de tableros y de cartas. `WarningModal` no se modifica: lo usan otras pantallas.
- **Carta grande.** `CardPreviewModal` recibe, opcionales, la lista de cartas, la posición y la acción de editar. Sin ellos se comporta como hoy, con el aspecto nuevo. Las flechas también responden a las teclas de flecha.
- **«Editar esta carta».** Se navega a `/cards` con el modo y la carta por abrir. `CardEditor` abre la ventana de esa carta cuando sus cartas ya cargaron y borra el dato de la navegación, para que no se vuelva a abrir al recargar o al regresar.
- **Archivos.** `SetView.tsx` (446 líneas) y `SetView.css` (460) se parten en piezas dentro de `src/components/SetView/`: encabezado, aviso de estado, sección Cartas, sección Tableros, menú, confirmaciones y ventana del PDF. Fuera de esa carpeta solo se tocan `CardEditor.tsx` y los textos. No se tocan `BoardThumbnail`, `BoardModal`, `WarningModal`, `LoteriaMenu` ni `LoteriaDialogs`.
- **Estados.** Cada bloque resuelve cargando, vacío y error antes de escribir código (`docs/workflow-fe.md`). El error del PDF se sigue mostrando en la página, con el mensaje de hoy.
- **Textos** en `src/locales/es` y `src/locales/en`; las claves que ya no se usen se borran en los dos idiomas.
- **Pruebas.** Nada de esto toca dinero. Se prueba lo que sea una regla (qué botones y qué aviso tocan a cada estado, cuántos espacios punteados salen) si queda en una función propia.
- **Orden.** Una o dos historias por sesión. «Borrar tableros» y «Generar nuevos tableros» siguen a la vista en la sección Tableros hasta que exista el menú (US A5), para que ninguna acción quede sin lugar.

## Grupo A — Página de una lotería

### US A1 — Encabezado y aviso de estado   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero ver de un vistazo en qué va mi lotería y cuál es el siguiente paso, para no buscarlo entre secciones.
- **Entrega demostrable** — Encabezado blanco con «← Mis loterías», el nombre con su lápiz, las etiquetas (modo, N cartas, N tableros si hay, tokens usados si son más de 0) y los botones del estado: «Descargar PDF» y «Editar cartas» con tableros; «Editar cartas» con cartas suficientes y sin tableros; «Agregar fotos» si faltan cartas. Debajo, el aviso: verde «Lista para imprimir» con el enlace «¿Cómo se juega?», naranja con «Armar tableros», o ámbar con la barra de avance. En celular, los botones van a lo ancho debajo de las etiquetas.
- **Construido** — 2026-10-11. `SetHeader` y `SetStatusNotice` (`src/components/SetView/`, cada uno con su `.css`) sustituyen al encabezado anterior; `setViewStateOf` (`setViewState.ts`) decide el estado y de él salen el aviso y los botones. `SetView.tsx` conserva la carga, el PDF y guardar el nombre; el campo de renombrar vive en el encabezado. En `SetView.css` quedan la página, el contenedor de 1200 px y los botones `set-button`, que usarán también las secciones. Textos nuevos en `setView` (español e inglés); el modo, las cartas y los tokens usan los textos de Mi cuenta. Prueba: `tests/src/setViewState.test.ts`. Las secciones Cartas y Tableros siguen con su aspecto anterior hasta las US A2 y A4.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre una lotería con tableros: arriba dice «← Mis loterías» y te lleva a esa sección de Mi cuenta → el nombre se cambia con el lápiz, como antes → las etiquetas dicen el modo, las cartas, los tableros y los tokens usados → «Descargar PDF» baja el PDF y el aviso verde dice «Lista para imprimir» → borra los tableros: el aviso pasa a naranja y «Armar tableros» te lleva a elegir cuántos → abre una lotería con pocas cartas: el aviso es ámbar, con la barra y «Te faltan X cartas», y el botón es «Agregar fotos».
- **Escenarios cubiertos**:
  - [x] El aviso y los botones salen del estado de la lotería, con el mínimo de `minCardsForGrid`. (Prueba automática de la regla.)
  - [ ] Clásico y Niños muestran su etiqueta y su mínimo.
  - [ ] Sin tableros no sale la etiqueta de tableros; con 0 tokens usados no sale la de tokens.
  - [ ] Renombrar funciona igual que hoy (guardar, cancelar, Enter y Escape).
  - [ ] «← Mis loterías» va a `/dashboard#mis-loterias`.
  - [ ] Una lotería sin cartas se ve como «faltan cartas», con la barra en 0.
  - [ ] Cargando se ve bien; el error del PDF se sigue mostrando.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A2 — Sección Cartas   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero ver todas mis cartas y saber cuáles llevan IA y cuántas me faltan, para decidir qué hacer con ellas.
- **Entrega demostrable** — «Cartas» con el conteo «N · M con IA» y todas las cartas de la lotería, como salen impresas; las transformadas con la etiqueta «IA». Debajo, la nota de que se tocan para verlas grandes. Cuando faltan cartas: un espacio punteado numerado por cada carta que falta, el botón «Editar cartas» en la sección y la nota de los espacios. En celular, 4 columnas.
- **Construido** — 2026-10-11. `SetCardsSection` (`src/components/SetView/`, estilos en `SetCardsSection.css`) muestra todas las cartas, el conteo con IA, los espacios punteados y la nota al pie. `SetCardThumb` lleva la etiqueta «IA» y guarda él mismo si su imagen ya cargó. `missingCardNumbers` (`setViewState.ts`) da los números de los espacios. En `SetView.css` quedan los estilos comunes de sección (`set-section`) y el botón chico, que usará también Tableros; se borraron los de la cuadrícula anterior. Textos nuevos en `setView`. Prueba: `tests/src/setViewState.test.ts`.
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — Abre una lotería con más de 24 cartas: se ven todas, sin el «+N» → las que transformaste con IA llevan la etiqueta «IA» y el conteo de arriba coincide → toca una y se abre grande → abre una lotería a la que le faltan cartas: después de sus cartas hay un espacio punteado por cada una que falta, numerados en orden → toca un espacio y te lleva a agregar fotos → en celular las cartas van de 4 en 4.
- **Escenarios cubiertos**:
  - [ ] Se muestran todas las cartas, sin corte.
  - [ ] La etiqueta «IA» y el conteo «M con IA» coinciden con las cartas transformadas; sin ninguna, el conteo solo dice el número de cartas.
  - [x] Los espacios punteados son los que faltan para el mínimo y se numeran desde la siguiente carta. (Prueba automática.)
  - [ ] «Editar cartas» en la sección solo sale cuando faltan cartas.
  - [ ] Las cartas se ven como salen impresas; mientras cargan, la foto con su nombre.
  - [ ] Una lotería sin cartas muestra solo los espacios punteados.
  - [ ] En computadora y en celular (4 columnas).
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A3 — Ver carta grande   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero pasar de una carta a otra sin cerrar la ventana y editar la que estoy viendo, para revisar mi lotería rápido.
- **Entrega demostrable** — La ventana de carta grande con fondo café y botón redondo de cerrar, flechas de anterior y siguiente, «9 de 24» y «Editar esta carta», que abre el editor de cartas directamente en esa carta. En el editor de cartas y en el detalle de una temática la ventana se ve con el aspecto nuevo, sin flechas, contador ni botón.
- **Construido** — 2026-10-11. `CardPreviewModal` (`src/components/SetView/`) tiene el aspecto nuevo y dos datos opcionales: `navigation` (lugar de la carta, total y cómo cambiarla), con el que salen las flechas y el contador, y `onEdit`, con el que sale «Editar esta carta». El editor de cartas y el detalle de una temática no los pasan. `SetView.tsx` guarda el lugar de la carta abierta y navega a `/cards` con el modo y `editCardId`. `CardEditor.tsx` lee `editCardId`, abre esa carta cuando ya está en la lista y lo borra de la navegación. Textos nuevos en `setView`.
- **Depende de** — A2.
- **Cómo se prueba (guion de demo)** — Abre una lotería y toca la carta 9: se ve grande y dice «9 de 24» → la flecha derecha pasa a la 10 y la izquierda regresa; también con las flechas del teclado → en la primera y en la última, la flecha que no aplica no se puede usar → «Editar esta carta» te lleva a las cartas con la ventana de esa carta ya abierta → ciérrala y recarga la página: no se vuelve a abrir sola → en el editor de cartas y en una temática, ver una carta grande muestra la ventana nueva sin flechas.
- **Escenarios cubiertos**:
  - [ ] Flechas y contador recorren todas las cartas, en su orden.
  - [ ] Escape y el toque fuera cierran la ventana, como hoy.
  - [ ] «Editar esta carta» abre el editor en esa carta; no se reabre al recargar ni al regresar.
  - [ ] Si la carta se está transformando con IA, el editor no la abre (regla de hoy).
  - [ ] El editor de cartas y el detalle de una temática siguen funcionando, con el aspecto nuevo.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A4 — Sección Tableros y «Preparando tu PDF…»   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero ver mis tableros y saber que el PDF se está armando, para no pensar que la página se trabó.
- **Entrega demostrable** — «Tableros» con su número, la cuadrícula de miniaturas y el botón «Revolver tableros»; en celular, una fila que se desliza a los lados con la nota «Desliza para ver los N». Con cartas suficientes y sin tableros, el botón «Armar tableros». Si faltan cartas, el bloque punteado «Los tableros se arman cuando tengas N cartas» con el botón deshabilitado. Al descargar el PDF, la ventana «Preparando tu PDF…» con tres cartas de la lotería, «N tableros y N cartas» y una barra animada.
- **Construido** — 2026-10-11. `SetBoardsSection` (`src/components/SetView/`, estilos en `SetBoardsSection.css`) muestra la cuadrícula con `BoardThumbnail` sin modificar, la fila deslizable en celular y el bloque punteado sin tableros (activo o bloqueado). `PdfProgressDialog` (con su `.css`) es la ventana «Preparando tu PDF…», con `CardThumbnail` de Mi cuenta para las tres cartas. En `SetView.tsx` ya no quedan secciones escritas a mano ni el velo; en `SetView.css` se borraron los estilos de las secciones y los botones anteriores. Textos nuevos en `setView`.
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — Abre una lotería con tableros: se ven en cuadrícula y al tocar uno se abre grande, como antes → «Revolver tableros» pide confirmar → pulsa «Descargar PDF»: aparece «Preparando tu PDF…» con tus cartas y se cierra sola cuando baja el archivo → en celular los tableros van en una fila que se desliza → abre una lotería con cartas suficientes y sin tableros: «Armar tableros» te lleva a elegir cuántos → abre una a la que le faltan cartas: el bloque dice cuántas cartas necesita y su botón no se puede pulsar.
- **Escenarios cubiertos**:
  - [ ] Los tableros se ven y se abren grandes igual que hoy.
  - [ ] «Revolver tableros» hace lo mismo que «Generar nuevos tableros» de hoy.
  - [x] El bloque bloqueado usa el mínimo de `minCardsForGrid`. (Prueba automática.)
  - [ ] «Preparando tu PDF…» sustituye al velo; si el PDF falla, la ventana se cierra y se ve el mensaje de error de hoy.
  - [ ] La ventana no se puede cerrar mientras se arma el PDF.
  - [ ] En computadora (cuadrícula) y en celular (fila que se desliza).
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A5 — Menú «⋮», confirmaciones y eliminar   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero que lo que se usa poco o borra cosas esté en un menú aparte, para no pulsarlo por error.
- **Entrega demostrable** — El «⋮» del encabezado con «Cambiar nombre», «Revolver tableros», «Borrar tableros» y, separado y en rojo, «Eliminar lotería»; sin tableros, solo «Cambiar nombre» y «Eliminar lotería». En celular, hoja inferior. Las confirmaciones nuevas: «¿Revolver los N tableros?» y «¿Borrar los N tableros?», con los textos de la maqueta. «Eliminar lotería» abre la ventana del panel y al terminar regresa a Mi cuenta. «Borrar tableros» deja de estar a la vista en la sección Tableros.
- **Construido** — 2026-10-11. `SetMenu` (`src/components/SetView/`) es el «⋮»: usa los estilos del desplegable y de la hoja de Mi cuenta (`LoteriaMenu.css`) y solo trae en `SetMenu.css` su botón. `SetHeader` lo coloca y le conecta «Cambiar nombre» con el campo de renombrar. `SetConfirmDialog` es la confirmación de revolver y de borrar, con el aspecto de las ventanas de Mi cuenta (`LoteriaDialogs.css`); sustituye a `WarningModal` en esta página. Eliminar usa `DeleteLoteriaDialog` y `SetRepository.deleteSetWithImages`, los mismos del panel. «Borrar tableros» salió de la sección Tableros. Textos nuevos en `setView`.
- **Depende de** — A1 y A4.
- **Cómo se prueba (guion de demo)** — Abre una lotería con tableros y pulsa «⋮»: salen las cuatro opciones → «Cambiar nombre» abre el mismo campo que el lápiz → «Revolver tableros» pregunta «¿Revolver los 12 tableros?»; «Cancelar» no cambia nada → «Borrar tableros» pregunta «¿Borrar los 12 tableros?» y dice que tus cartas se quedan; al confirmar, el aviso pasa a naranja → vuelve a abrir «⋮»: ya solo salen «Cambiar nombre» y «Eliminar lotería» → «Eliminar lotería» abre la ventana de eliminar; al confirmar regresas a Mi cuenta y la lotería ya no está → en celular el menú sale como hoja desde abajo.
- **Escenarios cubiertos**:
  - [ ] El menú se cierra al elegir, al pulsar fuera y con Escape.
  - [ ] Sin tableros no salen «Revolver tableros» ni «Borrar tableros».
  - [ ] Las confirmaciones dicen el número real de tableros y de cartas.
  - [ ] Revolver y borrar hacen lo mismo que hoy.
  - [ ] Eliminar usa la lógica del panel; si falla, la ventana se queda abierta y avisa.
  - [ ] Tras eliminar se llega a Mi cuenta y la lotería ya no aparece.
  - [ ] En computadora (menú) y en celular (hoja inferior).
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A6 — Limpieza y documentos   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como quien mantiene el sitio, quiero que no queden estilos ni textos sin uso y que los documentos digan cómo es la página, para retomar el trabajo sin sorpresas.
- **Entrega demostrable** — Sin cambios a la vista. Se borran los estilos de `SetView.css` y las claves de texto que ya nadie usa, en español y en inglés. La fila U2 de `docs/diseno-mockups.md` describe la página nueva, con la confirmación de Carlos.
- **Construido** — 2026-10-11, la limpieza. Se borraron, en español y en inglés, nueve textos de `setView` que ya nadie usa (`backToHome`, `cardCount`, `noCards`, `tokensSpentInSet`, `boardCount`, `generateBoards`, `regeneratePDF`, `regeneratingPDF`, `generateNewBoards`) y `modals.clearBoards`; `modals.regenerateBoards` se queda porque lo usa el flujo de crear. Los estilos anteriores de `SetView.css` se fueron borrando en cada historia y no queda ninguna clase sin uso en la carpeta. Prueba: `tests/src/setViewState.test.ts`. `docs/diseno-mockups.md`: la fila U2 describe la página nueva y ya no dice «por confirmar»; M10 suma el aspecto nuevo y las flechas de U2; M15 aparece también en U2; se agregan M16 (confirmar revolver o borrar tableros) y M17 («Preparando tu PDF…»). `contexto-negocio.md` y `casos-de-uso.md` no cambian.
- **Depende de** — A1 a A5.
- **Cómo se prueba (guion de demo)** — Recorre la página en sus tres estados, en computadora y en celular: se ve igual que al cerrar la US A5.
- **Escenarios cubiertos**:
  - [x] Ninguna clave de texto borrada se usa en otra pantalla. (Búsqueda en `src` y prueba automática.)
  - [x] Los textos de español y de inglés tienen las mismas claves. (Prueba automática.)
  - [x] `npm run typecheck`, `npm run lint` y `npm test` pasan. (2026-10-11.)
  - [x] Carlos confirmó los cuatro puntos del cambio en U2 antes de editar `docs/diseno-mockups.md`. (2026-10-11.)
