# FEAT-33 — Rediseño de las páginas públicas, la barra superior y el pie

**Estado: Carlos dio el visto bueno a las seis historias el 2026-10-10. Construidas ese día las US A1 a A4 y la US A7, que surgió al revisar (Beneficios ya no repite los paquetes). Carlos las ha ido viendo en su servidor local y pidiendo ajustes; están guardadas en la rama, sin PR a `dev` ni demo completa todavía. Faltan A5 y A6. `docs/diseno-mockups.md` al día con la barra, el pie, P2, P5 y U3 (Carlos lo confirmó el 2026-10-10). Pendiente de Carlos: revisar en Supabase que `/comprar-tokens` esté permitida como dirección de regreso de Google (ver «Pendientes de Carlos»). Rama `feature/inicio-rediseno`, la misma de FEAT-32 (decisión 1).**

**Contexto.** Después de la página de inicio (FEAT-32), Carlos pidió el 2026-10-10 rediseñar las demás páginas públicas, la barra superior y el pie para que queden como las maquetas de `docs/referencia-diseno/`. El detalle de cada página (secciones, imágenes, textos) y las reglas comunes de textos, SEO, rendimiento e inicio de sesión están en [`docs/referencia-diseno/INSTRUCCIONES-REDISENO-PAGINAS.md`](../referencia-diseno/INSTRUCCIONES-REDISENO-PAGINAS.md): aquí no se repiten. Las maquetas son referencia visual; no se copia su HTML. La página de inicio no se toca, salvo la barra y el pie, que son compartidos.

No cambia reglas de negocio. Sí cambia la descripción de la barra de navegación y de varias pantallas en `docs/diseno-mockups.md`: cada cambio se presenta a Carlos con los 4 puntos antes de editarlo.

## Decisiones tomadas con el usuario

1. **Se sigue en la rama `feature/inicio-rediseno`** (2026-10-10). Inicio y estas páginas llegan a `dev` en un solo PR. _(Descartadas: una rama `feature/rediseno-paginas` nacida de la de inicio; pasar primero inicio a `dev` y crear la rama desde ahí.)_

Tomadas del documento de instrucciones:

2. **Barra superior:** la opción A, «Limpia». Los enlaces se ven siempre, también con sesión iniciada.
3. **Pie de página:** sin enlaces a redes sociales. Sustituye a la decisión 9 de FEAT-32, que los dejaba preparados.
4. **Iniciar sesión:** «Entrar con Google» y «Crear tu cuenta» pesan lo mismo; Google no es la opción por defecto.
5. **Las 54 cartas** de «¿Qué es la lotería?» van como lista de nombres, con todos los nombres originales, y nunca con las ilustraciones de la baraja comercial.
6. **Beneficios:** se quita el bloque «Estilos de IA (Próximamente)», que menciona marcas de terceros.
7. **Comprar tokens** toca dinero: no se cambian cálculos de cobro ni de bonos. Si cambia un cálculo que se muestra, primero se escribe la prueba.

Heredadas de FEAT-32, sin volver a preguntar:

8. **Videos:** se usa la pieza de inicio. Safari y los navegadores de iPhone reciben solo el MP4; la página pre-generada lleva la imagen fija.
9. **Radios y sombras** del sistema de diseño en lugar de los valores sueltos de las maquetas. Sin colores sueltos: si falta uno, se propone y se pregunta.

Ajustes de Claude al construir la US A1 (2026-10-10), avisados a Carlos al entregar:

10. **La barra ancha empieza en 1201 px**, el mismo corte de la barra anterior. En 1200, 1024 y 768 px se ve la barra compacta con el botón de menú: los cinco enlaces, el idioma y la cuenta no caben holgados por debajo de ese ancho.
11. **Barra compacta con sesión:** el saldo muestra solo el número y lleva a Comprar tokens; la foto o inicial lleva a Mi cuenta.
12. **Menú de celular, administradores:** se agregó un botón «Administración», que la maqueta no dibuja, para que no pierdan el acceso desde el celular.
13. **Menú de celular con sesión:** ya no trae «Crear nueva lotería» ni la lista de loterías, como en la maqueta. Las dos cosas siguen en Mi cuenta, a donde llevan «Mis loterías» y «Mi cuenta».
14. **Pastilla del saldo:** usa el amarillo de la paleta (`--color-accent-light`) con texto café, en lugar del ámbar suelto de la maqueta.
15. **Si «Entrar con Google» falla** desde el menú de celular, se abre la ventana de registro, que ofrece Google otra vez y el registro por correo.

