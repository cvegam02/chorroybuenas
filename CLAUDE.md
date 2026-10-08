# Lotería Personalizada (chorroybuenas)

Sitio web para crear una lotería mexicana personalizada con fotos propias y descargarla en PDF; la transformación de fotos con IA se paga con tokens. Es una aplicación React + Vite + TypeScript publicada en Vercel, con Supabase como backend (base de datos, inicio de sesión, almacenamiento y edge functions), Mercado Pago para cobrar y Replicate para la IA.

## Documentación de referencia (leer antes de tocar reglas de negocio)

- [`docs/contexto-negocio.md`](docs/contexto-negocio.md) — documento maestro de reglas de negocio: propósito, roles, loterías y tableros, IA, tokens, compras, promociones, administración, permisos y avisos. **Las decisiones marcadas como definidas no se reabren sin que el usuario lo pida explícitamente** — están listadas en la sección «Decisiones definidas» (§15) de ese documento. La §17 lista las reglas ya definidas que el sitio todavía no cumple.
- [`docs/casos-de-uso.md`](docs/casos-de-uso.md) — 28 casos de uso formales en 6 bloques; complementa el documento de negocio sin introducir reglas nuevas.
- [`docs/diseno-mockups.md`](docs/diseno-mockups.md) — índice de pantallas con su código, estructura de navegación y fuente viva del diseño (el sitio ya construido).

Antes de empezar cualquier tarea, leer las partes de estos documentos que la tarea toca, y el archivo de la fase o feature activa. Si una tarea nueva parece contradecir algo del documento de negocio, señalarlo y pedir confirmación antes de cambiarlo — no reinterpretar en silencio.

## Estado de la infraestructura (verificar con comandos si hace falta confirmar vigencia)

- **Frontend:** Vercel. La rama `main` publica en `chorroybuenas.com.mx` (producción); la rama `dev` publica en `dev.chorroybuenas.com.mx` (pruebas; pide sesión de Vercel). Detalle en [`docs/VERCEL_DEPLOY.md`](docs/VERCEL_DEPLOY.md).
- **Backend:** dos proyectos de Supabase en cuentas distintas. Producción: `bdruzgjboxalpywljemk`. Dev: `vjglrfofyzvyvaetakpu`. Secrets y orden de despliegue en [`docs/ENTORNOS_DEV_PROD.md`](docs/ENTORNOS_DEV_PROD.md), secciones 4 y 10.
- **Variables de entorno:** las públicas (`VITE_*`) van en Vercel, una por entorno, y se incrustan al construir. En `.env` (ignorado por git) están las de desarrollo local y los tokens de acceso de Supabase: `SUPABASE_ACCESS_TOKEN` (dev) y `SUPABASE_ACCESS_TOKEN_PROD` (producción).
- **Claves que nunca deben llegar al navegador ni a Vercel:** la `service_role` de Supabase, el token de Mercado Pago, el token de Replicate y los tokens de acceso de Supabase. Viven como secrets de cada proyecto de Supabase o en `.env` local. Nada con prefijo `VITE_` puede ser secreto.
- **Flujo de ramas:** ver la regla «Ramas: feature → dev → main», más abajo. GitHub Actions (`ci.yml`) solo verifica; no despliega.
- **Migraciones y edge functions:** no las despliega Vercel. Se aplican primero en dev y, tras probar, en producción, **antes** de fusionar a `main`. No usar `supabase db push` contra dev (su base no tiene historial de migraciones) ni `supabase start` (no hay disco suficiente): ver «Cosas que conviene saber» en [`docs/PENDIENTES.md`](docs/PENDIENTES.md).
- **Tocar producción** (migraciones, secrets, funciones, datos) requiere que el usuario lo confirme en esa sesión.

## Cómo continuar (fases de construcción)

Ver [`docs/plan-fases.md`](docs/plan-fases.md). Las fases se ordenan por dependencia real; las que aún no están definidas se definen con el usuario al cerrar la anterior.

El seguimiento tarea por tarea de cada fase vive en un documento tipo «Jira» por fase, en [`docs/fases/`](docs/fases/) (fase = Epic, subtareas = User Stories). Al cerrar una fase y abrir la siguiente, crear su `docs/fases/fase-N.md`.

