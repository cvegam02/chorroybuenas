# FEAT-35 — Rediseño de «Mi cuenta» (U1)

**Estado: construidas las US A1 a A4 el 2026-10-11, en la rama `feature/rediseno-mi-cuenta`, creada desde `dev`; falta la A5 (limpieza de estilos y textos viejos). Las A1 a A4 llegan a dev.chorroybuenas.com.mx con el primer PR de esta rama hacia `dev`, pedido por Carlos el 2026-10-11 tras verlas en su máquina; falta su demo ahí. La A5 irá en un segundo PR de la misma rama. A producción pasa después, con el PR de `dev` a `main`, cuando Carlos lo confirme. Sin migraciones ni funciones que desplegar.**

**Contexto.** Carlos pidió el 2026-10-11 rediseñar el panel de Mi cuenta (U1, `/dashboard`) para que quede como las maquetas `docs/design/Dashboard.dc.html` (escritorio), `DashboardMobile.dc.html` (celular, 768 px o menos) y `DashboardEstados.dc.html` (menú «⋮», hoja inferior, renombrar, eliminar, editar nombre y cuenta nueva). Las maquetas son referencia visual: no se copia su HTML y sus imágenes `/_blob/` son de ejemplo; el sitio muestra las cartas reales de cada lotería.

**Es diseño, textos y datos que ya existen.** No cambian reglas de negocio, cobros, tokens ni la forma de guardar, generar tableros o armar el PDF. Todo lo que hoy funciona se conserva: subir foto de perfil, editar nombre, cambiar contraseña, renombrar, eliminar y crear loterías, y el ancla `#mis-loterias` a la que enlaza el menú de usuario. Cambia la descripción de U1 en `docs/diseno-mockups.md`: Carlos confirmó los 4 puntos el 2026-10-11 (decisión 48).

## Decisiones tomadas con el usuario

Del pedido de Carlos (2026-10-11):

1. **Orden de la pantalla:** encabezado naranja, «Mis loterías», dos columnas («Mis temáticas» y «Movimientos de tokens») y «Mis datos».
2. **El encabezado** lleva la foto con su botón de cámara, «Hola, {nombre}» y una tarjeta blanca con el saldo y «Comprar tokens». Se quitan la insignia de bienvenida, el correo y el lápiz: pasan a «Mis datos».
3. **Se quitan las tres tarjetas de estadísticas** y las dos tarjetas grandes de «Crear nueva lotería» y «Comprar tokens»; las sustituyen el encabezado, el botón de «Mis loterías» y el resumen de «Movimientos de tokens».
4. **El mínimo de cartas** es el mismo que deja pasar a tableros al crear una lotería (`minCardsForGrid`: 24 en Clásico, 15 en Niños). No se escribe otro número.
5. **Las cartas y el conteo de todas las loterías se piden en una sola consulta**, no una por lotería.
6. **Los movimientos se cargan al entrar a la página**; «Ver todos» abre el historial de hoy con esos mismos datos.
7. **La fila de contraseña no desaparece** en cuentas de Google: dice «Entraste con Google: no usas contraseña aquí».
8. **La ventana de eliminar sugiere descargar el PDF antes** cuando la lotería está lista.

Respuestas de Carlos a los choques con el código (2026-10-11):

9. **«Lista para imprimir» pide el mínimo de cartas y al menos un tablero guardado**, porque el PDF se arma con los tableros. Con cartas suficientes pero sin tableros, la tarjeta dice «Te faltan los tableros» y su botón es «Hacer tableros». Es un cuarto estado que la maqueta no dibuja. _(Descartada: llamarla «Lista» solo por las cartas y que «Descargar PDF» llevara a hacer tableros.)_
10. **El estado de cuenta nueva (panel 6) se muestra cuando solo hay una lotería y tiene 0 cartas.** El sitio crea sola «Mi primera lotería» al entrar, así que la lista nunca queda vacía; «Crear mi primera lotería» abre esa misma. La creación automática no se toca. _(Descartada: dejar de crearla sola.)_
11. **La lista corta de movimientos solo trae lo que mueve tokens:** compras de tokens y regalos, los últimos 4. Las compras de temáticas siguen en «Ver todos». No salen las filas «fotos transformadas» ni «Bienvenida al crear tu cuenta» de la maqueta: `buildTokenHistory` no las tiene y no se agregan en esta feature. _(Descartada: mostrar las temáticas en la lista corta, sin tokens.)_
12. **El abanico muestra las cartas como salen impresas** (marco, nombre y número), con la pieza que ya lo hace desde FEAT-29, y la foto sola mientras carga. _(Descartada: la foto sola.)_
13. **Colores:** los de la maqueta que no están en la paleta se cambian por su equivalente (rojo `--color-danger`, turquesa, morado de IA), como en FEAT-33 y FEAT-34. Si alguno no tiene equivalente, se le pregunta a Carlos.
14. **«Esperando pago» sustituye a «Pago en proceso»** en las temáticas pendientes.
15. **Diferencias entre maquetas:** la tarjeta punteada «Crear nueva lotería» solo va en escritorio (en celular queda el botón de arriba) y los movimientos son 4 en las dos.

