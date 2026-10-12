# FEAT-32 — Rediseño de la página de inicio (P1)

**Estado: definida con Carlos el 2026-10-10; ese día aprobó el diseño y las historias y pidió construir la página completa en una sola sesión. Las seis historias están construidas (2026-10-10), pendientes de su demo. Van a `dev` junto con FEAT-33, en el PR de la rama `feature/inicio-rediseno`; después FEAT-33 cambió la barra superior y quitó del pie lo de redes. `docs/diseno-mockups.md` al día (Carlos lo confirmó el 2026-10-10). Pendiente de Carlos: volver a exportar las dos imágenes fijas de los videos (traen fondo negro), las URL de las redes y el texto de la pregunta del papel (ver «Pendientes de Carlos»). Rama `feature/inicio-rediseno`, creada desde `dev`.**

**Contexto.** Carlos pidió el 2026-10-10 rehacer la página de inicio para que quede como las maquetas de `docs/referencia-diseno/` (`inicio-escritorio.html` e `inicio-celular.html`, de 390 px), siguiendo `docs/referencia-diseno/INSTRUCCIONES-CLAUDE-CODE.md`. Las maquetas son referencia visual de estructura, textos, orden y estilos: no se copia su HTML. Los archivos multimedia ya están en `public/media/inicio/` con su nombre final y no se mueven ni se renombran.

No cambia ninguna regla de negocio. Sí cambia la descripción de P1 y del pie de página en `docs/diseno-mockups.md`, y agrega colores y una excepción en `docs/sistema-diseno.md` (ver «Documentos que cambian»).

## Decisiones tomadas con el usuario

Todas del 2026-10-10.

1. **Feature aparte**, FEAT-32, en la rama `feature/inicio-rediseno`.
2. **Un solo pie de página en todo el sitio.** El pie general toma el aspecto y los enlaces de la maqueta y conserva el nombre de Carlos, el correo y PayPal. El pie pequeño propio de inicio desaparece. _(Descartadas: cambiar solo el de inicio, porque seguiría habiendo dos; usar el de la maqueta tal cual, porque quita el nombre, el correo y PayPal.)_
3. **No se publica «mínimo 8 tableros».** La maqueta lo dice en el paso 2 y en las preguntas frecuentes, pero esa regla no existe: `contexto-negocio.md` solo define una cantidad sugerida que el usuario puede cambiar. El paso 2 dice «Tableros distintos, de 4×4 o de 3×3 para niños. Tú eliges cuántos.» y la pregunta frecuente solo habla de las fotos. _(Descartadas: volverlo regla nueva; dejar el texto aunque no sea cierto.)_
4. **Las cartas de ocasiones se hacen como la maqueta, con una excepción anotada a FEAT-29 (decisión 9)**, que reservaba el aspecto de carta para componer la imagen de la carta: ahora también se permite en cartas decorativas de inicio. El margen crema y el marco usan los mismos valores que la carta real. Rosa, azul y lila entran a la paleta como colores nuevos; los otros tres fondos ya existen. _(Descartadas: usar solo colores existentes, porque las seis cartas se verían poco variadas; dejar las ocasiones como tarjetas con ícono.)_
5. **Arvo Bold se toma del archivo que ya tiene el proyecto** (`src/fonts/Arvo-Bold.ttf`, el mismo de las cartas y del PDF). No se carga de Google Fonts ni se toca `index.html`. _(Descartada: Google Fonts, como decía el documento, porque dejaría dos copias de la misma letra.)_
6. **Precio de temáticas:** «Desde $X MXN» con el precio más bajo entre las loterías temáticas publicadas, las mismas del catálogo. Si no hay ninguna con precio o la consulta falla, la etiqueta no aparece. _(Descartadas: quitar la etiqueta; un precio fijo escrito a mano.)_
7. **Precio de la IA en las preguntas frecuentes:** se lee del sitio, igual que la etiqueta «Desde $X MXN por foto». Si no se puede leer, la respuesta dice lo mismo sin la cifra. _(Descartadas: «$2 MXN» fijo, porque un administrador puede cambiar el precio; nunca decir la cifra.)_
8. **La pregunta del papel no se publica todavía.** Las preguntas frecuentes salen con tres; la del papel se agrega cuando Carlos pase el texto. _(Descartada: una recomendación redactada por Claude.)_

Tomadas del documento de instrucciones, sin pregunta aparte:

9. **Redes sociales:** el pie queda listo para mostrarlas, pero no muestra ningún enlace hasta tener su URL. Carlos las pasa después. _(Sustituida el 2026-10-10 por FEAT-33, decisión 3: se quitaron del todo.)_
10. **Precio de la IA:** 1 token = 1 foto. Si el precio no se puede leer, la etiqueta no aparece.
11. **Videos:** primero el WebM (fondo transparente) y después el MP4 (fondo naranja, para Safari). Con «reducir movimiento» activado se ve solo la imagen fija. En celular, la tarjeta de IA lleva imagen fija para no poner dos videos seguidos.

Aclaraciones de Claude que Carlos no objetó:

12. Los textos van en `src/locales/es` y `src/locales/en`, que es de donde lee el sitio; el documento decía `public/locales`.
13. El menú de arriba no se toca.
14. El título «Más formas de crear tu lotería» sobre las dos tarjetas sale solo en celular, como en la maqueta.

Ajustes de Claude al construir (2026-10-10), avisados a Carlos al entregar:

15. **La tarjeta de Google conserva la frase «No usamos ningún servicio de Google para crear ni modificar imágenes».** La maqueta la quitaba, pero responde a lo que Google pidió para aprobar el inicio de sesión (FEAT-22). El resto de esa tarjeta es el texto de la maqueta.
16. **El enlace «¿Qué es chorroybuenas?» del pie no se muestra con sesión iniciada**, porque con sesión inicio lleva al panel y el enlace no tendría a dónde llegar.
17. **Los nombres de las cartas de ocasiones no se traducen al inglés** (LA FAMILIA, LOS NIÑOS…), como los nombres de cualquier carta de lotería; sus descripciones sí.
18. **Radios y sombras** usan los del sistema de diseño (8, 16 y 24 px) en lugar de los valores sueltos de la maqueta (6, 14 y 20 px).

## Diseño

**Orden de la página.** Héroe → dos caminos → «Así quedan tus cartas» → «Crea y juega fácilmente» → «Todo para tu lotería, en un solo lugar» → «Perfecta para cualquier ocasión» → «¿Qué es chorroybuenas?» → preguntas frecuentes → llamada final → pie de página.

**Lo que deja de verse respecto a hoy.**

- En el héroe: el logo grande y las tres tarjetas translúcidas.
- Los dos banners a lo ancho (beneficios y temáticas): pasan a ser las dos tarjetas con imagen.
- La función «tableros» de la lista de funciones: quedan cuatro (personalizable, editor, Modo Kids, PDF).
- Los íconos de los tres pasos y de las ocasiones: los sustituyen las imágenes y las cartas.
- La insignia sobre «¿Listo para comenzar?».
- El bloque con los dos enlaces «¿Cómo se juega?» y «¿Qué es la lotería?»: pasan al pie.
- `amigos.png`: la sustituye `mesa-loteria.jpg`.

**Organización del código.** La pantalla era un archivo de 355 líneas con una hoja de estilos de 2,199. Ahora es una sección por archivo dentro de `src/components/LandingPage/`, cada una con sus estilos (unas 1,500 líneas en total); `LandingPage.css` guarda solo lo que comparten.

**Videos.** Una sola pieza para los dos videos: `<video autoplay muted loop playsinline preload="metadata">` con su poster y dos fuentes, WebM y luego MP4. Con «reducir movimiento» pinta la imagen del poster y no descarga el video. En celular, la tarjeta de IA pinta `hero-cartas-poster.jpg`.

Dos ajustes que salieron al construir (2026-10-10):

- **Safari recibe solo el MP4.** Safari sí reproduce WebM, pero no pinta su fondo transparente; si se le ofrecieran las dos fuentes en ese orden tomaría el WebM y lo mostraría con fondo opaco. Por eso en Safari, y en cualquier navegador de iPhone o iPad, la pieza ofrece solo el MP4. No se pudo comprobar en un Safari real: se revisa en la demo.
- **La página pre-generada lleva la imagen fija** (inicio se escribe por adelantado para buscadores, FEAT-21). El video se pone ya en el navegador, que es donde se sabe cuál puede pintar y si el visitante pidió menos movimiento.

**Precios.**

- IA: `TokenPricingRepository.getPricing('MXN')` hoy nunca falla: si la consulta sale mal devuelve $2.00. Para cumplir «si falla, no muestres la etiqueta» se agrega una forma de saber que falló, sin cambiar lo que ve la pantalla de comprar tokens.
- Temáticas: el precio más bajo del catálogo publicado (`SeasonalRepository.getCatalog()`).
- Mientras cargan, las etiquetas no se ven y no dejan hueco; aparecen cuando llega el precio. La página nunca espera a los precios para mostrarse.

