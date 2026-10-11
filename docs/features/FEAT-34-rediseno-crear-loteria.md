# FEAT-34 — Rediseño de «Crear tu lotería» (C1, C2, C3 y sus ventanas)

**Estado: construidas las ocho historias (US A1 a A8) el 2026-10-11, en la rama `feature/rediseno-crear-loteria`, creada desde `dev`. Falta la demo de Carlos en dev.chorroybuenas.com.mx, a donde llega con el PR de esta rama hacia `dev`; a producción pasa después, con el PR de `dev` a `main`, cuando él lo confirme.**

**Contexto.** Carlos pidió el 2026-10-11 rediseñar el flujo de crear una lotería —C1 Cartas (`/cards`), C2 Tableros (`/board-count`), C3 Vista previa (`/preview`) y sus ventanas— para que quede como las maquetas `docs/referencia-diseno/crear-*.html`. El detalle de cada pantalla está en [`docs/referencia-diseno/INSTRUCCIONES-CREAR-LOTERIA.md`](../referencia-diseno/INSTRUCCIONES-CREAR-LOTERIA.md): aquí no se repite. Las maquetas son referencia visual; no se copia su HTML, y las imágenes de `crear-img/` son solo de ejemplo y no van al sitio.

**Es solo diseño y textos.** No cambian reglas de negocio, cobros, tokens, el guardado, la forma de generar tableros ni el PDF. Así empezó la feature; al construirla Carlos decidió algunos cambios de comportamiento, cada uno anotado abajo: «Revolver tableros» (41), el botón «Siguiente» arriba (50), «Transformar solo Y cartas» (59), la IA de cada carta en «Editar carta» (70 y 75 a 81) y la IA oculta sin sesión (74). Ninguno cambia cómo se cobran o se devuelven los tokens. Si una maqueta pide un comportamiento que hoy no existe, se le pregunta a Carlos antes de construirlo. Cambia la descripción de C1, C2 y C3 en `docs/diseno-mockups.md`: cada cambio se presenta con los 4 puntos antes de editar.

## Decisiones tomadas con el usuario

1. **Rama desde `dev`** (2026-10-11): `feature/rediseno-crear-loteria`. Carlos confirmó que el PR #52 ya estaba fusionado.

Tomadas del documento de instrucciones:

2. **La ilustración de C2 es dinámica**: un tablerito armado con las cartas del usuario y una pila de hojas que crece con el número de tableros. Es una muestra; no son los tableros finales y no se guarda nada.
3. **«Salir sin guardar»** sustituye a «Cancelar proceso», y **«Revolver tableros»** a «Generar nuevos tableros»; conservan lo que hacen hoy y sus confirmaciones.
4. **Se borran los estilos de IA «Simpsons» y «Studio Ghibli»** y los textos de estilos y fidelidad que ya no se usan: son marcas de terceros.
5. **El morado de la IA** entra a la paleta como color nuevo si no está.

Heredadas de FEAT-32 y FEAT-33, sin volver a preguntar:

6. **Los tokens de regalo se leen del sitio**; si son 0 o no se pueden leer, la tarjeta de IA no promete regalo.
7. **«Entrar con Google» y «Crear tu cuenta» pesan lo mismo**, con la pieza que ya existe.
8. **Sin colores sueltos**; radios y sombras del sistema de diseño salvo que Carlos pida otros.
9. **Cada archivo se escribe de una sola vez** mientras el servidor local de Carlos esté encendido, y **no se hace push** sin que él lo pida.

Ajustes de Claude al construir la US A1 (2026-10-11), avisados a Carlos al entregar:

10. **En celular no se muestra el aviso de dónde se guarda** («Sin cuenta…» / «Guardado en tu cuenta»): la maqueta de celular solo trae los tres pasos, centrados.
11. **«Guardado en tu cuenta» va en el turquesa de la paleta**, que no tiene verde (mismo criterio que en FEAT-33).
12. **Los pasos no son enlaces**, como en la maqueta: se avanza y se regresa con los botones de cada pantalla, que conservan sus validaciones.
13. **Mientras el sitio confirma si hay sesión no se muestra ningún aviso de guardado**, para no decir «sin cuenta» a quien sí la tiene.

Decisión de Carlos al construir la US A2 (2026-10-11):

14. **El rojo `#dc2626` entra a la paleta como color de peligro** (`--color-danger`), con el valor que el sitio ya usaba escrito a mano en 15 lugares. Solo lo usa el código nuevo; lo viejo no se toca. _(Descartada: usar el naranja oscuro para «Vaciar cartas».)_

Ajustes de Claude al construir la US A2 (2026-10-11), avisados a Carlos al entregar:

15. **Los botones redondos al pasar el mouse sobre una carta pasan a la US A3.** Son la misma pieza (`CardPreview`) que A3 cambia para las cartas con IA; hacerla una sola vez evita tocarla dos veces. En A2 las cartas conservan sus botones de hoy.
16. **Sin sesión las cartas no muestran «transformar con IA»**, como hoy: la maqueta lo dibuja, pero sin cuenta no se puede transformar. La invitación está en la tarjeta de IA de la columna izquierda.
17. **Arrastrar fotos al recuadro** abre la misma ventana que «Subir fotos», con los mismos formatos. Es lo único nuevo que se puede hacer; no cambia cómo se guardan las cartas.
18. **Con sesión, A2 deja un bloque provisional** con el saldo y el botón de transformar en lote, que hacen lo mismo que hoy; el panel «Cartas con IA» llega con la US A3.
19. **La tarjeta de IA sin sesión:** el botón dice «Google» (como la maqueta) y, al entrar, se llega a Mi cuenta, como hoy. Si los tokens de regalo son 0 o no se pueden leer, dice «Crea tu cuenta para transformar tus fotos».
20. **Texto cuando ya hay cartas suficientes:** la maqueta solo dibuja el caso en que faltan. Claude redactó «Ya tienes las cartas necesarias. Puedes agregar más o pasar a los tableros.» y, en la barra, «lista para los tableros».
21. **La barra inferior no flota sobre el pie de página:** se queda pegada abajo mientras se ve la pantalla de cartas y se detiene donde termina.
22. **En celular se muestran todas las cartas.** La maqueta corta en ocho con «… y 7 más»; ocultar cartas habría sido un comportamiento nuevo.
23. **Cuadrícula:** seis columnas desde 1200 px de ancho, cuatro entre 769 y 1199, y tres en celular.

