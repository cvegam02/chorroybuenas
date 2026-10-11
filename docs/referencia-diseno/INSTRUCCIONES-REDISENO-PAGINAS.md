# Rediseño de las páginas públicas, barra superior y pie — instrucciones para Claude Code

Cómo usarlo:

1. Copia el contenido del zip en la raíz del repo. Solo agrega archivos nuevos en `public/media/beneficios/`, `public/media/tematicas/` y `docs/referencia-diseno/`; no reemplaza nada existente.
2. Pega en Claude Code el bloque **«Arranque»**.
3. En cada sesión siguiente, pídele que continúe con la siguiente User Story. Lo que dice cada página está más abajo, en este mismo archivo, y Claude Code lo va a leer de aquí.

---

## Arranque (pegar en Claude Code)

> Quiero rediseñar las páginas públicas que faltan, la barra superior y el pie de página para que queden como el diseño de referencia de `docs/referencia-diseno/`. Lee primero `docs/referencia-diseno/INSTRUCCIONES-REDISENO-PAGINAS.md`: ahí está el detalle de cada página y las reglas comunes. La página de inicio ya está rediseñada y no se toca, salvo la barra superior y el pie, que son compartidos.
>
> Sigue `CLAUDE.md`: crea el archivo de la feature en `docs/features/` (con el siguiente número libre) con una User Story por bloque de la lista de abajo, en ese orden. Trabaja en una rama `feature/rediseno-paginas` creada desde `dev`. No hagas commit ni PR sin que yo lo pida. Para cada cambio de pantalla en `docs/diseno-mockups.md`, preséntame los 4 puntos antes de editarlo. Propón las User Stories, espera mi visto bueno y después ve de una o dos por sesión.

---

## Archivos de referencia

Son maquetas estáticas y se abren con doble clic en el navegador, porque las imágenes apuntan a `public/` y `src/img/`. Úsalas como referencia de estructura, textos, orden y estilos; no copies su HTML. Construye con los componentes, clases y tokens del proyecto (`src/index.css`, `docs/sistema-diseno.md`), sin colores sueltos.

| Pantalla | Escritorio | Celular |
|---|---|---|
| Barra superior y menú | `barra-superior-escritorio.html` (**opción A**) | `barra-superior-celular.html` (opción A, más los dos menús abiertos) |
| P2 Beneficios | `beneficios-escritorio.html` | `beneficios-celular.html` |
| P5 Temáticas | `tematicas-escritorio.html` | `tematicas-celular.html` |
| U3 Comprar tokens, con sesión | `comprar-tokens-con-sesion-escritorio.html` | `comprar-tokens-con-sesion-celular.html` |
| U3 Comprar tokens, sin sesión | `comprar-tokens-sin-sesion-escritorio.html` | `comprar-tokens-sin-sesion-celular.html` |
| P3 ¿Cómo se juega? | `como-se-juega-escritorio.html` | `como-se-juega-celular.html` |
| P4 ¿Qué es la lotería? | `que-es-la-loteria-escritorio.html` | `que-es-la-loteria-celular.html` |

En `barra-superior-escritorio.html` vienen tres opciones: **la elegida es la A, «Limpia»**. B y C solo quedan como referencia.

---

## Reglas comunes (aplican a todas las historias)

### Textos

- Van en `src/locales/es/translation.json` y `src/locales/en/translation.json`, no en `public/locales`.
- Las claves que ya no se usen se borran en los dos idiomas.

### SEO (muy importante)

El sitio quiere posicionarse en búsquedas sobre la lotería. Lo hecho en FEAT-21 no se puede romper:

- Las direcciones no cambian. Se conservan el título, la descripción y el `canonical` de cada página, y la pre-generación de las páginas públicas.
- Al terminar cada historia, comprueba que el HTML pre-generado de esa página trae su texto completo.
- Todo el texto va como texto HTML real, nunca dentro de imágenes.
- Un solo `<h1>` por página, con las palabras que la gente busca, como en las maquetas. Las secciones van en `<h2>` y `<h3>`.
- Las preguntas frecuentes se ven en la página y se abren con `<details>`, que Google sí lee.
  - Agrega sus datos estructurados `FAQPage` (JSON-LD) en Beneficios, Temáticas, Cómo se juega y Qué es la lotería.
  - El texto del JSON-LD debe ser idéntico al visible y salir de las mismas claves de traducción.
- Todas las imágenes llevan un `alt` descriptivo en español. Las decorativas llevan `alt=""`.
- Deja enlaces internos donde la maqueta los pone: Cómo se juega → Crear lotería y Temáticas; Qué es → Cómo se juega; Comprar tokens → Beneficios; etc.

### Rendimiento

- Videos: `<video autoplay muted loop playsinline preload="metadata" poster>`, con WebM primero y MP4 después. Con `prefers-reduced-motion`, solo el poster.
- Imágenes fuera de la primera pantalla: `loading="lazy"` con ancho y alto declarados, para que la página no salte al cargar.

### Iniciar sesión

- Donde la maqueta tiene **«Entrar con Google»** y **«Crear tu cuenta»**, las dos opciones pesan lo mismo; Google no es la opción por defecto.
- «Entrar con Google» usa el inicio de sesión con Google que ya existe en `AuthContext`.
- «Crear tu cuenta» abre el `EmailAuthModal` en modo registro.

### Fuentes

Arvo Bold, que ya se carga desde el inicio, se usa en los números y nombres que imitan cartas: los versos de Cómo se juega, la lista de las 54 cartas y los datos rápidos de Qué es.

---

## Historias, en orden

### 1. Barra superior y pie de página (todas las páginas)

**Barra superior** (`src/components/Navbar/`), opción A:

- **Escritorio:**
  - Logo a la izquierda y los 5 enlaces al centro.
  - La página actual va en naranja y subrayada.
  - A la derecha:
    - Sin sesión: selector de idioma compacto («ES»), «Iniciar sesión» y el botón naranja **«Crear mi lotería gratis»**, que lleva a `/cards`.
    - Con sesión: idioma, una pastilla con el saldo de tokens («3 tokens», que lleva a Comprar tokens) y el avatar con nombre y flecha, que abre el menú de usuario.
- **Los enlaces ya no desaparecen al iniciar sesión.** Hoy se ocultan; deben verse siempre.
- **Menú de usuario** (desplegable):
  - Avatar, nombre y correo.
  - Un recuadro con el saldo y el botón «Comprar».
  - Crear nueva lotería.
  - Mis loterías, con las últimas y «Ver todas (n)», como hoy.
  - Mi cuenta.
  - Administración, solo para administradores, como hoy.
  - Cerrar sesión.
- **Celular:**
  - Barra: logo; «Crear lotería» sin sesión, o saldo e inicial con sesión; y el botón de menú.
  - El menú abierto ocupa toda la pantalla, con los 5 enlaces grandes.
  - Sin sesión, abajo van «Entrar con Google», «Crear tu cuenta» y «¿Ya tienes cuenta? Inicia sesión».
  - Con sesión, arriba va la tarjeta de usuario con saldo y «Comprar», más los botones «Mis loterías» y «Mi cuenta»; abajo, «Cerrar sesión».
  - Al final, el idioma como «Español | English».
- Revisa en 1200 px, 1024 px y 768 px que los enlaces no se encimen. Si no caben, pasa al botón de menú antes de que se rompan.

**Pie de página:** quita los enlaces a Instagram y TikTok. Todavía no hay redes sociales; no dejes enlaces vacíos ni con `#`.

### 2. P2 Beneficios (`src/components/BenefitsPage/`)

Secciones, en el orden de la maqueta:

1. **Héroe naranja.** Badge «5 tokens de regalo al crear tu cuenta», título, texto, «Entrar con Google» / «Crear tu cuenta», la nota de que crear con fotos normales es gratis y sin cuenta, y el video `hero-cartas` (el mismo del inicio) en lugar de `/videopromo.mp4`.
   - Con sesión, los dos botones se cambian por «Crear mi lotería» y «Comprar tokens».
2. **Antes y después.** Cuatro pares con las etiquetas «Antes» y «Con IA»:
   - `beneficios/antes-la-chata.jpg` → `ia-la-chata.jpg`
   - `antes-el-vaquero.jpg` → `galeria/carta-02.jpg`
   - `antes-la-consentida.jpg` → `galeria/carta-03.jpg`
   - `antes-la-payasita.jpg` → `galeria/carta-06.jpg`
   - Sustituye a `beneficios-antes-despues.png`.
3. **Así funciona.** 3 pasos y la nota de que el token se devuelve si falla y que volver a la foto original es gratis.
4. **Paquetes de tokens.**
   - Precios desde `TokenPricingRepository`, igual que `BuyTokensPage`. Los de la maqueta son de ejemplo.
   - El de en medio va marcado «El más elegido».
   - Precio por foto = precio ÷ (tokens + regalo).
   - Línea de cantidad libre y enlace a Comprar tokens.
   - Si falla la carga, oculta la sección.
5. **Galería** «Hechas con IA en chorroybuenas»: `galeria/carta-01..06.jpg`.
6. **«Y con tu cuenta, además…»**: 3 beneficios.
7. **Preguntas** (5), con su FAQPage.
8. **Llamada final** «Prueba gratis con 5 tokens». Con sesión: «Comprar más tokens».

Quita el bloque «Estilos de IA (Próximamente)» y la clave `landing.benefitsPage.aiStyles`: menciona marcas de terceros (Los Simpson, Studio Ghibli).

### 3. P5 Temáticas (`src/components/Seasonal/SeasonalCatalog.tsx`)

1. **Héroe naranja.**
   - «Loterías temáticas, listas para imprimir».
   - Tres etiquetas: PDF tamaño carta, Sin marca de agua, Descarga inmediata.
   - Botón «Ver el catálogo ↓», que baja a `#catalogo`.
   - Abanico con 3 cartas: `tematicas/halloween-01.jpg`, `-03` y `-02`.
2. **Cómo funciona.** Elige, Compra, Imprime, con íconos SVG y las claves que ya existen, más cortas.
3. **Catálogo** (`id="catalogo"`), agrupado por temática como hoy.
   - **Si una temática tiene una sola lotería:** tarjeta grande horizontal, como la maqueta.
     - Portada, nombre y etiquetas de modo, cartas y tableros.
     - Descripción, tira de las cartas de muestra que ya existen en la base y precio «Pago único».
     - Botón «Ver lotería →».
   - **Si tiene varias:** cuadrícula de tarjetas con los mismos datos, sin la tira.
   - Todos los datos vienen de la base, como hoy. «Ya es tuya» se conserva.
4. **Aviso «Muy pronto»** (ejemplo: Día de Muertos).
   - Sale de una clave de traducción, `seasonal.catalog.comingSoon`.
   - Si la clave está vacía, no se muestra.
   - Pregúntame si prefieres otro mecanismo.
5. **«¿Prefieres una con tus fotos?»**, que lleva a crear la lotería gratis.
6. **Preguntas frecuentes**, las 7 actuales, cerradas, con su FAQPage.

### 4. U3 Comprar tokens (`src/components/BuyTokens/BuyTokensPage.tsx`)