**Cartas de ocasiones.** Seis cartas hechas con HTML y CSS, en proporción 2:3, ligeramente giradas: número arriba a la izquierda, ícono al centro y nombre abajo, en Arvo Bold blanco con contorno. Debajo de cada una, su descripción en la letra del sitio.

| # | Nombre | Descripción | Fondo |
|---|---|---|---|
| 1 | BABY SHOWER | Con fotos del bebé y la familia. | rosa (nuevo) |
| 2 | LA FAMILIA | Cumpleaños, aniversarios y posadas. | turquesa (existe) |
| 3 | LA OFICINA | Con las caras de todo el equipo. | amarillo (existe) |
| 4 | LOS AMIGOS | Las anécdotas de siempre, en cartas. | naranja claro (existe) |
| 5 | LOS NIÑOS | Modo Kids con cartas grandes. | azul (nuevo) |
| 6 | LA FIESTA | Bodas, graduaciones y más. | lila (nuevo) |

**Colores nuevos en la paleta** (`src/index.css` y `docs/sistema-diseno.md`): rosa `#e8a3b8`, azul `#93c5fd` y lila `#c4b5fd` para los fondos de las cartas de ocasiones; y el crema `#F4EAD4` y el marco `#14100A` de la carta real, que hoy solo existen en el código que compone la carta. Todo lo demás de la maqueta se resuelve con colores que ya existen; donde la maqueta usa un tono que no está en la paleta (por ejemplo el borde `#fde4cc`), se usa el más cercano que sí está.

**«¿Qué es chorroybuenas?».** Lleva `id="que-es"` y se ve completa sin hacer clic (la exige Google para verificar el inicio de sesión): párrafo, tres tarjetas y enlace al Aviso de privacidad. Los textos de las tres tarjetas son los de la maqueta.

**Preguntas frecuentes.** Tres preguntas que se abren y cierran; la primera llega abierta.

1. ¿De verdad es gratis? — Sí. Crear e imprimir tu lotería con tus fotos es gratis y no necesitas cuenta.
2. ¿Cuánto cuesta la conversión con IA? — Cada foto transformada usa 1 token, de $X MXN. La compra mínima es de 5 tokens.
3. ¿Cuántas fotos necesito? — Al menos 24 para tableros de 4×4, o 15 en Modo Kids.

**Pie de página, en todo el sitio.** Fondo oscuro. A la izquierda, «chorroybuenas.com.mx», «Hecho con ♥ para mantener viva la tradición mexicana» (con el corazón que hoy falta) y el crédito de Carlos. A la derecha, los enlaces: ¿Qué es chorroybuenas?, ¿Cómo se juega?, ¿Qué es la lotería?, Aviso de privacidad, y las redes cuando haya URL. Se conservan el correo, la invitación a platicar de un proyecto y PayPal. «¿Qué es chorroybuenas?» lleva a esa sección de inicio desde cualquier página.

**Inglés.** Todos los textos nuevos llevan su versión en inglés.

**Riesgo a revisar en la demo.** El MP4 que usa Safari trae fondo naranja liso. Si el héroe lleva degradado, en iPhone podría notarse un recuadro alrededor del video. Se revisa en la demo de la US A1 y, si se nota, se decide con Carlos.

## Pendientes de Carlos

- **Imágenes fijas de los videos con fondo negro.** `hero-gratis-poster.jpg` y `hero-cartas-poster.jpg` son JPG, que no guarda transparencia, y salieron con fondo negro. Se ven como un cuadro negro sobre el naranja en tres momentos: el instante antes de que arranque el video, con «reducir movimiento» activado y, siempre, en la tarjeta de IA en celular. Hay que volver a exportarlas con el mismo nombre y fondo naranja `#D25014` (o transparente, en otro formato, y se ajusta el nombre en el código). Detectado el 2026-10-10.
- **URL de las redes sociales** para el pie (US C2).
- **Texto de la pregunta del papel** (decisión 8).

## Documentos que cambian

Se editan en el mismo commit que el código. Los de la base de conocimiento, solo con el sí de Carlos a los 4 puntos.

- `docs/diseno-mockups.md` — descripción de P1 y la línea del pie de página. **Hecho el 2026-10-10, con el sí de Carlos.**
- `docs/sistema-diseno.md` — colores nuevos y la excepción a FEAT-29 (decisión 9). **Hecho el 2026-10-10.**
- `docs/contexto-negocio.md` y `docs/casos-de-uso.md` — no cambian.

