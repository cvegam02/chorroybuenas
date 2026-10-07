# FEAT-21 — Que el sitio salga en las búsquedas de Google (SEO)

**Estado: 🚧 en curso — definida con Carlos el 2026-10-07. Rama `feature/seo`, creada desde `dev`.**

**Contexto.** Carlos dio de alta `chorroybuenas.com.mx` en Google Search Console (2026-10-07, a raíz de la verificación de marca del inicio de sesión con Google) y pidió ayuda para que el sitio aparezca en las búsquedas. Al revisar el sitio se encontraron cuatro frenos:

1. Todas las páginas declaran como dirección oficial la de inicio (`canonical` fijo en `/`), así que las páginas informativas se presentan a Google como duplicados del inicio.
2. El sitemap lista solo 3 páginas, con fecha de enero de 2026.
3. El idioma se elige por el navegador; el robot de Google navega en inglés, así que probablemente lee el sitio en inglés.
4. El contenido se arma en el navegador: la página que recibe Google llega vacía y depende de que ejecute el código.

**Fuera de esta feature.** La redirección de `www.chorroybuenas.com.mx` al dominio sin `www` (la hace Carlos en Vercel → Domains). Enviar el sitemap y pedir la indexación en Search Console (lo hace Carlos). Escribir contenido nuevo (artículos, páginas por ocasión). Una versión en inglés con direcciones propias. Pre-generar la página de cada lotería de temporada. Analítica.

**Clasificación:** zonas Pública y Crear; sin pantallas nuevas ni cambios de diseño. No toca base de datos, saldos, cobros ni permisos; no hay migración ni edge function. Estimado: 2 a 3 sesiones.

## Decisiones tomadas con el usuario (2026-10-07)

1. **Alcance:** dirección oficial por página, sitemap completo, páginas públicas pre-generadas y los detalles menores (título, descripción e imagen al compartir por página; `robots.txt` que excluya las páginas privadas). _(Descartado: dejar la pre-generación para una feature posterior.)_
2. **Temporada: solo la lista.** Se pre-generan las páginas fijas y la lista `/temporada`. Cada lotería de temporada sigue funcionando como hoy y entra al sitemap, pero no se pre-genera. _(Descartadas: pre-generar también cada lotería —obliga a volver a publicar el sitio cada vez que cambie el catálogo—; dejar temporada fuera.)_
3. **El sitio abre en español para todos.** El inglés sigue disponible con el selector de idioma y se recuerda para quien lo elija; ya no se activa solo por tener el navegador en inglés. _(Descartadas: dos versiones con dirección propia, `/en/…`; dejar la elección por navegador.)_

**Decisiones técnicas (de quien construye, por confirmar al probar):**

- La pre-generación se hace al construir el sitio, renderizando cada página pública a HTML sin abrir un navegador. _(Descartado: un navegador automatizado durante la construcción en Vercel; es pesado y frágil.)_
- El sitemap se genera en cada publicación del sitio. Una lotería de temporada nueva entra al sitemap en la siguiente publicación; mientras tanto Google la encuentra por el enlace desde `/temporada`.
- Páginas que se pre-generan: `/`, `/como-se-juega`, `/que-es-la-loteria`, `/beneficios`, `/privacidad`, `/temporada`.
- Páginas que se marcan para que Google no las indexe: `/dashboard`, `/admin`, `/comprar-tokens`, `/loteria/…`, `/cards`, `/board-count`, `/preview`.

## US A1 — Cada página pública se presenta a Google con su propia dirección, título y descripción   ·   Estado: 🟡 construida el 2026-10-07 — falta la demo de Carlos en dev

