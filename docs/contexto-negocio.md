# Contexto de negocio — Lotería Personalizada (chorroybuenas)

Documento maestro de las reglas de negocio. Es la fuente de verdad de qué hace el producto y bajo qué reglas; el resto de los documentos lo cita por número de sección (`§8`).

**Cómo leer las marcas:**

- _(inferido del código, por confirmar)_ — la regla se dedujo de lo que el sistema hace hoy. Que esté programado no la convierte en regla: falta que Carlos la confirme.
- `⚠️ Por definir` — no hay regla; hay que decidirla.
- **DEFINIDO** en un título — la sección está cerrada y no se reabre sin que Carlos lo pida.

Creado el 2026-10-06 a partir del código, las migraciones y las decisiones tomadas durante la remediación del code review.

---

## 1. Propósito del producto

Sitio web para crear una **lotería mexicana personalizada**: la persona sube sus propias fotos, les pone título, y el sitio arma las cartas y los tableros y los entrega en un PDF listo para imprimir y jugar. _(confirmado el 2026-10-06)_

Está pensado para reuniones familiares y de amigos (cumpleaños, fiestas, eventos), no para uso comercial masivo. _(confirmado el 2026-10-06)_

El negocio cobra por dos cosas: la **transformación de fotos con inteligencia artificial** al estilo de la lotería tradicional, que se paga con tokens, y las **loterías temáticas**, ya hechas, que se pagan en pesos (§18). Crear cartas, generar tableros y descargar el PDF de la lotería propia es gratis. _(confirmado el 2026-10-06; las loterías temáticas se agregaron ese mismo día, FEAT-17)_ También es gratis «Arma tus tableros»: tableros personalizados de la lotería tradicional, con las cartas de la suerte de cada quien (§19; 2026-10-22, FEAT-53).

## 2. Principio central — DEFINIDO

**Terminar e imprimir una lotería siempre es gratis.** Cualquiera debe poder hacer su lotería completa e imprimirla sin pagar ni registrarse. La IA es un extra de pago que nunca estorba ese camino.

Cuando dos reglas choquen, o haya que decidir algo que no está escrito, se elige lo que no bloquea a quien solo quiere su lotería. Decidido el 2026-10-06.

El principio habla de la lotería que cada quien hace con sus fotos. Las loterías temáticas (§18) son un producto aparte, de pago, y no lo contradicen: nunca estorban el camino de crear e imprimir la propia. Aclarado el 2026-10-06 (FEAT-17).

## 3. Actores, roles y permisos

| Actor | Quién es | Qué puede hacer |
|---|---|---|
| **Visitante** | Cualquiera sin cuenta | Crear cartas y tableros y descargar el PDF. Su trabajo se guarda solo en su navegador. Puede ver el catálogo de loterías temáticas (§18). No puede usar la IA, comprar tokens ni comprar loterías temáticas. _(confirmado el 2026-10-06)_ |
| **Usuario registrado** | Tiene cuenta (correo y contraseña, o Google) | Todo lo del visitante, y además: guardar varias loterías en la nube, usar la IA, comprar tokens, comprar y descargar loterías temáticas (§18), ver su historial y editar su perfil. _(confirmado el 2026-10-06)_ No se puede crear con un correo de un dominio desechable (2026-10-26, FEAT-58). |
| **Administrador** | Usuario incluido en la lista de administradores | Todo lo del usuario, y además el panel de administración (§10). _(confirmado el 2026-10-06)_ |
| **Invitado de una lotería** | Usuario registrado que entró con el enlace de una lotería colectiva de otra persona | En esa lotería, ver todas sus cartas y agregar cartas con su título. No puede editarlas ni borrarlas, ni usar la IA, los tableros, el PDF o el cantador de esa lotería (§21). _(decidido el 2026-10-23 y el 2026-10-24, FEAT-56)_ |

- Un usuario solo ve y modifica sus propias loterías, cartas, tableros, compras y saldo. **DEFINIDO** (2026-10-06). Excepción: el invitado de una lotería colectiva ve las cartas de esa lotería y agrega cartas a ella (§21; 2026-10-24, FEAT-56).
- Nadie puede modificar un saldo de tokens desde el navegador: el saldo solo cambia por registro, compra, uso de IA o regalo de un administrador. **DEFINIDO** (2026-10-06)
- Un administrador nuevo solo lo puede dar de alta otro administrador; el primero se crea directamente en la base. _(confirmado el 2026-10-06)_

## 4. Loterías, cartas y tableros

- **Lotería (set):** un conjunto de cartas con nombre. Un usuario registrado puede tener varias; un visitante trabaja con una sola, guardada en su navegador. _(confirmado el 2026-10-06)_
- **Carta:** una imagen con un título. No puede haber dos cartas con el mismo título en la misma lotería. _(confirmado el 2026-10-06)_
  - El título tiene como máximo 50 caracteres, al crearla o al cambiarle el título. Las cartas guardadas antes con títulos más largos no se modifican. **DEFINIDO** (2026-10-26, FEAT-58)
  - El título solo admite letras (con acentos, ñ y ü), números, espacios y signos de puntuación comunes; no admite emojis ni letras de otros alfabetos, porque el PDF no puede dibujarlos. El sitio lo rechaza al escribirlo. Las cartas guardadas antes de esta regla no se modifican: el PDF las dibuja sin esos caracteres. **DEFINIDO** (2026-10-09, FEAT-25)
  - Cada carta lleva un **número**: su lugar en el orden en que se subieron las cartas de su lotería (la primera es la 1). Se asigna solo y no se puede cambiar a mano; al borrar una carta, las siguientes bajan un número, así que nunca hay huecos ni repetidos. Se dibuja en la carta (si el ajuste de la lotería lo pide; ver la viñeta siguiente), arriba a la izquierda, en las cartas con foto y en las convertidas con IA; las cartas de loterías temáticas no lo llevan (§18). El número no se guarda: se calcula del orden. **DEFINIDO** (2026-10-09, FEAT-30)
  - **Qué se ve en las cartas:** cada lotería tiene un ajuste con cuatro opciones: nombre y número, solo nombre, solo número o nada. Empieza en «nombre y número». Se cambia en la pantalla de cartas (C1) o, con sesión, en «Ajustes» de la página de la lotería (U2; 2026-10-25, FEAT-57) y vale para toda la lotería: las cartas con foto y las convertidas con IA lo respetan en la cuadrícula, en la vista previa y en el PDF (tableros y baraja para recortar). Con sesión se guarda en la lotería; sin sesión, en el navegador, y pasa a la cuenta con las cartas. El título sigue siendo obligatorio y único aunque no se imprima. Las cartas de loterías temáticas no cambian. Sirve para fotos que ya traen su nombre y número. **DEFINIDO** (2026-10-20, FEAT-51)
- **Modos de juego:** _(confirmado el 2026-10-06)_
  - **Clásico:** tableros de 4 × 4 (16 cartas).
  - **Kids:** tableros de 3 × 3 (9 cartas).
- **Mínimo de cartas para generar tableros:**
  - Kids: **15 cartas. DEFINIDO** (2026-10-06; ese mismo día se había confirmado en 12 y se subió a 15).
  - Clásico: **24 cartas. DEFINIDO** (2026-10-06; ese mismo día se había fijado en 20 y se subió a 24).
  - Estos mínimos son los de la lotería que arma el usuario. Una lotería temática en modo Kids tiene el suyo, 9 cartas (§18; 2026-10-08, FEAT-24).
- **Tableros:** se generan al azar con las cartas de la lotería. No se generan dos tableros iguales. _(confirmado el 2026-10-06)_
- **Cantidad sugerida de tableros:** en Clásico, la que hace que cada carta aparezca unas 8 veces en total; en Kids, un tablero por cada 3 cartas. El usuario puede cambiarla. _(confirmado el 2026-10-06)_
- **Al iniciar sesión**, lo que el visitante tenía guardado en su navegador se pasa a su cuenta: a su primera lotería si está vacía o, si ya tenía cartas, a una lotería nueva, sin mezclarse con lo que había. Al terminar llega a esa lotería. _(decidido el 2026-10-12, FEAT-41; antes iba siempre a la primera lotería de la cuenta, confirmado el 2026-10-06)_
- No hay límite de cartas por lotería ni de loterías por usuario. **DEFINIDO** (2026-10-06). Cada lotería tiene como máximo **200 tableros** (2026-10-27, FEAT-58; hasta entonces tampoco había límite de tableros). Se revisa cuando el almacenamiento empiece a pesar. En una lotería colectiva, cada invitado sube como máximo 60 cartas y 10 por minuto (§21; 2026-10-26, FEAT-58; hasta entonces no había límite por invitado, 2026-10-24, FEAT-56).
- **Lotería colectiva:** una lotería guardada a la que su dueño abrió un enlace para que otras personas suban fotos. Reglas en §21. _(decidido el 2026-10-23 y el 2026-10-24, FEAT-56)_

## 5. Imágenes y PDF

- Formatos aceptados para las cartas: PNG, JPEG y WebP, de hasta 5 MB. _(confirmado el 2026-10-06)_
- Las imágenes de los usuarios registrados son privadas: solo su dueño puede verlas. _(confirmado el 2026-10-06)_ En una lotería colectiva, también las ven sus invitados (§21; 2026-10-24, FEAT-56).
- La portada y las cartas de muestra de las loterías temáticas son públicas, pero solo en su versión reducida y con marca de agua (§18). **DEFINIDO** (2026-10-06, FEAT-17)
- El PDF incluye los tableros en tamaño carta con área de corte, y la baraja completa para recortar. Descargarlo es gratis y no requiere cuenta. _(confirmado el 2026-10-06)_