Ajustes de Claude al construir la US A3 (2026-10-11), avisados a Carlos al entregar:

24. **«Transformar las N restantes» nunca se apaga.** Sin tokens suficientes abre la ventana de IA en lote, que hoy ya dice cuántos faltan y no deja empezar; su vista nueva «Te faltan N tokens» llega con la US A6. No cambia qué se cobra.
25. **Si todas las cartas ya tienen IA**, el panel lo dice («Todas tus cartas ya tienen IA.») en lugar del botón.
26. **«Ir a Mis loterías» lleva directo a Mi cuenta y no borra nada.** Con sesión ya no se ofrece «Cancelar proceso», que borraba los datos y recargaba; así lo piden las instrucciones.
27. **El texto de la carta en proceso** es «Pintando con IA… hasta 1 minuto», como piden las instrucciones; ya no dice «No cierres la página».
28. **Bajo el nombre de la lotería** dice «Se guarda solo mientras trabajas» en computadora y «Guardado en tu cuenta» en celular, como cada maqueta.
29. **Al pasar el mouse hay además un botón redondo de editar**; hacer clic en la carta sigue abriendo la edición, como hoy.
30. **Corrección de teclado:** pulsar Enter sobre un botón de la carta ya no abre además la edición de la carta.
31. **La etiqueta «IA» se ve en todas las cartas transformadas.** Antes el ícono solo salía donde no se podía transformar.

Decisiones de Carlos al construir la US A4 (2026-10-11):

32. **El mínimo de tableros sigue siendo 1 y el recuadro de sugerencia no lo menciona.** La maqueta decía «El mínimo es 8», que no es una regla del sitio. Los atajos 8, 10, 16 y 20 se quedan. _(Descartadas: escribir «El mínimo es 1»; volver el 8 una regla nueva.)_
33. **«← Volver a mis cartas» solo regresa a las cartas, sin borrar nada.** «Cancelar proceso» desaparece de C2; para salir sigue «Salir sin guardar» en C1. _(Descartadas: dejar además un enlace para salir; conservar el botón que borra todo.)_

Ajustes de Claude al construir la US A4 (2026-10-11), avisados a Carlos al entregar:

34. **En Kids el número sigue empezando en 5**, como hoy (o en el sugerido, si es menor); en Clásico empieza en el sugerido. El sugerido aparece marcado entre los atajos en los dos modos.
35. **El número del centro se puede escribir**, como hoy, además de moverlo con − y + o con un atajo. Los mensajes de error son los mismos.
36. **− y + se detienen en 1 y en el máximo**, y no se ofrecen atajos por encima del máximo.
37. **Se quitó la frase «Máximo teórico de tableros únicos»:** solo salía con un máximo menor que 100, y con el mínimo de cartas de cada modo el máximo siempre es de miles.
38. **La pila nunca tiene más hojas que tableros:** con 1 tablero se ve una sola hoja.
39. **La muestra se elige una vez por baraja** y no cambia al mover el número. Las hojas de atrás usan las mismas cartas en otro orden, y las cartas se ven como salen impresas.
40. **«TABLERO N» va con la letra del sitio** y la hoja con el papel crema de la paleta; la maqueta usaba otra letra y un tono suelto.

Decisión de Carlos al construir la US A5 (2026-10-11):

41. **«Revolver tableros» genera ahí mismo la misma cantidad de tableros, en el mismo modo, con otro acomodo.** Con sesión pide confirmación antes, porque reemplaza los guardados: es la ventana que ya usa Mis loterías. Es lo único de esta feature que cambia un comportamiento: antes el botón («Generar nuevos tableros») llevaba al paso 2, sin confirmación; por eso corrige la decisión 3 en lo que toca a este botón. Usa el generador de siempre. Para cambiar la cantidad se vuelve por «Editar cartas» → «Siguiente». _(Descartadas: dejarlo como estaba con el nombre nuevo; dejarlo como estaba y llamarlo «Cambiar cantidad».)_

Ajustes de Claude al construir la US A5 (2026-10-11), avisados a Carlos al entregar:

42. **Se muestran todos los tableros.** La maqueta corta en siete con «Mostrando 7 de 12 · Ver todos»; ocultar tableros habría sido un comportamiento nuevo (mismo criterio que el ajuste 22). Queda la frase «Toca un tablero para verlo en grande».
43. **La tarjeta de la baraja dice las hojas que de verdad trae el PDF:** 10 cartas por hoja, así que 24 cartas son 3 hojas (la maqueta decía 2).
44. **El tablero se abre tocando la hoja o con la lupa;** la lupa es la que se alcanza con teclado.
45. **Las cartas y la tarjeta de la baraja se leen de donde las lee el PDF** al abrir la pantalla. Si no se pueden leer, no salen la pastilla de cartas ni la tarjeta; lo demás funciona.
46. **Cuadrícula:** cuatro columnas desde 1200 px de ancho, tres desde 900, dos desde 600 y una en celular.
47. **La pastilla del modo dice «Modo Clásico 4×4»**, el texto que ya usa C1, en lugar de «Clásico 4×4».
48. **Corrección a la US A4:** la muestra de C2 se dibuja con la baraja que la propia pantalla lee. La primera versión tomaba una lista que no veía las cartas agregadas en esa misma visita, y la muestra podía no salir.

Decisiones de Carlos al revisar C1 (2026-10-11), que corrigen la US A2:

49. **El avance ya no dice «15 de 24 cartas»**, que se leía como si hicieran falta exactamente 24. Dice «15 cartas · mínimo 24», y la explicación aclara que se pueden subir más.
50. **«Siguiente: tableros» va arriba, dentro del recuadro de avance, y se quita la barra inferior.** La barra no se quedaba pegada a la pantalla: salía hasta abajo, junto al pie de página. Corrige los ajustes 20 y 21 y lo que las instrucciones piden para la barra inferior de C1.

Ajustes de Claude al construir la parte 1 de la US A6 (2026-10-11), avisados a Carlos al entregar:

51. **La US A6 se entrega en tres partes**, una por turno: 1) «Agregar una carta» y «Nombra tus fotos»; 2) IA en lote; 3) PDF descargado.
52. **No se escribió «Máximo 18 letras».** La maqueta lo dice, pero esa regla no existe: hoy el nombre admite hasta 100 letras. La ayuda queda en «Corto y fácil de cantar.»
53. **«Así se verá» usa el mismo dibujo de carta que la cuadrícula y el PDF.** El número es el siguiente al de la última carta; al subir varias cuenta las ya nombradas en esa tanda. Sale también al editar una carta, que usa la misma ventana.
54. **La foto se ve con el recorte de la carta (2 de ancho por 3 de alto)**, no con el de la maqueta, para que lo que se ve sea lo que se guarda.
55. **El campo se llama «Nombre de la carta»** (antes «Título de la carta») y muestra las letras en mayúsculas, como se imprimen. Se guarda tal como se escribe, igual que antes.
56. **«Ajustar recorte» y «Cambiar foto» van uno debajo del otro:** con el texto completo no caben lado a lado bajo la foto.
57. **En la cola de fotos**, la actual lleva borde naranja y las que ya pasaron se ven atenuadas; si son muchas, la fila se desliza. En la última foto el botón dice «Terminar».
58. **Las ventanas de agregar, editar y subir varias se cierran con Escape.** «Nombra tus fotos» pide la misma confirmación de siempre y guarda las cartas ya nombradas.

Decisión de Carlos al construir la parte 2 de la US A6 (2026-10-11):

59. **Sin tokens suficientes se ofrece «Transformar solo Y cartas»**, con Y = los tokens que tiene: transforma las primeras Y cartas sin IA, en el orden de la baraja, con el mismo proceso de siempre (1 token por carta, cobrado por el servidor y devuelto si la foto se rechaza). Solo aparece con al menos 1 token. Es un comportamiento nuevo, el segundo de la feature. _(Descartada: ofrecer solo «Comprar tokens».)_

Ajustes de Claude al construir la parte 2 de la US A6 (2026-10-11), avisados a Carlos al entregar:

60. **«Transformar solo Y cartas» pasa primero por la tabla de confirmar**, con la cuenta de esas Y cartas: nada se cobra sin haber visto cuántos tokens son y cuánto saldo queda.
61. **Mientras no se conoce el saldo**, la tabla muestra «—» en «Tu saldo después» y el botón de transformar está apagado, como hoy.
62. **La nota del token devuelto va en turquesa**, porque la paleta no tiene verde (mismo criterio que el ajuste 11).
63. **Durante el avance la X y Escape hacen lo mismo que «Cerrar y seguir trabajando».** Antes la X se escondía mientras corría el lote.
64. **El aviso de avance conserva «No recargues la página mientras tanto»**: sigue siendo cierto que recargar corta el lote.
65. **Una foto rechazada se ve atenuada y sin palomita** en la cuadrícula del avance, y no sale entre las miniaturas del resultado.
66. **Si todas las fotos del lote se rechazan**, el resultado dice «No se pudo transformar ninguna carta».
67. **El aviso que sale al terminar un lote con la ventana cerrada** usa los mismos textos nuevos (cuántas se transformaron y los tokens devueltos); antes decía «Todas las cartas han sido actualizadas», que con un lote parcial ya no es cierto.
68. **Se borraron ya los textos de estilos («Simpsons», «Studio Ghibli») y de fidelidad** de esta ventana, que no se usaban; la US A7 solo tiene que comprobarlo.
69. **`useCardAI` cambió en dos puntos** (corrige lo dicho en la US A3, que no lo tocó): al empezar el lote acepta un límite de cartas, y recuerda qué cartas lleva el lote para dibujar el avance. Cómo transforma, cobra y devuelve cada foto es el mismo código.

Decisión de Carlos al revisar C1 (2026-10-11), que corrige la US A3:

70. **Lo de la IA de cada carta se pasa a la ventana «Editar carta»** y se quita la franja morada que salía al pasar el mouse: su texto no cabía en el ancho de la carta. Al pasar el mouse quedan solo los botones redondos de editar y borrar. En «Editar carta» hay un apartado «Con inteligencia artificial» con «Transformar con IA · 1 token» o, si la carta ya tiene IA, «Otra versión con IA · 1 token» y «Volver a la foto original · gratis». Cada una cierra la ventana y abre su confirmación de siempre; las condiciones para ofrecerlas (sesión, tokens, sincronización) son las de antes. La hoja de acciones del celular no cambia. Corrige lo que las instrucciones piden «al pasar el mouse» en C1 con sesión.

Ajustes de Claude con la decisión 70, avisados a Carlos al entregar:

71. **Al elegir una acción de IA se pierden los cambios de nombre o foto sin guardar**, porque la ventana se cierra; un renglón lo avisa ahí mismo.
72. **Sin tokens, o mientras la carta se sincroniza, el botón sale apagado con su explicación debajo** (antes era un texto que solo salía al dejar el mouse encima).
73. **El renglón de ayuda sobre la cuadrícula** dice, con sesión, «Haz clic en una carta para editarla o transformarla con IA. Pasa el mouse para borrarla.»; sin sesión no menciona la IA.

Decisión de Carlos (2026-10-11):

74. **Sin sesión no se ve ninguna acción de IA:** ni transformar, ni otra versión, ni volver a la foto original, ni la sección «Imagen de la carta» de la ventana de editar. La tarjeta que invita a crear cuenta («Conviértelas en cartas con IA») se queda: es una invitación, no una acción. _(Descartada: ocultar también la invitación.)_ Ya era así en casi todo; se cerró el hueco de «Volver a la foto original», que solo dependía de que la carta tuviera foto original.

Decisiones de Carlos para la US A8, rediseño de «Editar carta» (2026-10-11; respondió «todas como recomiendas» a las siete que le planteó Claude):

