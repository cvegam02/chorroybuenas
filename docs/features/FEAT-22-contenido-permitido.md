# FEAT-22 — Decir en el inicio qué hace el sitio y qué contenido no se permite

**Estado: 🟡 en `dev` desde el 2026-10-07 (PR #30; función `transform-loteria` desplegada en el Supabase de dev) — falta la demo de Carlos en dev, pasarla a producción (función y `main`) y responderle a Google.**

**Contexto.** Google rechazó la verificación de marca del inicio de sesión con Google (2026-10-07) con este aviso: «We were unable to confirm your app's compliance. Please update your home page to clearly outline your application's purpose and ensure it does not use Google APIs for AI NCII (AI-generated Non-Consensual Intimate Imagery), then retry». Al revisar el sitio:

- El sitio solo usa Google para iniciar sesión (nombre, correo y foto de perfil), sin pedir ningún otro permiso. Las fotos las transforma Replicate, no Google.
- La página de inicio describe la lotería, pero la IA solo aparece en un banner y no dice para qué se usa la cuenta de Google.
- Ninguna página dice qué contenido no se permite. El filtro que bloquea fotos con desnudos o contenido sensible existe en la transformación con IA, pero quien revisa el sitio no lo ve.

**Fuera de esta feature.** No hay página de términos y condiciones. No se agrega un filtro propio (se sigue usando el del modelo de IA) ni revisión de las fotos que se suben sin usar la IA. No se configura nada en Google Cloud ni se reenvía la verificación (lo hace Carlos). No se toca el aviso de privacidad.

**Clasificación:** cambio de contenido en una pantalla existente de la zona Pública (P1, Inicio), más un cambio en la IA: se quita el segundo modelo (FLUX) del sitio y de la edge function `transform-loteria`. No toca base de datos, saldos, cobros ni permisos; no hay migración, pero sí hay que desplegar esa función. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-10-07)

1. **Regla nueva de contenido no permitido:** no se aceptan ni se generan desnudos, contenido sexual o íntimo, ni fotos de personas sin su permiso; un filtro automático las bloquea. Carlos la aceptó tal cual. _(Descartado: solo describir el propósito del sitio sin declarar la regla.)_
2. **Se dice en la página de inicio**, en un bloque nuevo «¿Qué es chorroybuenas?», junto con el propósito del sitio, para qué se usa la IA y para qué se usa Google. _(Descartado: ponerlo solo en el aviso de privacidad o en una página aparte; Google pide que esté en el inicio.)_
3. **En español y en inglés**, porque quien revisa en Google lee en inglés.
4. **Feature suelta (FEAT-22)**, en la rama `feature/contenido-permitido`, creada desde `dev`. _(Descartado: meterlo en FEAT-21, SEO.)_
5. **Una foto rechazada por el filtro de contenido ya no se manda al segundo modelo de IA (FLUX).** Al comprobar la frase «un filtro automático las bloquea» se vio que, tras tres rechazos por «contenido sensible», el sitio probaba FLUX como último recurso, y la documentación del propio proyecto dice que FLUX tiene «menos filtros». Carlos eligió quitar ese paso, aceptando que algunas fotos inocentes que antes salían por FLUX dejarán de transformarse. _(Descartado: dejar el comportamiento y suavizar la frase del inicio a «no está permitido…», sin prometer bloqueo.)_
6. **Se cierran los dos huecos que quedaban** («vamos a cerrar los dos huecos»): FLUX se quita por completo, del sitio y del servidor, así que la variable `VITE_REPLICATE_USE_FLUX` deja de existir. _(Descartado: dejar FLUX disponible en el servidor.)_

**Decidido al construir, por confirmar con Carlos al probarlo:**

- El bloque va justo debajo del banner de beneficios y antes de «¿Por qué elegirnos?», para que se vea sin bajar mucho.
- La redacción exacta de los cuatro textos (propósito, IA, Google, contenido no permitido).
- El bloque enlaza al aviso de privacidad.
- La regla quedó escrita en `docs/contexto-negocio.md` §6 y el bloque en `docs/diseno-mockups.md` (P1), con la confirmación de Carlos (2026-10-07).