## 6. Transformación con IA

- Convierte una foto al estilo de la lotería tradicional. Solo existe ese estilo. _(confirmado el 2026-10-06)_
- La voz con IA del cantador es otro uso de la IA, con reglas propias: precio por lotería, devolución solo si fallan todas las cartas y sin el límite por minuto de esta sección (§20). _(decidido el 2026-10-23, FEAT-55)_
- **Cuesta 1 token por imagen transformada.** _(confirmado el 2026-10-06)_
- El cobro lo hace el servidor antes de generar. **DEFINIDO** (2026-10-06)
- Si la imagen no se pudo generar, el token se devuelve: solo se paga por resultados entregados. **DEFINIDO** (2026-10-06)
- El resultado se guarda y se aplica a la carta en el servidor: si se cierra la página mientras la IA trabaja, la carta queda transformada; si no se pudo guardar, el token se devuelve. _(2026-10-27, FEAT-58)_
- Requiere cuenta. **DEFINIDO** (2026-10-06) Sin sesión no se ofrece ninguna acción de IA (transformar, otra versión, volver a la foto original): en la pantalla de cartas el visitante tampoco ve una invitación a crear su cuenta. _(decidido el 2026-10-12, FEAT-40; del 2026-10-11 al 2026-10-12 veía ahí la invitación a crear su cuenta, FEAT-34; antes, un aviso de iniciar sesión)_
- Máximo 10 transformaciones por minuto por usuario. **DEFINIDO** (2026-10-06)
- Se puede transformar una carta o todas las que falten de una lotería, en lote. Si el filtro de contenido rechaza una foto del lote, esa se omite y el lote continúa. _(confirmado el 2026-10-06)_ Si los tokens no alcanzan para todas, se puede transformar solo las primeras para las que alcancen, en el orden de la baraja, viendo antes cuántos tokens son y cuánto saldo queda. _(decidido el 2026-10-11, FEAT-34)_
- **Contenido no permitido:** no se aceptan ni se generan desnudos, contenido sexual o íntimo, ni fotos de personas sin su permiso. La regla se dice en la página de inicio. El bloqueo automático es el filtro de contenido del modelo de IA: una foto subida sin usar la IA no pasa por ningún filtro, y ahí la regla es norma de uso. _(decidido el 2026-10-07, FEAT-22)_
- La IA usa un solo modelo, elegido en el servidor. Una foto que su filtro de contenido rechaza no se transforma ni se intenta con otro modelo; el token se devuelve. _(decidido el 2026-10-07, FEAT-22)_
- El usuario puede revertir una carta transformada a su foto original, sin costo y sin recuperar el token. _(confirmado el 2026-10-06)_ Al revertir, la versión con IA se borra. Al pedir otra versión desde «Editar carta», la nueva se guarda en la carta al momento y la anterior se puede recuperar solo mientras esa ventana siga abierta. _(decidido el 2026-10-11, FEAT-34)_
- Volver a transformar una carta ya transformada cuesta otro token: cada transformación se cobra. **DEFINIDO** (2026-10-06)

## 7. Tokens

- El token es la unidad con la que se paga la IA. No tiene otro uso, no caduca (§14) y no se puede transferir entre usuarios. _(confirmado el 2026-10-06)_
- **Tokens de bienvenida:** cada cuenta nueva recibe una cantidad configurable por el administrador. Hoy son 5 en producción. **DEFINIDO** (2026-10-06)
- El saldo nunca puede ser negativo. **DEFINIDO** (2026-10-06)
- Un administrador puede regalar tokens a cualquier usuario. _(confirmado el 2026-10-06)_
- Cada regalo de tokens queda registrado: quién lo dio, a quién, cuánto y cuándo. **DEFINIDO** (2026-10-06). Los regalos anteriores a este registro no se pueden recuperar: el historial empieza el 2026-10-06, al publicarse la fase 2.
- Al regalar, el administrador puede escribir un motivo; es opcional. **DEFINIDO** (2026-10-06, fase 2)
- El administrador consulta todos los regalos en una lista general, del más reciente al más antiguo, con fecha, quién regaló, a quién, cuánto y motivo. **DEFINIDO** (2026-10-06, fase 2)
- El usuario ve los regalos que recibió en su historial, mezclados por fecha con sus compras: cantidad y fecha. No ve el motivo ni quién se los dio. **DEFINIDO** (2026-10-06, fase 2)

## 8. Compra de tokens

Mercado Pago cobra también las loterías temáticas; sus reglas están en §18 (2026-10-06, FEAT-17).

- Solo los usuarios registrados pueden comprar. **DEFINIDO** (2026-10-06)
- Se paga con Mercado Pago, en pesos mexicanos. En la versión en inglés del sitio el precio se muestra además en dólares, solo como referencia; el cobro es siempre en pesos. _(confirmado el 2026-10-06)_
- **Paquetes vigentes:** _(confirmado el 2026-10-06)_

  | Paquete | Tokens de regalo | Precio |
  |---|---|---|
  | 10 tokens | 2 | $20.00 MXN |
  | 20 tokens | 5 | $40.00 MXN |
  | 50 tokens | 20 | $100.00 MXN |

- **Cantidad libre:** se puede comprar cualquier cantidad entre el mínimo y 500 tokens, a $2.00 MXN por token, sin tokens de regalo. _(confirmado el 2026-10-06)_
- **Mínimo de compra:** el monto a pagar, ya con la oferta, nunca baja de **$10.00 MXN**; sin oferta son 5 tokens. En la cantidad libre, el mínimo de tokens sube lo necesario para llegar a $10 (con 50 % de oferta, 10 tokens). **DEFINIDO** (2026-10-06; en pesos desde el 2026-10-26, FEAT-58).
- El precio siempre lo calcula el servidor con los datos de la base. **DEFINIDO** (2026-10-06)
- Durante una oferta (§9), el precio que calcula el servidor es el de la oferta vigente en el momento de iniciar el pago. Vale el precio del momento en que se inició el pago: si la oferta termina mientras el pago está pendiente (efectivo, transferencia), se respeta el precio con descuento. **DEFINIDO** (2026-10-15, FEAT-49)
- Un pago aprobado acredita los tokens **una sola vez**, sin importar cuántas veces lo notifique Mercado Pago. **DEFINIDO** (2026-10-06)
- No se acredita si el monto pagado es menor al esperado. **DEFINIDO** (2026-10-06). El esperado es el de ese pago, con o sin oferta (2026-10-15, FEAT-49).
- Los pagos pendientes (efectivo, transferencia) se acreditan cuando Mercado Pago los confirma. _(confirmado el 2026-10-06)_
- **Reembolsos y contracargos:** cuando un pago se devuelve o el banco lo revierte, se descuentan los tokens de esa compra. Si el usuario ya gastó algunos, su saldo queda en 0, nunca en negativo, y la compra queda marcada como devuelta. **DEFINIDO** (2026-10-06). Construido en FEAT-58 (2026-10-26).
- **Reembolso parcial:** no se revierte nada automático; el administrador ajusta los tokens a mano si hace falta. **DEFINIDO** (2026-10-26, FEAT-58)
- **Comprobante:** el sitio no emite ninguno. El comprador tiene el recibo de Mercado Pago y su historial de compras en su panel. **DEFINIDO** (2026-10-06)

## 9. Promociones

- Hay dos tipos: **primera compra** (se aplica sola) y **código** (el usuario lo escribe). Ambas dan un porcentaje extra de tokens sobre los tokens base, redondeado hacia abajo. _(confirmado el 2026-10-06)_
- Las promociones tienen vigencia opcional (desde, hasta) y se pueden activar o desactivar. _(confirmado el 2026-10-06)_
- Si aplican las dos, gana el código; no se suman. _(confirmado el 2026-10-06)_
- El código aplica en cualquier compra, no solo en la primera. **DEFINIDO** (2026-10-06)
- Cada usuario puede usar un mismo código una sola vez; usuarios distintos pueden usar el mismo código. **DEFINIDO** (2026-10-06). Limitación conocida: si alguien abre dos pagos con el mismo código y paga los dos, recibe el bono en ambos, porque el uso se registra al acreditarse el pago.
- Los códigos no son visibles públicamente: solo quien conoce un código puede usarlo. **DEFINIDO** (2026-10-06)
- El código se revisa al tocar «Aplicar». Cada usuario puede probar como máximo **5 códigos sin bono por hora** (que no existen, vencidos o ya usados, sin distinguirlos); pasado el tope, se le dice que lo intente más tarde. **DEFINIDO** (2026-10-26, FEAT-58)
- Hoy no hay ninguna promoción activa en producción.

### Ofertas — DEFINIDO (2026-10-15, FEAT-49)