## Grupo A — Arriba de la página

### US A1 — Héroe con video   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero ver en cuanto abro el sitio qué hace y un ejemplo en movimiento, para decidir si creo mi lotería.
- **Entrega demostrable** — El héroe muestra la insignia «Gratis y sin registro», el título, la descripción, el botón «Crear mi lotería gratis →», la nota de las 24 fotos (15 en Modo Kids) y, a la derecha, el video `hero-gratis`. Ya no están el logo grande ni las tres tarjetas translúcidas.
- **Construido** — 2026-10-10. `LandingHero` (`src/components/LandingPage/LandingHero.tsx` y su `.css`) sustituye al héroe anterior. `LandingVideo` pinta el video o su imagen fija; `playsMp4Only` (`src/utils/landingVideo.ts`) decide qué navegadores reciben solo el MP4. Textos en `landing.hero` (español e inglés). El panel de «Mi cuenta» usaba la descripción anterior del héroe como subtítulo de «Crear nueva lotería»: conserva ese mismo texto en una clave propia (`dashboard.createNewDescription`), así que ahí no cambia nada. Los estilos del héroe anterior siguen en `LandingPage.css` sin usarse; se borran en la US C2.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre inicio en la computadora → arriba, sobre fondo naranja, a la izquierda el texto con el botón blanco y a la derecha el video andando solo, sin sonido → pulsa el botón y te lleva a crear tu lotería → ábrelo en el celular: el video queda debajo del texto → en un iPhone, fíjate que no se note un recuadro alrededor del video.
- **Escenarios cubiertos**:
  - [ ] El botón lleva a crear la lotería, igual que hoy.
  - [ ] El video arranca solo, sin sonido y en bucle, en computadora y en celular.
  - [ ] Con «reducir movimiento» activado se ve la imagen fija y no el video. (Hoy esa imagen sale con fondo negro: ver «Pendientes de Carlos».)
  - [x] Safari y los navegadores de iPhone reciben solo el MP4; los demás, primero el WebM. (Prueba automática.)
  - [ ] En Safari el video se ve sin un recuadro que desentone.
  - [x] Textos en español y en inglés.

