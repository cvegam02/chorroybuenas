# Rediseño de la página de inicio (P1) — instrucciones para Claude Code

Pega en Claude Code el texto que está entre las líneas `---`.

---

Quiero rediseñar la página de inicio (pantalla P1, `src/components/LandingPage/`) para que quede como el diseño de referencia que está en `docs/referencia-diseno/`:

- `inicio-escritorio.html`: versión de escritorio.
- `inicio-celular.html`: versión de celular (390 px).

Son maquetas estáticas: úsalas como referencia visual de estructura, textos, orden y estilos, no copies su HTML tal cual. Construye con los componentes, clases y tokens de color que ya usa el proyecto (`src/index.css`, `docs/sistema-diseno.md`), con textos en `public/locales/es` y `public/locales/en`.

Los archivos multimedia ya están en `public/media/inicio/` con su nombre final; no los renombres ni los muevas.

Sigue las reglas de `CLAUDE.md`: crea el archivo de la feature en `docs/features/` con sus User Stories antes de programar, trabaja en una rama `feature/inicio-rediseno` creada desde `dev`, y no hagas commit ni PR sin que yo lo pida. Si algo cambia la descripción de P1 en `docs/diseno-mockups.md`, preséntame los 4 puntos (qué cambia, dónde, impacto, confirmación) antes de editarla. Antes de programar, revisa las maquetas y propón las User Stories; si algo no queda claro, pregúntame.

## Orden de secciones

1. **Héroe.** Fondo naranja actual. Badge "Gratis y sin registro", título, descripción, botón "Crear mi lotería gratis →" y, debajo, "Necesitas al menos 24 fotos (15 en Modo Kids)". A la derecha, el video `hero-gratis`, en lugar del logo grande. Quita las tres tarjetas decorativas translúcidas.
2. **Dos caminos.**
   - Tarjeta de IA: video `hero-cartas` y la etiqueta "Desde $X MXN por foto". El precio se lee con `TokenPricingRepository.getPricing('MXN')`, 1 token = 1 foto; si falla, no muestres la etiqueta.
   - Tarjeta de temáticas: imagen `tematica-halloween.jpg` y la etiqueta "Desde [PRECIO]". Pregúntame de dónde sale ese precio o quítala.
3. **"Así quedan tus cartas".** Fila de `cartas/carta-01..08.jpg`, ligeramente giradas y con scroll horizontal.
4. **"Crea y juega fácilmente".** Los 3 pasos, cada uno con su imagen: `paso-1-fotos.png`, `paso-2-tablero.jpg` y `paso-3-baraja.jpg`.
5. **"Todo para tu lotería, en un solo lugar".** Imagen `mesa-loteria.jpg`, que sustituye a `amigos.png`, y las 4 funciones.
6. **"Perfecta para cualquier ocasión".** Seis cartas de lotería hechas con HTML/CSS: número, ícono SVG, color de fondo y nombre en Arvo Bold blanco con contorno negro. Debajo de cada una, su descripción.
7. **"¿Qué es chorroybuenas?"**, con `id="que-es"`. Párrafo de introducción, 3 tarjetas (IA, Google, contenido no permitido) y enlace al Aviso de privacidad. Esta sección la exige Google para verificar el inicio de sesión: debe verse completa sin hacer clic, no dentro de un acordeón.
8. **Preguntas frecuentes** (nueva). Respuestas con los datos reales de `docs/contexto-negocio.md`. La respuesta sobre el papel queda pendiente: pregúntame.
9. **Llamada final** ("¿Listo para comenzar?").
10. **Pie de página.** Añade un enlace "¿Qué es chorroybuenas?" que lleve a `#que-es`, corrige el corazón que falta en "Hecho con ♥ para…" y deja preparados los enlaces a redes; te paso las URL.

## Videos

- Usa `<video autoplay muted loop playsinline preload="metadata" poster="…-poster.jpg">` con dos fuentes: primero el `.webm` y después el `.mp4`. El WebM trae fondo transparente; el MP4 trae fondo naranja `#D25014` para Safari.
- Con `prefers-reduced-motion`, muestra solo la imagen del poster.
- En celular, la tarjeta de IA muestra `hero-cartas-poster.jpg` como imagen fija, no el video, para que no queden dos videos seguidos. La versión de celular de la maqueta tiene el acomodo exacto.

## Fuentes

Arvo Bold, de Google Fonts, se usa solo en los números y nombres de las cartas de ocasiones. Cárgala junto a Quicksand en `index.html`.

## Al terminar

Corre `npm run typecheck`, `npm run lint` y `npm test`. Después descríbeme el recorrido para revisarlo en dev.chorroybuenas.com.mx, en escritorio y en celular.

---
