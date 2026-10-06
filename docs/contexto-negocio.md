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

El negocio cobra por una sola cosa: la **transformación de fotos con inteligencia artificial** al estilo de la lotería tradicional, que se paga con tokens. Crear cartas, generar tableros y descargar el PDF es gratis. _(confirmado el 2026-10-06)_

## 2. Principio central — DEFINIDO

**Terminar e imprimir una lotería siempre es gratis.** Cualquiera debe poder hacer su lotería completa e imprimirla sin pagar ni registrarse. La IA es un extra de pago que nunca estorba ese camino.

Cuando dos reglas choquen, o haya que decidir algo que no está escrito, se elige lo que no bloquea a quien solo quiere su lotería. Decidido el 2026-10-06.

## 3. Actores, roles y permisos

| Actor | Quién es | Qué puede hacer |
|---|---|---|
| **Visitante** | Cualquiera sin cuenta | Crear cartas y tableros y descargar el PDF. Su trabajo se guarda solo en su navegador. No puede usar la IA ni comprar tokens. _(confirmado el 2026-10-06)_ |
| **Usuario registrado** | Tiene cuenta (correo y contraseña, o Google) | Todo lo del visitante, y además: guardar varias loterías en la nube, usar la IA, comprar tokens, ver su historial y editar su perfil. _(confirmado el 2026-10-06)_ |
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
  - Kids: 12 cartas. _(confirmado el 2026-10-06)_
  - Clásico: **20 cartas. DEFINIDO** (2026-10-06). La pantalla de tableros todavía acepta 16: está por corregirse.
- **Tableros:** se generan al azar con las cartas de la lotería. No se generan dos tableros iguales. _(confirmado el 2026-10-06)_
- **Cantidad sugerida de tableros:** en Clásico, la que hace que cada carta aparezca unas 8 veces en total; en Kids, un tablero por cada 3 cartas. El usuario puede cambiarla. _(confirmado el 2026-10-06)_
- **Al iniciar sesión**, lo que el visitante tenía guardado en su navegador se pasa a su cuenta, dentro de una lotería por defecto. _(confirmado el 2026-10-06)_
- No hay límite de cartas por lotería, de loterías por usuario ni de tableros por lotería. **DEFINIDO** (2026-10-06). Se revisa cuando el almacenamiento empiece a pesar.

## 5. Imágenes y PDF

- Formatos aceptados para las cartas: PNG, JPEG y WebP, de hasta 5 MB. _(confirmado el 2026-10-06)_
- Las imágenes de los usuarios registrados son privadas: solo su dueño puede verlas. _(confirmado el 2026-10-06)_
- El PDF incluye los tableros en tamaño carta con área de corte, y la baraja completa para recortar. Descargarlo es gratis y no requiere cuenta. _(confirmado el 2026-10-06)_

## 6. Transformación con IA

- Convierte una foto al estilo de la lotería tradicional. Solo existe ese estilo. _(confirmado el 2026-10-06)_
- **Cuesta 1 token por imagen transformada.** _(confirmado el 2026-10-06)_
- El cobro lo hace el servidor antes de generar. **DEFINIDO** (2026-10-06)
- Si la imagen no se pudo generar, el token se devuelve: solo se paga por resultados entregados. **DEFINIDO** (2026-10-06)
- Requiere cuenta. Un visitante que la pide ve el aviso de iniciar sesión. **DEFINIDO** (2026-10-06)
- Máximo 10 transformaciones por minuto por usuario. **DEFINIDO** (2026-10-06)
- Se puede transformar una carta o todas las que falten de una lotería, en lote. Si el filtro de contenido rechaza una foto del lote, esa se omite y el lote continúa. _(confirmado el 2026-10-06)_
- El usuario puede revertir una carta transformada a su foto original, sin costo y sin recuperar el token. _(confirmado el 2026-10-06)_
- Volver a transformar una carta ya transformada cuesta otro token: cada transformación se cobra. **DEFINIDO** (2026-10-06)

## 7. Tokens

- El token es la unidad con la que se paga la IA. No tiene otro uso, no caduca (§14) y no se puede transferir entre usuarios. _(confirmado el 2026-10-06)_
- **Tokens de bienvenida:** cada cuenta nueva recibe una cantidad configurable por el administrador. Hoy son 5 en producción. **DEFINIDO** (2026-10-06)
- El saldo nunca puede ser negativo. **DEFINIDO** (2026-10-06)
- Un administrador puede regalar tokens a cualquier usuario. _(confirmado el 2026-10-06)_
- Cada regalo de tokens queda registrado: quién lo dio, a quién, cuánto y cuándo. **DEFINIDO** (2026-10-06). Hoy no se guarda: está por construirse.

## 8. Compra de tokens

- Solo los usuarios registrados pueden comprar. **DEFINIDO** (2026-10-06)
- Se paga con Mercado Pago, en pesos mexicanos. En la versión en inglés del sitio el precio se muestra además en dólares, solo como referencia; el cobro es siempre en pesos. _(confirmado el 2026-10-06)_
- **Paquetes vigentes:** _(confirmado el 2026-10-06)_

  | Paquete | Tokens de regalo | Precio |
  |---|---|---|
  | 10 tokens | 2 | $20.00 MXN |
  | 20 tokens | 5 | $40.00 MXN |
  | 50 tokens | 20 | $100.00 MXN |