## US A1 — El inicio explica qué hace el sitio, para qué usa la IA y Google, y qué contenido no se permite   ·   Estado: 🟡 construida — falta la demo de Carlos

- **Historia** — Como persona que llega al sitio (o que lo revisa por parte de Google), quiero leer en el inicio qué hace el sitio, qué hace su IA, para qué pide mi cuenta de Google y qué fotos no se permiten, para saber que se usa de forma legítima.
- **Entrega demostrable** — La página de inicio tiene un bloque «¿Qué es chorroybuenas?» con una descripción del sitio y tres tarjetas: la IA, Google y el contenido no permitido.
- **Construido** — 2026-10-07, en la rama `feature/contenido-permitido`. Bloque nuevo en el inicio, debajo del banner de beneficios, con textos en español e inglés y enlace al aviso de privacidad; usa solo colores de la paleta. Sin pruebas automáticas nuevas: es solo contenido e interfaz.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre el inicio → baja un poco, debajo del banner «¿Quieres transformar tus fotos con IA?» → debería verse el título «¿Qué es chorroybuenas?», un párrafo que describe el sitio y tres tarjetas: «La IA solo dibuja tus cartas», «Google, solo para iniciar sesión» y «Contenido no permitido» → pulsa «Aviso de privacidad» al final del bloque → debería abrirse el aviso. Cambia el idioma a inglés → el bloque debería verse en inglés. Ábrelo en el teléfono → las tres tarjetas deberían verse una debajo de otra.
- **Escenarios cubiertos**:
  - [ ] El bloque se ve en el inicio, en español. (Demo.)
  - [ ] El bloque se ve en inglés al cambiar el idioma. (Demo.)
  - [ ] El enlace abre el aviso de privacidad. (Demo.)
  - [ ] Carlos leyó los textos y confirmó que describen bien lo que hace el sitio. (Demo.)

## US A3 — Una foto rechazada por el filtro de contenido se queda rechazada   ·   Estado: 🟡 construida — falta la demo de Carlos

- **Historia** — Como dueño del sitio, quiero que una foto que el filtro de contenido rechaza no se intente con otro modelo, para que lo que el inicio promete sea cierto.
- **Entrega demostrable** — Tras los reintentos con el modelo principal, la transformación se detiene con el mensaje de políticas de contenido; ya no hay un último intento con FLUX.
- **Construido** — 2026-10-07, en la rama `feature/contenido-permitido`. Prueba primero: dos pruebas nuevas en `tests/src/aiFallback.test.ts` (fallaban antes del cambio) sustituyen a las tres que cubrían el último recurso. El cambio vive en `src/services/aiFallback.ts`; no hay edge function que desplegar. Los reintentos con el modelo principal (hasta tres redacciones de la instrucción, y dos reintentos ante un bloqueo) siguen igual: los decide el mismo filtro.
- **Límite conocido** — una foto subida sin usar la IA no pasa por ningún filtro.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Entra con tu cuenta → abre una carta y transforma una foto normal → debería transformarse como siempre. Transforma una foto que dispare el filtro (por ejemplo, alguien en traje de baño) → deberían verse los avisos de reintento y al final el mensaje «El servicio de IA no pudo procesar esta imagen por sus políticas de contenido» → tu saldo de tokens debería quedar igual que antes del intento.
- **Escenarios cubiertos**:
  - [x] Tres rechazos por contenido sensible terminan en el mensaje de políticas, sin llamar a FLUX. (Prueba automática.)
  - [x] Con FLUX primero activado, una foto rechazada por contenido no vuelve a FLUX. (Prueba automática.)
  - [ ] Una foto normal se sigue transformando. (Demo.)
  - [ ] Una foto rechazada muestra el mensaje y no cuesta tokens. (Demo.)