75. **«Editar carta» se rediseña según `docs/design/EditarCarta.dc.html`, como US A8 de esta feature.** Reemplaza la decisión 70 en lo que toca a la ventana: ya no hay apartado «Con inteligencia artificial» ni se cierra la ventana para transformar. Lo de quitar la franja morada al pasar el mouse sigue en pie.
76. **La versión nueva con IA se guarda en la carta al momento, como hasta hoy**, y las opciones de la ventana sirven para regresar a la anterior antes de salir. _(Descartada: aplicarla solo al pulsar «Guardar cambios», porque quien cancelara o recargara perdería una versión ya cobrada.)_
77. **Generar no pide confirmación:** el botón ya dice «· 1 token». **Sí se confirma al guardar con «Foto original» cuando eso borra la versión con IA**, con la confirmación que ya tenía «Volver a la foto original».
78. **Antes de generar se guarda el nombre, y la IA pinta la foto que se ve en la ventana.**
79. **No se pone el máximo de 20 letras ni su contador.** Esa regla no existe: el nombre admite hasta 100.
80. **«Otra foto» en una carta con IA:** la foto nueva queda como foto original, en uso, y las versiones con IA de la foto anterior desaparecen.
81. **La hoja de acciones del celular queda igual.**

Ajustes de Claude al construir la US A8 (2026-10-11), avisados a Carlos al entregar:

82. **La foto usada para la versión nueva se guarda junto con ella, no antes** (matiz a la decisión 78). Si la IA falla, la carta queda exactamente como estaba y la foto nueva sigue en la ventana, sin guardar.
83. **Cada opción dice cómo va:** «En uso» (la guardada), «Al guardar» (la elegida, que todavía no se guarda) o «Gratis» (se puede elegir sin costo). Sin versión con IA, su lugar dice «Aún no».
84. **Tras hacer otra versión hay hasta tres opciones:** foto original, «Con IA (anterior)» y «Con IA (nueva)». Solo se conserva la anterior inmediata, y solo mientras la ventana está abierta; al guardar o cerrar, la que no quedó en la carta se pierde.
85. **Mientras la IA pinta una carta, esa carta no se puede abrir para editarla.** Cerrar la ventana a medio proceso no lo detiene: sigue solo, como siempre.
86. **«Recortar» recorta la imagen elegida**, sea la foto o la versión con IA.
87. **La ayuda del nombre dice «Corto y fácil de cantar»**, como en las otras ventanas (la maqueta decía «gritar»), y el aviso de espera dice «hasta 1 minuto» (la maqueta decía «Unos segundos»), que es lo que tarda.
88. **Colores de la paleta:** los morados claros salen del morado de la IA, y «Gratis» va en café, no en verde.
89. **Guardar sin cambios solo cierra la ventana.** Antes volvía a subir la imagen aunque no hubiera cambiado.
90. **`useCardAI`: transformar una carta ahora devuelve la imagen nueva**, o nada si falló, para que la ventana la muestre. Cómo transforma, cobra y devuelve el token no cambió.
91. **«Editar carta» ya no lleva la mini «Así se verá»** (corrige el ajuste 53): su vista previa grande ya es la carta final. «Agregar una carta» y «Nombra tus fotos» la conservan.
92. **Si la IA falla, sale el mismo aviso de error de siempre**, encima de la ventana, que sigue abierta.

Ajustes de Claude al construir la parte 3 de la US A6, «PDF descargado» (2026-10-11), avisados a Carlos al entregar:

93. **La X y Escape cierran la ventana y dejan en la vista previa.** Antes no se podía cerrar sin elegir uno de los dos botones.
94. **«Mira cómo se juega» se abre en otra pestaña**, para no perder la ventana ni la lotería a medio terminar, y no dice «en 5 minutos», que nadie ha medido.
95. **«Ir a Mis loterías» hace lo que hacía «Completo» con sesión** (limpia lo que quedó en este navegador; la cuenta no se toca), pero lleva a Mis loterías en lugar del inicio.
96. **«+ Crear otra lotería» hace lo mismo que «Nueva lotería» en Mi cuenta:** crea la lotería con su nombre por defecto y lleva a sus cartas.
97. **Los tokens de regalo se leen del sitio** (decisión 6): si son 0 o no se saben, el recuadro solo dice «Con una cuenta la abres desde cualquier dispositivo».
98. **Si no se conoce el nombre de la lotería**, el recuadro dice «Tu lotería está guardada en Mi cuenta…», sin nombrarla.
99. **La palomita y el recuadro de «guardada» van en turquesa**, porque la paleta no tiene verde (mismo criterio que el ajuste 11).
100. **«Terminar» y «Seguir editando» hacen lo mismo que «Completo» y «Modificar»**; solo cambian de nombre.

Decisión de Carlos antes del commit (2026-10-11):

101. **La base de conocimiento se actualiza con esta feature:** `docs/contexto-negocio.md` (§6: sin sesión no se ofrece la IA; lote parcial; qué pasa con las versiones al revertir o pedir otra), `docs/casos-de-uso.md` (casos 9, 11, 12 y 13) y `docs/diseno-mockups.md` (C1, C2, C3, M4, M5, M6, M8 y la fila nueva M13). Se le presentaron los cuatro puntos y respondió que sí a los tres documentos.

Ajustes de Claude al construir la US A7 (2026-10-11), avisados a Carlos al entregar:

102. **Se borró `public/locales/`**, una copia vieja de los textos que el sitio no lee (lee `src/locales/`) pero sí publicaba, y que mencionaba «Los Simpsons» y «Studio Ghibli».
103. **Se quitaron los estilos sin uso** de `CardEditor.css`, `CardPreview.css` e `ImageEditor.css` (las pantallas anteriores), y los textos sin uso de `cardEditor` en los dos idiomas, incluidos tres que ya estaban sin uso antes de esta feature.
104. **`CardUpload.tsx` ya solo sirve para agregar una carta:** se le quitó lo que conservaba de cuando también servía para editar.

## Decisiones pendientes

Se le preguntan a Carlos, una por una, al empezar la historia que las necesita.

| Historia | Pregunta |
|---|---|
| Todas | Lo que aparezca al leer cada maqueta y no cuadre con `contexto-negocio.md` o pida un comportamiento que hoy no existe. |

## Diseño

- **Una historia por bloque** de las instrucciones, en su orden. Una o dos por sesión.
- **Solo cambia lo que se ve.** Lo que lee y guarda cartas, sincroniza, cobra tokens, genera tableros y arma el PDF no se toca; cada historia termina comprobando que esos archivos no cambiaron o que sus pruebas siguen en verde sin tocarlas.
- **Pruebas primero** en lo que toque tokens o saldos que se muestran (historias A3 y A6), como pide `CLAUDE.md`.
- **Estados.** Cada pantalla tiene datos, así que se resuelven vacío, cargando y error antes de escribir código (`docs/workflow-fe.md`).
- **Textos** en `src/locales/es` y `src/locales/en`; las claves que ya no se usen se borran en los dos idiomas.