- **Con sesión:**
  - Encabezado naranja con la tarjeta «Tu saldo».
  - Aviso de primera compra, solo cuando aplica, como hoy.
  - 3 paquetes: el número grande es el **total** que se recibe y debajo dice «X + Y de regalo».
  - «¿Otra cantidad?»:
    - Botones − y + y atajos de 5, 15, 30 y 100.
    - Total en vivo y botón «Comprar N tokens».
    - Respeta `MIN_CUSTOM_TOKENS` y `MAX_CUSTOM_TOKENS`.
  - Código promocional, solo cuando hay promociones por código, como hoy.
  - Recuadro de confianza: Mercado Pago, efectivo o transferencia, devolución del token.
  - Bloque «1 token = 1 foto transformada» con `beneficios/antes-la-chata.jpg` → `ia-la-chata.jpg` y enlace a Beneficios.
  - Al final, la nota en una línea de que el cargo es en MXN y el monto en dólares es solo referencia.
- **Sin sesión:**
  - La tarjeta del saldo se cambia por «Recibe 5 tokens de regalo», con «Entrar con Google», «Crear tu cuenta» y «¿Ya tienes cuenta? Inicia sesión».
  - Los botones de compra dicen «Crear cuenta y comprar».
  - Se ocultan el aviso de primera compra y el código.
  - Después de entrar, lo ideal es volver a esta página con el paquete elegido. Si eso complica el flujo, pregúntame antes.
- **Los mensajes al volver de Mercado Pago** (éxito, pendiente, cancelado, acreditando) siguen como hoy, con el estilo nuevo.
- Esta página toca dinero. No cambies cálculos de cobro ni de bonos. Si cambia algún cálculo que se muestra, escribe primero la prueba.

### 5. P3 ¿Cómo se juega? (`src/components/HowToPlay/`)

Secciones:

1. **Héroe** con `inicio/mesa-loteria.jpg`, que sustituye a `comosejuega.png`.
2. **Lo que necesitas**: 4 tarjetas.
3. **Paso a paso**: 4 pasos.
4. **Cómo cantar las cartas**: texto y 4 versos tradicionales, en tarjetas con Arvo.
5. **Jugadas y premios**:
   - 4 tableros 4×4 dibujados con HTML/CSS, sin imágenes, con frijoles en las casillas de cada jugada.
   - «Premio mayor» en Tablero Lleno.
   - Debajo, la línea de El Marco y La X.
6. **«¡Buenas!»** y **«¿Y si jugamos con apuesta?»**.
7. **Modo Kids** y **«¿Cuántos tableros necesito?»**. Los números (15 y 24 cartas) son los de `docs/contexto-negocio.md`.
8. **Preguntas frecuentes** (6), con su FAQPage.
9. **Llamada final** con «Crear mi lotería» y «Ver temáticas».

Actualiza el título y la descripción de la página si hace falta para que reflejen el contenido nuevo, sin cambiar la dirección.

### 6. P4 ¿Qué es la lotería? (`src/components/AboutLoteria/`)

Secciones:

1. **Héroe** con abanico de 4 cartas de `inicio/cartas/`, que sustituye a `quees.jpg`.
2. **Datos rápidos**: 54, 4×4, 1, ∞.
3. **Historia y origen** como línea del tiempo de 4 etapas, con sus párrafos completos, junto a `inicio/paso-2-tablero.jpg`.
4. **«Más que un juego, una tradición»**, en bloque oscuro.
5. **Tu propia lotería**: ocasiones y fila de cartas.
6. **Las 54 cartas de la lotería tradicional**:
   - Lista numerada solo con nombres, como texto real (`<ol>`).
   - Se conservan todos los nombres originales, incluidos El Negrito y El Apache. Lo decidí así.
   - **Nunca uses las ilustraciones de la baraja comercial.**
7. **Preguntas frecuentes** (5), con su FAQPage.
8. **Llamada final**.

---

## Al terminar cada historia

1. Corre `npm run typecheck`, `npm run lint` y `npm test`.
2. Comprueba que el HTML pre-generado de la página trae su texto y su FAQPage.
3. Marca la historia en el archivo de la feature.
4. Descríbeme el recorrido para revisarlo en dev.chorroybuenas.com.mx, en escritorio y en celular, y con y sin sesión cuando aplique.
