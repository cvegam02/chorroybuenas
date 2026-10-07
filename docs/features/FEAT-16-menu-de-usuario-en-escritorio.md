# FEAT-16 — Menú de usuario como panel en escritorio

**Estado: ✅ hecha — Carlos la vio en local («se ve bien», 2026-10-06); dada por hecha por Carlos el 2026-10-07 («marca todo como completado»). En producción desde el 2026-10-06 (`dev` pasó a `main` con el PR #23).**

**Contexto.** Al hacer clic en el nombre del usuario, en la barra de navegación, se abre una lista angosta con Mi cuenta, Crear nueva lotería, Mis loterías, Comprar tokens, Administración y Cerrar sesión. En teléfono funciona bien; en computadora se ve pobre para el espacio que hay. Carlos pidió mejorarla en escritorio y dejarla igual en móvil (2026-10-06).

**Fuera de esta feature.** El menú en teléfono y tableta no cambia. Las opciones son las mismas de hoy, reordenadas, más un renglón nuevo («Ver todas mis loterías») cuando hay más de cinco. No cambia a dónde lleva cada opción existente ni el botón de la barra que abre el menú.

**Clasificación:** solo interfaz, un componente (barra de navegación). No toca base de datos, saldos, cobros ni permisos. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-10-06)

1. **En escritorio el menú es un panel con encabezado**: arriba la foto, el nombre, el correo y el saldo de tokens con un botón para comprar; abajo las opciones agrupadas. _(Descartado: solo pulir el aspecto de la lista actual; un panel ancho de dos columnas.)_
2. **Se registra como feature suelta**, en la rama `feature/menu-usuario-escritorio`. _(Descartado: agregarla a una fase; seguir sin archivo ni rama.)_

3. **Con muchas loterías, el panel muestra solo cinco y un renglón «Ver todas mis loterías»** que abre Mi cuenta y baja hasta la sección de loterías. _(Descartado: dejar la lista completa con desplazamiento dentro del panel; agregar un buscador.)_

**Decidido al construir, por confirmar con Carlos al probarlo:**

- «Escritorio» es una ventana de más de 1200 px de ancho, el mismo punto en que la barra de navegación ya cambia a su versión compacta. De ahí para abajo se ve el menú de siempre.
- Las cinco que se muestran son las creadas más recientemente, la más nueva arriba; la que está abierta aparece siempre, aunque sea antigua. No se ordena por última modificación porque las loterías no guardan esa fecha (haría falta un cambio en la base).
- «Ver todas mis loterías» solo aparece si hay más de cinco, y muestra el total entre paréntesis.
- En el panel, «Mis loterías» es un título fijo, no se pliega; «Crear nueva lotería» queda dentro de ese grupo.
- «Comprar tokens» deja de ser un renglón de la lista: es el botón «Comprar» junto al saldo.
- El menú se cierra con la tecla Escape (también en móvil, donde antes no lo hacía).

## Diseño

**Dónde vive.** Barra de navegación, presente en todas las pantallas; solo con sesión iniciada. No es una pantalla del índice: es el menú de usuario que `diseno-mockups.md` describe en «Barra de navegación».

**Panel (escritorio), de arriba abajo:**

1. **Encabezado** — foto (o el ícono de persona si no hay), nombre y, debajo, el correo. Si la cuenta no tiene nombre, solo el correo. Debajo, una franja con el saldo («12 tokens») y el botón «Comprar», que lleva a Comprar tokens.
2. **Mis loterías** — título del grupo, «Crear nueva lotería» y hasta cinco loterías; la que está abierta va resaltada y con una palomita. Si hay más de cinco, al final va «Ver todas mis loterías (N)», que abre Mi cuenta (U1) y baja hasta su lista de loterías.
3. **Mi cuenta** y, solo para administradores, **Administración**.
4. **Cerrar sesión**.

**Estados.** Mientras el saldo no ha cargado, la franja muestra solo el botón «Comprar». La lista de loterías vacía se comporta igual que hoy.

**Lo que se reutiliza.** Los renglones del menú actual (mismo aspecto al pasar el cursor, mismo resalte de la lotería abierta, mismo renglón de cerrar sesión) y el botón naranja de la barra. Solo colores de la paleta.

**Lo que no cambia.** Las reglas de negocio. `diseno-mockups.md` se actualizó el 2026-10-06, con la confirmación de Carlos, para describir el panel de escritorio y «Ver todas mis loterías» en «Barra de navegación».

## Grupo A — Menú de usuario

### US A1 — Ver el menú de usuario como panel en computadora   ·   Estado: ✅ hecha — dada por hecha por Carlos el 2026-10-07 («marca todo como completado»)

- **Historia** — Como persona con sesión iniciada en una computadora, quiero que el menú de mi nombre me muestre de un vistazo quién soy, cuántos tokens tengo y mis loterías, para llegar a lo que busco sin leer una lista larga.
- **Entrega demostrable** — En computadora, al hacer clic en el nombre se abre un panel con encabezado (foto, nombre, correo, saldo y «Comprar») y las opciones agrupadas; en teléfono se abre el menú de siempre.
- **Construido** — 2026-10-06, en la rama `feature/menu-usuario-escritorio`, con PR abierto hacia `dev`. Panel nuevo para ventanas de más de 1200 px; de ahí para abajo se dibuja el menú anterior sin cambios. Textos nuevos en español e inglés («Comprar», «Administración», saldo en tokens). Se agregó el cierre con Escape. Con más de cinco loterías el panel muestra cinco y «Ver todas mis loterías», que abre Mi cuenta y baja a la sección de loterías. Sin pruebas automáticas nuevas: no toca dinero ni permisos y el proyecto no tiene pruebas de componentes.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En computadora, con sesión iniciada, haz clic en tu nombre (arriba a la derecha) → debería abrirse un panel con tu foto, nombre y correo, y debajo tu saldo de tokens con el botón «Comprar» → debajo, «Mis loterías» con «Crear nueva lotería» y tus loterías, la actual resaltada con palomita → luego «Mi cuenta» (y «Administración» si eres administrador) → al final «Cerrar sesión». Haz clic en «Comprar» → deberías llegar a Comprar tokens. Abre el menú otra vez y elige una lotería → debería abrirse esa lotería. Abre el menú y presiona Escape, o haz clic fuera → debería cerrarse. Con una cuenta que tenga más de cinco loterías: abre el menú → deberían verse solo cinco y, debajo, «Ver todas mis loterías» con el total → haz clic → debería abrirse Mi cuenta y bajar sola hasta la lista de loterías. Por último, abre el sitio desde el celular (o angosta la ventana) y toca tu foto → debería verse el menú de siempre.
- **Escenarios cubiertos**:
  - [x] En computadora se abre el panel con encabezado, saldo y opciones agrupadas. (Demo.)
  - [x] «Comprar», «Crear nueva lotería», cada lotería, «Mi cuenta», «Administración» y «Cerrar sesión» hacen lo mismo que antes. (Demo.)
  - [x] «Administración» solo aparece para administradores. (Demo.)
  - [x] Con más de cinco loterías se ven cinco (la abierta siempre entre ellas) y «Ver todas mis loterías», que lleva a la lista en Mi cuenta. (Demo.)
  - [x] Con cinco o menos no aparece «Ver todas mis loterías». (Demo.)
  - [x] Escape y el clic fuera cierran el menú. (Demo.)
  - [x] En teléfono y tableta el menú se ve igual que antes. (Demo.)