- Una **oferta** es un descuento con fechas en el precio de los tokens. Tiene nombre interno, porcentaje de descuento y fechas de inicio y fin, obligatorias. Se puede cancelar antes de tiempo.
- Solo puede haber una oferta vigente a la vez: no se pueden crear dos que se crucen en fechas.
- Una oferta no se puede guardar si deja algún pack activo por debajo del mínimo de compra ($10.00, §8); tampoco un pack con precio menor a $10, ni que quede por debajo con la oferta vigente o programada. El panel dice cuál pack. _(2026-10-26, FEAT-58)_
- Mientras está vigente, el porcentaje se descuenta del precio de la cantidad libre y de todos los packs. Aplica solo a tokens, no a loterías temáticas (§18).
- El precio con descuento se redondea al centavo. En la cantidad libre el descuento se aplica al precio por token (con 25%, $2.00 → $1.50) y se multiplica por los tokens. _(Descartado: bajar solo el precio por token, porque la cantidad libre quedaba más barata que los packs de 10 y 20.)_
- Las promociones se suman a la oferta, no compiten: el código y la primera compra siguen dando sus tokens extra encima del descuento. Entre ellas sigue valiendo que gana el código.
- El precio con oferta lo calcula el servidor al iniciar el pago y vale el de ese momento (§8). Cada compra guarda si tuvo oferta y cuál.
- Al terminar las fechas, todo vuelve solo a su precio, sin ninguna acción.
- En Comprar tokens, durante la oferta, se ve el precio normal tachado, el precio con descuento y la etiqueta del descuento («−25%») en cada pack y en la cantidad libre.
- **Banner:** la oferta puede llevar un banner con video, título, texto corto y un botón que lleva a Comprar tokens, Crear lotería o Temáticas. Sale solo durante las fechas de la oferta, como un aviso flotante abajo a la izquierda en Inicio, en Mi cuenta o en ambas, y opcionalmente con cuenta regresiva. El video no va en la página: el aviso muestra la imagen fija y el video se abre en una ventana aparte solo cuando la persona lo pide _(2026-10-16, FEAT-49, US A6)_. Cerrarlo no lo quita: queda minimizado en el encabezado, de donde se vuelve a abrir, y así se recuerda en el navegador durante esa oferta; solo se va al terminar la oferta _(cambiado el 2026-10-16, FEAT-49, US A7; antes, quien lo cerraba no lo volvía a ver)_. Los textos van en español y, opcionalmente, en inglés; si falta el inglés, se muestra el español.

## 10. Panel de administración

El administrador puede: _(confirmado el 2026-10-06)_

- ver todas las compras y las transacciones de Mercado Pago;
- crear, editar, activar y borrar promociones;
- crear y editar paquetes de tokens, y cambiar el precio por token;
- crear, editar y cancelar ofertas con su banner (§9) _(2026-10-15, FEAT-49)_;
- ver los saldos de todos los usuarios y regalar tokens;
- ver el gasto en IA del periodo (Resumen) y el uso de cada usuario (su ficha), y ajustar el costo por imagen que se usa para estimarlo, y el costo de la voz con IA del cantador por lotería, que se cuenta aparte de las fotos _(la voz, 2026-10-24, FEAT-55)_ _(cambiado el 2026-10-15, FEAT-47; antes: ver el uso de la IA por día, por usuario y por lotería y su costo estimado)_;
- cambiar la cantidad de tokens de bienvenida;
- administrar las loterías temáticas (§18): crear temáticas, dar de alta loterías con su precio y sus archivos, publicarlas y retirarlas. Sus ventas se ven junto a las compras de tokens, distinguidas por tipo. **DEFINIDO** (2026-10-06, FEAT-17)

## 11. Modelo de entidades

| Entidad | Qué guarda | Relaciones |
|---|---|---|
| Lotería (`loteria_sets`) | Nombre y modo de juego | Pertenece a un usuario |
| Carta (`cards`) | Título, imagen, imagen original, si fue hecha con IA | Pertenece a una lotería |
| Dominio desechable | Un dominio de correo con el que no se crean cuentas | Lista del servidor, sin relación (2026-10-26, FEAT-58) |
| Intento de código | Un código sin bono que probó un usuario, y cuándo | Pertenece a un usuario; solo el servidor (2026-10-26, FEAT-58) |
| Tablero (`boards`, `board_cards`) | Las cartas de un tablero y su posición | Pertenece a una lotería |
| Saldo (`user_tokens`) | Tokens disponibles | Uno por usuario |
| Uso (`token_usage`) | Cada token gastado en IA, con su lotería | Pertenece a un usuario |
| Compra (`token_purchases`) | Tokens, monto, pago de Mercado Pago, promoción usada y oferta que tuvo | Pertenece a un usuario |
| Paquete (`token_packs`) | Tokens base, de regalo y precio | — |
| Precio (`token_pricing`) | Precio por token para la cantidad libre | — |
| Promoción (`promotions`) | Tipo, código, porcentaje, vigencia | — |
| Oferta (`offers`) — por construir | Nombre interno, porcentaje de descuento, fechas, si se canceló y su banner | — |
| Configuración (`app_config`) | Tokens de bienvenida | — |
| Perfil (`profiles`) | Correo y nombre | Uno por usuario |
| Administradores (`admin_users`) | Quién es administrador | Apunta a un usuario |
| Temática (`seasons`) — por construir | Nombre (español; inglés opcional) y orden | — |
| Lotería temática (`seasonal_loterias`) — por construir | Nombre, descripción, modo, número de cartas y de tableros, precio, publicada, fechas, portada, muestras y PDF | Pertenece a una temática |
| Compra de lotería temática (`seasonal_purchases`) — por construir | Monto pagado, pago de Mercado Pago y estado | Pertenece a un usuario y a una lotería temática |
| Juego de «Arma tus tableros» (`traditional_games`) | Nombre, modo y sus hasta 50 tableros (números de carta, casillas vacías y cartas fijadas) | Pertenece a un usuario (2026-10-22, FEAT-53) |
| Audio de carta | El audio con voz de IA del título de una carta, para el cantador | Pertenece a una carta; se borra con ella (2026-10-23, FEAT-55). La lotería guarda qué voz se escogió (2026-10-24) y cuántos audios se han generado, para el tope de §20 (2026-10-26, FEAT-58) |
| Audio compartido | El audio con voz de IA de un texto (la frase de arranque o un título) con una voz, para reutilizarlo entre loterías | No pertenece a ninguna cuenta; solo lo usa el servidor (2026-10-26, FEAT-58) |
| Invitación de lotería | Código del enlace, si está abierto y hasta cuándo el dueño ya vio las fotos de sus invitados | Pertenece a una lotería; una vigente a la vez (2026-10-24, FEAT-56) |
| Invitado de lotería | Quién entró con el enlace, cuándo y si el organizador lo quitó | Une a un usuario con una lotería. La carta guarda quién la subió (2026-10-24, FEAT-56) |

## 12. Permisos de acceso a datos — DEFINIDO

| Dato | Quién lo lee | Quién lo escribe |
|---|---|---|
| Loterías, cartas, tableros, imágenes | Su dueño | Su dueño |
| Saldo | Su dueño; los administradores | Solo el servidor |
| Uso de IA y compras | Su dueño; los administradores | Solo el servidor |
| Paquetes y precio por token | Cualquiera | Los administradores |
| Promociones | Los administradores | Los administradores |
| Tokens de bienvenida | Cualquiera | Los administradores |
| Lista de administradores | Los administradores | Los administradores |
| Temáticas | Cualquiera | Los administradores |
| Lotería temática visible: ficha, portada y muestras | Cualquiera | Los administradores |
| Lotería temática no visible | Los administradores; quien la compró | Los administradores |
| PDF de una lotería temática | Quien tiene una compra aprobada de esa lotería; los administradores | Los administradores |
| Compras de loterías temáticas | Su dueño; los administradores | Solo el servidor |
| Juegos de «Arma tus tableros» | Su dueño | Su dueño (sin sesión, nadie; 2026-10-22, FEAT-53) |
| Audios de las cartas (voz con IA del cantador) | Su dueño | Solo el servidor (2026-10-23, FEAT-55) |
| Audios compartidos (voz con IA) | Nadie desde el sitio: el servidor copia el que corresponde a la carpeta del dueño de cada lotería, sin que nadie vea los de otros | Solo el servidor (2026-10-26, FEAT-58) |
| Cartas e imágenes de una lotería colectiva | Su dueño; sus invitados | Su dueño; sus invitados solo agregan cartas nuevas, mientras el enlace esté abierto (2026-10-24, FEAT-56) |
| Invitación e invitados de una lotería | Su dueño (el invitado ve solo que él participa) | Su dueño; el invitado se une con el enlace abierto (2026-10-24, FEAT-56) |

Decidido el 2026-10-06 (remediación del code review). El detalle técnico está en las migraciones 022 a 025. Los cinco renglones de loterías temáticas se agregaron el 2026-10-06 (FEAT-17) y están por construir.

## 13. Notificaciones — DEFINIDO

| Evento | A quién se avisa | Estado |
|---|---|---|
| Registro con correo | Al usuario: correo de confirmación de cuenta | Funciona |
| Olvidó su contraseña | Al usuario: correo para recuperarla | Funciona |
| Un pago pendiente (efectivo o transferencia) se confirma y sus tokens ya están disponibles | Al usuario | Por construir |
| Un administrador le regala tokens | Al usuario | Por construir |
| Un pago se cobra pero lo comprado no se pudo entregar | Al administrador: alerta por correo | Por construir |
| Queda menos del 20 % del cupo mensual de la voz con IA (ElevenLabs) | Al administrador: alerta por correo, a la misma dirección fija, una vez por mes | Construida el 2026-10-26 (FEAT-58, US A4); en producción, al publicarse la voz con IA |