### US A2 — Dos caminos: IA y temáticas   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero ver las otras dos formas de tener una lotería y cuánto cuestan, para elegir la que me conviene.
- **Entrega demostrable** — Debajo del héroe hay dos tarjetas. La de IA, naranja, con el video `hero-cartas` (imagen fija en celular), la etiqueta «Desde $X MXN por foto» y «Ver beneficios →». La de temáticas, clara, con `tematica-halloween.jpg`, la etiqueta «Desde $X MXN» y «Ver loterías temáticas →». Cada tarjeta entera es un enlace.
- **Construido** — 2026-10-10. `LandingPaths` (`src/components/LandingPage/LandingPaths.tsx` y su `.css`) sustituye a los dos banners. `useLandingPrices` lee los dos precios una sola vez al abrir inicio; `lowestThemedPriceCents` y `formatFromPrice` (`src/utils/landingPrices.ts`) eligen el precio de temáticas y lo escriben («$2», «$2.50»). `TokenPricingRepository.getPricingOrNull` devuelve el precio guardado o nada; `getPricing` lo usa y sigue dando $2.00 a la compra de tokens cuando no se puede leer. Textos en `landing.paths`; se quitaron `landing.banner` y `landing.themedBanner`. Pruebas en `tests/src/landingPage.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En inicio, baja del héroe → ves dos tarjetas lado a lado → la naranja dice «Desde $2 MXN por foto» (el precio actual del token) y te lleva a Beneficios → la clara muestra el precio de la temática más barata y te lleva al catálogo → en el celular quedan una sobre otra, bajo el título «Más formas de crear tu lotería», y la de IA lleva una imagen fija.
- **Escenarios cubiertos**:
  - [ ] La etiqueta de IA muestra el precio por token vigente. (Falta verlo en pantalla.)
  - [x] Si el precio de la IA no se puede leer, no hay precio que mostrar y la compra de tokens sigue viendo $2.00. (Prueba automática.)
  - [x] El precio de temáticas es el más bajo entre las que el catálogo muestra hoy; no cuentan borradores, programadas, vencidas ni las que no tienen precio. (Prueba automática.)
  - [x] Si no hay temáticas con precio, no hay precio que mostrar. (Prueba automática.)
  - [ ] Sin precio, la etiqueta no aparece y no deja hueco. (Falta verlo en pantalla.)
  - [ ] En celular la tarjeta de IA muestra la imagen fija, no el video. (Hoy esa imagen sale con fondo negro: ver «Pendientes de Carlos».)
  - [x] Textos en español y en inglés.

## Grupo B — Cómo queda y cómo se usa

### US B1 — «Así quedan tus cartas» y los tres pasos   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero ver cartas de ejemplo y los pasos con su imagen, para entender qué voy a obtener y qué tengo que hacer.
- **Entrega demostrable** — Una fila con las ocho cartas de ejemplo, ligeramente giradas, que se desliza de lado. Después, «Crea y juega fácilmente»: tres tarjetas numeradas, cada una con su imagen (`paso-1-fotos.png`, `paso-2-tablero.jpg`, `paso-3-baraja.jpg`). El paso 2 no menciona un mínimo de tableros.
- **Construido** — 2026-10-10. `LandingShowcase` pinta las ocho cartas de `public/media/inicio/cartas/` en una fila que se desliza con el dedo, el ratón o el teclado. `LandingSteps` pinta los tres pasos con su imagen. Textos en `landing.showcase` y `landing.steps`. De paso se fue el «Mínimo 8 tableros únicos» que el sitio ya decía en el paso 2 antes del rediseño.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En inicio, baja de las dos tarjetas → «Así quedan tus cartas» con ocho cartas un poco chuecas → en el celular, desliza la fila con el dedo → más abajo, tres pasos con su foto: subir fotos, generar tableros, descargar e imprimir.
- **Escenarios cubiertos**:
  - [ ] Las ocho cartas se ven y la fila se desliza de lado sin mover toda la página.
  - [x] Cada carta tiene su texto alternativo.
  - [ ] Los tres pasos muestran su imagen, en fila en computadora y en columna en celular.
  - [x] Ningún texto dice «mínimo 8 tableros». (Prueba automática.)
  - [x] Textos en español y en inglés. (Prueba automática: mismas claves en los dos idiomas.)

### US B2 — Funciones y ocasiones como cartas   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero ver qué incluye el sitio y para qué ocasiones sirve, para imaginar mi propia lotería.
- **Entrega demostrable** — «Todo para tu lotería, en un solo lugar» con `mesa-loteria.jpg` y cuatro funciones. Después, «Perfecta para cualquier ocasión» con seis cartas de lotería dibujadas por el sitio (número, ícono, fondo de color y nombre en Arvo Bold blanco con contorno) y su descripción debajo.
- **Construido** — 2026-10-10. `LandingFeatures` (foto de la mesa y cuatro funciones) y `LandingOccasions` (seis cartas en HTML y CSS; sus íconos están en `occasionIcons.tsx`). Arvo Bold se declara en `LandingOccasions.css` con el archivo de `src/fonts/`. Cinco colores nuevos `--color-card-*` en `src/index.css`, anotados en `docs/sistema-diseno.md` junto con la excepción a FEAT-29. Textos en `landing.features` y `landing.occasions`. Se quitó `public/amigos.png`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En inicio, baja de los tres pasos → una foto de una mesa con tableros impresos y, al lado, cuatro funciones → más abajo, seis cartas de colores numeradas del 1 al 6 (BABY SHOWER, LA FAMILIA, LA OFICINA, LOS AMIGOS, LOS NIÑOS, LA FIESTA), con la misma letra que las cartas reales → en el celular van de dos en dos.
- **Escenarios cubiertos**:
  - [ ] La foto de la mesa sustituye a la anterior y quedan cuatro funciones.
  - [ ] Las seis cartas usan Arvo Bold del proyecto, con número y nombre legibles sobre su color.
  - [x] Los colores nuevos están en la paleta y en `docs/sistema-diseno.md`, con la excepción a FEAT-29 anotada.
  - [ ] En celular las cartas van en dos columnas y no se salen de la pantalla.
  - [x] Textos en español y en inglés. (Prueba automática: mismas claves en los dos idiomas.)

## Grupo C — Confianza y cierre

### US C1 — «¿Qué es chorroybuenas?» y preguntas frecuentes   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos

- **Historia** — Como visitante (y como revisor de Google), quiero leer qué es el sitio, cómo usa la IA y Google y qué no se permite, y resolver mis dudas más comunes, para confiar antes de usarlo.
- **Entrega demostrable** — La sección «¿Qué es chorroybuenas?», con `id="que-es"`, visible completa sin hacer clic: párrafo, tres tarjetas y enlace al Aviso de privacidad. Después, «Preguntas frecuentes» con tres preguntas; la del costo de la IA usa el precio leído del sitio.
- **Construido** — 2026-10-10. `LandingAbout` (con `id="que-es"`, siempre a la vista) y `LandingFaq` (tres preguntas con `<details>`, la primera abierta). `aiCostAnswerKey` (`src/utils/landingPrices.ts`) elige la respuesta con cifra o sin ella. Textos en `landing.about` y `landing.faq`.
- **Depende de** — US A2 (reutiliza la lectura del precio de la IA).
- **Cómo se prueba (guion de demo)** — En inicio, baja de las cartas de ocasiones → un recuadro «¿Qué es chorroybuenas?» con tres tarjetas, todo a la vista → el enlace lleva al Aviso de privacidad → más abajo, tres preguntas; la primera ya está abierta → abre «¿Cuánto cuesta la conversión con IA?» y dice el mismo precio que la tarjeta de IA.
- **Escenarios cubiertos**:
  - [ ] La sección «¿Qué es…?» se lee completa sin abrir nada y tiene `id="que-es"`.
  - [ ] El enlace al Aviso de privacidad funciona.
  - [ ] Las preguntas se abren y cierran con el ratón y con el teclado.
  - [x] La respuesta del costo usa el precio vigente; si no se puede leer, sale sin la cifra. (Prueba automática.)
  - [x] No aparece la pregunta del papel.
  - [x] Textos en español y en inglés. (Prueba automática: mismas claves en los dos idiomas.)

### US C2 — Llamada final, pie de página único y limpieza   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero un último botón para empezar y un pie con los enlaces útiles en cualquier página, para no tener que volver arriba ni buscar la información.
- **Entrega demostrable** — «¿Listo para comenzar?» con su botón, sin insignia. Un solo pie oscuro en todo el sitio, con el corazón, el crédito de Carlos, correo, PayPal y los enlaces (¿Qué es chorroybuenas?, ¿Cómo se juega?, ¿Qué es la lotería?, Aviso de privacidad). Sin enlaces a redes hasta tener sus URL. Se borran el pie pequeño de inicio, el bloque de dos enlaces, y los estilos, textos e imágenes que ya nadie usa. Documentos al día.
- **Construido** — 2026-10-10. `LandingFinalCta` comparte el botón blanco con el héroe (`.landing-cta-button`). `Footer` (`src/components/Footer/`) se rehízo con el aspecto de la maqueta y es el único pie del sitio; las redes están en `SOCIAL_LINKS`, con la URL vacía. `LandingPage` lleva a la sección que pida la dirección (`/#que-es`). Se borraron el pie pequeño de inicio, el bloque de dos enlaces, los 2,199 renglones de estilos anteriores y los textos `landing.events`, `landing.info`, `landing.footer`, `landing.banner` y `landing.themedBanner`.
- **Depende de** — US C1 (el enlace del pie apunta a `#que-es`).
- **Cómo se prueba (guion de demo)** — En inicio, baja hasta el final → recuadro naranja «¿Listo para comenzar?» con su botón, que lleva a crear la lotería → debajo, un solo pie oscuro que dice «Hecho con ♥ para mantener viva la tradición mexicana» → entra a «¿Cómo se juega?»: el pie es el mismo → desde ahí pulsa «¿Qué es chorroybuenas?» en el pie y te lleva a esa sección de inicio.
- **Escenarios cubiertos**:
  - [ ] El botón final lleva a crear la lotería.
  - [ ] En inicio hay un solo pie, y es el mismo en las demás páginas.
  - [ ] El corazón se ve en «Hecho con ♥ para…».
  - [ ] «¿Qué es chorroybuenas?» lleva a la sección desde inicio y desde otra página, sin sesión iniciada; con sesión el enlace no aparece.
  - [ ] Se conservan el crédito, el correo y PayPal.
  - [x] No se muestra ningún enlace a redes sin URL.
  - [x] No quedan estilos, textos ni imágenes de la versión anterior sin usar.
  - [x] `docs/diseno-mockups.md` y `docs/sistema-diseno.md` al día (el primero, con el sí de Carlos del 2026-10-10).
  - [x] `npm run typecheck`, `npm run lint` y `npm test` en verde.
  - [x] Textos en español y en inglés. (Prueba automática: mismas claves en los dos idiomas.)