Ajustes de Claude al construir la US A1 (2026-10-11), avisados a Carlos al entregar:

16. **El saludo usa el primer nombre** («Hola, Carlos»), como la maqueta y la barra superior; antes usaba el nombre completo, que ahora se ve en «Mis datos».
17. **Toda la foto es el botón de cambiarla**, no solo el círculo de la cámara, que en celular mide 30 px. Se ve igual que la maqueta.
18. **Sin foto se muestra la inicial**, con la misma regla del menú de usuario, en lugar del ícono de persona.
19. **Radios, bordes y sombras del sistema de diseño:** tarjetas con el radio grande (24 px; la maqueta dibuja 20), bordes en el naranja más claro de la paleta (la maqueta usa `#fde4cc`, que no existe) y campos con el radio mediano.
20. **Mientras el saldo carga se muestra «—»**, como en Comprar tokens, y no un 0.
21. **Las dos tarjetas grandes de «Crear nueva lotería» y «Comprar tokens» siguen hasta la US A2**, que trae el botón nuevo de crear; el panel ya no se monta sobre el encabezado.
22. **El panel pasa de 900 a 1100 px de ancho**, como la maqueta; las secciones que aún no se rediseñan quedan más anchas mientras tanto.
23. **La lista de idiomas se comparte** con el menú de celular (`src/utils/languages.ts`), para no tener dos.

Ajustes de Claude al construir la US A2 (2026-10-11), avisados a Carlos al entregar:

24. **El «⋮» conserva hasta la US A3 su menú de hoy** (Abrir, Cambiar nombre, Eliminar), con el aspecto anterior; solo el botón ya es el redondo de la maqueta.
25. **Con dos cartas** el abanico muestra las dos y el hueco de la tercera; en celular, solo las dos, porque el hueco no cabe. La maqueta no dibuja ese caso.
26. **Si las cartas y los conteos no cargan**, las loterías se listan igual, sin abanico ni estado y con «Abrir», bajo un aviso con «Reintentar». Nada impide entrar a una lotería.
27. **Una lotería sin fotos no lleva etiqueta de estado**, como en la maqueta: lo dice su recuadro («Aún sin fotos»).
28. **«Te falta 1 carta»** en singular cuando falta una sola.
29. **Colores de las etiquetas:** «Lista para imprimir» va en texto café sobre turquesa claro, para que se lea; las que faltan, sobre el amarillo de la paleta; «Niños 3×3», en el morado de la IA, que es el único morado de la paleta.
30. **Cuenta nueva:** las dos cartas del recuadro son las de muestra del sitio (las mismas de Temáticas), y el aviso de regalo va sin negritas.
31. **Las tarjetas de estadísticas siguen hasta la US A4**, ahora debajo de «Mis loterías».
32. **La tarjeta ya no recorta su contenido**, para que el menú «⋮» pueda salirse de ella.

Decisión de Carlos al revisar las US A1 y A2 (2026-10-11):

33. **«Cerrar sesión» no va en Mi cuenta.** Se quitó de «Mis datos»; se sigue cerrando sesión desde el menú de usuario. Corrige el pedido inicial y la maqueta, que lo dibujan bajo «Mis datos».

Ajustes de Claude al construir la US A3 (2026-10-11), avisados a Carlos al entregar:

34. **El menú «⋮» de computadora también trae «Abrir»**, como pidió Carlos; la maqueta no lo dibuja ahí.
35. **Mientras se arma un PDF** el botón de la tarjeta gira, y arriba de las tarjetas sale «Preparando el PDF de «…»…». Si falla, sale ahí mismo el aviso de siempre, con su botón para cerrarlo. Solo se arma un PDF a la vez.
36. **Renombrar y eliminar avisan si fallan** y dejan la ventana abierta; antes fallaban en silencio.
37. **La ventana de eliminar dice cuántas cartas se borran**; si no se sabe o no tiene, dice «Se borra con todo lo que tenga».
38. **El «⋮» ya se puede abrir con el teclado** (antes solo con ratón o dedo), y el menú y las ventanas se cierran con Escape.
39. **El rojo de «Eliminar» es el de la paleta** (`--color-danger`), no el `#b91c1c` de la maqueta (decisión 13).
40. **«Sí, eliminar» se apaga mientras se arma el PDF** de esa lotería, para no borrarla a media descarga.

Ajustes de Claude al construir la US A4 (2026-10-11), avisados a Carlos al entregar:

41. **La lista corta solo trae compras acreditadas** (aprobadas, o sin estado en los registros antiguos): una pendiente o rechazada no movió tokens. Siguen en «Ver todos», con su estado.
42. **Cada compra dice «Compra de tokens»**, con su fecha y su monto; la maqueta pone el nombre del paquete, que el sitio no guarda. Cada regalo dice «Regalo de chorroybuenas».
43. **Las cantidades que entran van en café y las que salen en naranja**: la paleta no tiene un verde que se lea sobre blanco.
44. **«Has recibido» y «Has usado» muestran «—» mientras cargan**, no un número a medias.
45. **Temáticas:** el renglón ya no dice la temporada, solo la fecha, como la maqueta; las pendientes conservan su portada; y «Descargar PDF» no lleva ícono, porque es la pieza de Temáticas, que no se toca.
46. **En celular «Ver todos los movimientos» va al pie de la tarjeta**, como la maqueta.
47. **Los regalos se pedían dos veces al entrar** (una para el total y otra al abrir el historial); ahora una sola.

Confirmación de Carlos antes del primer PR (2026-10-11):

48. **El índice de pantallas se puso al día** (`docs/diseno-mockups.md`): la fila U1, M11 (se abre desde «Ver todos» y ya incluye las temáticas) y las ventanas nuevas M14 «Cambiar nombre de la lotería» y M15 «Eliminar lotería». `contexto-negocio.md` y `casos-de-uso.md` no se tocan: dicen que el comprador ve su lotería como «pago en proceso», que describe el estado y sigue siendo el texto de la ficha de la temática; solo cambió la etiqueta de Mi cuenta.
49. **La limpieza (US A5) va en un segundo PR**, para que lo que llega a dev sea lo que Carlos vio.

## Decisiones pendientes

Se le preguntan a Carlos, una por una, al empezar la historia que las necesita.

| Historia | Pregunta |
|---|---|
| Todas | Un color de la maqueta que no tenga equivalente en la paleta. |
| Todas | Lo que aparezca al construir y pida un comportamiento que hoy no existe. |

## Diseño

- **Datos de «Mis loterías».** Una consulta a `loteria_sets` trae, por lotería, cuántas cartas tiene, cuántos tableros y sus 3 primeras cartas (por orden de creación, que son la 1, la 2 y la 3). Las imágenes son privadas: se firman todas en una sola llamada. Sin migración. Al construir se comprueba en dev que la base real tenga la relación entre cartas y loterías que dicen las migraciones.
- **Estado de cada lotería.** Una función sola decide entre «Aún sin fotos», «Te faltan N cartas», «Te faltan los tableros» y «Lista para imprimir», con `minCardsForGrid`. Sin `grid_size`, la lotería cuenta como Clásico 4×4, igual que hoy en la lotería guardada. Lleva prueba.
- **PDF desde el panel.** Al pulsar se cargan los tableros y las cartas de esa lotería y se usa el mismo `generatePDF` de la lotería guardada. No se carga nada antes de pulsar.
- **Movimientos.** Las consultas del historial pasan a la carga inicial. «Has recibido» y «Has usado» salen de `summarizeTokens`, como las tarjetas que se quitan.
- **Archivos.** `Dashboard.tsx` (735 líneas) y `Dashboard.css` (1190) se parten en piezas dentro de `src/components/Dashboard/`. No se tocan `ChangePasswordModal`, `PurchaseHistoryModal`, `WarningModal` ni `SeasonalDownloadButton`.
- **Estados.** Cada bloque con datos resuelve cargando, vacío y error antes de escribir código (`docs/workflow-fe.md`).
- **Textos** en `src/locales/es` y `src/locales/en`; las claves que ya no se usen se borran en los dos idiomas.
- **Orden.** El encabezado y «Mis datos» van en la misma historia para que editar el nombre y cambiar la contraseña nunca queden sin lugar. Una o dos historias por sesión.