Decisión de Carlos al empezar la US A2 (2026-10-10):

16. **Los tokens de regalo se leen del sitio**, de la misma cantidad que usa el alta de cuentas. _(Descartada: escribir «5» fijo, porque un administrador puede cambiarla.)_

Ajustes de Claude al construir la US A2 (2026-10-10), avisados a Carlos al entregar:

17. **Si los tokens de regalo son 0 o no se pueden leer, la página no promete regalo:** no sale la insignia del héroe, el paso 1 se queda en «Con Google o con tu correo.» y la llamada final dice «Crea tu cuenta gratis». A Carlos se le había dicho que los textos saldrían «sin número»; se prefirió no prometer un regalo que quizá no exista.
18. **El paso 2 nombra el botón real del editor, «Convertir imagen con IA».** La maqueta decía «Transformar con IA», que no existe con ese nombre.
19. **Nombres de los paquetes** («Para probar», «Para una lotería», «Para varias loterías»): solo se muestran si hay exactamente tres paquetes activos. «El más elegido» marca el de en medio cuando hay tres o más.
20. **Llamada final con sesión:** la maqueta solo define el botón «Comprar más tokens». El título («¿Más fotos por transformar?») y la línea («Compra tokens cuando los necesites. No caducan.») los redactó Claude.
21. **Colores:** la etiqueta «+N de regalo» y los fondos de los íconos usan los turquesa, amarillo y naranja suaves de la paleta en lugar de los tonos sueltos de la maqueta.
22. **El acomodo de celular se resolvió con el de escritorio**, que ya se reacomoda solo en una columna; no se leyó la maqueta de celular de Beneficios.

Decisión de Carlos al empezar la US A3 (2026-10-10):

23. **Temáticas no lleva aviso «Muy pronto».** Carlos eligió primero que fuera editable desde Administración y, al pensarlo, pidió quitarlo del todo. No hay historia para ello. _(Descartadas: un texto fijo del sitio, como proponían las instrucciones; un campo editable en Administración.)_

Ajustes de Claude al construir la US A3 (2026-10-10), avisados a Carlos al entregar:

24. **Sin las insignias «Temporada actual» y «Nueva»** que dibuja la maqueta: la base no guarda nada que diga cuál temporada es la actual ni qué lotería es nueva, y las instrucciones no las piden.
25. **Colores:** la etiqueta del modo usa el lila de la paleta y el fondo detrás de la portada el café oscuro, en lugar de los morados sueltos de la maqueta.
26. **Íconos de «Cómo funciona»:** los de la biblioteca de íconos del sitio (lupa, tarjeta, impresora), no los SVG de la maqueta.
27. **Las respuestas de preguntas frecuentes que terminan en enlace ahora cierran con punto** («…la lotería de siempre. Cómo se juega.»), para que el texto visible y el de `FAQPage` sean el mismo.
28. **El acomodo de celular se resolvió con el de escritorio**; no se leyó la maqueta de celular de Temáticas.

Decisiones de Carlos sobre la US A3 ya construida (2026-10-10):

29. **El catálogo se queda como está aunque crezca:** todas las loterías a la vista, sin paginación ni filtros; tarjeta grande por cada temática con una sola lotería. Claude propuso dejar la tarjeta grande solo a la primera temática, recortar la descripción en la cuadrícula y poner enlaces para saltar a cada temática; Carlos dijo «déjalo así por ahora».

Decisión de Carlos al empezar la US A4 (2026-10-10):

