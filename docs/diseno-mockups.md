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

**Barra de navegación (arriba, en todas las pantallas):** rediseñada el 2026-10-10 (FEAT-33, US A1).

- Para todos, con sesión o sin ella: logo (lleva a Inicio) y cinco enlaces, siempre visibles: Crear lotería, Temáticas, Beneficios, ¿Cómo se juega?, ¿Qué es la lotería? La página actual va en naranja y subrayada. Selector de idioma (español / inglés).
- Sin sesión: «Inicio» como primer enlace, para volver a la página principal (con sesión no aparece, porque ahí Inicio lleva a Mi cuenta); «Iniciar sesión» y el botón «Crear mi lotería gratis», que lleva a crear cartas (C1). Crear cuenta ya no está en la barra: se llega desde «Iniciar sesión», desde el menú de celular y desde las páginas que la piden.
- Con sesión: el saldo de tokens (lleva a Comprar tokens, U3) y un menú de usuario con encabezado (foto o inicial, nombre y correo), el saldo con el botón «Comprar», Crear nueva lotería, Mis loterías (hasta cinco; si hay más, «Ver todas», que abre Mi cuenta, U1, en su lista), Mi cuenta, Administración (solo administradores) y Cerrar sesión. «Temáticas» y «Comprar tokens» ya no van dentro del menú: la primera está en la barra y la segunda es el botón «Comprar». Esto sustituye lo anotado con FEAT-16 y FEAT-17.
- En pantallas de 1200 px o menos la barra es compacta: logo, «Crear lotería» (sin sesión) o saldo y foto (con sesión), y un botón que abre el menú a pantalla completa. Ese menú trae los cinco enlaces y el idioma; sin sesión, «Entrar con Google», «Crear tu cuenta» e «Inicia sesión»; con sesión, la tarjeta de usuario con saldo y «Comprar», «Mis loterías», «Mi cuenta», «Administración» (solo administradores) y «Cerrar sesión».

**Pie de página:** uno solo, el mismo en todas las pantallas (2026-10-10, FEAT-32). Lleva el nombre del sitio, el crédito, los enlaces ¿Qué es chorroybuenas? (a esa sección de Inicio; solo sin sesión), ¿Cómo se juega?, ¿Qué es la lotería? y Aviso de privacidad, y el contacto. Sin enlaces a redes sociales (FEAT-33).

---

