# FEAT-24 — Las loterías «de temporada» pasan a llamarse «temáticas», y su página explica cómo funcionan

**Estado: US A4 (el inicio anuncia las temáticas) construida el 2026-10-07 en la rama `feature/loterias-tematicas` y probada por Carlos en local ese día («todo funciona»); va a `dev` con el PR #39, junto con el logo y los íconos nuevos del sitio; sin migración ni cambios en funciones. Lo demás, ✅ hecho — US A3 (descargar el PDF desde la ficha de administración) construida el 2026-10-07 y probada por Carlos ese día («funciona»); va a `dev` con el PR #37, sin migración ni cambios en funciones. US A1 y US A2 — construidas el 2026-10-07 en la rama `feature/loterias-tematicas` (creada desde `dev`), que entró a `dev` con el PR #35 y a `main` con el PR #36 el 2026-10-07, fusionados por Carlos; en producción desde ese día, donde Carlos la revisó («todo se ve bien»). Sin migración. La función de cobro `create-seasonal-preference` cambia: desplegada en dev (`vjglrfofyzvyvaetakpu`) el 2026-10-07 a petición de Carlos y en producción (`bdruzgjboxalpywljemk`) ese mismo día, también a petición suya («solo falta que mandes la función a prod»), después de fusionar a `main`.**

**Contexto.** Carlos pidió el 2026-10-07 cambiar el enfoque de las «Loterías de temporada» (FEAT-17): «mejor vamos a llamarlas Temáticas, y vamos a dar ese enfoque en todos lados del flujo». «Temporada» amarra el catálogo a fechas del año (Halloween, Navidad); «temática» admite también ocasiones sin fecha (baby shower, bodas, cumpleaños). Pidió además que la página del catálogo deje de estar «muy pelona»: que explique cómo se usan y cómo se compran.

**Fuera de esta feature.** Ninguna regla de negocio cambia: precio, pago, cuenta obligatoria para comprar, fechas opcionales de publicación, descarga y reembolsos siguen como en `contexto-negocio.md` §18. No se renombran tablas, migraciones ni nombres en el código (`seasons`, `seasonal_loterias`, `Seasonal…`). No se tocan los archivos de FEAT-17 ni de FEAT-23, que quedan como histórico con el nombre anterior. US A4 de FEAT-23 (elegir las muestras) sigue pendiente allá.

**Clasificación:** cambio de textos y de dirección en las zonas Pública, Mi cuenta y Administración, más contenido nuevo en la pantalla P5. Toca la función de cobro (el título del cargo y la dirección de regreso de Mercado Pago), así que ese cambio empezó por su prueba. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-10-07)

1. **Solo cambia el nombre.** El producto se llama «Loterías temáticas» y los grupos pasan de «temporadas» a «temáticas». Las reglas no cambian: cada lotería pertenece a una temática y conserva «publicada sí/no» y fechas opcionales. _(Descartadas: quitar además las fechas de inicio y fin; cambiar solo el título público y dejar «temporada» por dentro.)_
2. **La dirección pasa de `/temporada` a `/tematicas`**, y la dirección vieja redirige sola a la nueva, conservando lo que venga después del signo de interrogación (para quien regresa de Mercado Pago con un pago iniciado antes del cambio). _(Descartada: dejar `/temporada` y cambiar solo los textos.)_
3. **El texto nuevo va en dos bloques:** arriba del catálogo, una introducción corta y tres pasos de cómo funciona; debajo del catálogo, las preguntas frecuentes. _(Descartadas: solo los pasos, sin preguntas; todo el texto debajo del catálogo.)_
4. **El inicio anuncia las temáticas con una franja propia debajo del banner de beneficios** (2026-10-07, US A4): título, una línea y el botón «Ver loterías temáticas». Carlos pidió además «hacer los cambios necesarios para seguir con el SEO». _(Descartadas: un segundo botón en la portada, que le quita protagonismo a crear la lotería propia; una sección con portadas reales del catálogo, que hace depender el inicio de que el catálogo cargue.)_

**Propuesto al diseñar, por confirmar con Carlos:**

