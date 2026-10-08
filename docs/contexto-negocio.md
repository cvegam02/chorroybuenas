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

El negocio cobra por dos cosas: la **transformación de fotos con inteligencia artificial** al estilo de la lotería tradicional, que se paga con tokens, y las **loterías temáticas**, ya hechas, que se pagan en pesos (§18). Crear cartas, generar tableros y descargar el PDF de la lotería propia es gratis. _(confirmado el 2026-10-06; las loterías temáticas se agregaron ese mismo día, FEAT-17)_

## 2. Principio central — DEFINIDO

**Terminar e imprimir una lotería siempre es gratis.** Cualquiera debe poder hacer su lotería completa e imprimirla sin pagar ni registrarse. La IA es un extra de pago que nunca estorba ese camino.

Cuando dos reglas choquen, o haya que decidir algo que no está escrito, se elige lo que no bloquea a quien solo quiere su lotería. Decidido el 2026-10-06.

El principio habla de la lotería que cada quien hace con sus fotos. Las loterías temáticas (§18) son un producto aparte, de pago, y no lo contradicen: nunca estorban el camino de crear e imprimir la propia. Aclarado el 2026-10-06 (FEAT-17).

## 3. Actores, roles y permisos

| Actor | Quién es | Qué puede hacer |
|---|---|---|
| **Visitante** | Cualquiera sin cuenta | Crear cartas y tableros y descargar el PDF. Su trabajo se guarda solo en su navegador. Puede ver el catálogo de loterías temáticas (§18). No puede usar la IA, comprar tokens ni comprar loterías temáticas. _(confirmado el 2026-10-06)_ |
| **Usuario registrado** | Tiene cuenta (correo y contraseña, o Google) | Todo lo del visitante, y además: guardar varias loterías en la nube, usar la IA, comprar tokens, comprar y descargar loterías temáticas (§18), ver su historial y editar su perfil. _(confirmado el 2026-10-06)_ |
| **Administrador** | Usuario incluido en la lista de administradores | Todo lo del usuario, y además el panel de administración (§10). _(confirmado el 2026-10-06)_ |

- Un usuario solo ve y modifica sus propias loterías, cartas, tableros, compras y saldo. **DEFINIDO** (2026-10-06)
- Nadie puede modificar un saldo de tokens desde el navegador: el saldo solo cambia por registro, compra, uso de IA o regalo de un administrador. **DEFINIDO** (2026-10-06)
- Un administrador nuevo solo lo puede dar de alta otro administrador; el primero se crea directamente en la base. _(confirmado el 2026-10-06)_

## 4. Loterías, cartas y tableros

- **Lotería (set):** un conjunto de cartas con nombre. Un usuario registrado puede tener varias; un visitante trabaja con una sola, guardada en su navegador. _(confirmado el 2026-10-06)_
- **Carta:** una imagen con un título. No puede haber dos cartas con el mismo título en la misma lotería. _(confirmado el 2026-10-06)_
- **Modos de juego:** _(confirmado el 2026-10-06)_
  - **Clásico:** tableros de 4 × 4 (16 cartas).
  - **Kids:** tableros de 3 × 3 (9 cartas).
- **Mínimo de cartas para generar tableros:**
  - Kids: **15 cartas. DEFINIDO** (2026-10-06; ese mismo día se había confirmado en 12 y se subió a 15).
  - Clásico: **24 cartas. DEFINIDO** (2026-10-06; ese mismo día se había fijado en 20 y se subió a 24).
- **Tableros:** se generan al azar con las cartas de la lotería. No se generan dos tableros iguales. _(confirmado el 2026-10-06)_
- **Cantidad sugerida de tableros:** en Clásico, la que hace que cada carta aparezca unas 8 veces en total; en Kids, un tablero por cada 3 cartas. El usuario puede cambiarla. _(confirmado el 2026-10-06)_
- **Al iniciar sesión**, lo que el visitante tenía guardado en su navegador se pasa a su cuenta, dentro de una lotería por defecto. _(confirmado el 2026-10-06)_
- No hay límite de cartas por lotería, de loterías por usuario ni de tableros por lotería. **DEFINIDO** (2026-10-06). Se revisa cuando el almacenamiento empiece a pesar.

## 5. Imágenes y PDF

- Formatos aceptados para las cartas: PNG, JPEG y WebP, de hasta 5 MB. _(confirmado el 2026-10-06)_
- Las imágenes de los usuarios registrados son privadas: solo su dueño puede verlas. _(confirmado el 2026-10-06)_
- La portada y las cartas de muestra de las loterías temáticas son públicas, pero solo en su versión reducida y con marca de agua (§18). **DEFINIDO** (2026-10-06, FEAT-17)
- El PDF incluye los tableros en tamaño carta con área de corte, y la baraja completa para recortar. Descargarlo es gratis y no requiere cuenta. _(confirmado el 2026-10-06)_