- No se avisa de una compra normal acreditada, de saldo bajo ni de un pago devuelto. Decidido el 2026-10-06.
- Tampoco se avisa de un pago pendiente que vence sin pagarse. Decidido el 2026-10-13 (fase 3).
- Los dos avisos nuevos llegan por correo. Decidido el 2026-10-06.
- Los correos del sitio se envían solo en español, aunque el usuario vea el sitio en inglés. Decidido el 2026-10-13 (fase 3).
- La alerta al administrador es el único aviso que no va al usuario. Cubre las compras de tokens y las de loterías temáticas (§18). Llega a una sola dirección fija, que se configura en el servidor; no se envía a toda la lista de administradores. Decidido el 2026-10-13 (fase 3).
- El aviso de pago pendiente confirmado cubre también las compras de loterías temáticas (§18). Mientras no exista, esas compras no generan ningún aviso. Decidido el 2026-10-06 (FEAT-17).

## 14. Fechas, plazos y cálculos automáticos

- Vigencia de las promociones (§9).
- Límite de 10 transformaciones por minuto (§6).
- Fechas de inicio y fin de cada lotería temática (§18).
- Nada caduca: ni los tokens, ni las loterías guardadas, ni las cuentas sin uso, ni las loterías temáticas compradas. **DEFINIDO** (2026-10-06)

## 15. Decisiones definidas

Decisiones ya tomadas. No se reabren sin que Carlos lo pida explícitamente.

