# Casos de uso — Lotería Personalizada (chorroybuenas)

Complementa a [`contexto-negocio.md`](contexto-negocio.md) sin introducir reglas nuevas: cada caso cita las secciones del contexto en que se apoya (`§4`). Si un caso y el contexto se contradicen, manda el contexto.

Los casos marcados con 🔧 describen una regla ya definida que el sitio todavía no cumple (ver §17 del contexto): el caso dice cómo debe funcionar, no cómo funciona hoy.

Son 23 casos en 5 bloques. Formato de cada caso: actor, precondiciones, flujo principal, excepciones, resultado, estados afectados, notificaciones y auditoría. No se usa "Tareas generadas": el producto no tiene tablero de tareas.

Creado el 2026-10-06.

---

## Bloque 1 — Cuenta

### 1. Registrarse
- **Actor(es)**: Visitante.
- **Precondiciones**: No tener cuenta con ese correo.
- **Flujo principal**: (1) Elige registrarse con correo y contraseña, o con Google. (2) Con correo, recibe un mensaje para confirmar su cuenta. (3) Al confirmar, queda registrado y recibe sus tokens de bienvenida (§7).
- **Excepciones**: El correo ya está registrado: se le avisa. Si la cantidad de tokens de bienvenida no está configurada, la cuenta se crea igual, con saldo 0.
- **Resultado**: Existe un usuario registrado con su saldo inicial.
- **Estados afectados**: Se crean el perfil y el saldo del usuario (§11).
- **Notificaciones**: Correo de confirmación de cuenta (§13).
- **Auditoría**: No.