- En inglés el producto se llama «Themed loterías» y el enlace «Themed».
- El enlace de la barra y del menú de usuario dice «Temáticas»; la pestaña de administración también.
- La página de administración para armar el PDF pasa a `/admin/tematicas/:id/crear`, sin redirección desde la anterior (solo la usa el administrador).
- El cargo en Mercado Pago dice «Lotería temática - {nombre}».
- Las preguntas frecuentes van cerradas, en una lista angosta: se ve solo la pregunta y al pulsarla se abre su respuesta. Corregido el 2026-10-07 al verlas Carlos («ocupa demasiado espacio en pantalla»); la primera versión las mostraba todas abiertas en dos columnas. Las respuestas siguen escritas en la página, así que Google las lee igual.
- Los pasos y las preguntas se ven también cuando el catálogo está vacío, cargando o con error.
- El texto exacto, que solo repite reglas ya definidas en §18:
  - **Introducción:** «Loterías ya hechas para cada ocasión: elige la tuya, descárgala e imprímela hoy mismo.»
  - **1 · Elige** — «Mira la portada y las cartas de muestra de cada lotería antes de decidir.»
  - **2 · Compra** — «Un solo pago en pesos con Mercado Pago. Necesitas una cuenta; crearla es gratis.»
  - **3 · Imprime** — «Descarga el PDF tamaño carta, imprímelo y recorta las cartas. Listo para jugar.»
  - **¿Qué recibo?** — «Un PDF tamaño carta con los tableros y las cartas de la lotería, sin marca de agua, listo para imprimir y recortar. En cada lotería dice cuántas cartas y cuántos tableros trae.»
  - **¿Me llega algo físico?** — «No. Es una descarga digital: no se envía nada a domicilio. Tú la imprimes en casa o donde prefieras.»
  - **¿Cómo pago?** — «En pesos mexicanos con Mercado Pago, un solo pago por lotería. No se usan tokens. Si pagas en efectivo o por transferencia, la lotería aparece en tu cuenta cuando se confirma el pago.»
  - **¿Necesito una cuenta?** — «Para ver el catálogo, no. Para comprar, sí: así la lotería queda guardada en tu cuenta.»
  - **¿Cuántas veces puedo descargarla?** — «Las que quieras. Queda en Mi cuenta y no caduca, aunque después salga del catálogo.»
  - **¿Cómo se usa?** — «Imprime los tableros y las cartas, recorta las cartas y juega como la lotería de siempre.» Con enlace a «Cómo se juega».
  - **¿Y si quiero una con mis fotos?** — «Puedes crear la tuya gratis, con tus propias fotos.» Con enlace a «Crear mi lotería».

## Diseño

### Recorrido

Barra (o menú de usuario) → «Temáticas» → `/tematicas`: título «Loterías temáticas», introducción, los tres pasos, el catálogo agrupado por temática y, al final, las preguntas frecuentes → una lotería → `/tematicas/:id` → Comprar → Mercado Pago → regreso a `/tematicas/:id`.

### Qué se reutiliza

- La pantalla P5 y sus estilos (`src/components/Seasonal/SeasonalCatalog.*`): los bloques nuevos usan los mismos colores, tipografías y tarjetas del catálogo.
- La pre-generación de páginas públicas de FEAT-21: toma la lista de páginas de `src/utils/pageMeta.ts`, así que `/tematicas` llega a Google ya con los pasos y las preguntas escritos.

### Qué es nuevo

- Dos bloques de texto en P5 (pasos y preguntas frecuentes).
- La redirección de `/temporada` y `/temporada/:id` a `/tematicas`, en Vercel (`vercel.json`) y dentro del sitio.

## Cambios en la base de conocimiento

**Aplicados el 2026-10-07, con la confirmación de Carlos («si»).**

- `docs/contexto-negocio.md`: §18 pasa a «Loterías temáticas» y sus grupos a «temáticas»; lo mismo en roles, datos, permisos y las demás menciones vigentes. Las decisiones fechadas el 2026-10-06 y el 2026-10-07 se conservan con su redacción original y se agrega el renglón de esta decisión.
- `docs/casos-de-uso.md`: todas las menciones.
- `docs/diseno-mockups.md`: P5 y P6 (nombre y dirección), la barra, el menú de usuario, Mi cuenta, el historial y la pestaña de administración; P5 describe los pasos y las preguntas frecuentes.
- `docs/diseno-mockups.md`, P1 (US A4, confirmado por Carlos el 2026-10-07: «si»): el inicio lleva la franja «Loterías temáticas» debajo del banner de beneficios.

## US A1 — El nombre «Temáticas» en todo el recorrido   ·   Estado: ✅ hecha — Carlos la revisó en producción el 2026-10-07 («todo se ve bien»)