Para trabajo que no es una fase completa del roadmap (un hueco puntual, una mejora aislada), el mismo formato vive en [`docs/features/`](docs/features/), un archivo por feature. Los archivos `FEAT-01` a `FEAT-13` de esa carpeta son el histórico de la remediación del 2026-10-06, en un formato anterior: no se editan ni se usan como plantilla.

**Dónde van los specs de diseño y los planes de implementación:** siempre dentro del archivo «Jira» correspondiente en `docs/fases/` o `docs/features/`, en ese formato (Epic + User Stories con `Historia` / `Entrega demostrable` / `Depende de` / `Cómo se prueba (guion de demo)` / `Escenarios cubiertos`). Nunca en archivos aparte como `docs/superpowers/specs/` o `docs/superpowers/plans/`: ese es el default de algunas skills y aquí se ignora. Si una skill lleva a escribir un `*-design.md` o un `*-plan.md` suelto, redirigirlo al archivo de la feature o fase. Lo que ya hay en `docs/superpowers/plans/` es histórico.

## Regla obligatoria: ramas feature → dev → main

Decidido por el usuario el 2026-10-06.

1. **Todo el trabajo se hace en una rama `feature/<nombre-corto>`**, creada desde `dev`. Una rama por fase o por feature (por ejemplo `feature/fase-1-reglas`), no una por historia. Nunca se trabaja ni se hace commit directamente en `dev` ni en `main`.
2. **Cuando la rama está funcional**, se manda a `dev` con un PR. Vercel publica `dev` en `dev.chorroybuenas.com.mx`, contra la base de pruebas, y ahí el usuario sigue el guion de demo.
3. **Solo cuando el usuario probó en dev y lo confirmó**, `dev` pasa a `main` con un PR. `main` es producción: Vercel lo publica en `chorroybuenas.com.mx`.
4. Si el cambio incluye migraciones o edge functions, se despliegan en el proyecto de Supabase de dev antes de probar, y en el de producción —con confirmación del usuario— antes de fusionar a `main`.

No hacer commit, subir una rama, abrir un PR ni fusionarlo sin que el usuario lo pida en esa sesión. «Funciona en mi máquina» no basta para pasar a `main`: hace falta la confirmación del usuario sobre lo probado en dev.

## Regla obligatoria: mantener el checklist actualizado

Cada vez que se complete una User Story (o parte de una) del documento de la fase o feature activa, marcarla como hecha ahí mismo antes de dar la tarea por terminada, y llenar su renglón «Construido». No dejarlo para después: ese archivo es lo que permite retomar el trabajo en frío en otra sesión.

Si se va a hacer algo que **no está listado** en ese documento (una subtarea nueva, una extensión de alcance, algo que surgió en la conversación), **antes de implementarlo** hay que agregarlo al checklist — y antes de agregarlo, preguntarle al usuario si corresponde a esa fase o story. No agregar subtareas ni marcarlas como completas sin esa confirmación.

## Regla obligatoria: documentos al día antes del commit o del PR

Decidido por el usuario el 2026-10-07 (FEAT-23).

Antes de hacer commit o abrir un PR, todos los documentos que el cambio deja desactualizados tienen que estar ya corregidos e incluidos en ese mismo commit: el archivo de la fase o feature (estado, «Construido», escenarios, fechas y PR de despliegue), la base de conocimiento y el índice de pantallas (`docs/diseno-mockups.md`, quitando las marcas «por construir» de lo ya construido). Un deploy solo para corregir documentos es un deploy que no debió hacer falta.

- Si algún documento necesita la confirmación del usuario (ver «mantener la base de conocimiento sincronizada», más abajo), se le pide **antes** del commit; no se deja como pendiente para después.
- El estado de despliegue se redacta de modo que siga siendo cierto después de fusionar (por ejemplo, citando el PR que lo lleva a `dev` o a `main`), para no tener que editarlo otra vez.

## Reglas de trabajo en este proyecto

Estas reglas mandan sobre las reglas globales del usuario cuando se contradigan (decidido el 2026-10-06).