- **Historia** — Como dueño del sitio, quiero que cada página informativa le diga a Google cuál es su dirección, su título y su descripción, para que se indexe como página propia y no como duplicado del inicio.
- **Entrega demostrable** — Al abrir cada página pública, su dirección oficial, su título, su descripción y los datos para compartir en redes son los de esa página. Las páginas privadas piden no ser indexadas y `robots.txt` las excluye.
- **Construido** — 2026-10-07, en la rama `feature/seo`. Una sola tabla (`src/utils/pageMeta.ts`) define título, descripción y dirección oficial de cada página pública; un componente (`PageMeta`) los escribe al cambiar de página, junto con los datos para compartir y la indicación de indexar o no. Se quitaron los títulos sueltos que cada página ponía por su cuenta. La ficha de una lotería de temporada publicada pone su propio nombre y descripción. `robots.txt` excluye además `/dashboard`, `/admin`, `/comprar-tokens` y `/loteria/`. Sin textos nuevos: beneficios y temporada reutilizan su título y subtítulo. Pruebas en `tests/src/pageMeta.test.ts`.
- **Límite conocido** — la vista previa al compartir un enlace (WhatsApp, Facebook) seguirá mostrando los datos del inicio hasta la US A4: esas aplicaciones no ejecutan el código del sitio. Google sí lo ejecuta, así que para Google el cambio ya cuenta.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre el inicio y entra a «¿Cómo se juega?» → la pestaña del navegador debería mostrar el título de esa página → entra a «Beneficios» → la pestaña debería decir «¿Por qué registrarte? | chorroybuenas.com.mx» → entra a «De temporada» y abre una lotería → la pestaña debería mostrar el nombre de esa lotería. Abre `/robots.txt` → deberían verse excluidas `/dashboard` y `/admin`.
- **Escenarios cubiertos**:
  - [x] Cada página pública declara su propia dirección oficial. (Prueba automática.)
  - [x] Título, descripción y datos para compartir cambian por página. (Prueba automática.)
  - [x] Las páginas privadas piden no ser indexadas. (Prueba automática.)
  - [x] `robots.txt` excluye las páginas privadas.
  - [ ] Carlos lo vio en dev. (Demo.)

## US A2 — El sitio abre en español   ·   Estado: 🟡 construida el 2026-10-07 — falta la demo de Carlos en dev

- **Historia** — Como dueño del sitio, quiero que el sitio abra en español para todos, para que Google lea e indexe el contenido en el idioma en que la gente lo busca.
- **Entrega demostrable** — Con el navegador en inglés y sin haber elegido idioma, el sitio abre en español. Quien elige inglés con el selector lo conserva en sus siguientes visitas.
- **Construido** — 2026-10-07, en la rama `feature/seo`. El idioma ya no se toma del navegador: solo de lo que la persona eligió con el selector, que se guarda en su navegador. La página declara además el idioma en que se está mostrando. Sin pruebas automáticas: es configuración.
- **Límite conocido** — quien ya visitó el sitio con el navegador en inglés lo sigue viendo en inglés, porque su navegador guardó esa elección; puede cambiarlo con el selector.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre el sitio en una ventana de incógnito con el navegador en inglés → debería verse en español → cambia a inglés con el selector → recarga → debería seguir en inglés.
- **Escenarios cubiertos**:
  - [ ] Primera visita con navegador en inglés: se ve en español.
  - [ ] El idioma elegido con el selector se recuerda.

## US A3 — El sitemap lista todas las páginas públicas y se actualiza solo   ·   Estado: ⬜ por hacer

- **Historia** — Como dueño del sitio, quiero que el sitemap incluya todas las páginas públicas y las loterías de temporada publicadas, para que Google las descubra sin que yo lo mantenga a mano.
- **Entrega demostrable** — `/sitemap.xml` lista las páginas públicas fijas y cada lotería de temporada publicada, con la fecha de la última publicación del sitio.
- **Construido** — pendiente.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre `/sitemap.xml` → deberían aparecer inicio, cómo se juega, qué es la lotería, beneficios, temporada, privacidad y una entrada por cada lotería de temporada publicada, todas con fecha reciente.
- **Escenarios cubiertos**:
  - [ ] Están todas las páginas públicas fijas.
  - [ ] Está cada lotería de temporada publicada; no aparecen las no publicadas.
  - [ ] No aparece ninguna página privada.
  - [ ] Si la base de datos no responde al construir, el sitio se publica igual con las páginas fijas.

## US A4 — Las páginas públicas llegan ya escritas   ·   Estado: ⬜ por hacer

- **Historia** — Como dueño del sitio, quiero que las páginas públicas lleguen a Google con su texto ya escrito, para que las lea completas y rápido sin depender de que ejecute el código del sitio.
- **Entrega demostrable** — El código fuente de cada página pública contiene su texto, y la página se comporta igual que hoy para quien la visita.
- **Construido** — pendiente.
- **Depende de** — A1 y A2.
- **Cómo se prueba (guion de demo)** — Abre `/como-se-juega` → pulsa Ctrl+U (ver código fuente) → busca una frase del texto de la página → debería aparecer. Repite con el inicio y `/temporada`. Navega por el sitio con sesión iniciada y sin ella → todo debería verse y funcionar como antes, sin parpadeos ni textos que cambien al cargar.
- **Escenarios cubiertos**:
  - [ ] El código fuente de las seis páginas pre-generadas contiene su texto en español.
  - [ ] Entrar directo a una página privada o de la zona Crear sigue funcionando.
  - [ ] Quien tiene el inglés elegido ve la página en inglés tras cargar.
  - [ ] La sesión iniciada se sigue reconociendo al entrar por una página pre-generada.
