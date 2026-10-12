# FEAT-37 — Rediseño del detalle de una lotería temática (P6)

**Estado: definida con Carlos el 2026-10-11, en la rama `feature/rediseno-detalle-tematica`, creada desde `dev`. Construidas sus cinco historias (US A1 a A5) ese mismo día. Carlos la revisó en su computadora el 2026-10-11 y dijo que todo se ve bien. Fusionada a `dev` ese mismo día con un merge directo, sin PR, porque Carlos lo pidió así; se publica en dev.chorroybuenas.com.mx cuando `dev` se sube a GitHub. Falta la demo de Carlos ahí, con el guion de cada historia. A producción pasa después, con el PR de `dev` a `main`, cuando Carlos confirme lo probado en dev.**

**Contexto.** Carlos pidió el 2026-10-11 rediseñar el detalle de una lotería temática (P6, `/tematicas/:id`) para que quede como las maquetas `docs/design/Tematica.dc.html` (escritorio, sin sesión), `TematicaMobile.dc.html` (celular, 768 px o menos) y `TematicaEstados.dc.html` (caja de compra, avisos y carta de muestra grande). Las imágenes `/_blob/` de las maquetas son de ejemplo: la página usa la portada y las muestras reales (`SeasonalRepository.previewUrl`).

**Es diseño y textos sobre lógica que ya existe.** No cambian reglas de negocio, ni cómo se crea el pago, ni cómo se lee el regreso de Mercado Pago, ni cómo se sabe si la cuenta ya tiene la lotería. Se conservan los metadatos de la página (`applyPageMeta`), la referencia en dólares para inglés, la carga con esqueleto y el error con «Reintentar».

## Decisiones tomadas con el usuario

Del pedido de Carlos (2026-10-11):

1. **Enlace «← Temáticas» arriba.**
2. **Dos columnas en escritorio.** Izquierda: portada grande y debajo «Cartas de muestra» en una fila de 6, con «6 de las N cartas» solo cuando `showsSampleNote` sea cierto. Derecha: la caja de compra, con la temática como etiqueta, título, descripción, etiquetas (modo según `grid_size`, N cartas y N tableros si existen), precio en «Pago único», botón «Comprar» y la lista de cuatro garantías (Mercado Pago, descarga inmediata, se queda en Mi cuenta, es digital).
3. **Sin sesión**, debajo del botón va «Necesitas una cuenta gratis para comprar… Inicia sesión», que abre `EmailAuthModal` como hoy.
4. **«Qué incluye el PDF» en 4 tarjetas**, y abajo dos bloques: «¿Primera vez jugando?» (lleva a `/como-se-juega`) y «¿Mejor con tus fotos?» (lleva a crear lotería).
5. **Celular:** todo apilado, muestras en una fila que se desliza a los lados y una barra fija abajo con el precio y «Comprar».
6. **La caja cambia según el estado, con la lógica que ya existe**, siguiendo los paneles de `TematicaEstados`:
   - `isStartingPayment` → botón deshabilitado «Abriendo Mercado Pago…».
   - `buyFailed` → aviso rojo debajo y el botón dice «Intentar de nuevo».
   - aviso `confirming` → «Confirmando tu pago…» arriba y la caja atenuada.
   - `isOwned` (o aviso `success`) → aviso verde «¡Listo! Ya es tuya», etiqueta «Ya es tuya», botón «Descargar PDF» y enlace a Mi cuenta.
   - `isPending` → etiqueta «Esperando pago», texto explicativo y botón «Ir a Mi cuenta».
   - aviso `cancel` → «No se completó el pago» y botón «Intentar de nuevo».
   - no disponible → bloque punteado con «Ver el catálogo» y «Mi cuenta».
   - Los avisos que hoy se pueden cerrar conservan su botón de cerrar.
7. **Carta de muestra grande** con flechas de anterior y siguiente y «Muestra N de M».
8. **Textos nuevos en español y en inglés.**

Respuestas de Carlos a los choques con el código (2026-10-11):

