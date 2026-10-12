# FEAT-38 — Rediseño de las ventanas de cuenta (iniciar sesión, crear cuenta y contraseña)

**Estado: definida con Carlos el 2026-10-11, en la rama `feature/ventanas-de-cuenta`, creada desde `dev`. Construidas las US A1 y A2 ese mismo día y fusionadas a `dev` con un merge directo, sin PR, porque Carlos lo pidió así; se publican en dev.chorroybuenas.com.mx al subir `dev` a GitHub. Falta la demo de Carlos ahí, con el guion de cada historia, y faltan las US A3 a A6, que siguen en la misma rama. A producción pasa después, con el PR de `dev` a `main`, cuando la feature esté completa y Carlos confirme lo probado en dev.**

**Contexto.** Carlos pidió el 2026-10-11 rediseñar las ventanas de iniciar sesión y crear cuenta para que queden como las maquetas aprobadas de `docs/design/`: `Auth.dc.html` y `AuthMobile.dc.html` (iniciar sesión, escritorio y celular) y `AuthEstados.dc.html` y `AuthEstadosMobile.dc.html` (los otros ocho estados). Las maquetas son la referencia exacta de textos, medidas y colores. Sus imágenes `/_blob/` salen rotas fuera del lienzo: las dos cartas del encabezado se toman de las cartas de muestra que ya usa el sitio (`/media/inicio/cartas/`, las mismas de Mi cuenta).

