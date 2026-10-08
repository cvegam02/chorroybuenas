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
| **Pública** | Cualquiera | Inicio, páginas informativas y el catálogo de loterías temáticas |
| **Crear** | Cualquiera | El recorrido de tres pasos para hacer una lotería: cartas → tableros → vista previa |
| **Mi cuenta** | Usuario registrado | Panel, loterías guardadas, loterías temáticas compradas y compra de tokens |
| **Administración** | Administrador | Panel de administración con sus pestañas |

**Barra de navegación (arriba, en todas las pantallas):** _(por confirmar)_

- Para todos: logo (lleva a Inicio), Crear lotería, Beneficios, ¿Cómo se juega?, ¿Qué es la lotería?, selector de idioma (español / inglés).
- Sin sesión: Iniciar sesión y Crear cuenta, y el enlace «Temáticas» junto a «Crear lotería» (2026-10-06, FEAT-17).
- «Temáticas» con sesión va dentro del menú de usuario, porque la barra solo muestra enlaces a quien no ha entrado (2026-10-06, FEAT-17).
- Con sesión: saldo de tokens, y un menú de usuario con Mis loterías, Crear nueva lotería, Comprar tokens, Mi cuenta, Temáticas, Administración (solo administradores) y Cerrar sesión. En computadora el menú es un panel con encabezado (foto, nombre, correo, saldo y botón «Comprar») que muestra hasta cinco loterías; si hay más, agrega «Ver todas mis loterías», que abre Mi cuenta (U1) en su lista de loterías (2026-10-06, FEAT-16).

**Pie de página:** en todas las pantallas. _(por confirmar)_

---

## Zona pública

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| P1 | Inicio | `/` | Presentación del producto, con el video y la llamada a crear una lotería. Desde el 2026-10-07 (FEAT-22), debajo del banner de beneficios lleva el bloque «¿Qué es chorroybuenas?»: qué hace el sitio, para qué se usa la IA, para qué se usa Google y qué contenido no se permite, con enlace al aviso de privacidad. |
| P2 | Beneficios | `/beneficios` | Por qué registrarse: guardar loterías, usar la IA, tokens. Lleva a crear cuenta. |
| P3 | ¿Cómo se juega? | `/como-se-juega` | Reglas del juego de la lotería. Informativa. |
| P4 | ¿Qué es la lotería? | `/que-es-la-loteria` | Historia y contexto de la lotería mexicana. Informativa. |
| P5 | Catálogo «Temáticas» | `/tematicas` | Construida el 2026-10-06 (FEAT-17); «Ya es tuya» en la tarjeta llega con las compras. Loterías temáticas visibles, agrupadas por temática: portada con marca de agua, nombre, modo, número de cartas y tableros, y precio. Tocar una abre P6. Desde el 2026-10-07 (FEAT-24): bajo el título, una introducción y tres pasos de cómo funciona (Elige, Compra, Imprime); después del catálogo, siete preguntas frecuentes cerradas, que se abren al pulsarlas, con enlaces a «Cómo se juega» y a crear la lotería propia. Pasos y preguntas se ven también con el catálogo vacío, cargando o con error. `/temporada` redirige aquí. Visible sin sesión. |
| P6 | Detalle de lotería temática | `/tematicas/:id` | Construida el 2026-10-06 (FEAT-17); el cobro, «Descargar PDF» y el aviso al volver de Mercado Pago llegan con las compras. Portada, cartas de muestra ampliables, qué incluye, descripción y recuadro con precio y «Comprar» (pide sesión). Si ya se compró: «Descargar PDF». Muestra el resultado al volver de Mercado Pago (éxito, pendiente o cancelado). |
| P7 | Aviso de privacidad | `/privacidad` | Construida el 2026-10-06 (FEAT-20). Texto legal en nueve apartados: responsable, datos que se recaban, para qué se usan, uso sin cuenta, con quién se comparten, cookies, conservación, derechos y cambios al aviso. Solo en español. Informativa; se llega desde el enlace «Aviso de privacidad» del pie de página. |

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
| U1 | Mi cuenta (panel) | `/dashboard` | Nombre y foto de perfil (editables), saldo y resumen de tokens, lista de loterías guardadas (crear, renombrar, borrar, abrir), historial de compras y cambio de contraseña. Por construir (FEAT-17): sección «Mis loterías temáticas», bajo las loterías guardadas, con la descarga de cada una y la etiqueta «Pago en proceso» en las pendientes. |
| U2 | Lotería guardada | `/loteria/:setId` | Las cartas y tableros de una lotería guardada, con acceso a editarla y a su PDF. _(por confirmar)_ |
| U3 | Comprar tokens | `/comprar-tokens` | Paquetes y cantidad libre, campo de código promocional, aviso de primera compra, y el resultado al volver de Mercado Pago (éxito, pendiente o cancelado). Visible sin sesión, pero comprar la requiere. |