- **Historia** — Como dueño del sitio, quiero que las loterías ya hechas se llamen «temáticas» en todo el sitio, para poder vender loterías de cualquier ocasión y no solo de fechas del año.
- **Entrega demostrable** — En la barra, el catálogo, la ficha, Mi cuenta, el historial de compras, el cargo de Mercado Pago y la administración dice «temática(s)»; la dirección es `/tematicas` y la vieja lleva sola a la nueva.
- **Construido** — 2026-10-07, en la rama `feature/loterias-tematicas`. Textos en español e inglés (`src/locales/*/translation.json`), textos fijos de la administración (`src/components/AdminPanel/`) y el aviso de privacidad. Rutas `/tematicas`, `/tematicas/:id` y `/admin/tematicas/:id/crear` (`src/AppRouter.tsx`); `/temporada` y `/temporada/:id` redirigen conservando los parámetros, en `vercel.json` (redirección permanente) y dentro del sitio. Datos para Google y sitemap con la dirección nueva (`src/utils/pageMeta.ts`, `src/utils/sitemap.ts`). En la función de cobro, el título del cargo y la dirección de regreso (`supabase/functions/_shared/seasonal.ts`), empezando por su prueba (`tests/functions/seasonal.test.ts`).
- **Depende de** — `create-seasonal-preference` desplegada en dev y en producción (hecho el 2026-10-07).
- **Cómo se prueba (guion de demo)** — Abre el sitio sin sesión → en la barra debería decir «Temáticas» → púlsalo → la dirección debería ser `/tematicas` y el título «Loterías temáticas» → abre una lotería → la dirección debería ser `/tematicas/…` y el enlace de regreso «← Temáticas» → escribe a mano `/temporada` en la barra de direcciones → debería llevarte a `/tematicas` → inicia sesión y abre el menú de usuario → debería decir «Temáticas» → en Mi cuenta, la sección debería llamarse «Mis loterías temáticas» → pulsa Comprar en una lotería → en Mercado Pago el cargo debería decir «Lotería temática - …» → al terminar deberías volver a `/tematicas/…` con el aviso de compra → entra como administrador → la pestaña debería llamarse «Temáticas», con la lista «Temáticas» y el botón «Nueva temática».
- **Escenarios cubiertos**:
  - [x] El cargo de Mercado Pago dice «Lotería temática» y regresa a `/tematicas/:id`. (Prueba automática.)
  - [x] El sitemap y los datos para Google usan `/tematicas`. (Prueba automática.)
  - [ ] `/temporada` y `/temporada/:id` llevan a la dirección nueva, también con parámetros de regreso de Mercado Pago. (Demo.)
  - [ ] Ningún texto visible dice «temporada», en español ni en inglés. (Demo.)
  - [ ] La compra de punta a punta funciona en dev con la función desplegada. (Demo. Carlos vio el 2026-10-07 el cargo en Mercado Pago: «Lotería temática - Haloween, $ 80»; falta confirmar el regreso a `/tematicas/…`.)

## US A2 — La página explica cómo funcionan y cómo se compran   ·   Estado: ✅ hecha — Carlos la revisó en producción el 2026-10-07 («todo se ve bien»)

- **Historia** — Como visitante, quiero que la página de loterías temáticas me diga qué son, cómo se compran y cómo se usan, para decidirme sin tener que adivinar.
- **Entrega demostrable** — `/tematicas` muestra una introducción, tres pasos antes del catálogo y siete preguntas frecuentes después —cerradas, cada una se abre al pulsarla—, en español e inglés.
- **Construido** — 2026-10-07, en la rama `feature/loterias-tematicas`. Bloques «Cómo funciona» y «Preguntas frecuentes» en `src/components/Seasonal/SeasonalCatalog.tsx`, con sus estilos en `SeasonalCatalog.css` (solo colores de la paleta) y sus textos en `src/locales/*/translation.json`. Se muestran siempre, cargue o no el catálogo.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Abre `/tematicas` → bajo el título debería verse la introducción y tres pasos numerados: Elige, Compra, Imprime → debajo, las loterías agrupadas por temática → al final, «Preguntas frecuentes» con siete preguntas en una lista, sin respuestas a la vista → pulsa «¿Qué recibo?» → debería abrirse su respuesta → pulsa «¿Cómo se usa?» y, en su respuesta, «Cómo se juega» → debería abrir esa página → vuelve, abre la última pregunta y pulsa «Crear mi lotería» → debería llevarte a crear cartas → cambia el idioma a inglés → todo el texto nuevo debería verse en inglés → ábrela en el teléfono → los pasos deberían verse en una sola columna y las preguntas a todo lo ancho.
- **Escenarios cubiertos**:
  - [ ] Los pasos y las preguntas se ven con catálogo lleno, vacío y con error de carga. (Demo.)
  - [ ] Los dos enlaces de las respuestas llevan a su página. (Demo.)
  - [ ] Se ve bien en teléfono y en inglés. (Demo.)
  - [ ] El código fuente de `/tematicas` trae los pasos y las preguntas ya escritos. (Demo, en dev.)

## US A3 — Descargar el PDF desde la ficha de administración   ·   Estado: ✅ hecha — Carlos la probó el 2026-10-07 («funciona»)

Agregada el 2026-10-07 a petición de Carlos («se crea el archivo PDF y todo en el modal pero no podemos descargarlo para verificarlo que está bien»), que confirmó que va en esta feature.