### 2. Iniciar sesión
- **Actor(es)**: Usuario registrado.
- **Precondiciones**: Tener cuenta confirmada.
- **Flujo principal**: (1) Entra con correo y contraseña, o con Google. (2) Si en su navegador había cartas o tableros creados como visitante, se pasan a su cuenta dentro de una lotería por defecto (§4). (3) Llega a su panel con sus loterías.
- **Excepciones**: Credenciales incorrectas: se le avisa. Si alguna carta no se puede pasar a la cuenta, las demás se pasan igual.
- **Resultado**: Sesión iniciada, con su trabajo previo de visitante ya en la nube.
- **Estados afectados**: Pueden crearse una lotería, cartas y tableros (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 3. Recuperar la contraseña
- **Actor(es)**: Usuario registrado que olvidó su contraseña.
- **Precondiciones**: Tener cuenta con correo y contraseña.
- **Flujo principal**: (1) Pide recuperar su contraseña con su correo. (2) Recibe un enlace. (3) Al abrirlo, define una contraseña nueva.
- **Excepciones**: El enlace caducó: debe pedir otro.
- **Resultado**: La contraseña queda cambiada.
- **Estados afectados**: Ninguno del negocio.
- **Notificaciones**: Correo de recuperación (§13).
- **Auditoría**: No.

### 4. Editar el perfil
- **Actor(es)**: Usuario registrado.
- **Precondiciones**: Sesión iniciada.
- **Flujo principal**: (1) Desde su panel cambia su nombre, su foto de perfil o su contraseña. (2) El cambio se ve de inmediato en su panel y en la barra de navegación.
- **Excepciones**: La foto no es PNG, JPEG ni WebP: se rechaza. El nombre vacío no se guarda.
- **Resultado**: Perfil actualizado.
- **Estados afectados**: Perfil del usuario (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

---

## Bloque 2 — Crear una lotería

### 5. Crear, renombrar o borrar una lotería
- **Actor(es)**: Usuario registrado. El visitante trabaja con una sola lotería, sin nombre, en su navegador (§3, §4).
- **Precondiciones**: Sesión iniciada.
- **Flujo principal**: (1) Crea una lotería nueva y le pone nombre, o elige una existente. (2) Puede renombrarla. (3) Puede borrarla, confirmando antes.
- **Excepciones**: El nombre vacío no se guarda.
- **Resultado**: La lotería existe, cambió de nombre o dejó de existir junto con sus cartas y tableros.
- **Estados afectados**: Lotería, y al borrar, sus cartas y tableros (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 6. Agregar cartas
- **Actor(es)**: Visitante o usuario registrado.
- **Precondiciones**: Tener una lotería abierta.
- **Flujo principal**: (1) Sube una imagen, la ajusta y le pone título; o sube varias a la vez y revisa sus títulos. (2) Las cartas aparecen en la lotería. (3) Ve cuántas le faltan para el mínimo del modo elegido (§4).
- **Excepciones**: Título repetido en la misma lotería: se rechaza (§4). Formato o tamaño de imagen no permitido: se rechaza (§5).
- **Resultado**: La lotería tiene las cartas nuevas.
- **Estados afectados**: Cartas (§11). Para el visitante, se guardan en su navegador (§3).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 7. Editar o borrar una carta
- **Actor(es)**: Visitante o usuario registrado, sobre sus propias cartas.
- **Precondiciones**: La carta existe.
- **Flujo principal**: (1) Cambia el título o la imagen de una carta, o la borra. (2) Puede vaciar la lotería completa, confirmando antes.
- **Excepciones**: Título repetido: se rechaza (§4). No se puede vaciar la lotería mientras hay una transformación en lote en curso.
- **Resultado**: La carta cambió o dejó de existir.
- **Estados afectados**: Cartas (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 8. Elegir el modo de juego 🔧
- **Actor(es)**: Visitante o usuario registrado.
- **Precondiciones**: Tener una lotería abierta.
- **Flujo principal**: (1) Elige Clásico (4 × 4) o Kids (3 × 3). (2) El mínimo de cartas se ajusta: 24 en Clásico, 15 en Kids (§4).
- **Excepciones**: Ninguna.
- **Resultado**: La lotería queda en el modo elegido.
- **Estados afectados**: Lotería (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 9. Generar tableros 🔧
- **Actor(es)**: Visitante o usuario registrado.
- **Precondiciones**: La lotería tiene al menos el mínimo de cartas de su modo (§4).
- **Flujo principal**: (1) Ve la cantidad de tableros sugerida y puede cambiarla (§4). (2) Genera los tableros. (3) Los revisa uno por uno.
- **Excepciones**: Faltan cartas para el mínimo (24 en Clásico, 15 en Kids): no puede generar y se le dice cuántas faltan. Si pide más tableros distintos de los que sus cartas permiten, no todos saldrán diferentes.
- **Resultado**: La lotería tiene sus tableros, armados al azar y sin repetidos (§4).
- **Estados afectados**: Tableros (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 10. Descargar el PDF
- **Actor(es)**: Visitante o usuario registrado.
- **Precondiciones**: Hay tableros generados.
- **Flujo principal**: (1) Pide el PDF. (2) Recibe un archivo con los tableros con área de corte y la baraja completa para recortar (§5).
- **Excepciones**: Si la imagen de alguna carta no carga, se le avisa.
- **Resultado**: El usuario tiene el PDF. Es gratis y no requiere cuenta (§1, §5).
- **Estados afectados**: Ninguno.
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

---

## Bloque 3 — Transformación con IA

### 11. Transformar una carta
- **Actor(es)**: Usuario registrado con al menos 1 token.
- **Precondiciones**: Sesión iniciada; la carta tiene imagen.
- **Flujo principal**: (1) Pide transformar la carta. (2) El servidor descuenta 1 token (§6). (3) Se genera la imagen en estilo de lotería tradicional. (4) La carta muestra la imagen nueva y conserva la original. (5) El saldo en pantalla se actualiza.
- **Excepciones**: La carta ya estaba transformada: se transforma de nuevo y cuesta otro token (§6). Sin sesión: se le pide iniciar sesión. Sin tokens: se le avisa y se le invita a comprar. La imagen no se pudo generar, o tardó demasiado: se le devuelve el token y se le avisa (§6). El filtro de contenido rechaza la foto: se le avisa y no se le cobra. Más de 10 transformaciones en un minuto: se le pide esperar (§6).
- **Resultado**: Carta transformada y 1 token menos; o carta sin cambios y saldo intacto.
- **Estados afectados**: Carta, saldo y uso (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: Se registra cada token gastado, con el usuario y la lotería (§11).

### 12. Transformar todas las cartas en lote
- **Actor(es)**: Usuario registrado con tokens suficientes para las cartas que faltan.
- **Precondiciones**: La lotería tiene cartas sin transformar.
- **Flujo principal**: (1) Ve cuántas cartas se transformarán y cuántos tokens costará. (2) Inicia el lote. (3) Las cartas se transforman una por una, con el avance a la vista. (4) Al terminar ve cuántas se transformaron y cuántas se omitieron.
- **Excepciones**: Todas las cartas ya están transformadas: se le avisa. El filtro de contenido rechaza una foto: esa se omite y el lote continúa (§6). Cualquier otro fallo (sin tokens, demasiadas solicitudes, error del servicio): el lote se detiene con su aviso; lo ya transformado se conserva.
- **Resultado**: Las cartas transformadas con éxito quedan cobradas a 1 token cada una; las demás, sin cobro.
- **Estados afectados**: Cartas, saldo y uso (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: Igual que el caso 11.

### 13. Revertir una carta transformada
- **Actor(es)**: Usuario registrado.
- **Precondiciones**: La carta fue transformada con IA.
- **Flujo principal**: (1) Pide volver a la foto original. (2) La carta muestra de nuevo la original.
- **Excepciones**: Ninguna.
- **Resultado**: La carta vuelve a su foto original. No cuesta y no devuelve el token (§6).
- **Estados afectados**: Carta (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

---

## Bloque 4 — Tokens

### 14. Comprar tokens 🔧
- **Actor(es)**: Usuario registrado.
- **Precondiciones**: Sesión iniciada.
- **Flujo principal**: (1) Elige un paquete, o una cantidad libre de 5 a 500 tokens (§8). (2) Si tiene un código promocional, lo escribe y ve el bono (§9). (3) Es enviado al pago de Mercado Pago. (4) Paga. (5) Vuelve al sitio y ve el resultado.
- **Excepciones**: Sin sesión: se le pide iniciar sesión. Pago cancelado o rechazado: vuelve sin tokens. Pago pendiente (efectivo o transferencia): se le avisa que se acreditará al confirmarse (§8). Cantidad libre menor a 5 tokens: no se permite (§8; hoy el sitio aún deja pedir desde 1).
- **Resultado**: Un pago iniciado. Los tokens llegan por el caso 15.
- **Estados afectados**: Ninguno hasta que el pago se aprueba.
- **Notificaciones**: Ninguna. El sitio no emite comprobante propio (§8, §13).
- **Auditoría**: No.

### 15. Acreditar un pago aprobado 🔧
- **Actor(es)**: El sistema, al recibir el aviso de Mercado Pago.
- **Precondiciones**: Existe un pago aprobado de una compra iniciada en el sitio.
- **Flujo principal**: (1) Llega el aviso de Mercado Pago. (2) El servidor consulta el pago directamente con Mercado Pago. (3) Comprueba que esté aprobado y que el monto pagado alcance el esperado (§8). (4) Suma los tokens al saldo del comprador y registra la compra.
- **Excepciones**: El mismo pago se avisa varias veces: se acredita una sola vez (§8). Pago no aprobado, o monto menor al esperado: no se acredita. Falla momentánea del servidor: Mercado Pago reintenta más tarde.
- **Resultado**: El comprador tiene sus tokens y la compra queda en su historial.
- **Estados afectados**: Saldo y compra (§11).
- **Notificaciones**: Si el pago estuvo pendiente (efectivo o transferencia) y se confirma después, correo al usuario avisando que sus tokens ya están disponibles (§13; por construir). En un pago inmediato, ninguna.
- **Auditoría**: Se registra la compra con tokens, monto, identificador del pago y promoción usada (§11).

### 16. Usar un código promocional
- **Actor(es)**: Usuario registrado.
- **Precondiciones**: Existe al menos un código vigente (§9). Sirve en cualquier compra, no solo en la primera.
- **Flujo principal**: (1) En la página de compra escribe el código. (2) Si es válido, ve el porcentaje de bono y el total de tokens que recibirá. (3) Compra (caso 14). (4) Al acreditarse el pago recibe los tokens del bono.
- **Excepciones**: Código inexistente, inactivo, vencido o aún no vigente: no se aplica. Código ya usado por ese usuario: no se aplica (§9). Primera compra con código: se aplica solo el código (§9). El bono redondea a 0 tokens: el código no cuenta como usado.
- **Resultado**: La compra lleva el bono del código.
- **Estados afectados**: Compra (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: La compra registra qué promoción se usó.

### 17. Ver el historial y el saldo
- **Actor(es)**: Usuario registrado.
- **Precondiciones**: Sesión iniciada.
- **Flujo principal**: (1) En su panel ve su saldo, cuántos tokens ha recibido y gastado, y en qué loterías. (2) Abre su historial de compras.
- **Excepciones**: Ninguna.
- **Resultado**: El usuario conoce su saldo y sus movimientos. Solo ve los suyos (§3, §12).
- **Estados afectados**: Ninguno.
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 18. Revertir una compra devuelta 🔧
- **Actor(es)**: El sistema, al recibir el aviso de Mercado Pago.
- **Precondiciones**: Una compra ya acreditada se devuelve, o el banco del comprador la revierte.
- **Flujo principal**: (1) Llega el aviso de Mercado Pago. (2) El servidor consulta el pago y confirma que fue devuelto o revertido. (3) Descuenta del saldo del comprador los tokens de esa compra. (4) Marca la compra como devuelta (§8).
- **Excepciones**: El usuario ya gastó parte de esos tokens: su saldo queda en 0, nunca en negativo (§7, §8). El mismo aviso llega varias veces: se descuenta una sola vez.
- **Resultado**: El saldo ya no incluye los tokens de la compra devuelta.
- **Estados afectados**: Saldo y compra (§11).
- **Notificaciones**: Ninguna (§13).
- **Auditoría**: La compra queda marcada como devuelta.

---

## Bloque 5 — Administración

### 19. Gestionar promociones
- **Actor(es)**: Administrador.
- **Precondiciones**: Sesión iniciada como administrador.
- **Flujo principal**: (1) Ve todas las promociones. (2) Crea una de primera compra o de código, con su porcentaje y vigencia opcional. (3) La edita, la activa, la desactiva o la borra (§9).
- **Excepciones**: Un usuario que no es administrador no puede ver ni cambiar promociones (§12).
- **Resultado**: La promoción queda creada, cambiada o eliminada.
- **Estados afectados**: Promoción (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 20. Gestionar paquetes y precio por token
- **Actor(es)**: Administrador.
- **Precondiciones**: Sesión iniciada como administrador.
- **Flujo principal**: (1) Ve los paquetes. (2) Crea o edita un paquete: tokens, tokens de regalo, precio y si está activo. (3) Cambia el precio por token de la cantidad libre (§8).
- **Excepciones**: Las compras ya iniciadas conservan el precio con el que se crearon.
- **Resultado**: Los precios nuevos aplican a las compras siguientes.
- **Estados afectados**: Paquete y precio (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 21. Regalar tokens 🔧
- **Actor(es)**: Administrador.
- **Precondiciones**: Sesión iniciada como administrador; el usuario destino existe.
- **Flujo principal**: (1) Busca al usuario en la lista de saldos. (2) Indica cuántos tokens regalar. (3) El saldo del usuario sube (§7).
- **Excepciones**: Cantidad de 0 o negativa: se rechaza. Quien no es administrador no puede regalar (§3).
- **Resultado**: El usuario tiene más tokens.
- **Estados afectados**: Saldo (§11).
- **Notificaciones**: Correo al usuario avisando que recibió tokens (§13; por construir).
- **Auditoría**: Se registra quién regaló, a quién, cuánto y cuándo (§7; por construir).

### 22. Consultar compras, saldos y uso de la IA
- **Actor(es)**: Administrador.
- **Precondiciones**: Sesión iniciada como administrador.
- **Flujo principal**: (1) Ve las compras y las transacciones de Mercado Pago, con filtros. (2) Ve los saldos de todos los usuarios. (3) Ve el uso de la IA por día, por usuario y por lotería, con su costo estimado (§10).
- **Excepciones**: Ninguna.
- **Resultado**: El administrador conoce el estado del negocio.
- **Estados afectados**: Ninguno.
- **Notificaciones**: Ninguna.
- **Auditoría**: No.

### 23. Cambiar los tokens de bienvenida
- **Actor(es)**: Administrador.
- **Precondiciones**: Sesión iniciada como administrador.
- **Flujo principal**: (1) Cambia la cantidad de tokens que recibe una cuenta nueva (§7).
- **Excepciones**: Un valor negativo se trata como 0.
- **Resultado**: Las cuentas creadas a partir de ese momento reciben la cantidad nueva. Las ya existentes no cambian.
- **Estados afectados**: Configuración (§11).
- **Notificaciones**: Ninguna.
- **Auditoría**: No.