**Es solo interfaz.** No cambia el flujo con Supabase (`signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `resetPasswordForEmail`, `updatePassword`) ni `AuthContext`. Tampoco cambian las reglas de negocio.

**Número de la feature.** El pedido decía FEAT-32, pero ese número ya es `FEAT-32-inicio-rediseno.md`; se usa el siguiente libre, FEAT-38.

**Archivos.** `src/components/Auth/EmailAuthModal.tsx` y `SetNewPasswordModal.tsx` con sus `.css`; textos en `src/locales/es` y `en`.

## Decisiones tomadas con el usuario

Del pedido de Carlos (2026-10-11):

1. **Tokens de regalo:** donde la maqueta dice «5 tokens» se muestra la cantidad de tokens de bienvenida que configura el administrador (`docs/contexto-negocio.md`, tokens de bienvenida), nunca un número fijo. Se lee con `useWelcomeTokens`, como en Beneficios.
2. **Pestañas «Iniciar sesión | Crear cuenta»** en lugar del enlace del pie. «Crea una gratis» cambia de pestaña.
3. **En el estado 3 (error al entrar)** el botón de Google pasa debajo del formulario.
4. **«Corrígelo»** en los dos avisos de «Revisa tu correo» regresa al formulario con el correo ya escrito.
5. **Celular (640 px o menos):** la ventana es una hoja que sube desde abajo; Crear cuenta ocupa casi toda la pantalla y se desplaza.
6. **Accesibilidad:** el botón del ojo se alcanza con Tab (se quita `tabIndex={-1}`); `role="dialog"` con `aria-modal` y `aria-labelledby`; errores con `role="alert"` y `aria-invalid` en el campo; foco al primer campo al abrir; Escape cierra.
7. **Colores solo de la paleta de `src/index.css`.** Si la maqueta usa uno que no está, se le avisa a Carlos (ver pendiente 3).

Respuestas de Carlos a lo que dependía del comportamiento de Supabase y de la paleta (2026-10-11):

8. **Estado 6:** dice «Ábrelo para crear tu contraseña nueva.» La maqueta decía «Ábrelo en este mismo navegador», que no es cierto: el sitio crea el cliente de Supabase sin opciones (`src/utils/supabaseClient.ts`), con el flujo por defecto, y el enlace del correo trae la sesión consigo; funciona en cualquier navegador o aparato. _(Descartada: la frase de la maqueta.)_
9. **Estado 8:** dice «Ya entraste a tu cuenta. La próxima vez usa tu correo y tu contraseña nueva.» Tras guardar la contraseña la persona ya queda con sesión iniciada. _(Descartada: «La próxima vez entra con tu correo y tu contraseña nueva», que da a entender que hay que volver a entrar.)_
10. **Estado 5:** dice «Ábrelo para confirmar tu cuenta y entrar.» Quien abre el enlace de confirmación ya queda con sesión en ese navegador. _(Descartada: «…y después entra con tu correo».)_
11. **Colores:** los de la maqueta que no están en la paleta se cambian por su equivalente, como en FEAT-35, 36 y 37. _(Descartada: agregarlos a la paleta.)_
    - Borde y líneas `#fde4cc` → naranja más claro de la paleta.
    - Café rojizo `#9a3412` (pestaña inactiva, ojo) → café de texto secundario.
    - Rojos del error `#b91c1c`, `#991b1b`, `#fee2e2`, `#fffafa` → rojo de la paleta para borde e ícono, letra café, fondo rojo rebajado con blanco.
    - Verdes `#0f766e`, `#115e59`, `#ccfbf1` → turquesa de la paleta con letra café.
    - Los cuatro colores del logo de Google se dejan: son de su marca.

Ajustes de Claude al construir las US A1 y A2 (2026-10-11), avisados a Carlos al entregar:

12. **Al cerrar la ventana se borra lo escrito.** Antes el correo se quedaba al volver a abrirla. Dentro de la misma ventana el correo sí se conserva al cambiar de pestaña o de vista.
13. **«Aviso de privacidad» abre en otra pestaña**, para no perder lo que ya se escribió en el formulario.
14. **Dos textos cambian en celular, como en la maqueta:** el subtítulo de Crear cuenta es más corto y la línea «¿Aún no tienes cuenta? Crea una gratis» no menciona el regalo.
15. **Al cerrar, el foco regresa al botón que abrió la ventana**, y con la ventana abierta la página de atrás no se desplaza.
16. **Al cambiar de pestaña el cursor pasa al primer campo** de la vista nueva.
17. **Recuperar contraseña y los avisos de «revisa tu correo» ya usan el cascarón nuevo con sus textos de antes**, hasta la US A4. El aviso de error es provisional hasta la US A3.
18. **Los campos llevan el radio de la maqueta (12 px)**, no el mediano del sistema (16 px), porque Carlos pidió las medidas exactas.

## Decisiones pendientes

Ninguna.

**Hallazgo para la US A3 (sin tocar todavía):** al entrar con una contraseña equivocada, el código busca el texto `invalid_credentials` dentro del mensaje del error; el mensaje de Supabase dice «Invalid login credentials», así que es probable que hoy la persona vea ese texto en inglés. Se confirma y se corrige en la A3, que de todos modos tiene que reconocer ese error para mostrar el aviso del estado 3.

## Diseño

- **Una sola ventana con vistas.** `EmailAuthModal` muestra: iniciar sesión, crear cuenta, recuperar contraseña y los dos avisos de «Revisa tu correo». `SetNewPasswordModal` muestra: nueva contraseña y contraseña guardada. Las dos comparten cascarón (`AuthDialog`: velo, caja de 420 px, botón de cerrar, hoja en celular) y campos (`AuthFields`: etiqueta, campo, ojo, ayuda).
- **Encabezado:** dos cartas pequeñas inclinadas, título y una línea de apoyo; cambia con la vista.
- **Tokens de regalo:** si la cantidad no se pudo leer, las frases que prometen regalo no salen (igual que en Beneficios).
- **Errores:** aviso arriba del formulario con `role="alert"`; el campo culpable lleva `aria-invalid` y borde rojo. Los enlaces del aviso («Inicia sesión», «recupera tu contraseña», «crea una contraseña nueva») cambian de vista conservando el correo.
- **Celular:** hoja pegada abajo con esquinas redondeadas arriba y su agarradera; alto máximo casi de pantalla, con desplazamiento interno.
- **Quién la abre:** los cinco lugares que hoy abren `EmailAuthModal` siguen igual; no cambian sus propiedades (`isOpen`, `onClose`, `initialMode`, `googleReturnPath`).

## Fuera de alcance

- Cambiar `AuthContext`, las plantillas de correo o la configuración de Supabase.
- `AuthChoice` (los botones «Entrar con Google / Crear tu cuenta» de las páginas).

## Cuándo parar y preguntar

| Historia | Se pregunta si… |
|---|---|
| Todas | Un color de la maqueta no tiene equivalente en la paleta. |
| Todas | Un texto de la maqueta promete algo que el sitio no hace. |
| A6 | Hay que tocar `docs/diseno-mockups.md`: antes, los cuatro puntos y la confirmación de Carlos. |

## Grupo A — Ventanas de cuenta

### US A1 — Ventana nueva de iniciar sesión   ·   Estado: construida el 2026-10-11, pendiente de la revisión de Carlos

- **Historia** — Como visitante, quiero una ventana clara para entrar a mi cuenta, con Google o con mi correo.
- **Entrega demostrable** — La ventana con las dos cartas, «¡Qué gusto verte!», las pestañas, «Continuar con Google», «o con tu correo», correo y contraseña con «¿La olvidaste?» y el ojo, «Iniciar sesión» y la línea «¿Aún no tienes cuenta? Crea una gratis y recibe N tokens». En celular, hoja desde abajo.
- **Construido** — 2026-10-11. En `src/components/Auth/`: `AuthDialog.tsx` y `AuthDialog.css` (cascarón: velo, caja, hoja en celular, Escape, foco al primer campo, foco de regreso al cerrar), `AuthFields.tsx` (campo de texto y de contraseña con su ojo), `AuthParts.tsx` (encabezado con las dos cartas, pestañas, botón de Google, separador y recuadro de regalo), `AuthIcons.tsx`, `AuthForms.tsx` (formularios de entrar y de crear cuenta) y `useEmailAuthForm.ts` (estado y envíos; las llamadas a `AuthContext` son las de antes). `EmailAuthModal.tsx` arma las vistas y conserva sus propiedades. Textos nuevos en `common.auth` de los dos idiomas. Prueba: `tests/src/authDialog.test.ts`.
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — Sin sesión, toca «Iniciar sesión» en la barra: se abre la ventana con el cursor en Correo → con Tab recorres correo, «¿La olvidaste?», contraseña, el ojo y el botón → el ojo muestra y oculta la contraseña → Escape o la X cierran → entra con tu correo: la ventana se cierra y quedas con sesión → en celular la ventana sube desde abajo.
- **Escenarios cubiertos**:
  - [ ] Entrar con correo y con Google funciona como antes.
  - [ ] Foco al primer campo al abrir; Escape y clic fuera cierran.
  - [ ] El ojo se alcanza con Tab y anuncia «Mostrar / Ocultar contraseña».
  - [ ] La cantidad de tokens es la configurada; si no se pudo leer, la frase no promete regalo.
  - [ ] En computadora y en celular (640 px o menos, hoja inferior).
  - [x] Textos en español y en inglés. (Prueba automática.)

### US A2 — Crear cuenta   ·   Estado: construida el 2026-10-11, pendiente de la revisión de Carlos

- **Historia** — Como visitante, quiero crear mi cuenta desde la misma ventana y saber qué me regalan.
- **Entrega demostrable** — La pestaña «Crear cuenta»: «Crea tu cuenta gratis», el recuadro «Te regalamos N tokens al crear tu cuenta», Google, «Tu nombre (opcional)», correo, contraseña con «Mínimo 6 caracteres», «Repite la contraseña», «Crear mi cuenta» y la línea del Aviso de privacidad. En celular ocupa casi toda la pantalla y se desplaza.
- **Construido** — 2026-10-11. `SignUpForm` (en `AuthForms.tsx`) y `GiftNotice` (en `AuthParts.tsx`). La cantidad de tokens sale de `useWelcomeTokens`, que solo se consulta con la ventana abierta; si no se pudo leer o es 0, no sale el recuadro ni la frase del regalo. En celular la hoja de Crear cuenta ocupa casi toda la pantalla (`auth-dialog__box--tall`).
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Abre la ventana y toca la pestaña «Crear cuenta» (o «Crea una gratis»): cambia el encabezado y aparece el recuadro de tokens con la cantidad que hoy da el sitio → cambia esa cantidad en Administración y vuelve a abrir: el número cambió → escribe contraseñas distintas: aviso de que no coinciden → «Aviso de privacidad» abre esa página en otra pestaña → en celular la hoja llega casi hasta arriba y se desplaza.
- **Escenarios cubiertos**:
  - [ ] Las pestañas cambian de vista y conservan el correo escrito.
  - [ ] La cantidad de tokens sale de la configuración.
  - [x] Ningún texto trae el número de tokens escrito. (Prueba automática.)
  - [ ] Contraseñas que no coinciden o de menos de 6 caracteres.
  - [ ] Quien abre la ventana directo en «Crear cuenta» (`initialMode="signup"`) la ve en esa pestaña.
  - [ ] En celular se desplaza sin que se mueva la página de atrás.

### US A3 — Errores al entrar y al crear cuenta   ·   Estado: por construir

- **Historia** — Como persona que se equivocó, quiero que el aviso me diga qué pasó y qué hacer.
- **Entrega demostrable** — Estado 2: «Ese correo ya tiene una cuenta», con «Inicia sesión» y «recupera tu contraseña» y la nota de Google. Estado 3: «El correo o la contraseña no coinciden», con «crea una contraseña nueva», y Google debajo del formulario tras una «o».
- **Construido** — —
- **Depende de** — US A1, US A2.
- **Cómo se prueba (guion de demo)** — Entra con una contraseña equivocada: aviso rojo arriba, los campos marcados y Google abajo del formulario → «crea una contraseña nueva» abre Recuperar con tu correo ya escrito → en Crear cuenta usa un correo que ya existe: aviso con «Inicia sesión» (cambia de pestaña con el correo) y «recupera tu contraseña».
- **Escenarios cubiertos**:
  - [ ] El aviso se anuncia (`role="alert"`) y el campo lleva `aria-invalid`.
  - [ ] Los enlaces del aviso cambian de vista con el correo escrito.
  - [ ] Al volver a escribir o cambiar de pestaña, el aviso se quita y Google regresa arriba.
  - [ ] Error al abrir Google: aviso propio.

### US A4 — Recuperar contraseña y «Revisa tu correo»   ·   Estado: por construir

- **Historia** — Como persona que olvidó su contraseña o acaba de registrarse, quiero saber a qué correo me escribieron y qué sigue.
- **Entrega demostrable** — Estado 4: «¿Olvidaste tu contraseña?» con «Volver», el correo, «Enviar enlace» y la nota para quien entra con Google. Estados 5 y 6: «Revisa tu correo», el correo en grande, la instrucción, «¿No te llegó? Busca en spam o promociones», el botón («Entendido» / «Volver a iniciar sesión») y «¿Escribiste mal tu correo? Corrígelo».
- **Construido** — —
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — «¿La olvidaste?» abre Recuperar con tu correo ya escrito → «Enviar enlace»: «Revisa tu correo» con tu correo → «Corrígelo» regresa a Recuperar con el correo escrito → crea una cuenta nueva: «Revisa tu correo» con la frase de los tokens de regalo → «Corrígelo» regresa a Crear cuenta con el correo escrito.
- **Escenarios cubiertos**:
  - [ ] «Volver» regresa a Iniciar sesión.
  - [ ] «Corrígelo» regresa al formulario del que se vino, con el correo.
  - [ ] La frase de tokens del estado 5 usa la cantidad configurada o no sale.
  - [ ] Error al enviar el enlace: aviso.

### US A5 — Nueva contraseña y contraseña guardada   ·   Estado: por construir

- **Historia** — Como persona que abrió el enlace del correo, quiero poner mi contraseña nueva y saber que quedó.
- **Entrega demostrable** — Estado 7: «Crea tu contraseña nueva», «Para tu-correo», los dos campos con su ojo, «Mínimo 6 caracteres», «Las dos coinciden» cuando coinciden y «Guardar contraseña». Estado 8: «¡Listo! Contraseña guardada», la frase acordada y «Continuar».
- **Construido** — —
- **Depende de** — US A1 (cascarón y campos).
- **Cómo se prueba (guion de demo)** — Pide el enlace y ábrelo desde el correo: el sitio abre la ventana «Crea tu contraseña nueva» con tu correo → escribe dos contraseñas iguales: sale «Las dos coinciden» → «Guardar contraseña»: «¡Listo!» → «Continuar» cierra y sigues con sesión iniciada.
- **Escenarios cubiertos**:
  - [ ] Contraseñas distintas o cortas: aviso y campo marcado.
  - [ ] Error al guardar: aviso.
  - [ ] Mismas reglas de accesibilidad que la otra ventana.
  - [ ] En celular, hoja inferior.

### US A6 — Limpieza y documentos   ·   Estado: por construir

- **Historia** — Como quien mantiene el sitio, quiero que no queden textos ni estilos viejos y que los documentos digan lo construido.
- **Entrega demostrable** — Sin textos de `common.auth` que ya no se usen, sin estilos huérfanos, y los documentos al día.
- **Construido** — —
- **Depende de** — US A1 a A5.
- **Cómo se prueba (guion de demo)** — `npm run typecheck`, `npm run lint` y `npm test` en verde → recorre los ocho estados en español y en inglés sin ver una clave de texto suelta.
- **Escenarios cubiertos**:
  - [ ] Textos en español e inglés con las mismas claves.
  - [ ] `docs/diseno-mockups.md`: si hay que tocarlo, cuatro puntos y confirmación de Carlos antes.
  - [ ] Este archivo con «Construido» y estado al día antes del commit.