## Grupo A — Flujo de crear

### US A1 — Barra de pasos   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como persona que arma su lotería, quiero ver en qué paso voy y si mi trabajo está guardado, para saber cuánto me falta y no temer perderlo.
- **Entrega demostrable** — En C1, C2 y C3, debajo de la barra superior, una franja blanca con «1 Tus cartas — 2 Tableros — 3 Descarga»: el paso actual con círculo naranja y los anteriores con palomita. A la derecha, «Sin cuenta, tu lotería se guarda solo en este navegador» o, con sesión, «✓ Guardado en tu cuenta». En celular solo el paso actual muestra su nombre.
- **Construido** — 2026-10-11. `CreateSteps` (`src/components/CreateSteps/`) se pinta en `AppRouter` debajo de la barra superior y solo aparece en `/cards`, `/board-count` y `/preview`. `createStepOf` y `createStepStatus` (`src/utils/createSteps.ts`) deciden qué paso toca y cómo va cada uno. Textos en `createSteps`. Pruebas en `tests/src/createSteps.test.ts`. No se tocó ninguna de las tres pantallas ni nada de lo que guarda, cobra o genera.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Sin sesión, entra a crear cartas: la franja marca el paso 1 y avisa que se guarda solo en este navegador → pasa a tableros: el paso 1 lleva palomita y el 2 va en naranja → llega a la vista previa: paso 3 → inicia sesión y repite: a la derecha dice «✓ Guardado en tu cuenta» → en el celular solo el paso actual trae su nombre.
- **Escenarios cubiertos**:
  - [x] La franja aparece en C1, C2 y C3, y en ninguna otra pantalla. (Prueba automática.)
  - [x] El paso actual y los anteriores se marcan bien en cada pantalla. (Prueba automática de qué paso toca.)
  - [ ] El aviso de la derecha cambia con y sin sesión.
  - [ ] En celular solo el paso actual muestra su nombre.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A2 — C1 Cartas, sin sesión   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero ver cuántas cartas llevo, cuántas me faltan y cómo agregar más, para armar mi baraja sin perderme.
- **Entrega demostrable** — C1 con dos columnas. A la izquierda: «Arma tu baraja», tipo de lotería (Clásico 4×4 o Kids 3×3, con su mini cuadrícula), avance («15 cartas · mínimo 24», barra) con «Siguiente: tableros» ahí mismo, «Subir fotos» y «Agregar una carta», la tarjeta de IA que invita a crear cuenta, «Consejos para buenas cartas» y los enlaces «Vaciar cartas» y «Salir sin guardar». A la derecha: «Tus cartas (N)», la cuadrícula con acciones al pasar el mouse y el recuadro para arrastrar fotos. En celular, una columna.
- **Construido** — 2026-10-11. `CardEditor.tsx`: se reacomodó lo que se ve (columna izquierda, cuadrícula y recuadro para arrastrar; la barra inferior se quitó el mismo día y «Siguiente: tableros» pasó al recuadro de avance: decisiones 49 y 50); lo que agrega, edita, borra, sincroniza y transforma cartas quedó como estaba. Estilos nuevos en `CardEditorDeck.css`; `CardEditor.css` sigue para las ventanas y el renombrado (sus reglas sin uso se limpian en la US A7). `GridModeSelector` se redibujó con sus mini cuadrículas. `deckProgress` y `pickImageFiles` (`src/utils/deckProgress.ts`) hacen la cuenta del avance y filtran lo que se arrastra. `AuthChoice` acepta una etiqueta corta para Google. Colores nuevos `--color-danger` y `--color-ai`. Textos en `cardEditor.deck`. Pruebas en `tests/src/deckProgress.test.ts`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Sin sesión, entra a crear cartas → elige Clásico: el avance dice «0 cartas · mínimo 24» → sube fotos: el contador y la barra avanzan, dice cuántas faltan y «Siguiente: tableros», en ese mismo recuadro, sigue apagado → cambia a Kids: el mínimo pasa a 15 → con las cartas suficientes el botón se pone naranja y lleva a tableros → «Vaciar cartas» pide confirmación → en el celular la cuadrícula es de tres columnas y empieza con «Agregar».
- **Escenarios cubiertos**:
  - [x] El mínimo sale del modo: 24 en Clásico y 15 en Kids, de la misma regla de hoy (`minCardsForGrid`, sin cambios).
  - [x] Avance, barra y botón «Siguiente: tableros» salen de la misma cuenta. (Prueba automática.) Falta verlo cambiar en pantalla.
  - [ ] «Subir fotos», «Agregar una carta» y arrastrar fotos hacen lo mismo que hoy.
  - [ ] La tarjeta de IA abre Google o el registro; los tokens de regalo salen del sitio.
  - [ ] «Vaciar cartas» y «Salir sin guardar» conservan sus confirmaciones.
  - [ ] Sin cartas, cargando y con error se ven bien.
  - [ ] En computadora y en celular. (Las acciones de cada carta pasan a la US A3: ajuste 15.)
  - [x] Textos en español y en inglés.