## Zona pública

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| P1 | Inicio | `/` | Rediseñada el 2026-10-10 (FEAT-32). Presentación del producto en este orden: héroe con video y el botón «Crear mi lotería gratis»; dos tarjetas, IA (abre P2) y loterías temáticas (abre P5), cada una con su precio «desde»; «Así quedan tus cartas»; los tres pasos; funciones; ocasiones dibujadas como cartas; el bloque «¿Qué es chorroybuenas?» (qué hace el sitio, para qué se usa la IA, para qué se usa Google y qué contenido no se permite, con enlace al aviso de privacidad; siempre a la vista, FEAT-22); preguntas frecuentes; y la llamada final. Con sesión iniciada, Inicio lleva a Mi cuenta (U1). |
| P2 | Beneficios | `/beneficios` | Rediseñada el 2026-10-10 (FEAT-33). Por qué registrarse y cómo queda una foto transformada con IA. En este orden: héroe con video y los botones «Entrar con Google» y «Crear tu cuenta» (con sesión, «Crear mi lotería» y «Comprar tokens»); cuatro pares antes y después; los tres pasos; el recuadro «¿Cuánto cuesta?», con el precio «desde» por foto y el botón que abre U3 (los paquetes solo se muestran en U3); galería de cartas hechas con IA; beneficios de la cuenta; cinco preguntas frecuentes; y la llamada final, que abre el registro (con sesión, lleva a U3). Visible con y sin sesión. |
| P3 | ¿Cómo se juega? | `/como-se-juega` | Rediseñada el 2026-10-10 (FEAT-33). Guía del juego, informativa. En este orden: héroe con foto; lo que necesitas; paso a paso; cómo cantar las cartas, con cuatro versos tradicionales; jugadas y premios, con cuatro tableritos dibujados por el sitio; «¡Buenas!» y jugar con apuesta; Modo Kids y cuántos tableros hacen falta; seis preguntas frecuentes; y la llamada final, que lleva a crear la lotería (C1) y a Temáticas (P5). |
| P4 | ¿Qué es la lotería? | `/que-es-la-loteria` | Rediseñada el 2026-10-10 (FEAT-33). Historia y contexto de la lotería mexicana, informativa. En este orden: héroe con un abanico de cuatro cartas clásicas de ilustración propia; cuatro datos rápidos; historia y origen como línea del tiempo, junto a una hoja de lotería dibujada por el sitio; «Más que un juego, una tradición»; las 54 cartas de la baraja tradicional, con una fila de las doce cartas clásicas y la lista numerada de los 54 nombres como texto (nunca las ilustraciones de la baraja comercial); cinco preguntas frecuentes; y la llamada final, que lleva a crear la lotería (C1) y a «¿Cómo se juega?» (P3). |
| P5 | Catálogo «Temáticas» | `/tematicas` | Construida el 2026-10-06 (FEAT-17); rediseñada el 2026-10-10 (FEAT-33). En este orden: héroe con tres etiquetas, un abanico de cartas y el botón que baja al catálogo; tres pasos de cómo funciona (Elige, Compra, Imprime); el catálogo, agrupado por temática; «¿Prefieres una con tus fotos?», que lleva a crear la lotería propia (C1); y siete preguntas frecuentes cerradas, con enlaces a «Cómo se juega» y a crear la lotería propia (FEAT-24). En el catálogo, una temática con una sola lotería se muestra como tarjeta grande (portada con marca de agua, nombre, modo, número de cartas y tableros, descripción, tira de cartas de muestra, precio y «Ver lotería») y una con varias, como cuadrícula sin la tira. Una lotería ya comprada dice «Ya es tuya» en lugar del precio. «Ver lotería» abre P6. Héroe, pasos y preguntas se ven también con el catálogo vacío, cargando o con error. `/temporada` redirige aquí. Visible sin sesión. |
| P6 | Detalle de lotería temática | `/tematicas/:id` | Construida el 2026-10-06 (FEAT-17); el cobro, «Descargar PDF» y el aviso al volver de Mercado Pago llegan con las compras. Portada, cartas de muestra ampliables, qué incluye, descripción y recuadro con precio y «Comprar» (pide sesión). Si ya se compró: «Descargar PDF». Muestra el resultado al volver de Mercado Pago (éxito, pendiente o cancelado). |
| P7 | Aviso de privacidad | `/privacidad` | Construida el 2026-10-06 (FEAT-20). Texto legal en nueve apartados: responsable, datos que se recaban, para qué se usan, uso sin cuenta, con quién se comparten, cookies, conservación, derechos y cambios al aviso. Solo en español. Informativa; se llega desde el enlace «Aviso de privacidad» del pie de página. |

## Zona Crear

Recorrido en tres pasos. No requiere cuenta (principio central, `contexto-negocio.md` §2).

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| C1 | Cartas | `/cards` | Lista de cartas de la lotería. Agregar una carta o varias, editarlas, borrarlas, ver una en grande (en teléfono, desde el menú de la carta), elegir el modo (Clásico o Kids), ver cuántas faltan para el mínimo, transformar con IA (una o todas) y renombrar la lotería. Botón para pasar al paso siguiente. Desde el 2026-10-09 (FEAT-29), cada carta se muestra como sale impresa, con el nombre y el número de carta (FEAT-30) dentro de la imagen: la de foto normal con margen crema y marco, la convertida con IA entera; mientras se convierte con IA se ve la foto. |
| C2 | Cantidad de tableros | `/board-count` | Cuántos tableros generar, con la cantidad sugerida. Avisa si faltan cartas. |
| C3 | Vista previa | `/preview` | Los tableros generados, uno por uno, y la descarga del PDF. Desde el 2026-10-09 (FEAT-29), las cartas de los tableros se muestran como salen impresas, con el nombre y el número de carta (FEAT-30) dentro de la imagen. |

`/crear` redirige a C1.

## Zona Mi cuenta

Requiere sesión.