30. **Quien entra desde Comprar tokens regresa a Comprar tokens**, con Google o con correo, ya con sesión; no se recuerda qué paquete había tocado. Hasta ahora Google siempre regresaba a Mi cuenta, y así sigue en el resto del sitio. _(Descartadas: regresar con el paquete resaltado, por ser más trabajo y más que probar; dejarlo como estaba.)_

Ajustes de Claude al construir la US A4 (2026-10-10), avisados a Carlos al entregar:

31. **El código promocional no tiene botón «Aplicar».** Se valida solo mientras se escribe, como hoy; la maqueta dibuja un botón que no haría nada.
32. ~~Con una promoción activa, el número grande la incluye.~~ Sustituido por la decisión 38: el número grande son los tokens que se pagan; la promoción va aparte y cuenta en las fotos y en el precio por foto.
33. **«¿Otra cantidad?»:** − y + cambian de uno en uno y el número también se puede escribir. Empieza en 15, como la maqueta; antes empezaba en 10.
34. **El aviso de primera compra dice «te regalamos +N% de tokens»**, sin «en cualquier paquete» como la maqueta, porque la promoción también aplica a la cantidad libre.
35. **El texto «1 token = 1 foto»** nombra el botón real, «Convertir imagen con IA» (igual que en Beneficios, ajuste 18).
36. **Colores:** el aviso de primera compra y el de pago acreditado usan el turquesa de la paleta.
37. **El acomodo de celular se resolvió con el de escritorio**; no se leyeron las maquetas de celular de Comprar tokens.

Decisión de Carlos al revisar las US A2 y A4 (2026-10-10):

38. **Los paquetes se ven igual en Beneficios y en Comprar tokens.** Carlos notó que las dos páginas daban la información distinta. Una sola tarjeta para las dos, con el acomodo y el diseño que tenía Comprar tokens: en grande los tokens que se pagan, debajo en una línea «+ N de regalo» (y «+ N de promoción» si aplica), el precio y «N fotos · $X por foto». Carlos aclaró que lo único que no le gustaba de Comprar tokens era ver el total en grande («70 tokens») con «50 + 20» debajo; una primera versión con el regalo en etiquetas de color, como Beneficios, no le gustó. Con sesión y primera compra, Beneficios también suma la promoción, para que los números coincidan. Sustituye la instrucción de que en Comprar tokens el número grande fuera el total, y el ajuste 32. _(Descartadas: las dos como dibujaba Comprar tokens, con el total en grande; dejar cada una como su maqueta.)_

Decisión de Carlos tras ver los paquetes en las dos páginas (2026-10-10):

39. **Beneficios ya no muestra los paquetes de tokens: solo se ven en Comprar tokens**, para no repetirlos. En su lugar va un recuadro «¿Cuánto cuesta?» con el precio «desde» por foto, cuatro puntos y el botón «Ver paquetes de tokens» (US A7). La decisión 38 queda vigente para la tarjeta de Comprar tokens; lo que decía de Beneficios ya no aplica. La cantidad de fotos gratis del recuadro se lee del sitio, como en la decisión 16; si es 0 o no se puede leer, esa línea no sale.

## Decisiones pendientes

Se le preguntan a Carlos, una por una, al empezar la historia que las necesita.

| Historia | Pregunta |
|---|---|
| Todas | Lo que aparezca al leer cada maqueta y no cuadre con `contexto-negocio.md`. |

## Pendientes de Carlos

- **Imágenes fijas de los videos con fondo negro** (viene de FEAT-32). También afectan al héroe de Beneficios, que usa `hero-cartas`.
- **Dirección de regreso de Google.** Para que «Entrar con Google» desde Comprar tokens regrese ahí (decisión 30), `/comprar-tokens` tiene que estar entre las direcciones de regreso permitidas en la configuración de inicio de sesión de cada proyecto de Supabase (dev y producción). Si no lo está, Google regresa a la dirección por defecto del sitio. No se pudo comprobar desde el código.

## Diseño