9. **La caja de compra no se queda pegada al bajar en escritorio.** `html` y `body` tienen `overflow-x: hidden` en `src/index.css` y eso anula `position: sticky`. La caja queda arriba a la derecha; la barra de celular sí es fija, con `position: fixed`, como la de hoy. _(Descartada: corregir la causa en `index.css`, porque cambia todo el sitio —la barra de navegación y el panel de administración también empezarían a pegarse—; queda para una feature aparte.)_
10. **Colores:** a la paleta se agrega solo el morado de temporada (`#6d28d9` sobre `#ede9fe`), porque Carlos lo pidió expresamente. Los demás colores de la maqueta que no están en la paleta (el borde `#fde4cc`, el verde de «Ya es tuya», el ámbar de «Esperando pago», el rojo claro del error y el fondo oscuro de la portada) se cambian por su equivalente, como en FEAT-35 y FEAT-36. _(Descartada: agregar todos a la paleta.)_

Ajustes de Claude al construir las US A1 y A2 (2026-10-11), avisados a Carlos al entregar:

11. **La etiqueta del modo dice «Clásico 4×4» o «Niños 3×3»**, con los textos que ya usan Mi cuenta y la página de una lotería. El catálogo (P5) sigue diciendo «Kids»; no se toca.
12. **En el bloque «ya no está disponible», «Mi cuenta» solo sale con sesión iniciada.** Sin sesión no hay cuenta a la cual ir.
13. **El aviso de «No se pudo abrir Mercado Pago» lleva el texto en café y el ícono en rojo**, sobre fondo rojo claro: el rojo de la paleta no se lee bien como texto chico sobre ese fondo.
14. **La portada se muestra cuadrada**, como en el catálogo (P5) y en la maqueta.
15. **En celular el pie de página deja libre el alto de la barra de compra**, para que la barra no lo tape al llegar al final.
16. **La descripción vive en la caja**, sin título propio; el apartado «Descripción» desaparece.

Ajustes de Claude al construir las US A3 y A4 (2026-10-11), avisados a Carlos al entregar:

17. **Las cartas dibujadas en «¿Mejor con tus fotos?» son las dos del bloque parecido del catálogo (P5)**, de `public/media/inicio/cartas/`; las de la maqueta eran de ejemplo.
18. **En celular las tarjetas de «Qué incluye el PDF» van de dos en dos y sin ícono**, como en la maqueta, pero con los mismos textos que en computadora.
19. **Con una sola muestra, la ventana grande no trae flechas ni contador.**

Propuestas de Claude que Carlos dio por buenas al ver la página (2026-10-11):

20. **Textos de la maqueta que no cuadraban con los datos:**
  - «Sin marca de agua: limpio, como lo ves en las muestras» → «Sin marca de agua: la marca solo va en las muestras», porque las muestras sí la llevan (§18 del documento de negocio).
  - «Nueva» sobre la portada y «· Temporada actual» en la etiqueta: se omiten; no hay dato que lo diga. La etiqueta lleva solo el nombre de la temática.
  - «Crea tu propia lotería de Halloween con tu familia disfrazada» → «Crea tu propia lotería con las fotos de tu familia. Es gratis.», porque el bloque sale en todas las temáticas.
  - «Terminó su temporada. Si la compraste, sigue en tu cuenta.» → solo «Si la compraste, sigue en tu cuenta.», porque el bloque también sale con un enlace equivocado.
  - Sin número de cartas o de tableros: se omiten esa etiqueta y esa tarjeta de «Qué incluye», como hoy.
21. **Celular.** La barra de abajo sigue a la caja: «Abriendo Mercado Pago…», «Intentar de nuevo», «Descargar PDF» si ya es tuya, «Ir a Mi cuenta» si el pago está pendiente; no sale mientras carga, con error ni si la lotería no está disponible. Los mismos bloques y textos que en escritorio, apilados (la maqueta de celular no trae «¿Primera vez jugando?» y acorta los textos de «Qué incluye»).
22. **El aviso verde «¡Listo! Ya es tuya» sale solo al volver de Mercado Pago**, como hoy. En una visita normal a una lotería ya comprada sale la caja con «Ya es tuya» y «Descargar PDF», sin aviso.