- **No inventar reglas de negocio** que no estén en `docs/contexto-negocio.md` o `docs/casos-de-uso.md`. Si falta una definición, preguntar — una por una, con opciones concretas y una recomendación — no asumir.
- **Antes de construir una feature o fase, se define con el usuario**: se le hacen las preguntas necesarias, sus respuestas quedan en «Decisiones tomadas con el usuario» con fecha y alternativas descartadas, y el diseño y las User Stories se escriben en el archivo «Jira» antes de tocar código.
- **Cada User Story se demuestra sola.** No está hecha si el usuario no puede seguir su guion de demo y ver el resultado.
- **Sesiones cortas:** una o dos User Stories por sesión. El archivo de la fase guarda el estado para continuar después.
- **Poca información a la vez:** presentar una pantalla o una decisión por turno, en lenguaje llano.
- **Al entregar un cambio visual**, describirlo como recorrido: «abre X → mira Y → debería verse Z», sin nombres de clases, commits ni jerga.
- **Ahorrar tokens** (pedido por el usuario el 2026-10-06): leer solo los archivos o fragmentos que la tarea necesita, no volver a leer lo ya visto, no repetir en el chat lo que ya está escrito en un documento, y dar respuestas y resúmenes cortos. Si una tarea va a gastar mucho (leer muchos archivos, una búsqueda amplia), avisarlo antes.
- **Sin ceremonia extra:** no lanzar agentes de planeación o de revisión, no buscar proyectos de referencia en GitHub ni agregar pasadas de investigación que el usuario no pidió. Esto sustituye lo que piden las reglas globales.
- **Pruebas primero en lo que toca dinero:** todo cambio en saldos, cobros, pagos, promociones o permisos se empieza escribiendo la prueba que falla (en `tests/` para el código, en `supabase/tests/` para la base) y luego el código que la hace pasar. Es la única regla global que se conserva: fue lo que encontró los errores reales. En lo demás, las pruebas se escriben cuando la historia lo pida.
- **Las bases reales pueden no coincidir con las migraciones del repo.** Antes de migrar un entorno, revisar su estado real (permisos, reglas de acceso, columnas) y respaldar lo que se va a tocar.
- **Verificación:** `npm run typecheck`, `npm run lint` y `npm test` después de cada cambio; `npm run test:db` además cuando se toque una migración. `npm run build` solo cuando el usuario lo pida. No verificar en el navegador por iniciativa propia: describir la pantalla para que el usuario la revise.

## Front-end: todo se diseña contra el sitio construido

Antes de diseñar o implementar cualquier pieza de interfaz —una pantalla, un componente, dónde va un botón, incluso UI temporal o de prueba— revisar `docs/diseno-mockups.md` (y el código de la pantalla si hace falta el detalle) para respetar tres cosas:

1. la **pantalla** correspondiente, por su código (`C1`, `U3`);
2. la **estructura de navegación**: a qué zona pertenece. Son cuatro: **Pública** (inicio y páginas informativas), **Crear** (cartas → tableros → vista previa, sin cuenta), **Mi cuenta** (panel, loterías guardadas, comprar tokens) y **Administración** (panel con pestañas);
3. el **sistema de diseño**: colores, tipografía, componentes.

Si lo que se va a construir no aparece en el índice o lo contradice, señalarlo y pedir confirmación antes de seguir — no improvisar la ubicación.

**Procedimiento por pantalla:** seguir [`docs/workflow-fe.md`](docs/workflow-fe.md). La autoridad de color, tipografía y componentes es [`docs/sistema-diseno.md`](docs/sistema-diseno.md), no el resumen de `diseno-mockups.md`; los valores se comprueban contra `src/index.css`. Código nuevo usa solo los colores de la paleta: no se escriben colores sueltos.

## Regla obligatoria: mantener la base de conocimiento sincronizada (nunca automático)

Cuando una conversación cambie, agregue o contradiga algo de `docs/contexto-negocio.md`, `docs/casos-de-uso.md` o `docs/diseno-mockups.md` (una regla de negocio, un flujo, un caso de uso, una pantalla), **antes de editar esos archivos** hay que parar y presentarle al usuario, en texto, estos cuatro puntos:

1. **Qué cambia** exactamente (la regla o flujo anterior frente al nuevo).
2. **En qué archivo(s) y sección(es)** de la base de conocimiento afecta.
3. **Cuál es el impacto**: qué otras reglas, módulos, pantallas o código ya construido dependían de la versión anterior y podrían quedar inconsistentes.
4. **Confirmación explícita**: preguntar si de verdad quiere aplicar el cambio.

Solo si el usuario responde que sí se edita la base de conocimiento, anotando la fecha y la feature que originó el cambio. Si dice que no, o no responde con un sí claro, la documentación se queda como está — no actualizar «por si acaso» ni asumir que un cambio de código implica tocar los documentos. Aplica siempre, aunque el cambio parezca pequeño u obvio.