- **Una historia por bloque** de las instrucciones, en su orden. Una o dos por sesión.
- **Lo compartido con inicio.** El video (`PromoVideo`), el botón blanco, los encabezados de sección, la fila de cartas y los estilos de las preguntas y de la llamada final viven en la carpeta de inicio (`src/components/LandingPage/`) y las demás páginas los importan de ahí; sus clases siguen llamándose `landing-…`. Lo nuevo que usan varias páginas va aparte: `FaqSection` (preguntas con sus datos `FAQPage`) y `AuthChoice` («Entrar con Google» / «Crear tu cuenta»).
- **SEO.** No cambian direcciones, títulos, descripciones ni `canonical`, salvo el título y la descripción de «¿Cómo se juega?» si hace falta (historia A5). Un solo `<h1>` por página. Las preguntas frecuentes van con `<details>` y con sus datos `FAQPage`, que salen de las mismas claves de traducción que el texto visible. Al cerrar cada historia se comprueba que la página pre-generada trae su texto completo.
- **Textos** en `src/locales/es` y `src/locales/en`; las claves que ya no se usen se borran en los dos idiomas.

## Grupo A — Páginas

### US A1 — Barra superior y pie de página   ·   Estado: construida el 2026-10-10; al entregarla, Carlos respondió «me gusta»

