# FEAT-19 — Registrarse e iniciar sesión con Google

**Estado: 🔨 en curso — construida; PR abierto hacia `dev`. Falta la demo de Carlos ahí.**

**Contexto.** Carlos pidió (2026-10-06) que los usuarios puedan registrarse con Google. Las reglas de negocio ya lo contemplaban (`contexto-negocio.md` §roles, casos de uso de registro e inicio de sesión, pantalla M1), y el sitio ya sabía hablar con Google, pero la ventana «Iniciar sesión / Crear cuenta» no tenía ningún botón que lo usara: solo ofrecía correo y contraseña. Los estilos y los textos del botón también seguían en el sitio, sin usarse.

**Fuera de esta feature.** No se revisa ni se cambia la configuración de Google en producción: eso se comprueba, con confirmación de Carlos, antes de pasar a `main`. No cambia a dónde llega el usuario después de entrar (su panel). No se muestra un aviso cuando la persona cancela ya estando en la pantalla de Google.

**Clasificación:** ajuste de interfaz en la pantalla M1. No toca base de datos, saldos, cobros ni permisos; no hay migración ni edge function. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-10-06)

1. **Si alguien entra con Google usando un correo que ya tiene cuenta con contraseña, entra a esa misma cuenta.** Conserva sus loterías y tokens, no recibe tokens de bienvenida otra vez y desde entonces puede entrar de las dos formas. Es el comportamiento por defecto de Supabase. _(Descartado: rechazarlo con un aviso de «este correo ya está registrado, entra con tu contraseña».)_ Esta regla vive por ahora solo en este archivo; no se agregó a `contexto-negocio.md`.
2. **Se registra como feature suelta**, en la rama `feature/registro-con-google`, creada desde `dev`.
3. **Producción queda fuera** de esta historia.

**Decidido al construir, por confirmar con Carlos al probarlo:**

- El botón va **arriba** del formulario, seguido de la línea «o con correo electrónico», y no debajo como se propuso en el chat: así estaba diseñado originalmente (los estilos y ese texto ya existían en el sitio con esa disposición).
- El botón dice «Iniciar sesión con Google» o «Registrarse con Google» según la pestaña (textos que ya existían), en vez de «Continuar con Google».

## US A1 — Entrar o registrarse con Google desde la ventana de inicio de sesión   ·   Estado: 🔨 construida, falta la demo de Carlos en dev

- **Historia** — Como persona que quiere usar el sitio, quiero entrar o crear mi cuenta con Google, para no tener que inventar ni recordar otra contraseña.
- **Entrega demostrable** — La ventana «Iniciar sesión / Crear cuenta» muestra un botón de Google que lleva a elegir cuenta y regresa al panel con la sesión iniciada.
- **Construido** — 2026-10-06, en la rama `feature/registro-con-google`. La ventana muestra el botón de Google y la línea «o con correo electrónico» arriba del formulario, tanto al iniciar sesión como al crear cuenta; no aparece en «recuperar contraseña» ni en el aviso de «revisa tu correo». Si no se puede abrir Google, aparece un aviso en rojo (texto nuevo, en español e inglés). Sin pruebas automáticas nuevas: es solo interfaz y el proyecto no tiene pruebas de componentes.
- **Depende de** — que Google esté activado en el proyecto de Supabase del entorno (en dev lo está, comprobado el 2026-10-06).
- **Cómo se prueba (guion de demo)** — Solo en `dev.chorroybuenas.com.mx` (en la máquina local Google no puede regresar al sitio).
  1. Sin sesión, abre «Iniciar sesión» → debería verse arriba el botón «Iniciar sesión con Google», luego la línea «o con correo electrónico» y el formulario de siempre. Cambia a «Crear cuenta» → el botón debería decir «Registrarse con Google».
  2. Pulsa el botón con una cuenta de Google que nunca hayas usado en el sitio → eliges la cuenta en Google → deberías llegar a tu panel, con tu nombre y foto de Google y tus tokens de bienvenida.
  3. Cierra sesión. Pulsa el botón con una cuenta de Google cuyo correo ya tenga cuenta con contraseña en dev → deberías entrar a esa misma cuenta, con sus loterías y su saldo de antes, sin tokens de bienvenida nuevos.
  4. Entra a «¿Olvidaste tu contraseña?» → el botón de Google no debería verse.
- **Escenarios cubiertos**:
  - [ ] El botón aparece al iniciar sesión y al crear cuenta, y no al recuperar contraseña. (Demo.)
  - [ ] Una cuenta nueva de Google queda registrada y recibe sus tokens de bienvenida. (Demo.)
  - [ ] Un correo que ya tenía cuenta con contraseña entra a la misma cuenta. (Demo.)
  - [ ] Entrar con correo y contraseña sigue funcionando igual. (Demo.)
