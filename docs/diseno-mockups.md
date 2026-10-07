# Diseño — índice de pantallas y navegación

Índice de las pantallas del sitio, cada una con un código corto para poder citarla (`C1`, `U3`), y la estructura de navegación.

**Fuente viva del diseño:** el sitio ya construido. No hay mockups aparte (decidido el 2026-10-06): lo publicado en `chorroybuenas.com.mx` y el código de `src/components/` son la referencia. Los archivos `design_system.md` y `design_system_v2.md` de la raíz del repo quedan como histórico.

La autoridad de colores, tipografía y componentes es [`sistema-diseno.md`](sistema-diseno.md), no este índice.

Creado el 2026-10-06 a partir del código. Las descripciones marcadas _(por confirmar)_ se dedujeron del código sin revisar la pantalla.

---

## Estructura de navegación

El sitio tiene cuatro zonas. Toda pantalla nueva debe pertenecer a una de ellas. Confirmado por Carlos el 2026-10-06.

| Zona | Quién la ve | Qué contiene |
|---|---|---|
| **Pública** | Cualquiera | Inicio y páginas informativas |
| **Crear** | Cualquiera | El recorrido de tres pasos para hacer una lotería: cartas → tableros → vista previa |
| **Mi cuenta** | Usuario registrado | Panel, loterías guardadas y compra de tokens |
| **Administración** | Administrador | Panel de administración con sus pestañas |

**Barra de navegación (arriba, en todas las pantallas):** _(por confirmar)_

- Para todos: logo (lleva a Inicio), Crear lotería, Beneficios, ¿Cómo se juega?, ¿Qué es la lotería?, selector de idioma (español / inglés).
- Sin sesión: Iniciar sesión y Crear cuenta.
- Con sesión: saldo de tokens, y un menú de usuario con Mis loterías, Crear nueva lotería, Comprar tokens, Mi cuenta, Administración (solo administradores) y Cerrar sesión.

**Pie de página:** en todas las pantallas. _(por confirmar)_

---

## Zona pública

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| P1 | Inicio | `/` | Presentación del producto, con el video y la llamada a crear una lotería. |
| P2 | Beneficios | `/beneficios` | Por qué registrarse: guardar loterías, usar la IA, tokens. Lleva a crear cuenta. |
| P3 | ¿Cómo se juega? | `/como-se-juega` | Reglas del juego de la lotería. Informativa. |
| P4 | ¿Qué es la lotería? | `/que-es-la-loteria` | Historia y contexto de la lotería mexicana. Informativa. |

## Zona Crear

Recorrido en tres pasos. No requiere cuenta (principio central, `contexto-negocio.md` §2).

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| C1 | Cartas | `/cards` | Lista de cartas de la lotería. Agregar una carta o varias, editarlas, borrarlas, ver una en grande (en teléfono, desde el menú de la carta), elegir el modo (Clásico o Kids), ver cuántas faltan para el mínimo, transformar con IA (una o todas) y renombrar la lotería. Botón para pasar al paso siguiente. |
| C2 | Cantidad de tableros | `/board-count` | Cuántos tableros generar, con la cantidad sugerida. Avisa si faltan cartas. |
| C3 | Vista previa | `/preview` | Los tableros generados, uno por uno, y la descarga del PDF. |

`/crear` redirige a C1.

## Zona Mi cuenta

Requiere sesión.

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| U1 | Mi cuenta (panel) | `/dashboard` | Nombre y foto de perfil (editables), saldo y resumen de tokens, lista de loterías guardadas (crear, renombrar, borrar, abrir), historial de compras y cambio de contraseña. |
| U2 | Lotería guardada | `/loteria/:setId` | Las cartas y tableros de una lotería guardada, con acceso a editarla y a su PDF. _(por confirmar)_ |
| U3 | Comprar tokens | `/comprar-tokens` | Paquetes y cantidad libre, campo de código promocional, aviso de primera compra, y el resultado al volver de Mercado Pago (éxito, pendiente o cancelado). Visible sin sesión, pero comprar la requiere. |

## Zona Administración

Requiere ser administrador.

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| A1 | Panel de administración | `/admin` | Menú lateral con seis pestañas. |
| A1.1 | — Compras | | Todas las compras, con filtros. |
| A1.2 | — Promociones | | Crear, editar, activar y borrar promociones. |
| A1.3 | — Packs de tokens | | Paquetes, precio por token y tokens de bienvenida. _(por confirmar dónde está cada control)_ |
| A1.4 | — Balances | | Saldos de todos los usuarios, regalo de tokens (con motivo opcional) e historial general de regalos. |
| A1.5 | — Uso de IA | | Uso por día, por usuario y por lotería, con costo estimado. |
| A1.6 | — Transacciones MP | | Transacciones de Mercado Pago, con filtros. |

## Ventanas emergentes

| Código | Ventana | Dónde aparece | Para qué |
|---|---|---|---|
| M1 | Iniciar sesión / Crear cuenta | Barra de navegación, y donde se pida sesión | Entrar o registrarse con correo o con Google; recuperar contraseña. |
| M2 | Definir contraseña nueva | Al abrir el enlace de recuperación | Poner la contraseña nueva. |
| M3 | Cambiar contraseña | U1 | Cambiar la contraseña con sesión iniciada. |
| M4 | Subir carta | C1 | Elegir imagen, ajustarla y poner título. |
| M5 | Editar carta | C1 | Cambiar imagen o título. |
| M6 | Subida en lote | C1 | Subir varias imágenes y revisar sus títulos. |
| M7 | Progreso de subida | C1 | Barra de avance al guardar imágenes. |
| M8 | Transformación con IA en lote | C1 | Cuántas cartas, cuántos tokens, avance y resultado. |
| M9 | Tablero ampliado | C3 | Ver un tablero en grande y pasar al siguiente. |
| M10 | Vista previa de carta | U2; C1 (solo en teléfono, desde el menú de la carta — 2026-10-06, FEAT-14) | Ver una carta en grande. _(por confirmar en U2)_ |
| M11 | Historial de compras y regalos | U1 | Lista de compras del usuario y, mezclados por fecha, los regalos de tokens que recibió. |
| M12 | Confirmación y advertencia | Varias | Confirmar acciones que no se deshacen (borrar, vaciar) y avisar de errores. |

---

## Pantallas que las reglas piden y todavía no existen

Salen de `contexto-negocio.md` §17. Cuando se construyan, se agregan arriba con su código.

- En U1 o M11: marca de "devuelta" en una compra reembolsada.