- **Historia** — Como visitante o usuario, quiero una barra clara con los mismos enlaces siempre y mi saldo y mi cuenta a la mano, para moverme por el sitio sin perderme.
- **Entrega demostrable** — La barra de la opción A en computadora y en celular, sin sesión y con sesión, con el menú de usuario y el menú de celular a pantalla completa descritos en las instrucciones. Los cinco enlaces se ven también con sesión. El pie ya no trae nada de redes sociales.
- **Construido** — 2026-10-10. `src/components/Navbar/` se rehízo: `Navbar` (la barra), `UserMenuPanel` (menú de usuario en pantallas anchas), `MobileMenu` (menú a pantalla completa: bloquea el fondo, se cierra con Escape y el tabulador no se sale), `UserAvatar` (foto o inicial) y `navLinks.ts` (los cinco enlaces y cuál es el actual). Qué versión de la barra se ve lo decide `Navbar.css` en 1200 px. «Temáticas» y «Comprar tokens» salieron del menú de usuario: la primera está en la barra y la segunda es el botón «Comprar». En `Footer` se quitó todo lo de redes. Textos en `navbar`. Pruebas en `tests/src/navbar.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Sin sesión, en computadora: logo, cinco enlaces al centro (la página actual en naranja y subrayada), «ES», «Iniciar sesión» y el botón «Crear mi lotería gratis», que lleva a crear cartas → inicia sesión: los enlaces siguen ahí; a la derecha tu saldo (lleva a Comprar tokens) y tu avatar → abre el menú de usuario: saldo con «Comprar», Crear nueva lotería, Mis loterías, Mi cuenta y Cerrar sesión → en el celular, abre el menú: ocupa toda la pantalla, con los cinco enlaces grandes y el idioma al final → cambia el ancho de la ventana a 1200, 1024 y 768: los enlaces no se enciman.
- **Escenarios cubiertos**:
  - [ ] Sin sesión, computadora: idioma, «Iniciar sesión» y «Crear mi lotería gratis» (a `/cards`).
  - [ ] Con sesión, computadora: los cinco enlaces, saldo y avatar con su menú.
  - [ ] La página actual se marca en naranja y subrayada.
  - [x] El enlace actual se decide bien, también dentro de la ficha de una temática. (Prueba automática.)
  - [ ] Menú de usuario con todo lo que tiene hoy; Administración solo para administradores.
  - [ ] Celular sin sesión: «Entrar con Google», «Crear tu cuenta» y «¿Ya tienes cuenta? Inicia sesión» en el menú.
  - [ ] Celular con sesión: tarjeta de usuario con saldo y «Comprar», «Mis loterías», «Mi cuenta» y «Cerrar sesión».
  - [ ] En 1200, 1024 y 768 px sale el botón de menú; de 1201 px en adelante, los enlaces sin encimarse.
  - [ ] El menú se puede usar con teclado y se cierra con Escape.
  - [x] El pie no tiene enlaces a redes ni enlaces vacíos.
  - [x] `docs/diseno-mockups.md` al día, con el sí de Carlos (2026-10-10).
  - [x] Textos en español y en inglés.

### US A2 — P2 Beneficios   ·   Estado: construida el 2026-10-10; al entregarla, Carlos respondió «se ve super bien»

- **Historia** — Como visitante, quiero ver qué gano con una cuenta y cómo queda una foto transformada con IA, para decidir si me registro.
- **Entrega demostrable** — La página de Beneficios con sus ocho secciones: héroe con el video `hero-cartas`, cuatro pares antes y después, «Así funciona», paquetes de tokens con precios leídos del sitio, galería, beneficios de la cuenta, cinco preguntas y llamada final. Con sesión, los botones de entrar se cambian por «Crear mi lotería» y «Comprar tokens». Ya no está el bloque de estilos de IA.
- **Construido** — 2026-10-10. `src/components/BenefitsPage/` se rehízo: `BenefitsPage` (héroe y llamada final), `BenefitsSections` (antes y después, pasos, galería, beneficios de la cuenta) y `BenefitsPricing` (paquetes). Nuevos y compartidos: `FaqSection` con `faqJsonLd`, `AuthChoice`, `useWelcomeTokens`, `packSummary` y `highlightedPackIndex` (`src/utils/tokenPacks.ts`) y `TokenPricingRepository.getPacksOrNull`. El título y la descripción para buscadores no cambiaron. Se quitaron el bloque de estilos de IA, `public/videopromo.mp4` y `public/beneficios-antes-despues.png`. Textos en `landing.benefitsPage`. Pruebas en `tests/src/tokenPacks.test.ts` y `tests/src/publicPagesPrerender.test.ts`.
- **Depende de** — US A1 (los botones de entrar se comportan igual que en la barra).
- **Cómo se prueba (guion de demo)** — Sin sesión, abre Beneficios → héroe naranja con el video y los botones «Entrar con Google» y «Crear tu cuenta», del mismo tamaño → cuatro pares «Antes» / «Con IA» → los paquetes muestran los mismos precios que Comprar tokens, y el de en medio dice «El más elegido» → galería de seis cartas → abre una pregunta frecuente → inicia sesión y vuelve: los botones dicen «Crear mi lotería» y «Comprar tokens».
- **Escenarios cubiertos**:
  - [ ] Las ocho secciones, en el orden de la maqueta (la de paquetes es ahora el recuadro «¿Cuánto cuesta?», US A7), en computadora y en celular.
  - [ ] «Entrar con Google» usa el inicio de sesión existente; «Crear tu cuenta» abre el registro por correo.
  - [ ] Con sesión cambian los botones del héroe y de la llamada final.
  - [x] ~~Paquetes de tokens con sus precios.~~ Sustituido por la US A7: Beneficios ya no muestra paquetes.
  - [x] No queda el bloque «Estilos de IA» ni su texto.
  - [x] Preguntas con `<details>` y datos `FAQPage` idénticos al texto visible. (Prueba automática.)
  - [x] La página pre-generada trae su texto completo y un solo `<h1>`. (Prueba automática.)
  - [x] Textos en español y en inglés.

### US A3 — P5 Temáticas   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos

- **Historia** — Como visitante, quiero ver las loterías temáticas con su portada, sus cartas de muestra y su precio, para elegir una y comprarla.
- **Entrega demostrable** — El catálogo con héroe naranja y abanico de tres cartas, «Cómo funciona», el catálogo en `#catalogo` (tarjeta grande si la temática tiene una sola lotería, cuadrícula si tiene varias), «¿Prefieres una con tus fotos?» y las siete preguntas actuales. Sin aviso «Muy pronto» (decisión 23). Los datos siguen viniendo de la base y se conserva «Ya es tuya».
- **Construido** — 2026-10-10. `SeasonalCatalog.tsx` se rehízo conservando cómo lee el catálogo, las compras de la cuenta y el tipo de cambio. `catalogLayout` (`src/utils/seasonalCatalog.ts`) decide tarjeta grande o cuadrícula. Estilos nuevos en `SeasonalCatalogPage.css`; los de carga, error y catálogo vacío siguen en `SeasonalCatalog.css`, que también usan la ficha y Mi cuenta. Las preguntas usan `FaqSection`. Textos nuevos en `seasonal.catalog`; el título y la descripción para buscadores no cambiaron. **Queda por limpiar:** en `SeasonalCatalog.css` hay reglas del catálogo anterior que ya nadie usa.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre Temáticas → héroe naranja con tres etiquetas y un abanico de cartas → «Ver el catálogo ↓» baja al catálogo → una temática con una sola lotería se ve como tarjeta grande, con su tira de cartas de muestra y «Pago único» → «Ver lotería →» abre su ficha → con sesión, una que ya compraste dice «Ya es tuya» → al final, las siete preguntas, cerradas.
- **Escenarios cubiertos**:
  - [ ] Héroe, «Cómo funciona», catálogo, invitación a crear la propia y preguntas, en computadora y en celular.
  - [x] Temática con una lotería: tarjeta grande. Con varias: cuadrícula sin la tira. (Prueba automática de qué forma toca.)
  - [ ] Precio, modo, cartas y tableros salen de la base, como hoy; «Ya es tuya» se conserva.
  - [ ] Catálogo vacío, cargando y con error se siguen viendo bien.
  - [x] Preguntas con `<details>` y datos `FAQPage` idénticos al texto visible. (Prueba automática.)
  - [x] La página pre-generada trae su texto completo.
  - [x] Textos en español y en inglés.