## Decisiones pendientes

Ninguna.

## Diseño

**Pantalla:** P6, zona Pública. No cambia de lugar ni de dirección.

**Orden en escritorio.** Enlace «← Temáticas» → aviso del regreso de Mercado Pago (si hay) → dos columnas: a la izquierda la portada cuadrada y la fila de muestras; a la derecha la caja de compra → «Qué incluye el PDF» → «¿Primera vez jugando?» y «¿Mejor con tus fotos?» lado a lado.

**Orden en celular (768 px o menos).** Enlace → aviso → portada → etiqueta de temática, título, etiquetas y descripción (y, si aplica, la etiqueta y el texto del estado) → muestras en fila deslizable → «Qué incluye el PDF» en dos columnas → garantías → los dos bloques. El precio y la acción van en la barra fija de abajo; la página deja espacio al final para que la barra no tape el pie.

**Caja de compra.** Una sola pieza (`SeasonalBuyBox`) dibuja la caja y la barra de celular a partir de un estado: `idle`, `starting`, `failed`, `confirming`, `cancelled`, `owned` o `pending`. El estado lo decide una función sin efectos (`seasonalBuyState`), con esta prioridad: ya es tuya → pago pendiente → abriendo Mercado Pago → confirmando → no se pudo iniciar → pago no completado → normal. `SeasonalDetail` conserva los efectos y `handleBuy` tal como están.

**Colores.** Morado de temporada: dos variables nuevas en `src/index.css` y en `docs/sistema-diseno.md`. Lo demás, de la paleta.

**Carta de muestra grande.** `CardPreviewModal` ya tiene flechas y contador opcionales desde FEAT-36; aquí se activan. Para que diga «Muestra 3 de 6», «Muestra anterior» y «Muestra siguiente» se le agregan textos opcionales. La página de una lotería (U2) y el editor de cartas no cambian. Las flechas conservan su color de hoy.

**«Descargar PDF».** `SeasonalDownloadButton` gana una variante grande con ícono para esta página; en Mi cuenta se ve igual que hoy.

## Grupo A — Detalle de lotería temática