## US A4 — El sitio usa un solo modelo de IA: se quita FLUX del sitio y del servidor   ·   Estado: 🟡 construida y desplegada en dev — falta la demo de Carlos

- **Historia** — Como dueño del sitio, quiero que no exista ningún camino hacia el modelo con menos filtros, para que nadie pueda transformar una foto que el filtro de contenido rechazaría.
- **Entrega demostrable** — La función del servidor ignora el modelo que pida el navegador y siempre usa el principal; el sitio ya no lee `VITE_REPLICATE_USE_FLUX` ni pide modelo.
- **Construido** — 2026-10-07, en la rama `feature/contenido-permitido`. Prueba primero: `tests/functions/transform.test.ts` (una petición que pide FLUX se atiende con el modelo principal) y `tests/src/aiFallback.test.ts` (el sitio ya no manda modelo). Código en `supabase/functions/_shared/transform.ts`, `src/services/aiFallback.ts` y `src/services/AIService.ts`. Se quitó la variable de `docs/VERCEL_DEPLOY.md` y `docs/CONFIGURAR_REPLICATE_EDGE_FUNCTION.md`. Carlos confirmó (2026-10-07) que `VITE_REPLICATE_USE_FLUX` no está entre sus variables de entorno.
- **Despliegue** — la edge function `transform-loteria` cambia: va primero al Supabase de dev y, tras la demo y con confirmación de Carlos, al de producción antes de fusionar a `main`. Un navegador con la versión anterior del sitio en caché puede seguir pidiendo FLUX: el servidor nuevo lo ignora.
- **Depende de** — US A3.
- **Cómo se prueba (guion de demo)** — Con la función ya desplegada en dev → entra en `dev.chorroybuenas.com.mx` → transforma una foto normal → debería salir con el estilo de siempre → transforma un lote de varias cartas → deberían salir todas y descontarse un token por carta.
- **Escenarios cubiertos**:
  - [x] Una petición que pide FLUX se atiende con el modelo principal. (Prueba automática.)
  - [x] El sitio no manda modelo en sus peticiones. (Prueba automática.)
  - [x] Función desplegada en dev. (2026-10-07.)
  - [ ] Una foto normal y un lote se transforman en dev. (Demo.)
  - [ ] Función desplegada en producción, con confirmación de Carlos. (Pendiente.)

## US A2 — Reenviar la verificación a Google   ·   Estado: ⬜ pendiente (la hace Carlos)

- **Historia** — Como dueño del sitio, quiero responderle a Google que el inicio ya explica el propósito y la regla de contenido, para que apruebe la verificación de marca.
- **Entrega demostrable** — La verificación reenviada, con el texto de respuesta de abajo.
- **Construido** — pendiente.
- **Depende de** — US A1, A3 y A4 publicadas en producción (sitio y función).
- **Cómo se prueba (guion de demo)** — Con el bloque ya visible en `chorroybuenas.com.mx` → abre en Google Cloud la verificación de la aplicación → responde al aviso con el texto de abajo y reenvía → Google debería contestar por correo en unos días.
- **Texto de respuesta para Google** (en inglés):

  > Hello, we have updated our home page (https://chorroybuenas.com.mx) to clearly describe the application's purpose. chorroybuenas.com.mx lets people create a custom Mexican Lotería (a traditional bingo-style card game) with their own pictures and download it as a printable PDF. Google is used only for Sign-In (name, email address and profile picture), with no additional scopes. We do not use any Google API to generate or edit images. The optional AI feature only redraws a user's own photo in the illustrated style of a traditional Lotería card. Nudity, sexual or intimate content, and photos of people without their consent are not allowed, and an automatic content filter blocks them. This policy is now stated on the home page. Thank you.

- **Escenarios cubiertos**:
  - [ ] Verificación reenviada. (Carlos.)
  - [ ] Google aprobó la verificación. (Carlos.)