## Grupo A — Mi cuenta

### US A1 — Encabezado y «Mis datos»   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero ver mi saldo al entrar y tener mis datos en un solo lugar, para comprar tokens o cambiar mi nombre sin buscar.
- **Entrega demostrable** — Arriba, franja naranja con la foto (o la inicial) y su botón de cámara, «Hola, {nombre}» y una tarjeta blanca con «Tu saldo», los tokens, «= N fotos con IA» (solo en escritorio) y «Comprar tokens». Al final de la página, «Mis datos»: Nombre con «Cambiar» (se edita en la misma fila, con Guardar y Cancelar), Correo, Contraseña con «Cambiar» o el aviso de Google e Idioma (Español / English). Sin «Cerrar sesión» (decisión 33).
- **Construido** — 2026-10-11. `AccountHeader` y `AccountDetails` (`src/components/Dashboard/`, cada uno con su `.css`) sustituyen al encabezado anterior; `Dashboard.tsx` les pasa lo que ya tenía (`useProfileEditing`, saldo, `ChangePasswordModal`), sin cambiar cómo se guarda el nombre, la foto o la contraseña. `src/utils/languages.ts` tiene la lista de idiomas, que también usa el menú de celular. En `Dashboard.css` solo cambiaron el ancho del panel y su separación del encabezado; los estilos del encabezado anterior se borran en la US A5. Textos en `dashboard.header` y `dashboard.details`. Pruebas en `tests/src/accountDetails.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Entra a Mi cuenta: el encabezado ya no trae insignia, correo ni lápiz → pulsa la cámara y sube una foto: cambia → «Comprar tokens» abre la compra → baja a «Mis datos» → «Cambiar» en Nombre: la fila se vuelve un campo; guarda y el saludo de arriba cambia → «Cambiar» en Contraseña abre la ventana de hoy → con una cuenta de Google, la fila dice «Entraste con Google: no usas contraseña aquí» → cambia el idioma a English y regresa.
- **Escenarios cubiertos**:
  - [ ] Subir foto de perfil funciona igual que hoy, con su aviso si falla.
  - [ ] El nombre se edita en la fila; Enter guarda, Escape cancela, máximo 60 letras.
  - [ ] Contraseña: «Cambiar» con cuenta de correo; aviso con cuenta de Google.
  - [ ] El idioma cambia igual que desde el menú de celular.
  - [ ] El saldo es el mismo de la barra superior.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A2 — «Mis loterías»: tarjetas y estados   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero ver mis loterías con sus cartas y saber cuál está lista, para seguir donde me quedé.
- **Entrega demostrable** — «Mis loterías» con el número de loterías y el botón «Crear nueva lotería». Una cuadrícula de tarjetas: abanico con 3 cartas de esa lotería (con 1 o 2 cartas, las que haya y un hueco punteado; con 0, «Aún sin fotos»), etiqueta «Clásico 4×4» o «Niños 3×3», nombre, «N cartas · N tokens usados», el estado y su botón principal: «Abrir», «Seguir editando», «Hacer tableros» o «Subir fotos». Al final, en escritorio, la tarjeta punteada «Crear nueva lotería». En celular, tarjetas a lo ancho. Con una sola lotería sin cartas, el estado de cuenta nueva: aviso de los tokens de regalo y «Crear mi primera lotería».
- **Construido** — 2026-10-11. `MyLoterias`, `LoteriaCard` y `CardFan` (`src/components/Dashboard/`, estilos en `MyLoterias.css`) sustituyen a la lista anterior y a las dos tarjetas grandes. `SetRepository.getSetSummaries` hace la consulta única (conteo de cartas, conteo de tableros y las 3 primeras cartas de cada lotería) y `CardRepository.getImageUrlsInOneCall` firma sus imágenes en una llamada; `loadSetSummaries` (`src/services/setSummaries.ts`) las junta y `useSetSummaries` las carga y las vuelve a pedir al crear o eliminar una lotería. `setStatusOf`, `gridSizeOfSet`, `isNewAccount` y `parseSetSummaryRows` (`src/utils/setSummary.ts`) deciden el estado y leen la respuesta. En `Dashboard.tsx` quedó una sola función para crear lotería (antes eran tres copias). Sin migración: el 2026-10-11 se comprobó contra la base de dev, sin sesión y solo de lectura, que acepta la consulta. Textos en `dashboard.loterias`. Pruebas en `tests/src/setSummary.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Entra a Mi cuenta con varias loterías: cada tarjeta muestra sus propias cartas → una con cartas suficientes y tableros dice «Lista para imprimir» y «Abrir» → una con pocas cartas dice «Te faltan N cartas» y «Seguir editando» te lleva a sus cartas → una con cartas suficientes y sin tableros dice «Te faltan los tableros» → una vacía dice «Aún sin fotos» y «Subir fotos» → «Crear nueva lotería» crea una y te lleva a cartas → desde el menú de usuario, «Ver todas» baja a esta sección → con una cuenta nueva se ve el recuadro punteado y «Crear mi primera lotería» abre la lotería que ya existe.
- **Escenarios cubiertos**:
  - [x] El estado sale de una sola función, con el mínimo de `minCardsForGrid`. (Prueba automática.)
  - [ ] Cartas y conteos de todas las loterías llegan en una consulta; las imágenes se firman en una llamada. (La base de dev acepta la consulta; falta verla con una cuenta que tenga loterías.)
  - [ ] El abanico muestra las cartas como salen impresas; con 0, 1 y 2 cartas se ve bien.
  - [ ] «Crear nueva lotería» hace lo mismo que hoy (nombre, lotería actual, ir a cartas).
  - [ ] El ancla `#mis-loterias` sigue funcionando.
  - [ ] Cuenta nueva: el aviso de regalo sale del sitio; con 0 tokens de regalo o sin poder leerlos, no se muestra.
  - [ ] Cargando y con error se ven bien.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A3 — Menú «⋮», renombrar, eliminar y PDF   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero descargar, renombrar o eliminar una lotería desde su tarjeta, para no tener que abrirla.