### US A3 — C1 Cartas, con sesión   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario con cuenta, quiero ver mi lotería con su nombre, cuántas cartas llevan IA y mi saldo, para transformar las que faltan sin salir de la pantalla.
- **Entrega demostrable** — C1 con sesión: «TU LOTERÍA», el nombre y el lápiz para renombrar; el panel «Cartas con IA» (transformadas, saldo, «Comprar» y el botón morado «Transformar las N restantes»); etiqueta «IA» en las cartas transformadas; la carta en proceso con su degradado y «Pintando con IA…»; acciones al pasar el mouse según la carta; en celular, la hoja de acciones al tocar una carta. Se conservan la sincronización, los bloqueos durante el lote y el límite de transformaciones.
- **Construido** — 2026-10-11. `CardEditor.tsx`: encabezado «Tu lotería» con el renombrado de siempre, panel «Cartas con IA», enlace «Ir a Mis loterías» y la pastilla «N con IA». `CardPreview.tsx`: etiqueta «IA», la carta en proceso con su degradado, botones al pasar el mouse y hoja de acciones en celular; todas las condiciones de cuándo se puede editar, borrar, revertir o transformar son las de antes, y las confirmaciones también. Estilos en `CardPreviewActions.css` y `CardEditorDeck.css`. `aiDeckSummary` (`src/utils/deckProgress.ts`) hace la cuenta del panel. En esta historia no se tocó `useCardAI` (la US A6 sí: ajuste 69), ni nada de `src/hooks/`, `src/services/`, `src/repositories/` ni `supabase/`. Pruebas, escritas antes del código, en `tests/src/aiDeckSummary.test.ts`.
- **Depende de** — US A2.
- **Cómo se prueba (guion de demo)** — Con sesión, abre una lotería → arriba su nombre; el lápiz la renombra → el panel dice cuántas llevan IA y tu saldo → transforma una carta: mientras se pinta lleva el degradado; al terminar, la etiqueta «IA» y tu saldo baja 1 → sobre una carta con IA: «Volver a la foto» (gratis) y «Otra versión · 1 token», cada una con su confirmación → en el celular, toca una carta: sube la hoja con sus acciones.
- **Escenarios cubiertos**:
  - [ ] Al pasar el mouse, cada carta muestra sus botones redondos (editar y borrar), y se alcanzan con teclado. (Viene de la US A2: ajuste 15.)
  - [ ] «Editar carta» ofrece lo de la IA de esa carta (decisión 70; la ventana se rediseñó en la US A8).
  - [x] El código que cobra y devuelve tokens no cambió; las pruebas existentes siguen en verde, sin tocarlas. Falta transformar una carta en dev para verlo de punta a punta.
  - [x] El panel cuenta bien transformadas y restantes. (Prueba automática, escrita antes del código.)
  - [x] Renombrar usa el renombrado que ya existe (mismo código).
  - [ ] «Volver a la foto» y «Otra versión» conservan sus confirmaciones (misma pieza, `CardActionConfirm`, para la carta y para la ventana de editar).
  - [ ] Durante un lote siguen bloqueadas las mismas acciones que hoy.
  - [x] La hoja de acciones de celular se cierra con Escape, tocando fuera y con su botón de cerrar. (Falta verlo en un celular.)
  - [x] Textos en español y en inglés.

### US A4 — C2 Tableros   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como persona que ya tiene su baraja, quiero elegir cuántos tableros imprimir con una sugerencia clara y ver una muestra, para decidir sin adivinar.
- **Entrega demostrable** — C2 con «¿Cuántos tableros imprimimos?», el selector con − y +, los atajos (con el sugerido marcado), el recuadro de sugerencia, «← Volver a mis cartas» y «Generar N tableros →». A la derecha (arriba en celular), un tablerito de muestra con las cartas del usuario y una pila de hojas que crece con el número.
- **Construido** — 2026-10-11. `BoardCountSelector.tsx` se redibujó: título, selector con − y +, atajos, recuadro de sugerencia y botones; la carga de cartas, el sugerido, el máximo y los mensajes de error son el mismo código de antes. `BoardPile.tsx` dibuja la muestra con la baraja que la propia pantalla lee para contar las cartas (ajuste 48). `boardCountShortcuts`, `stepBoardCount`, `sheetPileSize`, `pickSample` y `pileSheetCards` (`src/utils/boardCountPicker.ts`) hacen las cuentas. En `AppRouter`, el botón de la izquierda ahora regresa a `/cards`. Textos en `boardGenerator.count`; se borraron los de la pantalla anterior. No se tocó `boardGeneration.ts`, `useBoard` ni nada que genere o guarde tableros. Pruebas en `tests/src/boardCountPicker.test.ts`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Llega a tableros con tu baraja → en Clásico el número empieza en el sugerido, que aparece marcado entre los atajos (en Kids empieza en 5, como hoy) → pulsa + y −: el número cambia y la pila de hojas crece o se achica → «← Volver a mis cartas» te regresa a tus cartas sin borrar nada → escribe un número fuera de rango: sale el mismo mensaje de error de hoy → «Generar N tableros →» genera los tableros igual que antes.
- **Escenarios cubiertos**:
  - [x] El mínimo, el máximo, la sugerencia y los mensajes de error son los que ya calcula el selector (mismo código). Falta verlos en pantalla.
  - [x] Los atajos incluyen el sugerido una sola vez, marcado. (Prueba automática.)
  - [x] La pila tiene 2, 3, 4 o 5 hojas según el número de tableros. (Prueba automática.)
  - [x] La muestra usa 16 cartas en Clásico y 9 en Kids, y no cambia nada guardado. (Prueba automática de la cuenta; la muestra no escribe nada.)
  - [x] Generar produce los mismos tableros que antes del rediseño. (Pruebas existentes en verde, sin cambios.)
  - [ ] «← Volver a mis cartas» regresa a las cartas y no borra nada.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés.

### US A5 — C3 Vista previa   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como persona que generó sus tableros, quiero verlos como saldrán impresos y descargar el PDF desde arriba, para terminar rápido.
- **Entrega demostrable** — C3 con «¡Tus N tableros están listos!», sus pastillas y los botones «Descargar PDF», «Revolver tableros» y «Editar cartas» arriba. Los tableros en cuadrícula, cada uno como en el PDF (hoja crema, «TABLERO N» entre líneas) y con una lupa que lo abre en grande. Al final, la tarjeta «+ la baraja para recortar».
- **Construido** — 2026-10-11. `BoardPreview.tsx`: encabezado con pastillas y los tres botones arriba, cuadrícula de tableros, tarjeta de la baraja y la frase de ayuda. `BoardThumbnail.tsx`: cada tablero como hoja crema con «TABLERO N» entre líneas y el botón de lupa; cómo busca y refresca las imágenes no cambió. `useDeckSnapshot` (`src/hooks/`) lee la baraja de donde la lee el PDF, solo para contarla y dibujarla. `deckSheetCount` y `deckTileSample` (`src/utils/boardPreviewSummary.ts`) hacen la cuenta de la tarjeta. En `AppRouter`, «Revolver tableros» llama al mismo generador con la cantidad y el modo de los tableros que se ven, y con sesión abre antes la confirmación (decisión 41). Textos en `boardGenerator.preview` y `boardGenerator.sheetTitle`; se borraron los de la pantalla anterior. No se tocó `PDFService`, `src/services/pdf/`, `useBoard` ni `boardGeneration.ts`. Pruebas en `tests/src/boardPreviewSummary.test.ts`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Genera tableros → arriba dice cuántos son y trae «Descargar PDF» → cada tablero se ve como hoja; la lupa lo abre en grande → «Revolver tableros» los cambia sin salir de la pantalla: misma cantidad, otro acomodo (con sesión, pide confirmación antes) → «Editar cartas» te regresa a tus cartas → descarga el PDF: sale igual que antes.
- **Escenarios cubiertos**:
  - [x] El PDF descargado es el mismo que antes del rediseño. (Pruebas existentes en verde, sin cambios.)
  - [ ] «Revolver tableros» genera la misma cantidad con otro acomodo; con sesión pide confirmación antes y reemplaza los guardados.
  - [x] La lupa abre el tablero en grande y se alcanza con teclado (es un botón). Falta verlo en pantalla.
  - [x] La tarjeta de la baraja dice cuántas cartas y cuántas hojas son, las mismas que arma el PDF. (Prueba automática de la cuenta.)
  - [ ] En computadora (cuatro columnas) y en celular (una, con los botones apilados).
  - [x] Textos en español y en inglés.