- **Historia** — Como administrador, quiero bajar el PDF que ya tiene guardado una lotería temática, para revisar que quedó bien antes de publicarla.
- **Entrega demostrable** — En la ficha de una lotería, pestaña Archivos, junto al nombre del PDF guardado hay un botón «Descargar» que baja el archivo.
- **Construido** — 2026-10-07, en la rama `feature/loterias-tematicas`; va a `dev` con el PR #37. Botón en `src/components/AdminPanel/AdminSeasonalLoteriaForm.tsx`, que pide el mismo enlace temporal que usa quien la compró (`SeasonalRepository.getPdfDownloadUrl`); abrir el enlace quedó en `src/utils/openDownloadLink.ts`, compartido con el botón del comprador. Sin migración: el permiso del administrador sobre el archivo ya existía (migración 028).
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — Entra como administrador → pestaña «Temáticas» → abre una lotería que ya tenga PDF → pestaña «Archivos» → junto al nombre del PDF debería verse «Descargar», antes de «Reemplazar» → púlsalo → debería decir «Preparando…» un momento y bajar el PDF con su nombre → pulsa «Reemplazar» y elige otro PDF → «Descargar» debería desaparecer hasta que guardes → arma un PDF con «Crear el PDF con mis cartas» y guarda → al volver a la ficha, «Descargar» debería bajar el PDF recién armado.
- **Escenarios cubiertos**:
  - [x] El botón baja el PDF guardado, también el recién armado con las cartas. (Demo.)
  - [ ] No aparece si la lotería no tiene PDF ni mientras hay uno elegido sin guardar. (Demo.)
  - [ ] Si el enlace no se puede preparar, se ve el aviso «No se pudo preparar la descarga del PDF. Intenta de nuevo.» (Demo.)

## US A4 — El inicio anuncia las loterías temáticas   ·   Estado: ✅ hecha — Carlos la probó en local el 2026-10-07 («todo funciona»); falta verla en dev

Agregada el 2026-10-07 a petición de Carlos («en la pantalla principal no hacemos referencia a la nueva sección de las loterías temáticas»), que confirmó que va en esta feature («si»).

- **Historia** — Como visitante, quiero enterarme desde el inicio de que hay loterías ya hechas, para comprarlas sin tener que descubrir el enlace de la barra.
- **Entrega demostrable** — En el inicio, debajo del banner de beneficios, hay una franja «Loterías temáticas, listas para imprimir» que lleva a `/tematicas`, en español e inglés; y lo que el inicio le dice a los buscadores menciona las temáticas.
- **Construido** — 2026-10-07, en la rama `feature/loterias-tematicas`; va a `dev` con el PR #39. Franja en `src/components/LandingPage/LandingPage.tsx`, que reutiliza el banner de beneficios con una variante clara (`LandingPage.css`, solo colores de la paleta); textos en `src/locales/*/translation.json` (`landing.themedBanner`). Es un enlace de verdad con texto fijo: no lee el catálogo, se ve igual con o sin sesión y llega ya escrito en la página pre-generada del inicio. Para los buscadores: la descripción del inicio (`landing.metaDescription` y `index.html`) menciona las temáticas, y `index.html` suma palabras clave y un renglón en la lista de funciones de los datos estructurados. El precio «0» de esos datos no se tocó: sigue describiendo la herramienta gratuita.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Abre el inicio sin sesión → debajo del banner naranja de beneficios debería verse una franja clara: «Loterías temáticas, listas para imprimir», una línea de texto y el botón «Ver loterías temáticas» → púlsala → debería abrir `/tematicas` → vuelve, inicia sesión y abre el inicio → la franja debería seguir ahí → cambia el idioma a inglés → debería decir «Themed loterías, ready to print» → ábrelo en el teléfono → el botón debería bajar debajo del texto, sin cortarse → en dev, mira el código fuente del inicio → debería traer el texto de la franja ya escrito y la descripción nueva.
- **Textos**:
  - **Título:** «Loterías temáticas, listas para imprimir»
  - **Línea:** «¿Sin tiempo para armar la tuya? Elige una ya hecha para tu fiesta o reunión, cómprala y descarga el PDF.»
  - **Botón:** «Ver loterías temáticas»
  - **Descripción del inicio para buscadores:** «Crea tu Lotería Mexicana con tus propias cartas e imágenes, o elige una lotería temática lista para imprimir. Modo Kids (3x3) para niños. Ideal para baby showers y fiestas.» (Antes: «Crea tableros personalizados de Lotería Mexicana con tus propias cartas e imágenes. Nuevo Modo Kids (3x3) para niños. Perfecto para baby showers y eventos familiares.»)
- **Escenarios cubiertos**:
  - [x] La franja lleva a `/tematicas`, con y sin sesión. (Demo, en local.)
  - [ ] Se ve bien en teléfono y en inglés. (Demo.)
  - [ ] El código fuente del inicio trae la franja y la descripción nueva ya escritas. (Demo, en dev.)