- **Entrega demostrable** — Las loterías listas traen además el botón de descargar PDF. El «⋮» abre un menú con Abrir, Descargar PDF (solo si está lista), Cambiar nombre y Eliminar; en celular es una hoja inferior con la carta, el nombre y los datos de la lotería. «Cambiar nombre» abre su ventana con el campo y «Así aparece en tu cuenta y en el PDF». «Eliminar» abre su ventana con el nombre, cuántas cartas se borran y, si está lista, «¿La quieres guardar? Descarga el PDF antes».
- **Construido** — 2026-10-11. `LoteriaMenu` (menú y hoja inferior, con `LoteriaMenu.css`) y `LoteriaDialogs` (`RenameLoteriaDialog` y `DeleteLoteriaDialog`, con `LoteriaDialogs.css`) sustituyen al menú, a la hoja y a las dos ventanas que vivían dentro de `Dashboard.tsx`, que bajó de 735 a unas 300 líneas; `WarningModal` ya no se usa aquí y no se tocó. `downloadSetPdf` (`src/services/setPdf.ts`) carga los tableros y las cartas de la lotería y llama al mismo `generatePDF` de la lotería guardada, con los mismos datos; `useSetPdfDownload` lleva el estado de la descarga. Renombrar y eliminar usan las mismas funciones de antes (`SetRepository.updateSet` y `deleteSetWithImages`). Textos en `dashboard.loterias`.
- **Depende de** — US A2.
- **Cómo se prueba (guion de demo)** — En una lotería lista pulsa el botón de descarga: avisa que la prepara y baja el PDF, igual al de la lotería guardada → abre «⋮»: trae las cuatro opciones → en una que no está lista, «⋮» no trae «Descargar PDF» → «Cambiar nombre»: escribe otro y guarda; la tarjeta cambia → «Eliminar» en una lista: la ventana ofrece descargar el PDF antes; «Sí, eliminar» la quita → en el celular el «⋮» abre la hoja de abajo y se cierra al tocar fuera.
- **Escenarios cubiertos**:
  - [ ] El PDF del panel es el mismo que el de la lotería guardada; si falla, lo dice.
  - [ ] «Descargar PDF» solo aparece en loterías listas (tarjeta, menú, hoja y ventana de eliminar).
  - [ ] Renombrar: Enter guarda, Escape cancela, no acepta vacío.
  - [ ] Eliminar borra la lotería con sus cartas, tableros e imágenes, como hoy.
  - [ ] El menú se cierra al hacer clic fuera; la hoja no se cierra sola al abrirse.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A4 — «Mis temáticas» y «Movimientos de tokens»   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario, quiero ver mis temáticas compradas y mis últimos movimientos de tokens, para descargar lo que compré y entender mi saldo.