## 6. Transformación con IA

- Convierte una foto al estilo de la lotería tradicional. Solo existe ese estilo. _(confirmado el 2026-10-06)_
- **Cuesta 1 token por imagen transformada.** _(confirmado el 2026-10-06)_
- El cobro lo hace el servidor antes de generar. **DEFINIDO** (2026-10-06)
- Si la imagen no se pudo generar, el token se devuelve: solo se paga por resultados entregados. **DEFINIDO** (2026-10-06)
- Requiere cuenta. Un visitante que la pide ve el aviso de iniciar sesión. **DEFINIDO** (2026-10-06)
- Máximo 10 transformaciones por minuto por usuario. **DEFINIDO** (2026-10-06)
- Se puede transformar una carta o todas las que falten de una lotería, en lote. Si el filtro de contenido rechaza una foto del lote, esa se omite y el lote continúa. _(confirmado el 2026-10-06)_
- **Contenido no permitido:** no se aceptan ni se generan desnudos, contenido sexual o íntimo, ni fotos de personas sin su permiso. La regla se dice en la página de inicio. El bloqueo automático es el filtro de contenido del modelo de IA: una foto subida sin usar la IA no pasa por ningún filtro, y ahí la regla es norma de uso. _(decidido el 2026-10-07, FEAT-22)_
- La IA usa un solo modelo, elegido en el servidor. Una foto que su filtro de contenido rechaza no se transforma ni se intenta con otro modelo; el token se devuelve. _(decidido el 2026-10-07, FEAT-22)_
- El usuario puede revertir una carta transformada a su foto original, sin costo y sin recuperar el token. _(confirmado el 2026-10-06)_
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
- **Mínimo de compra: 5 tokens ($10.00 MXN). DEFINIDO** (2026-10-06).
- El precio siempre lo calcula el servidor con los datos de la base. **DEFINIDO** (2026-10-06)
- Un pago aprobado acredita los tokens **una sola vez**, sin importar cuántas veces lo notifique Mercado Pago. **DEFINIDO** (2026-10-06)
- No se acredita si el monto pagado es menor al esperado. **DEFINIDO** (2026-10-06)
- Los pagos pendientes (efectivo, transferencia) se acreditan cuando Mercado Pago los confirma. _(confirmado el 2026-10-06)_
- **Reembolsos y contracargos:** cuando un pago se devuelve o el banco lo revierte, se descuentan los tokens de esa compra. Si el usuario ya gastó algunos, su saldo queda en 0, nunca en negativo, y la compra queda marcada como devuelta. **DEFINIDO** (2026-10-06). Hoy el sistema no lo hace: está por construirse.
- **Comprobante:** el sitio no emite ninguno. El comprador tiene el recibo de Mercado Pago y su historial de compras en su panel. **DEFINIDO** (2026-10-06)

## 9. Promociones

- Hay dos tipos: **primera compra** (se aplica sola) y **código** (el usuario lo escribe). Ambas dan un porcentaje extra de tokens sobre los tokens base, redondeado hacia abajo. _(confirmado el 2026-10-06)_
- Las promociones tienen vigencia opcional (desde, hasta) y se pueden activar o desactivar. _(confirmado el 2026-10-06)_
- Si aplican las dos, gana el código; no se suman. _(confirmado el 2026-10-06)_
- El código aplica en cualquier compra, no solo en la primera. **DEFINIDO** (2026-10-06)
- Cada usuario puede usar un mismo código una sola vez; usuarios distintos pueden usar el mismo código. **DEFINIDO** (2026-10-06). Limitación conocida: si alguien abre dos pagos con el mismo código y paga los dos, recibe el bono en ambos, porque el uso se registra al acreditarse el pago.
- Los códigos no son visibles públicamente: solo quien conoce un código puede usarlo. **DEFINIDO** (2026-10-06)
- Hoy no hay ninguna promoción activa en producción.

## 10. Panel de administración

El administrador puede: _(confirmado el 2026-10-06)_

- ver todas las compras y las transacciones de Mercado Pago;
- crear, editar, activar y borrar promociones;
- crear y editar paquetes de tokens, y cambiar el precio por token;
- ver los saldos de todos los usuarios y regalar tokens;
- ver el uso de la IA (por día, por usuario y por lotería) y su costo estimado;
- cambiar la cantidad de tokens de bienvenida;
- administrar las loterías temáticas (§18): crear temáticas, dar de alta loterías con su precio y sus archivos, publicarlas y retirarlas. Sus ventas se ven junto a las compras de tokens, distinguidas por tipo. **DEFINIDO** (2026-10-06, FEAT-17)

