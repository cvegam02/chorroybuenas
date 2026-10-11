# FEAT-34 — Rediseño de «Crear tu lotería» (C1, C2, C3 y sus ventanas)

**Estado: Carlos dio el visto bueno a las siete historias el 2026-10-11. Construida la US A1 ese día, guardada en la rama y pendiente de su demo. Faltan A2 a A7. Rama `feature/rediseno-crear-loteria`, creada desde `dev` (que ya trae FEAT-32 y FEAT-33, del PR #52).**

**Contexto.** Carlos pidió el 2026-10-11 rediseñar el flujo de crear una lotería —C1 Cartas (`/cards`), C2 Tableros (`/board-count`), C3 Vista previa (`/preview`) y sus ventanas— para que quede como las maquetas `docs/referencia-diseno/crear-*.html`. El detalle de cada pantalla está en [`docs/referencia-diseno/INSTRUCCIONES-CREAR-LOTERIA.md`](../referencia-diseno/INSTRUCCIONES-CREAR-LOTERIA.md): aquí no se repite. Las maquetas son referencia visual; no se copia su HTML, y las imágenes de `crear-img/` son solo de ejemplo y no van al sitio.

**Es solo diseño y textos.** No cambian reglas de negocio, cobros, tokens, el guardado, la forma de generar tableros ni el PDF. Si una maqueta pide un comportamiento que hoy no existe, se le pregunta a Carlos antes de construirlo. Cambia la descripción de C1, C2 y C3 en `docs/diseno-mockups.md`: cada cambio se presenta con los 4 puntos antes de editar.

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

## Decisiones pendientes

Se le preguntan a Carlos, una por una, al empezar la historia que las necesita.

| Historia | Pregunta |
|---|---|
| A4 | La maqueta dice «El mínimo es 8» tableros y propone los atajos 8, 10, 16 y 20. En FEAT-32 se quitó «mínimo 8 tableros» de inicio porque esa regla no está en `contexto-negocio.md`. Hay que ver qué mínimo aplica hoy el selector y qué texto va. |
| A6 | «Transformar solo Y cartas» cuando no alcanzan los tokens: hoy no existe (el botón solo se desactiva). Es un comportamiento nuevo que toca tokens; las instrucciones piden preguntar antes. |
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

### US A2 — C1 Cartas, sin sesión   ·   Estado: por hacer

- **Historia** — Como visitante, quiero ver cuántas cartas llevo, cuántas me faltan y cómo agregar más, para armar mi baraja sin perderme.
- **Entrega demostrable** — C1 con dos columnas. A la izquierda: «Arma tu baraja», tipo de lotería (Clásico 4×4 o Kids 3×3, con su mini cuadrícula), avance («15 de 24 cartas», barra), «Subir fotos» y «Agregar una carta», la tarjeta de IA que invita a crear cuenta, «Consejos para buenas cartas» y los enlaces «Vaciar cartas» y «Salir sin guardar». A la derecha: «Tus cartas (N)», la cuadrícula con acciones al pasar el mouse y el recuadro para arrastrar fotos. Abajo, la barra fija con el resumen y «Siguiente: tableros». En celular, una columna.
- **Construido** — —
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Sin sesión, entra a crear cartas → elige Clásico: el avance dice «0 de 24 cartas» → sube fotos: el contador y la barra avanzan y la barra de abajo dice cuántas faltan, con el botón apagado → cambia a Kids: el mínimo pasa a 15 → con las cartas suficientes el botón se pone naranja y lleva a tableros → «Vaciar cartas» pide confirmación → en el celular la cuadrícula es de tres columnas y empieza con «Agregar».
- **Escenarios cubiertos**:
  - [ ] El mínimo sale del modo: 24 en Clásico y 15 en Kids, de la misma regla de hoy.
  - [ ] Avance, barra y barra inferior dicen lo mismo y cambian al agregar o borrar. (Prueba automática de la cuenta.)
  - [ ] «Subir fotos», «Agregar una carta» y arrastrar fotos hacen lo mismo que hoy.
  - [ ] La tarjeta de IA abre Google o el registro; los tokens de regalo salen del sitio.
  - [ ] «Vaciar cartas» y «Salir sin guardar» conservan sus confirmaciones.
  - [ ] Sin cartas, cargando y con error se ven bien.
  - [ ] En computadora y en celular; las acciones de cada carta se alcanzan con teclado.
  - [ ] Textos en español y en inglés.

### US A3 — C1 Cartas, con sesión   ·   Estado: por hacer

- **Historia** — Como usuario con cuenta, quiero ver mi lotería con su nombre, cuántas cartas llevan IA y mi saldo, para transformar las que faltan sin salir de la pantalla.
- **Entrega demostrable** — C1 con sesión: «TU LOTERÍA», el nombre y el lápiz para renombrar; el panel «Cartas con IA» (transformadas, saldo, «Comprar» y el botón morado «Transformar las N restantes»); etiqueta «IA» en las cartas transformadas; la carta en proceso con su degradado y «Pintando con IA…»; acciones al pasar el mouse según la carta; en celular, la hoja de acciones al tocar una carta. Se conservan la sincronización, los bloqueos durante el lote y el límite de transformaciones.
- **Construido** — —
- **Depende de** — US A2.
- **Cómo se prueba (guion de demo)** — Con sesión, abre una lotería → arriba su nombre; el lápiz la renombra → el panel dice cuántas llevan IA y tu saldo → transforma una carta: mientras se pinta lleva el degradado; al terminar, la etiqueta «IA» y tu saldo baja 1 → sobre una carta con IA: «Volver a la foto» (gratis) y «Otra versión · 1 token», cada una con su confirmación → en el celular, toca una carta: sube la hoja con sus acciones.
- **Escenarios cubiertos**:
  - [ ] Los tokens que se cobran y se devuelven son los mismos que antes del rediseño. (Pruebas existentes en verde, sin cambios.)
  - [ ] El panel cuenta bien transformadas y restantes. (Prueba automática, escrita antes del código.)
  - [ ] Renombrar usa el renombrado que ya existe.
  - [ ] «Volver a la foto» y «Otra versión» conservan sus confirmaciones.
  - [ ] Durante un lote siguen bloqueadas las mismas acciones que hoy.
  - [ ] La hoja de acciones de celular se cierra con Escape y tocando fuera.
  - [ ] Textos en español y en inglés.

### US A4 — C2 Tableros   ·   Estado: por hacer

- **Historia** — Como persona que ya tiene su baraja, quiero elegir cuántos tableros imprimir con una sugerencia clara y ver una muestra, para decidir sin adivinar.
- **Entrega demostrable** — C2 con «¿Cuántos tableros imprimimos?», el selector con − y +, los atajos (con el sugerido marcado), el recuadro de sugerencia, «← Volver a mis cartas» y «Generar N tableros →». A la derecha (arriba en celular), un tablerito de muestra con las cartas del usuario y una pila de hojas que crece con el número.
- **Construido** — —
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Llega a tableros con tu baraja → el número empieza en el sugerido, que aparece marcado entre los atajos → pulsa + y −: el número cambia y la pila de hojas crece o se achica → escribe un número fuera de rango: sale el mismo mensaje de error de hoy → «Generar N tableros →» genera los tableros igual que antes.
- **Escenarios cubiertos**:
  - [ ] El mínimo, el máximo, la sugerencia y los mensajes de error son los que ya calcula el selector.
  - [ ] Los atajos incluyen el sugerido una sola vez, marcado. (Prueba automática.)
  - [ ] La pila tiene 2, 3, 4 o 5 hojas según el número de tableros. (Prueba automática.)
  - [ ] La muestra usa 16 cartas en Clásico y 9 en Kids, y no cambia nada guardado.
  - [ ] Generar produce los mismos tableros que antes del rediseño. (Pruebas existentes en verde, sin cambios.)
  - [ ] En computadora y en celular.
  - [ ] Textos en español y en inglés.

### US A5 — C3 Vista previa   ·   Estado: por hacer

- **Historia** — Como persona que generó sus tableros, quiero verlos como saldrán impresos y descargar el PDF desde arriba, para terminar rápido.
- **Entrega demostrable** — C3 con «¡Tus N tableros están listos!», sus pastillas y los botones «Descargar PDF», «Revolver tableros» y «Editar cartas» arriba. Los tableros en cuadrícula, cada uno como en el PDF (hoja crema, «TABLERO N» entre líneas) y con una lupa que lo abre en grande. Al final, la tarjeta «+ la baraja para recortar».
- **Construido** — —
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Genera tableros → arriba dice cuántos son y trae «Descargar PDF» → cada tablero se ve como hoja; la lupa lo abre en grande → «Revolver tableros» los cambia (con sesión, pide confirmación) → «Editar cartas» te regresa a tus cartas → descarga el PDF: sale igual que antes.
- **Escenarios cubiertos**:
  - [ ] El PDF descargado es el mismo que antes del rediseño. (Pruebas existentes en verde, sin cambios.)
  - [ ] «Revolver tableros» conserva su confirmación con sesión.
  - [ ] La lupa abre el tablero en grande y se alcanza con teclado.
  - [ ] La tarjeta de la baraja dice cuántas cartas y cuántas hojas son. (Prueba automática de la cuenta.)
  - [ ] En computadora (cuatro columnas) y en celular (una, con los botones apilados).
  - [ ] Textos en español y en inglés.

### US A6 — Ventanas   ·   Estado: por hacer

- **Historia** — Como persona que sube fotos, transforma con IA y descarga su PDF, quiero ventanas claras que me digan qué va a pasar y qué sigue, para no dudar en cada paso.
- **Entrega demostrable** — Las ventanas rediseñadas: «Agregar una carta» y «Nombra tus fotos» (con «Así se verá» y «Siguiente foto →» en naranja); IA en lote con sus estados (confirmar, avance, resultado y sin tokens suficientes); y «PDF descargado», distinta con y sin sesión.
- **Construido** — —
- **Depende de** — US A2 y US A3.
- **Cómo se prueba (guion de demo)** — Agrega una carta: mientras escribes el nombre, «Así se verá» cambia → sube tres fotos: avance «Foto 1 de 3» y el botón naranja «Siguiente foto →» → con sesión, abre la IA en lote: la tabla dice fotos, tokens y saldo después; al confirmar ves el avance y luego el resultado → descarga el PDF sin sesión: palomita, tres consejos y la invitación a crear cuenta; con sesión, el recuadro verde con el nombre de tu lotería.
- **Escenarios cubiertos**:
  - [ ] Subir una o varias fotos guarda lo mismo que antes.
  - [ ] La tabla de la IA en lote hace bien la cuenta de tokens y saldo. (Prueba automática, escrita antes del código.)
  - [ ] Los tokens que se cobran y se devuelven no cambian. (Pruebas existentes en verde, sin cambios.)
  - [ ] Sin tokens suficientes sale la ventana «Te faltan N tokens», no un botón apagado.
  - [ ] «PDF descargado» sin sesión avisa que la lotería se borra al terminar; con sesión, que está guardada.
  - [ ] Todas las ventanas se cierran con Escape y se usan con teclado.
  - [ ] Textos en español y en inglés.

### US A7 — Limpieza   ·   Estado: por hacer

- **Historia** — Como dueño del sitio, quiero que no queden marcas de terceros ni textos y estilos sin uso, para no tener riesgos ni basura en el código.
- **Entrega demostrable** — Sin los estilos «Simpsons» y «Studio Ghibli» ni los textos de estilos y fidelidad que ya no se usan, en los dos idiomas. Sin estilos, textos ni imágenes de las pantallas anteriores. `docs/diseno-mockups.md` al día.
- **Construido** — —
- **Depende de** — US A2 a US A6.
- **Cómo se prueba (guion de demo)** — Recorre el flujo completo, con y sin sesión: nada cambió de comportamiento → en ninguna pantalla ni texto aparecen «Simpsons» ni «Ghibli».
- **Escenarios cubiertos**:
  - [ ] Ningún texto ni estilo menciona marcas de terceros. (Prueba automática.)
  - [ ] No quedan claves de texto sin uso de este flujo, en español ni en inglés.
  - [ ] `docs/diseno-mockups.md` (C1, C2 y C3) al día, con el sí de Carlos.
  - [ ] `npm run typecheck`, `npm run lint` y `npm test` en verde.