## Zona Administración

Requiere ser administrador.

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| A1 | Panel de administración | `/admin` | Menú lateral con seis pestañas; serán siete con A1.7. |
| A1.1 | — Compras | | Todas las compras, con filtros. Por construir (FEAT-17): columna y filtro «Tipo» (tokens o lotería temática). |
| A1.2 | — Promociones | | Crear, editar, activar y borrar promociones. |
| A1.3 | — Packs de tokens | | Paquetes, precio por token y tokens de bienvenida. _(por confirmar dónde está cada control)_ |
| A1.4 | — Balances | | Saldos de todos los usuarios, regalo de tokens (con motivo opcional) e historial general de regalos. |
| A1.5 | — Uso de IA | | Uso por día, por usuario y por lotería, con costo estimado. |
| A1.6 | — Transacciones MP | | Transacciones de Mercado Pago, con filtros. |
| A1.7 | — Temáticas | | **Por construir (FEAT-17).** Lista de temáticas (crear, editar, ordenar, borrar) y tabla de loterías temáticas con estado, fechas, ventas e interruptor de publicar; formulario de lotería con ficha, precio, fechas, PDF, portada y muestras. Desde el 2026-10-07 (FEAT-23) la ventana de la ficha tiene tres pestañas —Datos, Precio y fechas, Archivos— con Cancelar y Guardar siempre visibles; en Archivos, junto a «Elegir PDF», el botón «Crear el PDF con mis cartas» abre A1.7a. |
| A1.7a | Crear lotería temática con cartas | `/admin/tematicas/:id/crear` | Construida el 2026-10-07 (FEAT-23); falta elegir las muestras en el paso 3. Solo administradores; pantalla completa, fuera del panel con pestañas, con botón para volver a la ficha. Tres pasos: Cartas (subida por lote, cartas completas sin nombre, contador «N de 54», aviso de las que no vienen en 2:3) → Tableros (cuántos, generar, volver a generar) → Muestras y guardar (guarda el PDF y los números de cartas y tableros en la ficha y regresa a ella, abierta en Archivos; marcar las muestras está por construir). |

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
| M10 | Vista previa de carta | U2; C1 (solo en teléfono, desde el menú de la carta — 2026-10-06, FEAT-14); P6, para las cartas de muestra (2026-10-06, FEAT-17) | Ver una carta en grande. _(por confirmar en U2)_ |
| M11 | Historial de compras y regalos | U1 | Lista de compras del usuario y, mezclados por fecha, los regalos de tokens que recibió. Por construir (FEAT-17): también sus compras de loterías temáticas. |
| M12 | Confirmación y advertencia | Varias | Confirmar acciones que no se deshacen (borrar, vaciar) y avisar de errores. |

---

## Pantallas que las reglas piden y todavía no existen

Salen de `contexto-negocio.md` §17. Cuando se construyan, se agregan arriba con su código.

- En U1 o M11: marca de "devuelta" en una compra reembolsada.
- Las pantallas de loterías temáticas (P5, P6, A1.7 y los cambios en U1, M11, A1.1 y la barra) ya están en el índice, marcadas «por construir»: su diseño está en `docs/features/FEAT-17-loterias-de-temporada.md`. Al construir cada una se le quita la marca.