## 11. Modelo de entidades

| Entidad | Qué guarda | Relaciones |
|---|---|---|
| Lotería (`loteria_sets`) | Nombre y modo de juego | Pertenece a un usuario |
| Carta (`cards`) | Título, imagen, imagen original, si fue hecha con IA | Pertenece a una lotería |
| Tablero (`boards`, `board_cards`) | Las cartas de un tablero y su posición | Pertenece a una lotería |
| Saldo (`user_tokens`) | Tokens disponibles | Uno por usuario |
| Uso (`token_usage`) | Cada token gastado en IA, con su lotería | Pertenece a un usuario |
| Compra (`token_purchases`) | Tokens, monto, pago de Mercado Pago, promoción usada | Pertenece a un usuario |
| Paquete (`token_packs`) | Tokens base, de regalo y precio | — |
| Precio (`token_pricing`) | Precio por token para la cantidad libre | — |
| Promoción (`promotions`) | Tipo, código, porcentaje, vigencia | — |
| Configuración (`app_config`) | Tokens de bienvenida | — |
| Perfil (`profiles`) | Correo y nombre | Uno por usuario |
| Administradores (`admin_users`) | Quién es administrador | Apunta a un usuario |
| Temática (`seasons`) — por construir | Nombre (español; inglés opcional) y orden | — |
| Lotería temática (`seasonal_loterias`) — por construir | Nombre, descripción, modo, número de cartas y de tableros, precio, publicada, fechas, portada, muestras y PDF | Pertenece a una temática |
| Compra de lotería temática (`seasonal_purchases`) — por construir | Monto pagado, pago de Mercado Pago y estado | Pertenece a un usuario y a una lotería temática |

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

Decidido el 2026-10-06 (remediación del code review). El detalle técnico está en las migraciones 022 a 025. Los cinco renglones de loterías temáticas se agregaron el 2026-10-06 (FEAT-17) y están por construir.

## 13. Notificaciones — DEFINIDO

| Evento | A quién se avisa | Estado |
|---|---|---|
| Registro con correo | Al usuario: correo de confirmación de cuenta | Funciona |
| Olvidó su contraseña | Al usuario: correo para recuperarla | Funciona |
| Un pago pendiente (efectivo o transferencia) se confirma y sus tokens ya están disponibles | Al usuario | Por construir |
| Un administrador le regala tokens | Al usuario | Por construir |

- No se avisa de una compra normal acreditada, de saldo bajo ni de un pago devuelto. Decidido el 2026-10-06.
- Los dos avisos nuevos llegan por correo. Decidido el 2026-10-06.
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
| 2026-10-07 | El PDF de una lotería de temporada también se puede armar en el sitio: el administrador sube por lote sus cartas ya terminadas (con el nombre dibujado, 54 esperadas, sin recortarlas), genera los tableros y el PDF queda guardado en la ficha; solo se guarda el PDF, no las cartas. Las muestras se pueden elegir de esas cartas. _(Descartadas: una página pública para cualquier usuario; exigir exactamente 54; recortar a 2:3; guardar cartas y tableros. Origen: FEAT-23.)_ |
| 2026-10-07 | Las loterías «de temporada» pasan a llamarse «loterías temáticas» y sus grupos «temáticas», para dar cabida a ocasiones sin fecha del año; el catálogo pasa de `/temporada` a `/tematicas` y la dirección anterior redirige a la nueva. Ninguna regla cambia. En las decisiones de arriba, «temporada» es el nombre anterior de lo mismo. _(Descartadas: quitar además las fechas de inicio y fin; cambiar solo el título público; conservar la dirección `/temporada`. Origen: FEAT-24.)_ |

## 16. Pendientes por definir

Ninguno al 2026-10-06. Todas las reglas de este documento están confirmadas o definidas.

## 17. Reglas definidas que el sitio todavía no cumple

Decididas el 2026-10-06 y pendientes de construir. Los correos son la fase 3 de `plan-fases.md`; el descuento por reembolso quedó apartado el 2026-10-06, sin fecha. Las loterías temáticas son la feature `docs/features/FEAT-17-loterias-de-temporada.md`.

Ya cumplidas y retiradas de esta lista el 2026-10-06, al publicarse la fase 1 en producción: mínimo de 24 cartas en Clásico, mínimo de 15 en Kids, y mínimo de compra de 5 tokens. Retirada el 2026-10-06, al publicarse la fase 2: registrar cada regalo de tokens.