| Fecha | Decisión |
|---|---|
| 2026-10-06 | La IA se cobra en el servidor, antes de generar, y el token se devuelve si la generación falla. |
| 2026-10-06 | El saldo solo lo modifica el servidor; nunca el navegador. No puede ser negativo. |
| 2026-10-06 | Un pago se acredita una sola vez y solo si el monto pagado alcanza el esperado. |
| 2026-10-06 | Los tokens de bienvenida se asignan al registrarse. Los usuarios que no los habían recibido los recibieron en ese despliegue. |
| 2026-10-06 | Los códigos promocionales no son visibles públicamente; se validan en el servidor. |
| 2026-10-06 | La IA requiere cuenta. Sin sesión se muestra un aviso; nunca se devuelve la foto original como si fuera el resultado. |
| 2026-10-06 | Máximo 10 transformaciones de IA por minuto por usuario. |
| 2026-10-06 | En modo Clásico se necesitan al menos 24 cartas para generar tableros. _(Descartadas: 16, el mínimo matemático, porque todos los tableros tendrían las mismas cartas; 20, porque jugando a tablero lleno con 10 jugadores más de la mitad de las partidas terminaba en empate; 30, porque deja fuera a quien tiene pocas fotos. Origen del cambio de 20 a 24: fase 1, historia A1.)_ |
| 2026-10-06 | En modo Kids se necesitan al menos 15 cartas para generar tableros. _(Descartadas: 12, porque daba los mismos empates que Clásico con 20, un 52 %; 18, porque es demasiado para un modo pensado como sencillo. Origen: fase 1, historia A1.)_ |
| 2026-10-06 | El mínimo de compra en cantidad libre es de 5 tokens ($10.00 MXN). _(Descartadas: 1 token, porque Mercado Pago no permite pagar $2.00; 10 tokens, porque duplica al paquete más chico.)_ |
| 2026-10-06 | Ante un reembolso o contracargo se descuentan los tokens de esa compra, dejando el saldo en 0 como mínimo. _(Descartadas: dejar deuda de tokens y bloquear la IA; no hacer nada automático.)_ |
| 2026-10-26 | Un reembolso parcial no revierte nada automático; el administrador ajusta los tokens a mano (FEAT-58). _(Descartada: descontar la parte proporcional de tokens.)_ |
| 2026-10-06 | El sitio no emite comprobante propio de las compras. _(Descartadas: correo de confirmación; factura fiscal.)_ |
| 2026-10-06 | Un código promocional aplica en cualquier compra. _(Descartada: solo en la primera compra.)_ |
| 2026-10-06 | Cada usuario puede usar un mismo código una sola vez. _(Descartadas: sin límite mientras esté vigente; número de usos configurable.)_ |
| 2026-10-06 | Si una compra califica para primera compra y trae código, se aplica solo el código; no se suman. _(Descartada: sumar los dos bonos.)_ |
| 2026-10-06 | Cada regalo de tokens de un administrador queda registrado (quién, a quién, cuánto, cuándo). _(Descartada: que solo suba el saldo, sin registro.)_ |
| 2026-10-06 | El motivo de un regalo de tokens es opcional. _(Descartadas: motivo obligatorio; no guardar motivo. Origen: fase 2.)_ |
| 2026-10-06 | El usuario ve los regalos que recibió, sin el motivo ni quién se los dio. _(Descartadas: que el historial sea solo para administradores; que el usuario vea también el motivo. Origen: fase 2.)_ |
| 2026-10-06 | Los regalos se muestran al usuario dentro de su historial de compras, mezclados por fecha. _(Descartada: una lista aparte de "tokens regalados". Origen: fase 2.)_ |
| 2026-10-06 | En el panel de administración los regalos se consultan en una lista general. _(Descartadas: historial por usuario; las dos vistas. Origen: fase 2.)_ |
| 2026-10-06 | Se avisa al usuario cuando un pago pendiente se acredita y cuando un administrador le regala tokens. _(Descartados: aviso de pago devuelto; no avisar de nada más.)_ |
| 2026-10-06 | Los avisos de pago pendiente acreditado y de tokens regalados llegan por correo. _(Descartadas: solo dentro del sitio; ambos medios.)_ |
| 2026-10-06 | Cada transformación de IA cuesta 1 token, también al repetir sobre la misma carta. _(Descartada: un reintento gratis por carta.)_ |
| 2026-10-06 | No hay límites de loterías, cartas ni tableros por usuario. _(Descartada: poner topes.)_ |
| 2026-10-06 | Nada caduca: ni tokens, ni loterías, ni cuentas. _(Descartadas: caducidad de tokens; borrar loterías de cuentas inactivas.)_ |
| 2026-10-06 | Principio central: terminar e imprimir una lotería siempre es gratis y sin registro; la IA es un extra de pago. _(Descartados: "el dinero del usuario primero"; "lo más simple gana".)_ |
| 2026-10-06 | El sitio se publica con Vercel: `main` es producción y `dev` es el entorno de pruebas, cada uno con su propio proyecto de Supabase. |
| 2026-10-06 | Loterías de temporada: se vende el PDF ya terminado que sube el administrador, igual para todos. _(Descartadas: desbloquear la lotería para elegir cuántos tableros; una copia editable en la cuenta. Origen: FEAT-17, como todas las de temporada.)_ |
| 2026-10-06 | Las loterías de temporada se pagan en pesos con Mercado Pago, un precio por lotería, mínimo $10.00 MXN; los tokens siguen siendo solo para la IA. _(Descartadas: pagar con tokens; aceptar las dos formas.)_ |
| 2026-10-06 | Comprar una lotería de temporada requiere cuenta; ver el catálogo no. Una lotería se compra una sola vez por cuenta. _(Descartada: comprar sin cuenta y recibir un enlace por correo.)_ |
| 2026-10-06 | La vista previa de una lotería de temporada son una portada y las cartas de muestra que el administrador elija, reducidas y con marca de agua puesta por el sitio. El PDF nunca llega a quien no pagó. _(Descartadas: que el administrador suba las muestras ya protegidas; mostrar solo portada y descripción.)_ |
| 2026-10-06 | Cada lotería de temporada tiene «publicada sí/no» y fechas opcionales. Lo comprado se conserva y se puede descargar siempre, sin límite de veces, aunque la lotería salga del catálogo. _(Descartadas: solo interruptor manual; todo visible todo el año; que deje de aparecerle también a quien la compró.)_ |
| 2026-10-06 | El catálogo vive en la zona Pública, con el enlace «De Temporada» en la barra; lo comprado, en Mi cuenta; la administración, en una pestaña del panel. _(Descartadas: llegar solo desde un bloque en Inicio; enlace más bloque.)_ |
| 2026-10-06 | Ante un reembolso o contracargo de una lotería de temporada se quita el acceso a la descarga y la compra queda como devuelta. _(Descartada: nada automático.)_ |
| 2026-10-06 | Las temporadas las crea y ordena el administrador; cada lotería pertenece a una. Una temporada con loterías no se borra. _(Descartadas: lista fija de temporadas; sin temporadas.)_ |
| 2026-10-06 | Sin descuentos en las loterías de temporada: un solo precio. Cambiarlo no afecta compras ya hechas. _(Descartadas: precio de oferta; códigos de descuento.)_ |
| 2026-10-06 | En las loterías de temporada el español es obligatorio y el inglés opcional; el precio en dólares es solo referencia. _(Descartadas: solo español; los dos obligatorios.)_ |
| 2026-10-06 | El cobro de una lotería de temporada tiene las mismas garantías que el de tokens: precio puesto por el servidor, entrega una sola vez por pago, y sin entrega si el monto es menor. Los pagos pendientes entregan al confirmarse. |
| 2026-10-06 | Una lotería de temporada con ventas no se borra, solo se despublica. No se puede publicar incompleta. Se puede reemplazar su PDF: los compradores descargan la versión nueva. |
| 2026-10-06 | Para publicar una lotería de temporada hacen falta también el número de cartas y el de tableros, además de nombre, descripción, precio, PDF y portada (FEAT-17). |
| 2026-10-07 | El PDF de una lotería de temporada también se puede armar en el sitio: el administrador sube por lote sus cartas ya terminadas (con el nombre dibujado, 54 esperadas, sin recortarlas), genera los tableros y el PDF queda guardado en la ficha; solo se guarda el PDF, no las cartas. Las muestras se pueden elegir de esas cartas. _(Descartadas: una página pública para cualquier usuario; exigir exactamente 54; recortar a 2:3; guardar cartas y tableros. Origen: FEAT-23.)_ Desde el 2026-10-15 (FEAT-48) las cartas sí se guardan, en privado: ver esa fecha. |
| 2026-10-07 | Las loterías «de temporada» pasan a llamarse «loterías temáticas» y sus grupos «temáticas», para dar cabida a ocasiones sin fecha del año; el catálogo pasa de `/temporada` a `/tematicas` y la dirección anterior redirige a la nueva. Ninguna regla cambia. En las decisiones de arriba, «temporada» es el nombre anterior de lo mismo. _(Descartadas: quitar además las fechas de inicio y fin; cambiar solo el título público; conservar la dirección `/temporada`. Origen: FEAT-24.)_ |
| 2026-10-08 | Una lotería temática en modo Kids se puede armar con 9 cartas en vez de 15; la lotería normal conserva 15 en Kids y 24 en Clásico, y la temática en Clásico sigue en 24. Con exactamente 9 cartas los tableros llevan las mismas cartas, cada uno con un acomodo distinto (FEAT-24, US A5). _(Descartadas: bajar a 9 todo el modo Kids, también para los usuarios; dejarlo en 15 y solo aclarar el contador «de 54». Para los tableros con 9 cartas, descartadas: generar un solo tablero; permitir copias con el mismo acomodo.)_ |
| 2026-10-09 | El título de una carta solo admite letras (con acentos, ñ y ü), números, espacios y signos de puntuación comunes; no admite emojis ni letras de otros alfabetos. Se valida en el navegador; las cartas ya guardadas no se tocan y el PDF las dibuja sin esos caracteres. _(Descartadas: quitarlos solo en el PDF y dejar el título intacto en el sitio; quitarlos en el PDF y avisar con una nota en el editor. Origen: FEAT-25.)_ |
| 2026-10-09 | Cada carta lleva un número, que es su lugar en el orden de subida dentro de su lotería. Se asigna solo, no se edita y, al borrar una carta, las siguientes se renumeran. Lo llevan las cartas con foto y las convertidas con IA; las de loterías temáticas, no (FEAT-30). Descartado: que el usuario pueda editarlo, y dejar huecos al borrar. |
| 2026-10-13 | Se alerta por correo al administrador cuando un pago se cobra pero lo comprado no se pudo entregar. _(Descartado: no avisar al administrador. Origen: fase 3.)_ |
| 2026-10-13 | No se avisa al usuario de un pago pendiente que vence sin pagarse. _(Descartado: correo invitándolo a intentarlo de nuevo. Origen: fase 3.)_ |
| 2026-10-13 | La alerta al administrador cubre las compras de tokens y las de loterías temáticas, y llega a una sola dirección fija configurada en el servidor. _(Descartadas: alertar solo de tokens; enviarla a todos los de la lista de administradores. Origen: fase 3.)_ |
| 2026-10-13 | Los correos del sitio se envían solo en español. _(Descartadas: español e inglés en el mismo correo; guardar el idioma de cada usuario y escribirle en el suyo. Origen: fase 3.)_ |
| 2026-10-15 | Las cartas que el administrador carga para armar el PDF de una lotería temática se guardan en privado (solo él las ve), con su orden y el acomodo de los tableros, hasta que se borra la lotería; así puede seguir armándola otro día y elegir de entre ellas la portada y las muestras. Una lotería que se empieza a crear queda guardada como borrador no publicado. _(Descartado: no guardar las cartas. Origen: FEAT-48.)_ |
| 2026-10-15 | Existen las ofertas: un descuento con fechas, una vigente a la vez, sobre el precio de la cantidad libre y de todos los packs (no de las loterías temáticas), redondeado al centavo; las promociones dan sus tokens extra encima; vale el precio del momento en que se inició el pago; cada compra guarda su oferta; con banner opcional en Inicio y Mi cuenta (§9). _(Descartado: bajar solo el precio por token, porque la cantidad libre quedaba más barata que los packs de 10 y 20 y nadie los compraría. Origen: FEAT-49.)_ |
| 2026-10-17 | El administrador puede generar con IA las cartas de una lotería temática dentro del asistente (prompt general + número, nombre y escena por carta; imagen de entrada de la baraja base, de una carta de referencia o ninguna; hasta 5 intentos por carta, elige uno). Existe una baraja base privada de 54 cartas tradicionales que se sube una vez. Generar no descuenta tokens (§18). _(Descartados: una pantalla aparte de generación; subir la baraja base en cada lotería; que cada intento reemplace al anterior. Origen: FEAT-50.)_ |
| 2026-10-20 | Cada lotería elige qué se ve en sus cartas: nombre y número (por defecto), solo nombre, solo número o nada. Un solo ajuste para toda la lotería, en la pantalla de cartas, guardado con la lotería (o en el navegador sin sesión). Vale en la cuadrícula, la vista previa y el PDF. Cambia la regla del 2026-10-09 de que el número se dibuja siempre. _(Descartados: elegir carta por carta, o lotería con excepciones por carta; poner el ajuste en la vista previa o en ambas pantallas; no guardarlo. Origen: FEAT-51.)_ |
| 2026-10-22 | Se pueden armar gratis tableros de lotería tradicional con las 54 cartas tradicionales, en una página pública aparte del recorrido «Crear», sin cuenta (con sesión, además se guardan en «Mi cuenta»). Reglas en §19. Usa los dibujos tradicionales de la baraja: Carlos decidió asumir el riesgo de derechos de autor, señalado en la conversación; es una excepción a la regla de FEAT-33 para «¿Qué es la lotería?», que sigue sin mostrarlos. _(Descartados: hacer dibujos propios de las 54 con IA; usarlos solo como provisionales en dev; cobrarlo; meterlo como atajo dentro de «Crear». Origen: FEAT-53.)_ |
| 2026-10-22 | Cambia el enfoque de la sección del renglón anterior, antes de publicarse: se llama «Arma tus tableros» (`/arma-tus-tableros`) y sirve para armar tableros personalizados con las cartas de la suerte de cada quien, no para generar muchos tableros para una fiesta. Empieza con un tablero vacío; cada tablero se puede «Llenar al azar»; se quitan «Agregar varios» y la cantidad sugerida; en el menú, el grupo «Crear» abre «Tu lotería con fotos» y «Arma tus tableros»; en Mi cuenta, «Mis tableros de la suerte»; un juego nuevo se llama «Mis tableros · <fecha>». _(Descartados: los nombres «Tableros de la suerte» (elegido primero y cambiado por Carlos), «Tableros personalizados» y «Lotería tradicional»; empezar con un tablero al azar; dejarla como estaba cambiando solo los textos; un enlace propio en la barra; dejar `/loteria-tradicional`. Origen: FEAT-53.)_ |
| 2026-10-23 | Existe el cantador: baraja las cartas de una lotería con fotos, las muestra una por una y dice sus títulos. Requiere cuenta y es gratis; voz del navegador en español y, opcional, voz con IA de pago (5 tokens por lotería, una sola vez; 10 desde el 2026-10-24). Reglas en §20. _(Descartados: cantador sin cuenta, recomendado por Claude por el principio central; con cuenta y de pago; solo voz del navegador o solo voz con IA; pagar la voz por carta o en cada partida; precio según el número de cartas; ElevenLabs; un límite propio de voz por hora; revisar los títulos con una lista de palabras. Fuera por ahora: figuras para ganar y verificar «¡Lotería!». Origen: FEAT-55.)_ |
| 2026-10-24 | La voz con IA del cantador se escoge entre cuatro voces (tres de hombre y una de mujer), escuchando una muestra antes de pagar; la elección es definitiva para esa lotería. La voz con IA pasa de 5 a 10 tokens por lotería. Con voz con IA se puede cantar aunque el navegador no tenga voz en español. Mientras se genera la voz no se puede empezar a cantar. Reglas en §20. _(Descartados: empezar a cantar mientras se genera, con la voz del navegador en las cartas sin audio; bloquear el cantador igual en ese navegador; una sola voz para todas las loterías, como se había decidido el 2026-10-23; poder cambiar la voz pagando otra vez. Origen: FEAT-55.)_ |
| 2026-10-24 | El panel de administración cuenta la voz con IA del cantador aparte de las fotos: el gasto en IA del Resumen la suma con su propio costo por lotería, editable en Precios y promos (0.10 US$ al empezar), y la ficha del usuario la muestra como su propio renglón. _(Descartados: contarla como fotos con IA; un costo fijo en el código. Origen: FEAT-55, decisión 28.)_ |
| 2026-10-24 | La voz con IA del cantador pasa a generarse con ElevenLabs directo (cuenta con plan Starter), con 8 voces mexicanas de su biblioteca para escoger. _(Descartados: Replicate con MiniMax, lo decidido el 2026-10-23; las voces de ElevenLabs en Replicate, de origen inglés; dos voces que piden el plan Creator. Origen: FEAT-55, decisión 29.)_ |
| 2026-10-24 | Existen las loterías colectivas: el dueño de cualquier lotería guardada abre un enlace para que otras personas, con cuenta, suban fotos a ella. Las fotos entran directo, sin aprobación y sin límite por invitado; el invitado les pone título y ve todas las cartas, pero no edita, borra, usa IA, tableros, PDF ni cantador. El enlace queda abierto hasta que el dueño lo cierra o genera otro. Al quitar a un invitado sus fotos se quedan. El dueño ve «N fotos nuevas» en Mi cuenta, sin correo. Reglas en §21 (decisiones del 2026-10-23 y el 2026-10-24). _(Descartados: subir sin cuenta; aprobar cada foto antes de que entre; que el invitado borre o cambie sus fotos o use la IA; fecha límite del enlace; tope de fotos por invitado; borrar sus fotos al quitarlo; que solo se abran loterías creadas como colectivas; avisar por correo; que el invitado vea los tableros o descargue el PDF. Origen: FEAT-56.)_ |
| 2026-10-24 | En las loterías colectivas: un invitado quitado no vuelve a unirse con el enlace aunque siga abierto; la página del enlace muestra el nombre de quien organiza (nada si no tiene; nunca el correo); quien crea su cuenta con correo desde el enlace regresa a él al confirmar su correo (§21). _(Descartados: que el quitado vuelva a entrar con el enlace abierto; mostrar solo el primer nombre o ningún organizador; que al confirmar el correo llegue al Inicio. Origen: FEAT-56, decisiones 10, 11 y 13.)_ |
| 2026-10-26 | El título de una carta tiene como máximo 50 caracteres, para todas las cartas (antes solo las de invitados); aplica al crear o renombrar, sin tocar las guardadas. _(Descartado: 100 para el dueño y 50 para invitados. Origen: FEAT-58, decisión 6.)_ |
| 2026-10-26 | Voz con IA: los audios de cartas agregadas o renombradas se generan sin costo hasta tantos audios como cartas tenga la lotería más 10, con un máximo de 20 regeneraciones por minuto por usuario; pasado el tope, esa carta se canta con la voz del navegador. Los 10 tokens se devuelven solo si no salió ninguna carta ni la frase de arranque. Reemplaza las decisiones del 2026-10-23 de no aplicar límite y de regenerar siempre sin costo (FEAT-55, decisiones 13, 15 y 25). _(Descartados: tope igual al número de cartas; tope de 20 o 50 regeneraciones; solo límite por minuto; contar solo los renombres; límite por minuto también al primer audio; devolver con solo la frase. Origen: FEAT-58, decisiones 7 y 10.)_ |
| 2026-10-26 | Loterías colectivas: cada invitado sube como máximo 60 cartas por lotería y 10 por minuto, cada carta con su propia imagen; el dueño puede borrar de una vez las fotos de un invitado, que sigue participando. Reemplaza «sin tope de fotos por invitado» (2026-10-24, FEAT-56, decisión 5). _(Descartados: 30 por lotería; solo límite por minuto; borrar las fotos solo al quitar al invitado. Origen: FEAT-58, decisión 9.)_ |
| 2026-10-26 | Voz con IA: 10 tokens cubren hasta 60 cartas y cada 10 cartas más cuestan 2; si la lotería crece después de pagar, se ofrece «Ampliar la voz» y solo se cobra si el usuario acepta. Antes de cobrar se revisa el cupo de ElevenLabs y, si no alcanza, no se cobra; alerta al administrador al bajar del 20 % del cupo. La frase de arranque se genera una vez por voz y los títulos repetidos con la misma voz se reutilizan entre cuentas. Se mantiene la indicación de tono. Medido el 2026-10-26: unos 26 créditos por carta, unas 26 loterías de 54 cartas al mes con el plan Starter. Reemplaza «10 tokens tenga las cartas que tenga» (FEAT-55, decisión 11) y la frase por lotería (decisión 23). _(Descartados: +1 token por cada 10 cartas; 10 fijos; cobrar el bloque nuevo sin preguntar; que lo pagado cubra todo; revisar el cupo sin correo o solo la alerta; compartir solo la frase o nada; acortar o quitar la indicación de tono. Origen: FEAT-58, decisiones 8, 11 y 12.)_ |
| 2026-10-26 | No se crean cuentas con correos de dominios desechables (lista en la base); la ventana lo avisa antes de registrar. Las cuentas anónimas ya estaban apagadas y la confirmación del correo ya era obligatoria. Los tokens de bienvenida no cambian. _(Descartados: captcha de Turnstile o hCaptcha, que piden cuenta externa; dar los tokens al confirmar el correo; no hacer nada. Origen: FEAT-58, decisión 1.)_ |
| 2026-10-26 | El mínimo de compra se mide en pesos: el monto final, ya con la oferta, nunca baja de $10.00 MXN; la cantidad libre sube su mínimo para llegar a $10; el panel no deja guardar ofertas o packs que dejen un pack por debajo. Precisa la fila del 2026-10-06 («5 tokens»). _(Descartado: dejar guardar todo y ocultar en la tienda los packs que no llegan. Origen: FEAT-58, decisión 2.)_ |
| 2026-10-26 | Códigos promocionales: como máximo 5 sin bono por usuario por hora, sin distinguir si no existen, vencieron o ya se usaron; el código se revisa al tocar «Aplicar», no mientras se escribe. _(Descartados: 10 o 20 por hora; seguir revisando mientras se escribe, con más espera. Origen: FEAT-58, decisión 3.)_ |
| 2026-10-27 | Cada lotería tiene como máximo 200 tableros, en el selector y en la base. Reabre, con el sí explícito de Carlos, la regla DEFINIDA del 2026-10-06 («no hay límite … de tableros por lotería»); las cartas y las loterías siguen sin límite. _(Descartados: 500; sin tope. Origen: FEAT-58, decisión 4.)_ |
| 2026-10-27 | Un pago en proceso de una lotería temática sin aviso de Mercado Pago deja de bloquear una nueva compra a los 3 días, sin consultar a Mercado Pago; un pago vencido se libera como uno rechazado. _(Descartados: consultar el pago en Mercado Pago al volver a comprar; 5 o 7 días. Origen: FEAT-58, decisión 5.)_ |
| 2026-10-27 | El resultado de la IA se guarda y se aplica a la carta en el servidor: cerrar la página no pierde lo pagado. _(Descartado: guardarlo como «resultado pendiente» con un aviso para aplicarlo. Origen: FEAT-58, US A7.)_ |
| 2026-10-27 | Los avisos en vivo de las loterías colectivas ya no incluyen las cartas borradas: una carta borrada desaparece al recargar o con el siguiente cambio. _(Descartados: seguir mandándolos y aceptar el riesgo; canales privados por lotería. Origen: FEAT-58, H21.)_ |
| 2026-10-28 | El cantador suma dos ritmos: «Personalizado» (segundos entre cartas de 1 a 15, pausa nunca o cada 2 a 10 cartas, de 1 a 20 s; empieza en 3 s, cada 3 cartas y 5 s; se recuerda en el navegador) y «Manual» (→ o «Siguiente carta» saca la siguiente, ← regresa; no se saca otra mientras suena la anterior). Se eligen antes de empezar, como los demás. Reglas en §20. _(Descartados: un interruptor «Automático / Manual» durante la partida; los campos del personalizado sin límites, desde 0; en manual, bloquear también revisar las anteriores mientras suena la voz. Origen: FEAT-59.)_ |