### US A4 — U3 Comprar tokens   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos (incluye una compra de prueba en dev)

- **Historia** — Como usuario, quiero ver mi saldo, lo que recibo con cada paquete y el total antes de pagar, para comprar tokens con confianza.
- **Entrega demostrable** — Comprar tokens con el diseño nuevo. Con sesión: «Tu saldo», tres paquetes con el total grande y «X + Y de regalo», «¿Otra cantidad?» con − y + y atajos, código promocional cuando aplica, recuadro de confianza y el bloque «1 token = 1 foto». Sin sesión: «Recibe … tokens de regalo» con los botones de entrar, y los botones de compra dicen «Crear cuenta y comprar». Los mensajes al volver de Mercado Pago siguen igual, con el estilo nuevo. Ningún cálculo de cobro ni de bonos cambia.
- **Construido** — 2026-10-10. `BuyTokensPage.tsx`: se rehízo lo que se ve; lo que lee datos, crea el pago y acredita al volver de Mercado Pago quedó línea por línea como estaba, y no se tocó nada de `src/services/` ni de `supabase/`. La cuenta de los tokens de promoción salió del componente a `promoBonusTokens` (`src/utils/tokenPacks.ts`) con la misma fórmula, junto con `packPurchaseSummary`, `clampCustomTokens` y `stepCustomTokens`. `signInWithGoogle` acepta una ruta de regreso, validada por `googleRedirectUrl` (`src/utils/authRedirect.ts`) para que solo pueda ser del sitio; `AuthChoice` y `EmailAuthModal` la pasan. Se borraron 20 textos de `buyTokens` que ya no se usan. Pruebas, escritas antes del código, en `tests/src/buyTokensDisplay.test.ts`. Tras la decisión 38, los paquetes de esta página y los de Beneficios usan `TokenPackCard` (`src/components/TokenPacks/`), con sus textos en `tokenPacks`; `useFirstPurchasePercent` le da a Beneficios la promoción de primera compra de quien mira.
- **Depende de** — US A1 (botones de entrar).
- **Cómo se prueba (guion de demo)** — Con sesión, abre Comprar tokens → arriba, tu saldo → en cada paquete el número grande es el total que recibes → en «¿Otra cantidad?» pulsa + y los atajos: el total cambia al momento y no deja bajar del mínimo ni pasar del máximo → compra un paquete en dev y vuelve de Mercado Pago: el mensaje de éxito sale como siempre y el saldo sube lo mismo que antes del rediseño → cierra sesión: en lugar del saldo sale la invitación a crear cuenta y los botones dicen «Crear cuenta y comprar».
- **Escenarios cubiertos**:
  - [x] El código que crea el pago y acredita no cambió; las pruebas existentes siguen en verde, sin tocarlas. Falta la compra de prueba en dev para verlo de punta a punta.
  - [x] Las fotos que alcanza cada paquete son tokens + regalo, más la promoción si aplica; el precio no cambia con la promoción. (Prueba automática, escrita antes del código.)
  - [x] La tarjeta de paquete es la misma que en Beneficios y dice los mismos números. (Prueba automática de la cuenta; decisión 38.)
  - [x] «¿Otra cantidad?» respeta el mínimo y el máximo actuales. (Prueba automática, escrita antes del código.)
  - [ ] Aviso de primera compra y código promocional aparecen solo cuando aplican, como hoy.
  - [ ] Sin sesión se ocultan el aviso de primera compra y el código.
  - [ ] Mensajes de éxito, pendiente, cancelado y acreditando, con el estilo nuevo.
  - [ ] En computadora y en celular.
  - [x] Textos en español y en inglés.
  - [x] Google solo puede regresar a una dirección del propio sitio. (Prueba automática.)
  - [ ] Al entrar con Google desde Comprar tokens se regresa a Comprar tokens. (Depende de la configuración de Supabase: ver «Pendientes de Carlos».)