| Código | Pantalla | Ruta | Qué muestra y qué permite |
|---|---|---|---|
| U1 | Mi cuenta (panel) | `/dashboard` | Nombre y foto de perfil (editables), saldo y resumen de tokens, lista de loterías guardadas (crear, renombrar, borrar, abrir), historial de compras y cambio de contraseña. Por construir (FEAT-17): sección «Mis loterías temáticas», bajo las loterías guardadas, con la descarga de cada una y la etiqueta «Pago en proceso» en las pendientes. |
| U2 | Lotería guardada | `/loteria/:setId` | Las cartas y tableros de una lotería guardada, con acceso a editarla y a su PDF. Desde el 2026-10-09 (FEAT-29), sus cartas y sus tableros se muestran como salen impresos, con el nombre y el número de carta (FEAT-30) dentro de la imagen. _(por confirmar)_ |
| U3 | Comprar tokens | `/comprar-tokens` | Rediseñada el 2026-10-10 (FEAT-33). Encabezado con el saldo; los paquetes (en grande los tokens que se pagan, debajo el regalo y la promoción, el precio y cuántas fotos alcanza); «¿Otra cantidad?», con botones − y +, atajos y el total al momento; campo de código promocional, solo si hay promociones por código; aviso de primera compra, solo cuando aplica; recuadro de confianza; «1 token = 1 foto transformada», con enlace a P2; y el resultado al volver de Mercado Pago (acreditando, éxito, pendiente o cancelado). Visible sin sesión, pero comprar la requiere: sin sesión, el saldo se cambia por la invitación a crear cuenta, los botones dicen «Crear cuenta y comprar» y abren el registro, y no se muestran el aviso de primera compra ni el código. Quien entra desde esta pantalla regresa a ella. |

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
| A1.7 | — Temáticas | | **Por construir (FEAT-17).** Lista de temáticas (crear, editar, ordenar, borrar) y tabla de loterías temáticas con estado, fechas, ventas e interruptor de publicar; formulario de lotería con ficha, precio, fechas, PDF, portada y muestras. Desde el 2026-10-07 (FEAT-23) la ventana de la ficha tiene tres pestañas —Datos, Precio y fechas, Archivos— con Cancelar y Guardar siempre visibles; en Archivos, junto a «Elegir PDF», el botón «Crear el PDF con mis cartas» abre A1.7a. Desde el 2026-10-07 (FEAT-24, US A3), cuando la lotería ya tiene un PDF guardado, en Archivos hay además un botón «Descargar» para bajarlo y revisarlo. |
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
| M9 | Tablero ampliado | C3; U2 | Ver un tablero en grande y pasar al siguiente. Desde el 2026-10-09 (FEAT-29), las cartas de los tableros se muestran como salen impresas, con el nombre y el número de carta (FEAT-30) dentro de la imagen. |
| M10 | Vista previa de carta | U2; C1 (solo en teléfono, desde el menú de la carta — 2026-10-06, FEAT-14); P6, para las cartas de muestra (2026-10-06, FEAT-17) | Ver una carta en grande. Desde el 2026-10-09 (FEAT-29), la carta se muestra como sale impresa, con el nombre y el número de carta (FEAT-30) dentro de la imagen; las cartas de muestra de P6 no cambian. _(por confirmar en U2)_ |
| M11 | Historial de compras y regalos | U1 | Lista de compras del usuario y, mezclados por fecha, los regalos de tokens que recibió. Por construir (FEAT-17): también sus compras de loterías temáticas. |
| M12 | Confirmación y advertencia | Varias | Confirmar acciones que no se deshacen (borrar, vaciar) y avisar de errores. |

---

## Pantallas que las reglas piden y todavía no existen

Salen de `contexto-negocio.md` §17. Cuando se construyan, se agregan arriba con su código.

- En U1 o M11: marca de "devuelta" en una compra reembolsada.
- Las pantallas de loterías temáticas (P5, P6, A1.7 y los cambios en U1, M11, A1.1 y la barra) ya están en el índice, marcadas «por construir»: su diseño está en `docs/features/FEAT-17-loterias-de-temporada.md`. Al construir cada una se le quita la marca.