## 16. Pendientes por definir

Ninguno al 2026-10-06. Todas las reglas de este documento están confirmadas o definidas.

## 17. Reglas definidas que el sitio todavía no cumple

Decididas el 2026-10-06 y pendientes de construir. Los correos son la fase 3 de `plan-fases.md`. Las loterías temáticas son la feature `docs/features/FEAT-17-loterias-de-temporada.md`.

Ya cumplidas y retiradas de esta lista el 2026-10-06, al publicarse la fase 1 en producción: mínimo de 24 cartas en Clásico, mínimo de 15 en Kids, y mínimo de compra de 5 tokens. Retirada el 2026-10-06, al publicarse la fase 2: registrar cada regalo de tokens. Retiradas el 2026-10-26, al pasar FEAT-58 a producción: descontar tokens y quitar el acceso a una lotería temática ante reembolso o contracargo.

| Regla | Dónde está | Qué hace hoy el sitio |
|---|---|---|
| Avisar por correo de pago pendiente acreditado | §13 | No avisa |
| Avisar por correo de tokens regalados | §13 | No avisa |
| Alertar por correo al administrador de un pago cobrado sin entregar | §13 | No avisa. Anotada el 2026-10-13 (fase 3) |
| Loterías temáticas: catálogo, compra, descarga y administración | §18 | No existen |
| Ofertas con descuento y banner | §8, §9 | No existen. Anotada el 2026-10-15; se construye con `docs/features/FEAT-49-ofertas-con-banner.md` |
| Elegir qué se ve en las cartas (nombre, número, ambos o nada) | §4 | Siempre dibuja nombre y número. Anotada el 2026-10-20; se construye con `docs/features/FEAT-51-nombre-y-numero-en-cartas.md` |
| Tableros del PDF en tamaño carta | §5 | El PDF sale en hoja A4. Anotada el 2026-10-09; se corrige con `docs/features/FEAT-26-pdf-impresion-y-recorte.md` |
| «Arma tus tableros» | §19 | No existe. Anotada el 2026-10-22; se construye con `docs/features/FEAT-53-tableros-loteria-tradicional.md` |