### US A6 — Ventanas   ·   Estado: construida el 2026-10-11 (sus tres partes), pendiente de la demo de Carlos

- **Historia** — Como persona que sube fotos, transforma con IA y descarga su PDF, quiero ventanas claras que me digan qué va a pasar y qué sigue, para no dudar en cada paso.
- **Entrega demostrable** — Las ventanas rediseñadas: «Agregar una carta» y «Nombra tus fotos» (con «Así se verá» y «Siguiente foto →» en naranja); IA en lote con sus estados (confirmar, avance, resultado y sin tokens suficientes); y «PDF descargado», distinta con y sin sesión.
- **Construido** — Parte 1 de 3, 2026-10-11: «Agregar una carta», «Editar carta» y «Nombra tus fotos». `CardUpload.tsx` y `BatchUploadModal.tsx` se redibujaron; cómo se valida el nombre, se recorta, se comprime y se guarda cada carta es el mismo código de antes. `CardLivePreview` y `useCardPreview` dibujan «Así se verá» con el compositor de cartas que ya existía, sin guardar nada. `useEscapeKey` cierra con el teclado. `nextCardNumber`, `queueItemState` y `queuePercent` (`src/utils/uploadQueue.ts`) hacen las cuentas. Estilos: `CardForm.css` (formulario compartido), `CardUploadModal.css` (marco de las tres ventanas), `CardUpload.css` y `BatchUploadModal.css`. Textos en `cardUpload` y `batchUpload`; se borraron los que ya no se usan. Pruebas en `tests/src/uploadQueue.test.ts`. Parte 2 de 3, 2026-10-11: IA en lote. `AIBatchModal.tsx` se reescribió con sus cuatro vistas (confirmar, avance, resultado y «te faltan tokens»). `aiBatchPlan`, `cardsForBatch` y `batchCardState` (`src/utils/aiBatchPlan.ts`) hacen la cuenta de tokens y saldo, deciden qué cartas entran al lote y cómo va cada una; sus pruebas se escribieron antes que el código (`tests/src/aiBatchPlan.test.ts`). `useCardAI` acepta un límite al empezar el lote y recuerda sus cartas (ajuste 69). No se tocó `AIService`, `supabase/` ni nada que cobre o devuelva tokens. Textos en `aiBatchModal`. Parte 3 de 3, 2026-10-11: «PDF descargado». `ConfirmationModal.tsx` se reescribió con sus dos variantes: sin sesión (tres consejos, invitación a guardar con «Entrar con Google» y «Crear tu cuenta», «Seguir editando», «Terminar» y el aviso de que se borra) y con sesión (dos consejos, el recuadro de «guardada», «Seguir editando», «Ir a Mis loterías» y «+ Crear otra lotería»). En `AppRouter.tsx`, `handleGoToLoterias` y `handleCreateAnother` (ajustes 95 y 96). Estilos en `ConfirmationModal.css`. Textos en `modals.confirmation`. No se tocó `PDFService` ni lo que arma o descarga el PDF.
- **Depende de** — US A2 y US A3.
- **Cómo se prueba (guion de demo)** — Agrega una carta: mientras escribes el nombre, «Así se verá» cambia → sube tres fotos: avance «Foto 1 de 3» y el botón naranja «Siguiente foto →» → con sesión, abre la IA en lote: la tabla dice fotos, tokens y saldo después; al confirmar ves el avance y luego el resultado → descarga el PDF sin sesión: palomita, tres consejos, la invitación a crear cuenta, «Seguir editando», «Terminar» y el aviso de que se borra; con sesión, dos consejos, el recuadro con el nombre de tu lotería, «Ir a Mis loterías» y «+ Crear otra lotería».
- **Escenarios cubiertos**:
  - [x] Subir una o varias fotos guarda lo mismo que antes (mismo código). Falta verlo en pantalla.
  - [ ] «Así se verá» cambia mientras se escribe el nombre, con el número que le toca a la carta. (La cuenta del número tiene prueba automática.)
  - [x] La tabla de la IA en lote hace bien la cuenta de tokens y saldo. (Prueba automática, escrita antes del código.)
  - [x] Los tokens que se cobran y se devuelven no cambian. (Pruebas existentes en verde, sin cambios.) Falta transformar un lote en dev para verlo de punta a punta.
  - [ ] Sin tokens suficientes sale la ventana «Te faltan N tokens», no un botón apagado.
  - [x] «Transformar solo Y cartas» manda al lote solo las primeras Y sin IA, y un límite que no es válido no transforma nada. (Prueba automática, escrita antes del código.) Falta verlo en dev.
  - [ ] «PDF descargado» sin sesión avisa que la lotería se borra al terminar; con sesión, que está guardada.
  - [ ] Todas las ventanas se cierran con Escape y se usan con teclado. (Hecho en todas; falta verlo en pantalla.)
  - [ ] Textos en español y en inglés.

### US A7 — Limpieza   ·   Estado: construida el 2026-10-11