### US A1 — Acomodo nuevo y caja de compra   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero ver la portada, las muestras, lo que trae la lotería y su precio de un vistazo, para decidir si la compro.
- **Entrega demostrable** — La página con el enlace «← Temáticas», la portada grande, la fila de muestras con su nota, y la caja de compra con etiqueta de temática, título, descripción, etiquetas, «Pago único» con el precio, «Comprar» y las cuatro garantías. Sin sesión, el texto de «Necesitas una cuenta gratis…» con «Inicia sesión». En celular, todo apilado y la barra fija de abajo. Carga con esqueleto y error con «Reintentar».
- **Construido** — 2026-10-11. `SeasonalDetail` (`src/components/Seasonal/`) acomoda la portada, la caja y las muestras en una rejilla que en celular se apila; sus efectos y `handleBuy` no cambiaron. `SeasonalBuyBox.tsx` trae `SeasonalBuyPanel` (precio y acción; `variant="box"` en la caja y `variant="bar"` en la barra fija de celular) y `SeasonalGuarantees`; estilos en `SeasonalBuyBox.css` y `SeasonalDetail.css`. Morado de temporada: `--color-season` y `--color-season-light` en `src/index.css` y en `docs/sistema-diseno.md`. Textos nuevos en `seasonal.detail`. Prueba: `tests/src/seasonalBuyState.test.ts` (textos).
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — Sin sesión, abre Temáticas → «Ver lotería»: arriba «← Temáticas»; a la izquierda la portada y debajo las cartas de muestra en una fila; a la derecha la caja con el nombre de la temática en morado, el título, la descripción, las etiquetas, el precio y «Comprar» → debajo del botón dice que necesitas una cuenta; toca «Inicia sesión» y se abre la ventana de siempre → inicia sesión: ese texto cambia por «Te llevamos a Mercado Pago para pagar» → cambia a inglés: junto al precio sale la referencia en dólares → en celular: todo en una columna, las muestras se deslizan a los lados y abajo queda fija la barra con el precio y «Comprar».
- **Escenarios cubiertos**:
  - [ ] Portada y muestras reales; sin portada o sin muestras, esa parte no sale.
  - [ ] «6 de las N cartas» solo cuando las muestras son menos que las cartas.
  - [ ] Etiquetas: modo según el tamaño del tablero; cartas y tableros solo si la ficha los tiene.
  - [ ] Sin sesión: «Comprar» e «Inicia sesión» abren la ventana de inicio de sesión.
  - [ ] En inglés: referencia en dólares y su aclaración.
  - [ ] Esqueleto al cargar y error con «Reintentar».
  - [ ] Los metadatos de la página siguen saliendo solo en una lotería publicada.
  - [ ] En computadora y en celular (barra fija abajo, sin tapar el pie).
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A2 — Estados de la caja y avisos   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como comprador, quiero que la página me diga con claridad en qué va mi compra, para saber qué hacer después.
- **Entrega demostrable** — La caja y la barra de celular en cada estado (abriendo Mercado Pago, no se pudo iniciar, confirmando, ya es tuya, esperando pago, pago no completado) con sus avisos arriba, y el bloque punteado de «ya no está disponible».
- **Construido** — 2026-10-11. `seasonalBuyStateOf` (`src/utils/seasonalBuyState.ts`) decide el estado de la caja a partir de lo que `SeasonalDetail` ya sabía; `SeasonalBuyPanel` dibuja cada estado en la caja y en la barra. `SeasonalDetailNotice` es el aviso de arriba, con ícono y botón redondo de cerrar. `SeasonalDownloadButton` gana `size="large"` (a todo el ancho y con ícono); en Mi cuenta se usa sin él y queda igual. El bloque punteado de «ya no está disponible» está en `SeasonalDetail`. Prueba: `tests/src/seasonalBuyState.test.ts`.
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — Con sesión, toca «Comprar»: el botón se apaga y dice «Abriendo Mercado Pago…» → en Mercado Pago, regresa sin pagar: arriba «No se completó el pago» con su botón de cerrar y el botón dice «Intentar de nuevo» → paga con tarjeta de prueba y regresa: «Confirmando tu pago…» con la caja atenuada y, enseguida, el aviso verde «¡Listo! Ya es tuya», la etiqueta «Ya es tuya», «Descargar PDF» y el enlace a Mi cuenta → cierra el aviso y recarga: la caja sigue en «Ya es tuya» → con otra lotería, paga en efectivo: «Tu pago está en proceso», la etiqueta «Esperando pago», el texto y «Ir a Mi cuenta» → abre una lotería despublicada que no compraste: el bloque punteado con «Ver el catálogo» y «Mi cuenta» → repite en celular: la barra de abajo cambia igual.
- **Escenarios cubiertos**:
  - [x] El estado de la caja sale en el orden de prioridad del diseño. (Prueba automática.)
  - [ ] Abriendo Mercado Pago: botón deshabilitado y «No cierres esta página».
  - [ ] No se pudo iniciar: aviso rojo debajo y «Intentar de nuevo».
  - [ ] Confirmando: aviso arriba, caja atenuada y botón deshabilitado.
  - [ ] Ya es tuya: etiqueta, «Descargar PDF» y enlace a Mi cuenta; sin precio.
  - [ ] Esperando pago: etiqueta, texto y «Ir a Mi cuenta»; sin botón de comprar.
  - [ ] Pago no completado: aviso que se puede cerrar y «Intentar de nuevo»; al cerrarlo el botón vuelve a «Comprar».
  - [ ] No disponible: bloque punteado; quien la compró la sigue viendo.
  - [ ] Los avisos de éxito, pendiente y cancelado se pueden cerrar; «Confirmando» no.
  - [ ] En computadora y en celular (barra).
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A3 — «Qué incluye el PDF» y los dos bloques   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero saber qué trae el PDF y a dónde ir si quiero aprender a jugar o hacer la mía, para no quedarme con dudas.
- **Entrega demostrable** — «Qué incluye el PDF» en tarjetas con ícono (tableros, cartas para cantar, tamaño carta, sin marca de agua) y los bloques «¿Primera vez jugando?» y «¿Mejor con tus fotos?».
- **Construido** — 2026-10-11. `SeasonalDetailExtras.tsx` (`src/components/Seasonal/`, estilos en `SeasonalDetailExtras.css`) trae `SeasonalIncludes` (las tarjetas; las de tableros y de cartas solo con su número) y `SeasonalDetailLinks` (los dos bloques). En celular, las garantías van entre «Qué incluye el PDF» y los bloques. Textos en `seasonal.detail.includes`, `firstTime` y `ownPhotos`. Prueba: `tests/src/seasonalBuyState.test.ts` (textos).
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — Baja en el detalle: «Qué incluye el PDF» con cuatro tarjetas → abajo, «¿Primera vez jugando?»: «Ver cómo se juega» abre ¿Cómo se juega? → «¿Mejor con tus fotos?»: «Crear mi lotería» abre el primer paso de crear → en celular, las tarjetas van de dos en dos y los bloques, uno debajo del otro.
- **Escenarios cubiertos**:
  - [ ] Las tarjetas de tableros y de cartas solo salen si la ficha tiene el número.
  - [ ] Los dos enlaces llevan a `/como-se-juega` y a crear lotería.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A4 — Carta de muestra grande con flechas   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero pasar de una muestra a otra sin cerrar la ventana, para verlas todas rápido.