## 18. Loterías temáticas — DEFINIDO

Definido con Carlos el 2026-10-06 (FEAT-17). Por construir. Hasta el 2026-10-07 se llamaron «loterías de temporada», agrupadas por «temporada»; el nombre cambió con FEAT-24 sin tocar ninguna regla.

**Qué son.** Loterías ya hechas, preparadas por el administrador, agrupadas por temática: fechas del año (Halloween, Día de Muertos, Navidad…) u ocasiones sin fecha (un baby shower, una boda…). Se muestran en un catálogo público y se venden como descarga digital: no se envía nada físico.

**Qué se vende.** El PDF terminado que el administrador subió ya hecho o armó en el sitio con sus propias cartas (2026-10-07, FEAT-23). Todos los compradores de una lotería reciben el mismo archivo; el comprador no la edita ni elige cuántos tableros trae.

**Mínimo de cartas al armarla en el sitio** (2026-10-08, FEAT-24). En modo Kids (3 × 3) bastan **9 cartas**, una por casilla; en Clásico (4 × 4) se conserva el mínimo de la lotería normal, 24 (§4). Con exactamente 9 cartas todos los tableros llevan las mismas cartas y cada uno tiene un acomodo distinto: no se generan dos tableros con el mismo acomodo. Con 10 cartas o más los tableros se generan como en la lotería normal.

**Temáticas.**

- Las crea, nombra, ordena y borra el administrador. El orden decide cuál sale primero en el catálogo.
- Cada lotería pertenece a una temática. Una temática con loterías no se puede borrar.

**Ficha de una lotería.** Temática, nombre, descripción, modo (Clásico o Kids), número de cartas, número de tableros, precio, PDF, portada y cartas de muestra. El nombre y la descripción son obligatorios en español y opcionales en inglés; si falta el inglés, se muestra el español.

**Vista previa.**

- El administrador elige una portada y las cartas de muestra que quiera, pocas o todas. Si arma el PDF en el sitio, la portada puede ser una de las cartas que cargó o una imagen que suba aparte, y las muestras se eligen entre esas cartas (2026-10-07, FEAT-23; la portada desde las cartas, 2026-10-15, FEAT-48). Si sube el PDF ya hecho, sube la portada y las muestras como imágenes.
- El sitio reduce la portada y las muestras —también las cartas que se usen como portada o muestra— y les pone marca de agua antes de guardarlas; la imagen limpia no se guarda como vista previa.
- Las cartas que el administrador carga para armar el PDF se guardan en privado, solo para él, hasta que se borra la lotería; nunca se muestran al público (2026-10-15, FEAT-48).
- **Generar las cartas con IA** (2026-10-17, FEAT-50). En vez de subirlas, el administrador puede generar las cartas en el sitio: escribe un prompt general de la lotería y una lista de cartas, cada una con número, nombre y escena, y el sitio genera cada carta en 2:3 con el prompt general más los datos de la carta. La imagen de entrada de cada carta es su carta de la baraja base, una carta ya generada que él marque como referencia de estilo, o ninguna. Puede generar de una en una o todas las que faltan; cada carta guarda hasta 5 intentos y él elige cuál se queda. Las elegidas pasan a ser las cartas de la lotería. Los intentos se guardan en privado, como las cartas, y se borran con la lotería. Generar no descuenta tokens: el costo lo paga la cuenta de Replicate del negocio.
- **Baraja base** (2026-10-17, FEAT-50). Las 54 cartas tradicionales, con su número y nombre, que el administrador sube una sola vez y reemplaza cuando quiere, para usarlas como imagen de entrada. Son privadas, solo para administradores; nunca se muestran al público y no se borran al borrar una lotería. No toda temática parte de ellas: la lista de cartas es libre (por ejemplo, estados o números).
- El PDF nunca se entrega a quien no lo compró.

**Visibilidad.**

- Cada lotería tiene «publicada sí/no» y fechas opcionales de inicio y de fin. Es visible cuando está publicada y dentro de sus fechas.
- Una lotería que se empieza a crear queda guardada como borrador no publicado hasta que el administrador la publique o la borre (2026-10-15, FEAT-48).
- El catálogo muestra solo las visibles, y solo las temáticas que tienen al menos una.
- No se puede publicar una lotería a la que le falte nombre, descripción, número de cartas, número de tableros, precio, PDF o portada. _(El número de cartas y de tableros se agregaron el 2026-10-06, FEAT-17: el catálogo los muestra en cada tarjeta.)_
- Una lotería con ventas no se borra: solo se despublica.

**Precio y cobro.**

- Un solo precio por lotería, en pesos mexicanos, con mínimo de $10.00 MXN. No hay descuentos, ofertas ni códigos. Las promociones de §9 no aplican.
- No se pagan con tokens.
- En la versión en inglés el precio se muestra además en dólares, solo como referencia.
- Ver el catálogo no requiere cuenta; comprar sí.
- Una cuenta compra cada lotería una sola vez: quien ya la tiene, o tiene un pago en proceso por ella, no puede iniciar otro cobro. Un pago en proceso sin aviso de Mercado Pago deja de bloquear a los 3 días, y uno vencido se libera como uno rechazado; si después se aprueba y la cuenta ya tenía la lotería, el pago queda para devolverse a mano. _(2026-10-27, FEAT-58)_
- El precio lo pone el servidor. Un pago aprobado entrega la lotería una sola vez, sin importar cuántas veces lo notifique Mercado Pago, y no se entrega si el monto pagado es menor al precio.
- Vale el precio del momento en que se inició el pago. Quien pagó recibe su lotería aunque el precio haya cambiado o la lotería se haya despublicado mientras tanto.
- Los pagos pendientes (efectivo, transferencia) entregan la lotería cuando Mercado Pago los confirma; mientras, el comprador la ve como «pago en proceso».
- Cambiar el precio no afecta compras ya hechas: cada compra guarda lo que se pagó.
- Limitación conocida: si alguien abre dos pagos por la misma lotería y paga los dos, el segundo queda registrado como compra repetida para devolverlo a mano.

**Entrega.**

- La lotería comprada queda en Mi cuenta. Se descarga las veces que se quiera.
- Lo comprado se conserva siempre, aunque la lotería se despublique o pasen sus fechas (§14).
- Si el administrador reemplaza el PDF, los compradores descargan la versión nueva.

**Reembolso o contracargo.** Se quita el acceso a la descarga y la compra queda marcada como devuelta. Lo que ya se descargó no se puede deshacer. Construido en FEAT-58 (2026-10-26), junto con el descuento de tokens por reembolso (§8).

**Historial.** El comprador ve estas compras en su historial, mezcladas por fecha con las de tokens y los regalos. El administrador las ve en la lista de compras, distinguidas por tipo, y ve cuántas ventas lleva cada lotería.

**Avisos.** Al usuario, ninguno por ahora; al administrador, la alerta de un pago cobrado sin entregar (§13; por construir; agregado el 2026-10-13, fase 3).

## 19. «Arma tus tableros» — DEFINIDO (2026-10-22, FEAT-53)

Cualquiera puede armar sus propios tableros de la lotería tradicional, eligiendo sus cartas de la suerte, y bajarlos en PDF para jugar con su baraja de siempre. En México mucha gente cree que jugar con un tablero propio, armado a su gusto, trae buena suerte: la sección es para eso, no para hacer una lotería para una fiesta. Es gratis. _(El enfoque se cambió el 2026-10-22, antes de publicarse: primero se pensó como «Lotería tradicional», para generar muchos tableros al azar.)_

- **Dónde:** una página pública, «Arma tus tableros» (`/arma-tus-tableros`), aparte del recorrido de la lotería con fotos. No pide cuenta: sin sesión, lo armado se guarda en el navegador; con sesión, además se guarda en «Mi cuenta», en la sección «Mis tableros de la suerte», donde caben varios juegos (abrir, cambiar nombre, descargar PDF, eliminar). Con sesión, el juego abierto se guarda solo en cada cambio (se crea al poner la primera carta, como «Mis tableros · <fecha>») y «Nuevo juego» empieza otro sin borrar el anterior. Al iniciar sesión se ofrece guardar en la cuenta, como juego nuevo, lo armado sin sesión (si tiene alguna carta puesta); si se descarta, se borra del navegador.
- **Cartas:** las 54 tradicionales, con sus dibujos tradicionales (salvo la carta 1, El Gallo, que usa el dibujo propio del sitio para no mostrar el logotipo de la marca; 2026-10-22), guardadas como archivos fijos del sitio (una versión ligera para la pantalla y otra de buena calidad para el PDF). No es la baraja base del administrador (§18), que sigue privada.
- **Modos:** Clásico (4 × 4) y Kids (3 × 3), como en §4. Cambiar de modo con cartas puestas pide confirmación, porque se pierden; sin cartas puestas cambia sin preguntar.
- **Tableros:** la página empieza con un tablero vacío, para elegir las cartas a mano. Cada tablero se puede «Llenar al azar» (solo sus casillas vacías; lo puesto se queda), revolver (cambian las cartas no fijadas) o borrar. Se agregan más con «Agregar tablero vacío» o «Agregar tablero al azar», hasta 50, y se pueden revolver todos. No hay cantidad sugerida. Dos tableros nunca salen idénticos al generarse; si la persona deja dos iguales a mano, se le avisa pero no se le impide.
- **Cambiar cartas:** arrastrando una carta de la baraja a una casilla, o entre casillas del mismo tablero (en computadora), o tocando la casilla y eligiendo la carta (en cualquier pantalla). Una carta no se repite en un tablero: si se pone una que ya está en él, las dos casillas se intercambian. Una carta se puede **fijar**: al revolver, las fijadas no se mueven.
- **PDF:** solo los tableros, sin la baraja para recortar. No se descarga con casillas vacías: se avisa cuántos tableros están incompletos y se ofrece llenar al azar las vacías, respetando lo ya puesto.