### US A5 — P3 ¿Cómo se juega?   ·   Estado: por hacer

- **Historia** — Como persona que busca cómo se juega la lotería, quiero una guía completa y clara, para poder organizar una partida.
- **Entrega demostrable** — La página con sus nueve secciones: héroe con `mesa-loteria.jpg`, lo que necesitas, paso a paso, cómo cantar las cartas (cuatro versos en tarjetas con Arvo), jugadas y premios con cuatro tableros dibujados por el sitio, «¡Buenas!» y la apuesta, Modo Kids y cuántos tableros, seis preguntas y llamada final. Los números (15 y 24 cartas) son los de `contexto-negocio.md`.
- **Construido** — —
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre «¿Cómo se juega?» → héroe con la foto de la mesa → baja por las secciones → en «Jugadas y premios» hay cuatro tableros de 4×4 con frijoles marcando cada jugada, y «Premio mayor» en Tablero Lleno → abre una pregunta frecuente → al final, «Crear mi lotería» lleva a crear cartas y «Ver temáticas» al catálogo.
- **Escenarios cubiertos**:
  - [ ] Las nueve secciones, en computadora y en celular.
  - [ ] Los tableros de las jugadas son HTML y CSS, sin imágenes, y se entienden con lector de pantalla.
  - [ ] Los mínimos de cartas coinciden con `contexto-negocio.md`.
  - [ ] Enlaces internos a Crear lotería y a Temáticas.
  - [ ] Un solo `<h1>`; título y descripción de la página al día; la dirección no cambia.
  - [ ] Preguntas con `<details>` y datos `FAQPage` idénticos al texto visible. (Prueba automática.)
  - [ ] La página pre-generada trae su texto completo.
  - [ ] Textos en español y en inglés.

### US A6 — P4 ¿Qué es la lotería?   ·   Estado: por hacer

- **Historia** — Como persona curiosa por la lotería mexicana, quiero conocer su historia y sus 54 cartas, para entender la tradición y animarme a hacer la mía.
- **Entrega demostrable** — La página con sus ocho secciones: héroe con abanico de cuatro cartas, datos rápidos, historia como línea del tiempo, «Más que un juego, una tradición», tu propia lotería, la lista numerada de las 54 cartas como texto, cinco preguntas y llamada final. Se quitan de las historias A5 y A6 las imágenes que ya no se usen.
- **Construido** — —
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre «¿Qué es la lotería?» → héroe con cuatro cartas en abanico → datos rápidos (54, 4×4, 1, ∞) → la historia en cuatro etapas, con sus párrafos completos → un bloque oscuro sobre la tradición → la lista de las 54 cartas, numerada y solo con nombres → enlace a «¿Cómo se juega?» → preguntas frecuentes y llamada final.
- **Escenarios cubiertos**:
  - [ ] Las ocho secciones, en computadora y en celular.
  - [ ] Las 54 cartas son una lista numerada de texto, con todos los nombres originales y sin ilustraciones de la baraja comercial.
  - [ ] Enlace interno a «¿Cómo se juega?».
  - [ ] Un solo `<h1>`; la dirección, el título y la descripción no cambian.
  - [ ] Preguntas con `<details>` y datos `FAQPage` idénticos al texto visible. (Prueba automática.)
  - [ ] La página pre-generada trae su texto completo.
  - [ ] No quedan imágenes, estilos ni textos de las versiones anteriores sin usar.
  - [ ] Textos en español y en inglés.