| Regla | Dónde está | Qué hace hoy el sitio |
|---|---|---|
| Descontar tokens ante reembolso o contracargo | §8 | No descuenta nada |
| Avisar por correo de pago pendiente acreditado | §13 | No avisa |
| Avisar por correo de tokens regalados | §13 | No avisa |
| Loterías temáticas: catálogo, compra, descarga y administración | §18 | No existen |
| Quitar el acceso a una lotería temática ante reembolso o contracargo | §18 | No existe; se construirá junto con el descuento de tokens |

## 18. Loterías temáticas — DEFINIDO

Definido con Carlos el 2026-10-06 (FEAT-17). Por construir. Hasta el 2026-10-07 se llamaron «loterías de temporada», agrupadas por «temporada»; el nombre cambió con FEAT-24 sin tocar ninguna regla.

**Qué son.** Loterías ya hechas, preparadas por el administrador, agrupadas por temática: fechas del año (Halloween, Día de Muertos, Navidad…) u ocasiones sin fecha (un baby shower, una boda…). Se muestran en un catálogo público y se venden como descarga digital: no se envía nada físico.

**Qué se vende.** El PDF terminado que el administrador subió ya hecho o armó en el sitio con sus propias cartas (2026-10-07, FEAT-23). Todos los compradores de una lotería reciben el mismo archivo; el comprador no la edita ni elige cuántos tableros trae.

**Temáticas.**

- Las crea, nombra, ordena y borra el administrador. El orden decide cuál sale primero en el catálogo.
- Cada lotería pertenece a una temática. Una temática con loterías no se puede borrar.

**Ficha de una lotería.** Temática, nombre, descripción, modo (Clásico o Kids), número de cartas, número de tableros, precio, PDF, portada y cartas de muestra. El nombre y la descripción son obligatorios en español y opcionales en inglés; si falta el inglés, se muestra el español.

**Vista previa.**

- El administrador sube una portada y las cartas de muestra que quiera, pocas o todas. Si arma el PDF en el sitio, puede elegir las muestras entre las cartas que cargó (2026-10-07, FEAT-23).
- El sitio las reduce y les pone marca de agua antes de guardarlas; la imagen limpia no se guarda.
- El PDF nunca se entrega a quien no lo compró.

**Visibilidad.**

- Cada lotería tiene «publicada sí/no» y fechas opcionales de inicio y de fin. Es visible cuando está publicada y dentro de sus fechas.
- El catálogo muestra solo las visibles, y solo las temáticas que tienen al menos una.
- No se puede publicar una lotería a la que le falte nombre, descripción, número de cartas, número de tableros, precio, PDF o portada. _(El número de cartas y de tableros se agregaron el 2026-10-06, FEAT-17: el catálogo los muestra en cada tarjeta.)_
- Una lotería con ventas no se borra: solo se despublica.

**Precio y cobro.**

- Un solo precio por lotería, en pesos mexicanos, con mínimo de $10.00 MXN. No hay descuentos, ofertas ni códigos. Las promociones de §9 no aplican.
- No se pagan con tokens.
- En la versión en inglés el precio se muestra además en dólares, solo como referencia.
- Ver el catálogo no requiere cuenta; comprar sí.
- Una cuenta compra cada lotería una sola vez: quien ya la tiene, o tiene un pago en proceso por ella, no puede iniciar otro cobro.
- El precio lo pone el servidor. Un pago aprobado entrega la lotería una sola vez, sin importar cuántas veces lo notifique Mercado Pago, y no se entrega si el monto pagado es menor al precio.
- Vale el precio del momento en que se inició el pago. Quien pagó recibe su lotería aunque el precio haya cambiado o la lotería se haya despublicado mientras tanto.
- Los pagos pendientes (efectivo, transferencia) entregan la lotería cuando Mercado Pago los confirma; mientras, el comprador la ve como «pago en proceso».
- Cambiar el precio no afecta compras ya hechas: cada compra guarda lo que se pagó.
- Limitación conocida: si alguien abre dos pagos por la misma lotería y paga los dos, el segundo queda registrado como compra repetida para devolverlo a mano.

**Entrega.**

- La lotería comprada queda en Mi cuenta. Se descarga las veces que se quiera.
- Lo comprado se conserva siempre, aunque la lotería se despublique o pasen sus fechas (§14).
- Si el administrador reemplaza el PDF, los compradores descargan la versión nueva.

**Reembolso o contracargo.** Se quita el acceso a la descarga y la compra queda marcada como devuelta. Lo que ya se descargó no se puede deshacer. Por construir junto con el descuento de tokens por reembolso (§8).

**Historial.** El comprador ve estas compras en su historial, mezcladas por fecha con las de tokens y los regalos. El administrador las ve en la lista de compras, distinguidas por tipo, y ve cuántas ventas lleva cada lotería.

**Avisos.** Ninguno por ahora (§13).