- **Entrega demostrable** — Al tocar una muestra, la ventana grande con flechas de anterior y siguiente y «Muestra N de M».
- **Construido** — 2026-10-11. `CardPreviewModal` acepta textos propios en `navigation.labels` (anterior, siguiente y contador); sin ellos dice lo de siempre, así que la página de una lotería y el editor de cartas no cambian. `SeasonalDetail` guarda el número de la muestra abierta y le pasa la navegación cuando hay más de una. Textos `samplePosition`, `samplePrevious` y `sampleNext`. Prueba: `tests/src/seasonalBuyState.test.ts` (textos).
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — Toca la tercera muestra: se abre grande y dice «Muestra 3 de 6» → la flecha derecha pasa a la 4; en la última, la flecha derecha está apagada → las flechas del teclado también cambian de carta y Esc cierra → abre una carta grande en la página de una lotería tuya: sigue diciendo «3 de 24» y «Editar esta carta», sin cambios.
- **Escenarios cubiertos**:
  - [ ] Flechas y contador en las muestras; apagadas en la primera y la última.
  - [ ] Con una sola muestra no salen flechas ni contador.
  - [ ] La página de una lotería y el editor de cartas se ven igual que antes.
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A5 — Limpieza y documentos   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como quien mantiene el sitio, quiero que no queden estilos ni textos sin uso y que los documentos digan lo que hay.
- **Entrega demostrable** — Sin estilos ni textos del detalle anterior; el morado de temporada en `docs/sistema-diseno.md`; la descripción de P6 al día en `docs/diseno-mockups.md` (con la confirmación de Carlos); este archivo con sus «Construido».
- **Construido** — 2026-10-11. `SeasonalDetail.css` se reescribió sin los estilos del detalle anterior. Se quitaron de `seasonal.detail` los textos que ya no usa ninguna pantalla (`samplesNote`, `includesMode`, `includesPdf`, `descriptionTitle`, `digitalNote`). El morado de temporada está en `docs/sistema-diseno.md`. La descripción de P6 en `docs/diseno-mockups.md` se actualizó con la confirmación de Carlos (2026-10-11).
- **Depende de** — A1 a A4.
- **Cómo se prueba (guion de demo)** — Recorre el detalle en computadora y en celular: nada se ve roto ni distinto de lo entregado en A1 a A4.
- **Escenarios cubiertos**:
  - [x] No quedan estilos ni textos del detalle anterior sin uso.
  - [x] `npm run typecheck`, `npm run lint` y `npm test` pasan (998 pruebas, 2026-10-11).
  - [x] Documentos al día antes del commit: esta feature, `docs/sistema-diseno.md` y P6 en `docs/diseno-mockups.md`.
