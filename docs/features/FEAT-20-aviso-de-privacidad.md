# FEAT-20 — Página de aviso de privacidad

**Estado: ✅ hecha — dada por hecha por Carlos el 2026-10-07 («marca todo como completado»). Entró a `dev` con el PR #22. En producción desde el 2026-10-06, con confirmación de Carlos: `dev` pasó a `main` con el PR #23 y Vercel lo publicó en `chorroybuenas.com.mx`. El aviso ya es público en `chorroybuenas.com.mx/privacidad`. El texto sigue sin revisión de un abogado.**

**Contexto.** Carlos pidió (2026-10-06) una página de política de privacidad. Surgió al revisar la pantalla de Google del inicio de sesión (FEAT-19): Google pide el enlace a la política de privacidad para verificar la aplicación y mostrar su nombre y logotipo. El sitio no tenía ninguna página de este tipo.

**Fuera de esta feature.** No hay página de términos y condiciones. No se configura nada en Google Cloud (lo hace Carlos). No se agrega al sitio una forma de borrar la cuenta: el aviso dice que se pide por correo. El texto no está en inglés.

**Clasificación:** pantalla nueva en la zona Pública, solo informativa. No toca base de datos, saldos, cobros ni permisos; no hay migración ni edge function. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-10-06)

1. **Pantalla nueva «Aviso de privacidad» en `/privacidad`**, enlazada desde el pie de página, con el aspecto de las páginas informativas. Solo privacidad por ahora. _(Descartado por ahora: hacer también términos y condiciones.)_
2. **El responsable es Carlos como persona física.** _(Descartado: a nombre de una empresa.)_ Datos publicados, dados por Carlos «por el momento»: nombre «Carlos Vega», domicilio «Hermosillo, Sonora, México», correo de contacto `carlos.tests01@gmail.com`.
3. **Feature suelta**, en la rama `feature/aviso-de-privacidad`, creada desde `dev`. La rama quedó montada sobre `feature/registro-con-google` (FEAT-19) porque las dos tocan los archivos de textos del sitio, que son de una sola línea y chocarían al fusionar: el PR de FEAT-19 se fusiona primero.
4. **El texto es un borrador** redactado a partir de lo que el sitio hace. No lo ha revisado un abogado.

**Decidido al construir, por confirmar con Carlos al probarlo:**

- El aviso está solo en español, aunque el sitio se vea en inglés: es un texto legal mexicano y una sola versión evita contradicciones. El enlace del pie de página sí se traduce.
- El texto vive en `src/components/PrivacyNotice/privacyNoticeContent.ts`, no en los archivos de traducción, para poder corregirlo sin tocar nada más.
- Afirmaciones del aviso que conviene que Carlos confirme: no hay publicidad ni correos promocionales; no hay herramientas de analítica (comprobado en el código el 2026-10-06); la cuenta se elimina a petición por correo; plazos de respuesta de 20 y 15 días hábiles (los de la ley).
- La pantalla quedó en el índice de `docs/diseno-mockups.md` como **P7**, con la confirmación de Carlos (2026-10-06).

## US A1 — Leer el aviso de privacidad del sitio   ·   Estado: ✅ hecha — dada por hecha por Carlos el 2026-10-07 («marca todo como completado»)

- **Historia** — Como persona que usa el sitio, quiero poder leer qué datos míos se guardan y para qué, para decidir con confianza si me registro o subo mis fotos.
- **Entrega demostrable** — El pie de página tiene el enlace «Aviso de privacidad», que abre una página con el aviso completo en `/privacidad`.
- **Construido** — 2026-10-06, en la rama `feature/aviso-de-privacidad`. Página nueva con nueve apartados (responsable, datos que se recaban, para qué se usan, uso sin cuenta, con quién se comparten, cookies, conservación, derechos y cambios al aviso), con los colores de la paleta. Enlace nuevo en el pie de página, en español e inglés. Sin pruebas automáticas nuevas: es solo contenido e interfaz.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Abre cualquier página del sitio y baja hasta el pie → debería verse el enlace «Aviso de privacidad» entre el año y el lema → haz clic → debería abrirse la página, empezando desde arriba, con el título, la fecha de última actualización y nueve apartados en tarjetas blancas → revisa que tu nombre, domicilio y correo estén bien en el apartado 1 → pulsa «Volver» → deberías regresar al inicio. Abre directamente `/privacidad` en una pestaña nueva → debería cargar la misma página.
- **Escenarios cubiertos**:
  - [x] El enlace del pie de página abre el aviso. (Demo.)
  - [x] La dirección `/privacidad` abre el aviso directamente. (Demo.)
  - [x] Carlos leyó el texto y confirmó que describe bien lo que hace el sitio. (Demo.)