- **Entrega demostrable** — Dos columnas (una sola en celular). «Mis temáticas», con «Ver catálogo →»: cada compra con su portada, nombre, fecha y «Descargar PDF»; las pendientes, con la etiqueta «Esperando pago»; abajo, «Las temáticas que compras se quedan aquí para siempre. Descárgalas las veces que quieras.» «Movimientos de tokens», con «Ver todos →»: «Has recibido» y «Has usado» arriba y los últimos 4 movimientos (compras de tokens y regalos). Desaparecen las tres tarjetas de estadísticas y «Ver historial».
- **Construido** — 2026-10-11. `TokenMovements` (con `TokenMovements.css`) es nuevo; `MySeasonalLoterias` y su `.css` se reescribieron con la misma carga de datos. `latestTokenMovements` (`src/utils/tokenHistory.ts`) saca del historial los últimos 4 movimientos, sin tocar `buildTokenHistory` ni `summarizeTokens`. En `Dashboard.tsx` el historial se pide en la carga inicial y «Ver todos» solo abre `PurchaseHistoryModal`, que no se tocó; se quitaron las tres tarjetas de estadísticas y «Ver historial». Las dos columnas y sus encabezados están al final de `Dashboard.css`. Textos en `dashboard.movements` y `dashboard.seasonal`. Pruebas en `tests/src/tokenHistory.test.ts`, escritas antes que el código.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Entra a Mi cuenta: los movimientos ya están ahí, sin abrir nada → «Has recibido» y «Has usado» dan los mismos números que las tarjetas de antes → «Ver todos» abre el historial de siempre, con las temáticas incluidas → una temática comprada se descarga → una con pago sin terminar dice «Esperando pago» → sin temáticas, invita a ver el catálogo.
- **Escenarios cubiertos**:
  - [x] Los últimos 4 salen de `buildTokenHistory`, sin las temáticas. (Prueba automática.)
  - [ ] «Ver todos» no vuelve a pedir los datos.
  - [ ] Temáticas: cargando, vacío, error con «Reintentar», comprada y pendiente.
  - [ ] Sin movimientos se ve bien.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A5 — Limpieza y documentos   ·   Estado: en curso (documentos al día el 2026-10-11; falta la limpieza)

- **Historia** — Como quien mantiene el sitio, quiero que no queden estilos ni textos del panel anterior, para que el siguiente cambio no tropiece con ellos.
- **Entrega demostrable** — Sin cambios a la vista. Se borran los estilos y los textos del panel anterior que ya nadie usa, en español y en inglés, y `docs/diseno-mockups.md` describe U1 como quedó (con la confirmación de Carlos sobre los 4 puntos).
- **Construido** — 2026-10-11, la parte de documentos: `docs/diseno-mockups.md` describe U1, M11, M14 y M15 como quedaron, con la confirmación de Carlos (decisión 48). Falta borrar los estilos del panel anterior en `Dashboard.css` y las claves de texto sin uso.
- **Depende de** — US A1 a A4.
- **Cómo se prueba (guion de demo)** — Recorre Mi cuenta en computadora y en celular: todo se ve igual que al cerrar la US A4.
- **Escenarios cubiertos**:
  - [ ] Ningún archivo del panel pasa de 800 líneas.
  - [ ] No quedan claves de texto sin uso del panel anterior.
  - [x] `docs/diseno-mockups.md` al día (U1 y sus ventanas).