- **Historia** — Como dueño del sitio, quiero que no queden marcas de terceros ni textos y estilos sin uso, para no tener riesgos ni basura en el código.
- **Entrega demostrable** — Sin los estilos «Simpsons» y «Studio Ghibli» ni los textos de estilos y fidelidad que ya no se usan, en los dos idiomas. Sin estilos, textos ni imágenes de las pantallas anteriores (incluye lo que `CardUpload.tsx` conserva de cuando también servía para editar: título, imagen y texto del botón iniciales). `docs/diseno-mockups.md` al día.
- **Construido** — 2026-10-11. Fuera los estilos sin uso de `CardEditor.css` (de 1181 a 309 renglones), `CardPreview.css` (de 317 a 81) e `ImageEditor.css`; los textos sin uso de `cardEditor`, en español y en inglés; lo que `CardUpload.tsx` conservaba de cuando también editaba; y `public/locales/` (ajuste 102). Los textos de «Simpsons», «Studio Ghibli» y fidelidad de la ventana de IA ya se habían borrado en la US A6 (ajuste 68). No había imágenes de las pantallas anteriores que quitar. `docs/diseno-mockups.md`, `docs/contexto-negocio.md` y `docs/casos-de-uso.md` al día (decisión 101). Pruebas en `tests/src/createFlowCleanup.test.ts`.
- **Depende de** — US A2 a US A6.
- **Cómo se prueba (guion de demo)** — Recorre el flujo completo, con y sin sesión: nada cambió de comportamiento → en ninguna pantalla ni texto aparecen «Simpsons» ni «Ghibli».
- **Escenarios cubiertos**:
  - [x] Ningún texto ni estilo menciona marcas de terceros. (Prueba automática.)
  - [x] No quedan claves de texto sin uso de este flujo, en español ni en inglés. (Revisado con un barrido del código; las claves de los dos idiomas coinciden: prueba automática.)
  - [x] `docs/diseno-mockups.md` (C1, C2 y C3) al día, con el sí de Carlos (decisión 101).
  - [x] `npm run typecheck`, `npm run lint` y `npm test` en verde (844 pruebas).

### US A8 — «Editar carta»   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como usuario que edita una carta, quiero ver la carta como va a salir, elegir entre mi foto y la versión con IA y pedir otra versión sin salir de la ventana, para decidir con cuál me quedo sin perder lo que llevo.
- **Entrega demostrable** — «Editar carta» según `docs/design/EditarCarta.dc.html`: a la izquierda la carta final con su número y su nombre, y debajo «Recortar» y «Otra foto»; a la derecha el nombre y «Imagen de la carta», con «Foto original» y «Con IA» como opciones con miniatura y el botón «Hacer otra versión con IA · 1 token»; abajo, fijos, «Cancelar» y «Guardar cambios». La IA trabaja sin cerrar la ventana. Sin tokens, un aviso con «Comprar tokens». Sin sesión no aparece «Imagen de la carta». En celular, pantalla completa.
- **Construido** — 2026-10-11. `CardEditModal.tsx` se reescribió; ya no reutiliza el formulario de «Agregar una carta». `cardEditDraft` (`src/utils/cardEditDraft.ts`) lleva las opciones de imagen, cuál está en uso, qué se guarda y cuándo se pierde una versión con IA, y valida el nombre; sus pruebas se escribieron antes que el código (`tests/src/cardEditDraft.test.ts`). `imageToDataUrl` (`src/utils/imageDataUrl.ts`) conserva la versión que está por sobrescribirse y deja las imágenes como las necesita el guardado. En `CardEditor.tsx` la ventana recibe la carta viva, el saldo y la transformación. En `useCardAI.ts`, transformar una carta devuelve la imagen nueva (ajuste 90). Se quitó de `CardUpload.tsx` y `CardForm.css` el apartado de IA de la decisión 70. Estilos en `CardEditModal.css`. Textos en `cardEdit`. No se tocó `AIService`, `useCards`, `supabase/` ni nada que cobre o devuelva tokens.
- **Depende de** — US A3 y US A6 (parte 1).
- **Cómo se prueba (guion de demo)** — Con sesión, abre una carta con IA → a la izquierda la carta final con la etiqueta «IA»; a la derecha «Foto original · Gratis» y «Con IA · En uso» → elige «Foto original»: la vista previa cambia y dice «Al guardar» → vuelve a «Con IA» → pulsa «Hacer otra versión con IA · 1 token»: la vista previa dice «Creando otra versión…» y al terminar hay tres opciones, con «Con IA (nueva)» en uso y tu saldo 1 abajo → elige «Con IA (anterior)» y guarda: la carta queda con la anterior → abre otra carta con IA, elige «Foto original» y guarda: pide confirmación antes de borrar la versión con IA → con 0 tokens: en lugar del botón sale «Necesitas 1 token…» con «Comprar tokens» → sin sesión: no aparece «Imagen de la carta» → en el celular: pantalla completa, carta chica con «Recortar» y «Otra foto» al lado, y «Guardar cambios» abajo.
- **Escenarios cubiertos**:
  - [x] Qué se guarda en cada caso (nombre, recorte, foto nueva, volver a la foto, regresar a la versión anterior) y cuándo se pierde una versión con IA. (Prueba automática, escrita antes del código.)
  - [x] El nombre sigue las reglas de siempre: no vacío, sin repetir y sin emojis. (Prueba automática.)
  - [x] El código que cobra y devuelve tokens no cambió; las pruebas existentes siguen en verde, sin tocarlas. Falta transformar una carta en dev para verlo de punta a punta.
  - [ ] La versión nueva queda guardada en la carta aunque se cierre la ventana o se cancele.
  - [ ] Si la IA falla, la carta queda como estaba y el token se devuelve.
  - [ ] Guardar con «Foto original» en una carta con IA pide confirmación.
  - [ ] «Otra foto» en una carta con IA deja la foto nueva y quita las versiones con IA.
  - [ ] Sin tokens sale el aviso con «Comprar tokens»; sin sesión no aparece nada de IA.
  - [ ] «Recortar» abre el editor de recorte de siempre dentro de la ventana.
  - [ ] En computadora y en celular (pantalla completa, con «Guardar cambios» fijo abajo).
  - [ ] Se cierra con Escape y se usa con teclado.
  - [x] Textos en español y en inglés.
