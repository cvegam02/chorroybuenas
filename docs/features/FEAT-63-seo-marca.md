# FEAT-63 — Que Google encuentre el sitio al buscar «Chorro y Buenas»

**Estado: 🟡 en construcción — definida con Carlos el 2026-11-08, en la rama `feature/seo-marca`.**

**Contexto.** Carlos notó que al buscar «chorro y buenas» en Google el sitio no aparece. Al revisar el código se encontró que el sitio casi nunca dice su nombre con espacios: títulos, logo, pie de página, datos para compartir y datos para buscadores dicen siempre «chorroybuenas.com.mx» o «chorroybuenas», todo junto. «Chorro y Buenas» solo aparecía en una respuesta de «¿Cómo se juega?» (y en el remitente de los correos). Además no existe el dato `WebSite` con el que Google decide el nombre del sitio, y la lista de perfiles de redes (`sameAs`) está vacía.

**Fuera de esta feature** (Carlos lo dejó fuera el 2026-11-08): páginas nuevas por ocasión o por búsqueda («tableros de lotería», baby shower, posadas); pre-generar cada lotería temática; que una temática borrada le avise a Google que ya no existe (hoy sigue pidiendo ser indexada). Lo que Carlos hace fuera del código: pedir de nuevo la indexación en Search Console después de publicar y poner el enlace al sitio en sus redes.

**Clasificación:** zona Pública (y textos de Crear que nombran la marca); sin pantallas nuevas ni cambios de diseño. No toca base de datos, saldos, cobros ni permisos; no hay migración ni edge function. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-11-08)

1. **Alcance: solo la marca.** _(Descartados: agregar páginas por ocasión; pre-generar las temáticas, con republicación automática al crear o retirar una.)_
2. **Nombre del sitio: «Lotería Chorro y Buenas»**, igual que el logo. _(Descartado: «Chorro y Buenas», sin la palabra «lotería».)_
3. **Redes: solo Facebook** por ahora (`https://www.facebook.com/profile.php?id=61594999635801`). Los demás perfiles se agregan cuando existan.

**Decisiones técnicas (de quien construye, por confirmar al probar):**

- Los títulos terminan en «| Lotería Chorro y Buenas» en lugar de «| chorroybuenas.com.mx».
- Donde el texto nombra la marca a secas («la IA de chorroybuenas», «¿Qué es chorroybuenas?») se escribe «Chorro y Buenas». El dominio se conserva donde es una dirección (marca de agua de las vistas previas, aviso de privacidad) y en la presentación del inicio, que une ambas: «Lotería Chorro y Buenas (chorroybuenas.com.mx) es un sitio…».
- Los datos para buscadores incluyen un `WebSite` con nombre «Lotería Chorro y Buenas» y nombres alternos «Chorro y Buenas», «chorroybuenas» y «chorroybuenas.com.mx».

## US B1 — El sitio se presenta en todas partes como «Lotería Chorro y Buenas»   ·   Estado: 🟡 en construcción

- **Historia** — Como dueño del sitio, quiero que Google lea el nombre de la marca con espacios, igual que en el logo, para que quien busque «chorro y buenas» encuentre el sitio.
- **Entrega demostrable** — Los títulos de las páginas públicas, el logo, el pie de página, la imagen al compartir y los datos para buscadores dicen «Lotería Chorro y Buenas»; los datos para buscadores declaran ese nombre del sitio, sus nombres alternos y la página de Facebook.
- **Construido** — 2026-11-08, en la rama `feature/seo-marca`. El nombre del sitio en `src/utils/pageMeta.ts` pasó a «Lotería Chorro y Buenas»; los títulos fijos de inicio, «¿Cómo se juega?», «¿Qué es la lotería?» y «Arma tus tableros» (español e inglés) terminan igual, y los textos que nombraban la marca dicen «Chorro y Buenas». Logo (texto alternativo) y pie de página con el nombre nuevo. En `index.html`: título, autor, datos para compartir y `og:site_name` con el nombre nuevo; dato `WebSite` nuevo con nombres alternos; `Organization` con nombres alternos y la página de Facebook. Prueba nueva en `tests/src/pageMeta.test.ts`. Pendiente: correr `npm run verify` (la sesión donde se construyó no pudo instalar dependencias).
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre el inicio en dev → la pestaña del navegador debería terminar en «| Lotería Chorro y Buenas» → baja al pie de página → debería decir «Lotería Chorro y Buenas» → entra a «¿Cómo se juega?» y «Arma tus tableros» → sus pestañas también deberían terminar así → comparte el enlace del inicio en WhatsApp → la vista previa debería mostrar el nombre nuevo. Después de publicar en producción, pega la dirección del inicio en la Prueba de resultados enriquecidos de Google → debería aparecer el dato «WebSite» con el nombre «Lotería Chorro y Buenas».
- **Escenarios cubiertos**:
  - [x] Los títulos de las páginas públicas terminan en «| Lotería Chorro y Buenas». (Prueba automática, por correr.)
  - [x] Ningún texto visible de la marca dice «chorroybuenas» sin espacios, salvo donde es una dirección. (Revisión.)
  - [x] Los datos para buscadores traen `WebSite` con nombre y nombres alternos, y `Organization` con la página de Facebook. (Revisión.)