## 20. Cantador — DEFINIDO (2026-10-23, FEAT-55)

El cantador sirve para jugar sin recortar la baraja: revuelve las cartas de una lotería, las saca una por una en grande y dice sus títulos en voz alta. Imprimir y jugar con la baraja recortada sigue siendo gratis y sin registro (§2); el cantador es un extra.

- **Quién y con qué:** requiere cuenta y es gratis. Funciona con las loterías con fotos del usuario y se abre solo desde la lotería guardada (U2), en cuanto tiene el mínimo de cartas de su modo (§4), tenga tableros o no. No funciona con las loterías temáticas (§18) ni con «Arma tus tableros» (§19).
- **La partida:** las cartas salen al azar sin repetirse, como salen impresas (con su nombre abajo solo si la carta no lo trae dibujado, §4). La partida se recuerda en el navegador: al recargar sigue donde iba. Si la lotería cambia a media partida, las cartas borradas dejan de salir y las nuevas entran en un lugar al azar entre las que faltan.
- **Voz del navegador:** dice solo el título de cada carta, siempre en español (de preferencia de México), aunque el sitio esté en inglés. Sin ninguna voz en español en el navegador no se puede cantar: se dice en qué navegadores sí funciona; salvo que la lotería tenga voz con IA, que entonces se canta con sus audios y las cartas cuyo audio falló salen sin voz _(2026-10-24, FEAT-55)_. Silenciarla a propósito sí se permite.
- **Ritmos:** se eligen antes de empezar y el elegido se recuerda en el navegador. La partida empieza diciendo «Se va y se corre con…». En automático sigue sola, contando desde que la voz termina: «Tradicional» (tres cartas con 1.5 s entre una y otra y una pausa de 3 s), una carta cada 4, 6, 8 o 10 s, o «Personalizado», con los segundos entre cartas (1 a 15), cada cuántas cartas una pausa (nunca, o de 2 a 10) y cuánto dura (1 a 20 s); empieza en 3 s, cada 3 cartas y 5 s, y fuera de los límites se queda en el límite. En «Manual» nada corre solo: «Siguiente carta» o → saca y canta la siguiente, «Anterior» o ← regresa por las cantadas, y si se está revisando atrás → avanza hasta la última antes de sacar otra; no se saca otra carta mientras suena la anterior, y dejar una tecla aplastada no repite. _(2026-10-28, FEAT-59; antes solo automático, con «Tradicional» o una carta cada 4, 6, 8 o 10 s)_
- **Voz con IA (opcional, de pago):** cuesta 10 tokens por lotería _(5 hasta el 2026-10-24)_ y se paga una sola vez; esos 10 tokens cubren hasta 60 cartas y cada 10 cartas más cuestan 2 (54 → 10; 70 → 12; 100 → 18). Si después de pagar la lotería pasa de lo cubierto, las cartas de más se dicen con la voz del navegador y el cantador ofrece «Ampliar la voz», que solo cobra si el usuario acepta _(2026-10-26, FEAT-58)_. Antes de cobrar se revisa el cupo del mes en ElevenLabs: si no alcanza para la lotería, no se cobra y se avisa que la voz con IA no está disponible por ahora _(2026-10-26, FEAT-58)_; el servidor cobra antes de generar un audio por carta y los guarda en privado (solo los oye el dueño, §12). Si fallan algunas cartas, esas se dicen con la voz del navegador y no se devuelve nada; si no salió ninguna carta ni la frase de arranque, se devuelven los 10 tokens _(2026-10-26, FEAT-58; antes bastaba con que fallaran todas las cartas)_. No tiene el límite de 10 por minuto de §6: cada lotería la genera una vez. Los audios de cartas agregadas o renombradas después se generan sin costo al abrir el cantador, hasta tantos audios como cartas tenga la lotería más 10, y con un máximo de 20 regeneraciones (cartas renombradas) por minuto por usuario; pasado el tope, esa carta se dice con la voz del navegador _(2026-10-26, FEAT-58; antes sin tope)_. La frase «Se va y se corre con…» se genera una sola vez por voz, y un título ya generado con la misma voz (sin importar mayúsculas ni espacios) se reutiliza en lugar de generarse otra vez; nadie oye ni ve los audios de otros (§12) _(2026-10-26, FEAT-58)_. Mientras se genera la voz no se puede empezar a cantar; si al terminar alguna carta falló, se deja empezar y esa carta se dice con la voz del navegador _(2026-10-24, FEAT-55)_. Los títulos no se revisan antes de generar: la regla de contenido no permitido (§6) es norma de uso. Usa ElevenLabs, con 8 voces mexicanas de su biblioteca, 4 de hombre y 4 de mujer _(2026-10-24, FEAT-55; antes Replicate con cuatro voces de MiniMax)_. Antes de pagar, el usuario escucha una muestra y escoge una; la elección es definitiva para esa lotería y las cartas agregadas después salen con la misma voz _(2026-10-24, FEAT-55; reemplaza «una sola voz para todas las loterías»)_. Borrar una carta o la lotería borra sus audios.

## 21. Loterías colectivas — DEFINIDO (2026-10-24, FEAT-56)

Sirven para juntar las fotos de varias personas: el dueño de una lotería manda un enlace (por ejemplo, por WhatsApp) y cada invitado sube sus fotos directo a ella. Decisiones del 2026-10-23 y el 2026-10-24.

- **Quién la abre:** el dueño de cualquier lotería guardada en su cuenta, desde la lotería (U2). Al generar su primer enlace pasa a ser «Colectiva». El recorrido «Crear» no cambia.
- **El enlace:** queda abierto hasta que el dueño lo cierra. Puede generar uno nuevo, y el anterior deja de servir. Hay un enlace vigente a la vez por lotería. No tiene fecha límite.
- **Invitados:** necesitan cuenta. Quien abre el enlace sin sesión crea su cuenta (con sus tokens de bienvenida, §7) o entra, y queda como invitado de esa lotería. Entrar de nuevo no lo duplica. El dueño que abre su propio enlace llega a su lotería. Quien crea su cuenta con correo desde el enlace regresa a él al confirmar su correo; con Google, también _(2026-10-24, FEAT-56)_. La página del enlace muestra el nombre de la lotería, cuántas cartas lleva y el nombre de quien la organiza tal como está en su cuenta; si no tiene nombre, no se muestra organizador. Nunca se muestra su correo _(2026-10-24, FEAT-56)_.
- **Qué hace el invitado:** ve todas las cartas de la lotería, con quién subió cada una, y agrega fotos con su título. Las fotos entran directo, sin aprobación, al final de la baraja con su número (§4), con las mismas reglas del título (único en la lotería, sin emojis) y el aviso de contenido permitido (§6). Cada invitado sube como máximo 60 cartas por lotería y 10 por minuto, y cada carta lleva su propia imagen _(2026-10-26, FEAT-58; hasta entonces no había límite, decisión 5 de FEAT-56)_. No puede cambiar ni borrar cartas, ni siquiera las suyas, ni usar la IA, los tableros, el PDF o el cantador de esa lotería. Si el enlace se cierra, sigue viendo la lotería, pero ya no puede subir.
- **Qué hace el dueño:** con las cartas de sus invitados hace lo mismo que con las suyas: cambiar el título, borrarlas y transformarlas con IA, con sus propios tokens. Ve la lista de invitados con cuántas fotos subió cada uno y puede quitar a cualquiera: el invitado pierde el acceso y sus fotos se quedan en la lotería. También puede borrar de una vez todas las fotos de un invitado: sus cartas salen de la lotería y de los tableros, y el invitado sigue participando _(2026-10-26, FEAT-58)_. Un invitado quitado no puede volver a unirse con el enlace, aunque siga abierto _(2026-10-24, FEAT-56)_.
- **Aviso al dueño:** un contador «N fotos nuevas» en la lotería, en Mi cuenta (U1) y en la lotería (U2), que se borra al abrirla. No se manda correo (§13 no cambia). En U2 el aviso se ve durante la visita en que se abre la lotería, con cada foto nueva marcada; abrirla ya las cuenta como vistas, así que en U1 desaparece y la siguiente visita ya no lo muestra _(2026-10-24, FEAT-56, decisión 16)_.
- **Contenido permitido:** las fotos que suben los invitados sin IA no pasan por ningún filtro (§6). Lo mitigan que los invitados tienen cuenta y que el dueño puede borrar cualquier carta.
