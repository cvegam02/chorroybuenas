# FEAT-18 — Aviso de correo ya registrado al crear cuenta

**Estado: 🔨 en curso — construida; PR abierto hacia `dev`. Falta la demo de Carlos ahí y aplicar el correo en producción**

**Contexto.** Carlos reportó (2026-10-06) que al intentar registrar un correo que ya tiene cuenta, el sitio no avisa nada: muestra el mensaje de «revisa tu correo para confirmar» y nunca llega ningún correo. La causa: con la confirmación de correo activa, Supabase no devuelve un error en ese caso, sino una respuesta que parece un registro exitoso. El aviso «Este correo ya está registrado» ya existía en el sitio, pero solo se mostraba si llegaba un error.

**Fuera de esta feature.** No cambia el inicio de sesión ni el registro con Google. El correo de confirmación de registro y los demás correos automáticos no se tocan.

**Clasificación:** corrección de un error en el registro con correo un ajuste de interfaz en la ventana de nueva contraseña y la plantilla del correo de recuperación (configuración de Supabase, no la despliega Vercel). No toca base de datos, saldos, cobros ni permisos. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-10-06)

1. **Se registra como feature suelta**, en la rama `feature/aviso-correo-registrado`, creada desde `dev`. _(Descartado: hacerlo en la rama de las loterías de temporada, como historia extra de FEAT-17.)_
2. **Se agrega a esta misma feature el ícono de ver/ocultar contraseña** en la ventana donde se crea la contraseña nueva al recuperarla (pedido por Carlos el 2026-10-06, US B1).
3. **Se agrega también darle formato al correo de recuperación de contraseña**, que llegaba con el texto por defecto de Supabase, en inglés (pedido por Carlos el 2026-10-06, US B2).

**Decidido al construir, por confirmar con Carlos al probarlo:**

- El sitio avisa abiertamente que el correo ya tiene cuenta. Eso permite a cualquiera saber si un correo está registrado; es lo habitual y lo que el sitio ya pretendía hacer con el aviso existente.
- El correo de recuperación usa el mismo diseño que el de confirmación de registro, con el nombre «chorroybuenas.com.mx» (como el correo de confirmación que hoy está en dev) y el asunto «Recupera tu contraseña - chorroybuenas.com.mx». Dice que el enlace expira en 1 hora, que es lo configurado en dev; falta comprobar que producción tenga el mismo tiempo antes de aplicarlo ahí.

## Grupo A — Registro con correo

### US A1 — Ver el aviso cuando el correo ya tiene cuenta   ·   Estado: 🔨 construida, falta la demo de Carlos en dev

- **Historia** — Como persona que intenta crear una cuenta con un correo que ya usé, quiero que el sitio me diga que ese correo ya está registrado, para iniciar sesión o recuperar mi contraseña en vez de esperar un correo que no va a llegar.
- **Entrega demostrable** — Al registrar un correo que ya tiene cuenta, la ventana de registro muestra «Este correo ya está registrado» y no pasa al mensaje de confirmación.
- **Construido** — 2026-10-06, en la rama `feature/aviso-correo-registrado`. El registro reconoce la respuesta que da Supabase cuando el correo ya tiene cuenta y muestra el aviso que ya existía (en español e inglés). Prueba automática nueva en `tests/src/signUpResult.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Sin sesión iniciada, abre la ventana de crear cuenta con correo → escribe un correo que ya tenga cuenta, una contraseña cualquiera y su confirmación → presiona el botón de crear cuenta → debería aparecer en rojo «Este correo ya está registrado» y la ventana debería quedarse en el formulario. Luego repite con un correo nuevo → debería verse, como siempre, el mensaje de que revises tu correo para confirmar.
- **Escenarios cubiertos**:
  - [x] La respuesta de Supabase para un correo ya registrado se reconoce como tal. (Prueba automática.)
  - [ ] Con un correo ya registrado aparece el aviso y no el mensaje de confirmación. (Demo.)
  - [ ] Con un correo nuevo el registro sigue funcionando igual que antes. (Demo.)

## Grupo B — Recuperación de contraseña

### US B1 — Ver u ocultar la contraseña nueva al recuperarla   ·   Estado: 🔨 construida, falta la demo de Carlos en dev

- **Historia** — Como persona que está creando una contraseña nueva después de pedir recuperarla, quiero poder ver lo que escribo, para no equivocarme al teclearla.
- **Entrega demostrable** — En la ventana «crear nueva contraseña», los dos campos (contraseña y confirmación) tienen el ícono del ojo, igual que en la ventana de crear cuenta.
- **Construido** — 2026-10-06, en la rama `feature/aviso-correo-registrado`. Cada campo tiene su propio ícono, con el mismo aspecto y los mismos textos de ayuda que en la ventana de crear cuenta. Sin pruebas automáticas nuevas: es solo interfaz y el proyecto no tiene pruebas de componentes.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En iniciar sesión, elige «olvidé mi contraseña», escribe tu correo y abre el enlace que te llega → debería abrirse la ventana para crear la contraseña nueva → escribe algo en el primer campo y toca el ojo a su derecha → debería verse el texto; toca de nuevo → debería ocultarse → haz lo mismo en el campo de confirmación → guarda → debería guardarse como siempre.
- **Escenarios cubiertos**:
  - [ ] El ojo muestra y oculta la contraseña en cada uno de los dos campos, por separado. (Demo.)
  - [ ] Guardar la contraseña nueva sigue funcionando igual. (Demo.)

### US B2 — Recibir el correo de recuperación con el formato del sitio   ·   Estado: 🔨 aplicada en dev, falta la demo de Carlos; pendiente en producción

- **Historia** — Como persona que pidió recuperar su contraseña, quiero que el correo que me llega se vea como del sitio y esté en español, para reconocerlo y confiar en el enlace.
- **Entrega demostrable** — El correo de recuperación llega en español, con el encabezado naranja y el botón «Crear nueva contraseña», igual de formato que el de confirmación de registro.
- **Construido** — 2026-10-06, en la rama `feature/aviso-correo-registrado`. Plantilla nueva en `supabase/templates/recovery.html`, registrada en `supabase/config.toml`. Aplicada ese día en el proyecto de Supabase de dev (asunto y contenido; el valor anterior era el de fábrica de Supabase). **En producción no se ha aplicado**: requiere la confirmación de Carlos y hacerse antes de fusionar a `main`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En `dev.chorroybuenas.com.mx`, en iniciar sesión, elige «olvidé mi contraseña» y escribe tu correo → debería llegarte un correo con el asunto «Recupera tu contraseña - chorroybuenas.com.mx», encabezado naranja, texto en español y un botón «Crear nueva contraseña» → haz clic en el botón → debería abrirse el sitio con la ventana para crear la contraseña nueva.
- **Escenarios cubiertos**:
  - [ ] El correo llega con el formato del sitio y en español. (Demo.)
  - [ ] El botón del correo abre la ventana de nueva contraseña. (Demo.)
  - [ ] Aplicado en producción, con confirmación de Carlos.