### US A7 — Beneficios: recuadro «¿Cuánto cuesta?» en lugar de los paquetes   ·   Estado: construida el 2026-10-10, pendiente de la demo de Carlos

- **Historia** — Como visitante de Beneficios, quiero saber de un vistazo desde cuánto cuesta transformar una foto y dónde ver los paquetes, sin que la página repita lo que ya está en Comprar tokens.
- **Entrega demostrable** — En Beneficios, donde estaban las tres tarjetas de paquetes, un solo recuadro: ícono de moneda con «¿Cuánto cuesta?», «Desde $X MXN por foto» (el precio en naranja) y «Y las primeras N son gratis al crear tu cuenta»; al centro, cuatro puntos con palomita; a la derecha, «Ver paquetes de tokens →», que lleva a Comprar tokens. En celular va en columna y el botón ocupa todo el ancho. X es el menor precio por foto entre los paquetes (precio ÷ tokens + regalo, a dos decimales) y el precio por token de la cantidad libre. Si los precios no se pueden leer, solo desaparece la línea del precio.
- **Construido** — 2026-10-10. `BenefitsCost` (`src/components/BenefitsPage/`) sustituye a `BenefitsPricing`, que se borró junto con `useFirstPurchasePercent`. `lowestPricePerPhotoCents` (`src/utils/tokenPacks.ts`) calcula el precio «desde»; hace falta leer tanto los paquetes como el precio por token, y si falta cualquiera de los dos la línea no sale. Las palomitas van en el turquesa de la paleta, que no tiene verde. Textos en `landing.benefitsPage.cost`; se quitó `landing.benefitsPage.pricing`. La tarjeta de paquetes (`TokenPackCard`) queda solo en Comprar tokens.
- **Depende de** — US A2.
- **Cómo se prueba (guion de demo)** — Abre Beneficios → entre «Así funciona» y la galería ya no hay tarjetas de paquetes; hay un recuadro blanco con borde naranja claro → dice «Desde $1.43 MXN por foto» (con los paquetes actuales) y «Y las primeras 5 son gratis al crear tu cuenta» → cuatro puntos con palomita → «Ver paquetes de tokens →» te lleva a Comprar tokens, donde siguen los tres paquetes → en el celular el recuadro va en columna y el botón ocupa todo el ancho.
- **Escenarios cubiertos**:
  - [ ] Beneficios ya no muestra tarjetas de paquetes; Comprar tokens sí.
  - [x] El precio «desde» es el menor entre el precio por foto de cada paquete y el precio por token. (Prueba automática, escrita antes del código.)
  - [ ] Si los precios no se pueden leer, no sale la línea del precio y el resto del recuadro se queda.
  - [ ] La línea de fotos gratis usa la cantidad del sitio; sin ella no sale.
  - [ ] El botón lleva a Comprar tokens.
  - [ ] En celular va en columna y el botón ocupa todo el ancho.
  - [x] La dirección, el título y la descripción de la página no cambian; la página pre-generada trae el texto del recuadro. (Prueba automática.)
  - [x] Se borraron los textos de las tarjetas que ya no se usan, en los dos idiomas.
  - [x] `docs/diseno-mockups.md` (P2, y de paso P5 y U3) al día, con el sí de Carlos (2026-10-10).