- **Cantidad libre:** se puede comprar cualquier cantidad entre el mínimo y 500 tokens, a $2.00 MXN por token, sin tokens de regalo. _(confirmado el 2026-10-06)_
- **Mínimo de compra: 5 tokens ($10.00 MXN). DEFINIDO** (2026-10-06). El sitio todavía deja comprar desde 1 token: está por corregirse.
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
- cambiar la cantidad de tokens de bienvenida.

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

Decidido el 2026-10-06 (remediación del code review). El detalle técnico está en las migraciones 022 a 025.

## 13. Notificaciones — DEFINIDO

| Evento | A quién se avisa | Estado |
|---|---|---|
| Registro con correo | Al usuario: correo de confirmación de cuenta | Funciona |
| Olvidó su contraseña | Al usuario: correo para recuperarla | Funciona |
| Un pago pendiente (efectivo o transferencia) se confirma y sus tokens ya están disponibles | Al usuario | Por construir |
| Un administrador le regala tokens | Al usuario | Por construir |

- No se avisa de una compra normal acreditada, de saldo bajo ni de un pago devuelto. Decidido el 2026-10-06.
- Los dos avisos nuevos llegan por correo. Decidido el 2026-10-06.

## 14. Fechas, plazos y cálculos automáticos

- Vigencia de las promociones (§9).
- Límite de 10 transformaciones por minuto (§6).
- Nada caduca: ni los tokens, ni las loterías guardadas, ni las cuentas sin uso. **DEFINIDO** (2026-10-06)

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
| 2026-10-06 | En modo Clásico se necesitan al menos 20 cartas para generar tableros. _(Descartada: 16, el mínimo matemático, porque todos los tableros tendrían las mismas cartas.)_ |
| 2026-10-06 | El mínimo de compra en cantidad libre es de 5 tokens ($10.00 MXN). _(Descartadas: 1 token, porque Mercado Pago no permite pagar $2.00; 10 tokens, porque duplica al paquete más chico.)_ |
| 2026-10-06 | Ante un reembolso o contracargo se descuentan los tokens de esa compra, dejando el saldo en 0 como mínimo. _(Descartadas: dejar deuda de tokens y bloquear la IA; no hacer nada automático.)_ |
| 2026-10-06 | El sitio no emite comprobante propio de las compras. _(Descartadas: correo de confirmación; factura fiscal.)_ |
| 2026-10-06 | Un código promocional aplica en cualquier compra. _(Descartada: solo en la primera compra.)_ |
| 2026-10-06 | Cada usuario puede usar un mismo código una sola vez. _(Descartadas: sin límite mientras esté vigente; número de usos configurable.)_ |
| 2026-10-06 | Si una compra califica para primera compra y trae código, se aplica solo el código; no se suman. _(Descartada: sumar los dos bonos.)_ |
| 2026-10-06 | Cada regalo de tokens de un administrador queda registrado (quién, a quién, cuánto, cuándo). _(Descartada: que solo suba el saldo, sin registro.)_ |
| 2026-10-06 | Se avisa al usuario cuando un pago pendiente se acredita y cuando un administrador le regala tokens. _(Descartados: aviso de pago devuelto; no avisar de nada más.)_ |
| 2026-10-06 | Los avisos de pago pendiente acreditado y de tokens regalados llegan por correo. _(Descartadas: solo dentro del sitio; ambos medios.)_ |
| 2026-10-06 | Cada transformación de IA cuesta 1 token, también al repetir sobre la misma carta. _(Descartada: un reintento gratis por carta.)_ |
| 2026-10-06 | No hay límites de loterías, cartas ni tableros por usuario. _(Descartada: poner topes.)_ |
| 2026-10-06 | Nada caduca: ni tokens, ni loterías, ni cuentas. _(Descartadas: caducidad de tokens; borrar loterías de cuentas inactivas.)_ |
| 2026-10-06 | Principio central: terminar e imprimir una lotería siempre es gratis y sin registro; la IA es un extra de pago. _(Descartados: "el dinero del usuario primero"; "lo más simple gana".)_ |
| 2026-10-06 | El sitio se publica con Vercel: `main` es producción y `dev` es el entorno de pruebas, cada uno con su propio proyecto de Supabase. |

## 16. Pendientes por definir

Ninguno al 2026-10-06. Todas las reglas de este documento están confirmadas o definidas.

## 17. Reglas definidas que el sitio todavía no cumple

Decididas el 2026-10-06 y pendientes de construir. Cada una se convierte en una feature en `docs/features/`.

| Regla | Dónde está | Qué hace hoy el sitio |
|---|---|---|
| Mínimo de 20 cartas en Clásico | §4 | La pantalla de tableros acepta 16 |
| Mínimo de compra de 5 tokens | §8 | Deja comprar desde 1 token |
| Descontar tokens ante reembolso o contracargo | §8 | No descuenta nada |
| Registrar cada regalo de tokens | §7 | Solo sube el saldo, sin registro |
| Avisar por correo de pago pendiente acreditado | §13 | No avisa |
| Avisar por correo de tokens regalados | §13 | No avisa |
