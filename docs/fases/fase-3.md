# Fase 3 — Avisos por correo

**Estado: 🟡 en curso (2026-10-13)** — US A1 hecha en dev y en producción (configuración, sin código). US B1 construida, con su función desplegada en dev; falta la demo. Faltan B2 y B3. Rama `feature/fase-3-correos`; A1 y B1 llegan a `dev` con el PR de esa rama.

**Contexto.** El sitio no envía correos propios. Los dos que existen (confirmar la cuenta y recuperar la contraseña) los manda el servicio de inicio de sesión de Supabase, a nombre de Supabase. Los dos avisos decididos el 2026-10-06 (`contexto-negocio.md` §13: pago pendiente acreditado y tokens regalados) no tienen por dónde salir. El aviso de regalo se apoya en el registro de la fase 2.

**Fuera de esta fase.** Lo descartado el 2026-10-06 y que no se reabre: aviso de compra normal acreditada, comprobante, saldo bajo y pago devuelto. El aviso de una lotería temática nueva es publicidad (pide permiso del usuario y enlace de baja): iría como feature aparte. El enlace del botón de los correos de cuenta (decisión 9).

**Clasificación:** toca las funciones de Supabase (una pieza compartida de envío, una función nueva para el aviso de regalo y el aviso de Mercado Pago ya existente), la configuración de inicio de sesión de los dos proyectos de Supabase y una llamada nueva en el panel de administración, sin cambio visual. No se prevén migraciones ni pantallas nuevas. Toca cobros y permisos: pruebas primero. Estimado: 3 o 4 sesiones.

## Decisiones tomadas con el usuario (2026-10-13)

1. **Los correos se envían con Resend.** _(Descartado: el SMTP de Gmail — el remitente sería una dirección `@gmail.com`, la clave daría acceso a todo ese buzón, Google puede bloquear la cuenta por envío automático y no queda registro de entrega.)_
2. **Resend manda los cuatro correos:** los dos de cuenta, que hoy salen a nombre de Supabase, y los dos avisos nuevos. El motivo: que el usuario no vea «Supabase» como remitente. _(Descartada: usar Resend solo para los dos avisos nuevos y dejar los de cuenta como están.)_
3. **Se suma una alerta por correo al administrador** cuando un pago se cobra pero lo comprado no se pudo entregar. Es el primer aviso que no va al usuario. _(Descartado: no avisar al administrador.)_ Cambió `contexto-negocio.md` (§13, §15 y §17) y el caso 15 de `casos-de-uso.md`, con la confirmación de Carlos, el 2026-10-13.
4. **No se avisa de un pago pendiente que vence sin pagarse.** _(Descartado: correo al usuario invitándolo a intentarlo de nuevo.)_
5. **La alerta al administrador cubre también las compras de loterías temáticas,** no solo las de tokens: pasan por el mismo cobro. _(Descartada: alertar solo de tokens.)_ Llevado a `contexto-negocio.md` (§13 y §18) y al caso 25 de `casos-de-uso.md`, con la confirmación de Carlos, el 2026-10-13.
6. **La alerta llega a una sola dirección fija,** que se configura en el servidor de cada entorno y se cambia sin tocar código. Carlos dio la dirección el 2026-10-13; no se escribe aquí porque el repositorio es público. _(Descartada: enviarla a todos los de la lista de administradores.)_ Llevado a `contexto-negocio.md` (§13 y §15), con su confirmación, el 2026-10-13.
7. **Remitente:** los correos salen a nombre de «Chorro y Buenas», desde `avisos@chorroybuenas.com.mx`. Las respuestas de los usuarios llegan al mismo buzón que la alerta al administrador (decisión 6), puesto como dirección de respuesta; se configura en el servidor y no se escribe aquí. _(Descartados: que las respuestas reboten; un buzón de contacto aparte.)_
8. **Los correos salen solo en español.** El sitio no guarda el idioma de cada usuario (lo decide su navegador), así que el servidor no sabe en cuál escribirle. _(Descartadas: español e inglés en el mismo correo; guardar el idioma en la cuenta y escribir a cada quien en el suyo.)_ Llevado a `contexto-negocio.md` (§13 y §15) el 2026-10-13.
9. **El enlace del botón de los correos de cuenta no se toca en esta fase:** sigue apuntando a una dirección `…supabase.co`. Cambiarlo es lo único que tocaría el código de inicio de sesión, y Carlos prefiere no arriesgar los flujos actuales. Queda como mejora suelta en `docs/PENDIENTES.md`. _(Descartadas: hacerlo como historia obligatoria; hacerlo como última historia, opcional.)_

## Por definir con Carlos

Nada pendiente al 2026-10-13: alcance, remitente, idioma y textos están decididos.

## Diseño

**Cómo se envía.** Una pieza compartida de las funciones de Supabase manda cada correo con una petición web a Resend. La clave de Resend, la dirección de alertas y la de respuesta son secretos de cada proyecto de Supabase; ninguna lleva el prefijo `VITE_` ni se escribe en el repositorio. El dominio `chorroybuenas.com.mx` se verifica una vez en Resend y lo comparten dev y producción, cada uno con su clave.

**Un correo nunca cambia un cobro ni un regalo.** Primero se acredita, se entrega o se regala; el correo se intenta después. Si el envío falla, el error queda en el registro del servidor y lo ya hecho no se deshace ni se repite.

**Sin repetidos.** Mercado Pago avisa del mismo pago varias veces. Cada correo lleva una marca única (por pago o por regalo) para que Resend lo entregue una sola vez.

**Correos de cuenta.** No llevan código: en la configuración de inicio de sesión de cada proyecto de Supabase se indica que el envío lo hace Resend, con el remitente de la decisión 7. Las plantillas en español que ya existen se conservan y el enlace no se toca (decisión 9). Al dejar el envío de fábrica desaparece el tope de 2 correos por hora; el tope nuevo se fija ahí mismo.

**Aviso de pago pendiente confirmado.** Sale desde el aviso de Mercado Pago, después de acreditar, y solo si el pago fue en efectivo o por transferencia (el tipo de pago lo informa Mercado Pago). Un pago con tarjeta no manda nada (`contexto-negocio.md` §13). Vale para tokens y para loterías temáticas.

**Aviso de tokens regalados.** El regalo se hace hoy desde el panel directo contra la base, que no puede mandar correos. Se agrega una función del servidor que el panel llama justo después de regalar: comprueba que quien llama es administrador, lee el regalo del registro de la fase 2 y arma el correo con esos datos, no con lo que mande el navegador.

**Alerta al administrador.** Sale desde el aviso de Mercado Pago cuando un pago aprobado no termina en entrega: (1) falla al sumar los tokens o al entregar la lotería (Mercado Pago lo reintenta); (2) el pago llega con datos inválidos o con un monto menor al esperado (no se acredita ni se reintenta); (3) el pago llega sin la referencia que dice de quién es; (4) la cuenta ya tenía esa lotería temática y el pago queda para devolverse a mano. La función que acredita al volver del pago no alerta: si ella falla, el aviso de Mercado Pago lo vuelve a intentar.

**Lo que no cambia.** Ninguna pantalla, ningún flujo de inicio de sesión, ninguna regla de saldo ni de cobro.

**Tareas manuales de Carlos.** Crear la cuenta de Resend, agregar los registros DNS del dominio, generar una clave para dev y otra para producción, y renovar el token de acceso de dev en `.env`.

### Textos de los correos

Todos en español, de «Chorro y Buenas». Los valores entre llaves los pone el servidor.

**Correo 1 — Pago pendiente confirmado** (aprobado por Carlos el 2026-10-13). Sin el monto pagado: el sitio no emite comprobante propio (`contexto-negocio.md` §13).

- Compra de tokens — Asunto: «Tu pago se confirmó: ya tienes tus tokens»
  > Hola, {nombre}:
  >
  > Confirmamos tu pago. Ya sumamos **{tokens} tokens** a tu cuenta y puedes usarlos cuando quieras para transformar tus cartas con IA.
  >
  > [ Ir a mi cuenta ]
  >
  > Si no reconoces esta compra, responde a este correo.
  >
  > Chorro y Buenas
- Compra de una lotería temática — Asunto: «Tu pago se confirmó: tu lotería ya está lista». Igual que el anterior, con esta frase central: «Confirmamos tu pago. Ya puedes descargar **{nombre de la lotería}** desde tu cuenta, las veces que quieras.»

**Correo 2 — Tokens regalados** (aprobado por Carlos el 2026-10-13). Sin el motivo ni quién los regaló: el usuario solo ve cantidad y fecha (fase 2, decisión 2).

- Asunto: «Te regalamos tokens»
  > Hola, {nombre}:
  >
  > Te regalamos **{tokens} tokens**. Ya están en tu cuenta y puedes usarlos cuando quieras para transformar tus cartas con IA.
  >
  > [ Ir a mi cuenta ]
  >
  > Chorro y Buenas

**Correo 3 — Alerta al administrador** (aprobado por Carlos el 2026-10-13). Lleva el monto y el correo del cliente porque solo le llega al administrador; no es un comprobante para el usuario.

- Asunto: «Alerta: pago cobrado sin entregar»
  > Un pago se cobró en Mercado Pago, pero el sitio no pudo entregar lo comprado.
  >
  > - **Cliente:** {correo del cliente, o «no se pudo identificar»}
  > - **Compró:** {tokens} tokens · o el nombre de la lotería temática
  > - **Monto:** {monto} MXN
  > - **Pago de Mercado Pago:** {número de pago}
  > - **Fecha:** {fecha y hora}
  > - **Error:** {qué falló, con el detalle técnico}
  >
  > **Qué hacer:** antes de corregir nada a mano, revisa en el panel si la compra ya aparece acreditada. Mercado Pago lo reintenta solo y puede haberse resuelto.
  >
  > Recibirás una sola alerta por cada pago, aunque falle varias veces.

## Comprobado

- **Producción, correos de cuenta, antes del cambio (2026-10-13, consulta de solo lectura a la configuración de inicio de sesión):** salían por el envío de fábrica de Supabase, sin servicio propio, con tope de 2 correos por hora. Las plantillas de confirmar cuenta y de recuperar contraseña ya están en español, con asuntos «Confirma tu cuenta - chorroybuenas.com.mx» y «Recupera tu contraseña - chorroybuenas.com.mx». Confirmar el correo es obligatorio para entrar.
- **Producción, registro con correo (2026-10-13):** Carlos se registró en `chorroybuenas.com.mx`, recibió el correo de confirmación y pudo entrar. El envío de fábrica entrega; queda sin confirmar si la dirección que usó era ajena al equipo del proyecto de Supabase, que es el caso que la documentación de Supabase dice que no entrega.
- **Dominio en Resend (2026-10-13):** `chorroybuenas.com.mx` aparece como verificado en Resend, consultado con la clave de dev.
- **Dev, correos de cuenta (2026-10-13):** igual que producción antes del cambio: envío de fábrica de Supabase, tope de 2 correos por hora y las mismas plantillas en español. Para volver atrás basta apagar el servicio propio en la configuración de inicio de sesión.
- **El dominio no tiene buzones (2026-10-13):** `chorroybuenas.com.mx` no tiene registros para recibir correo. Y la configuración de inicio de sesión de Supabase solo deja elegir el remitente, no una dirección de respuesta. Consecuencia: en los tres correos nuevos la respuesta sí se puede dirigir al buzón de alertas (decisión 7), pero una respuesta a los dos correos de cuenta rebotaría mientras `avisos@chorroybuenas.com.mx` no exista o no se reenvíe. Pendiente de decidir con Carlos.

## Por comprobar al construir

- Que Resend respete la marca única contra repetidos y por cuánto tiempo, y sus límites vigentes en el plan gratuito.
- El tope de correos por hora que Supabase aplica al conectar un servicio propio.
- Cómo se simula en el entorno de pruebas de Mercado Pago un pago en efectivo que se confirma después, y cuántas veces reintenta un aviso fallido.

---

## Grupo A — Correos de cuenta

### US A1 — Los correos de cuenta salen a nombre de Chorro y Buenas   ·   Estado: ✅ hecha en dev y en producción (2026-10-13)

- **Historia** — Como usuario que se registra o recupera su contraseña, quiero que el correo me llegue de Chorro y Buenas y no de Supabase, para reconocerlo y confiar en él.
- **Entrega demostrable** — El correo de confirmar cuenta y el de recuperar contraseña llegan de «Chorro y Buenas» `<avisos@chorroybuenas.com.mx>`, con el mismo texto de hoy, y el registro y la recuperación siguen funcionando igual.
- **Construcción (propuesta)** — Sin código. Carlos crea la cuenta de Resend y agrega los registros DNS; con el dominio verificado se conecta Resend en la configuración de inicio de sesión de dev, se prueba, y —con confirmación— se repite en producción.
- **Construido** — 2026-10-13: Carlos creó la cuenta de Resend, verificó el dominio, generó las claves y renovó el token de dev. Ese mismo día, con el permiso de Carlos, se conectó Resend en la configuración de inicio de sesión de **dev**: servidor `smtp.resend.com`, puerto 465, usuario `resend`, la clave de dev como contraseña, remitente «Chorro y Buenas» `<avisos@chorroybuenas.com.mx>` y tope de 30 correos por hora (antes 2). Plantillas y enlaces sin tocar. Supabase confirmó el cambio. Demo de Carlos en dev, 2026-10-13: dos registros de prueba, los dos marcados como entregados en Resend con el remitente nuevo. A una cuenta de Gmail le llegó a la bandeja de entrada, a nombre de Chorro y Buenas. A una cuenta de empresa con Microsoft 365 no le apareció (lo más probable, cuarentena del filtro de la empresa). El botón del correo lo dejó dentro del sitio, con sesión. La recuperación de contraseña también lo redirigió al sitio; falta confirmar que le pidió la contraseña nueva. **Producción:** con la confirmación de Carlos, el 2026-10-13 se aplicó la misma configuración en el proyecto de producción (antes: envío de fábrica y tope de 2 por hora; después: Resend, el remitente nuevo y tope de 30). Plantillas, enlaces y dirección del sitio quedaron iguales. La clave de Resend guardada en producción es de acceso completo: conviene cambiarla por una de solo envío. Demo de Carlos en producción ese mismo día: se registró con una cuenta de Gmail, el correo llegó de Chorro y Buenas (entregado según Resend), la cuenta quedó confirmada y con sesión; «todo bien». La configuración quedó descrita en `docs/ENTORNOS_DEV_PROD.md` §4.
- **Depende de** — las tareas manuales de Carlos.
- **Cómo se prueba (guion de demo)** — En `dev.chorroybuenas.com.mx` → Crear cuenta con un correo que no hayas usado → abre tu bandeja: el remitente debería decir «Chorro y Buenas», no «Supabase Auth» → pulsa el botón del correo: deberías quedar dentro del sitio con tu sesión. Después: Cerrar sesión → «Olvidé mi contraseña» → llega el correo del mismo remitente → el botón abre el sitio y te pide la contraseña nueva.
- **Escenarios cubiertos**:
  - [x] Confirmar cuenta: llega con el remitente nuevo y el botón deja al usuario con sesión. (Demo de Carlos en dev, 2026-10-13, con Gmail.)
  - [ ] Recuperar contraseña: llega con el remitente nuevo y el sitio pide la contraseña nueva. (Demo. En dev, 2026-10-13: el correo llegó y el botón lo redirigió al sitio; falta confirmar que pidió la contraseña nueva.)
  - [ ] El correo no cae en spam en Gmail ni en Outlook. (Demo. Gmail: bandeja de entrada, 2026-10-13. Falta Outlook o Hotmail personal.)
  - [ ] Responder al correo llega al buzón de respuesta. (Demo.)
  - [ ] Entrar con Google y con correo y contraseña sigue igual. (Demo.)
  - [x] Confirmar cuenta, en producción. (Demo de Carlos, 2026-10-13, con Gmail.)
  - [ ] Recuperar contraseña, en producción. (Demo.)

## Grupo B — Avisos nuevos

### US B1 — Aviso por correo de tokens regalados   ·   Estado: 🟡 construida, falta la demo (2026-10-14)

- **Historia** — Como usuario, quiero recibir un correo cuando un administrador me regala tokens, para enterarme sin tener que entrar al sitio.
- **Entrega demostrable** — Al regalar tokens desde Balances, a la cuenta que los recibe le llega el correo 2 con la cantidad, sin el motivo ni quién los regaló.
- **Construcción (propuesta)** — Pruebas primero en `tests/`. La pieza compartida de envío; la función nueva del servidor para el aviso de regalo; la llamada desde `src/repositories/AdminRepository.ts` después de regalar. Desplegar la función en dev antes de la demo, y en producción —con confirmación— antes de pasar a `main`.
- **Construido** — 2026-10-14, en la rama `feature/fase-3-correos`. Se empezó por las pruebas: `tests/functions/email.test.ts` (envío a Resend con la marca contra repetidos, remitente, errores, HTML escapado) y `tests/functions/giftNotice.test.ts` (quién puede pedirlo, datos válidos, regalo que no existe, sin motivo, envío fallido); fallaron sin el código y pasan con él (22 pruebas nuevas; 1056 en total). Código: la pieza compartida `supabase/functions/_shared/email.ts` (envío y plantilla con el estilo de los correos de cuenta), `supabase/functions/_shared/giftNotice.ts` (la regla del aviso) y la función `supabase/functions/notify-token-gift`, que el panel llama después de regalar desde `src/services/giftNotice.ts` sin esperarla. La función ubica el regalo en el registro de la fase 2 (el más reciente de ese administrador a esa cuenta por esa cantidad, de los últimos 10 minutos) y no recibe del navegador nada que vaya en el correo. Sin migraciones. Desplegada en **dev** el 2026-10-14, con los secretos `RESEND_API_KEY` y `EMAIL_REPLY_TO`; comprobado que rechaza a quien no tiene sesión. El panel con la llamada nueva llega a `dev.chorroybuenas.com.mx` con el PR de la rama `feature/fase-3-correos` a `dev`. Antes de pasar a `main` hay que desplegar la función en producción y cargarle los dos secretos, con la confirmación de Carlos.
- **Depende de** — US A1 (dominio verificado y clave de Resend en dev).
- **Cómo se prueba (guion de demo)** — En `dev.chorroybuenas.com.mx`, con tu cuenta de administrador → Administración → Balances → Regalar en una cuenta de prueba cuyo correo puedas abrir → 3 tokens, con un motivo → Regalar. El saldo sube 3 como siempre, y en la bandeja de esa cuenta debería estar «Te regalamos tokens» con «3 tokens» y sin el motivo.
- **Escenarios cubiertos**:
  - [x] Regalo hecho: sale un correo con la cantidad correcta. (Prueba.)
  - [x] El correo no lleva el motivo ni quién regaló, aunque haya motivo. (Prueba.)
  - [x] Si el envío falla, el regalo queda hecho y el saldo no cambia otra vez. (Prueba: la función informa el fallo sin lanzar y no toca el saldo; el panel no espera la respuesta.)
  - [x] Llamar dos veces por el mismo regalo no manda dos correos. (Prueba: las dos llamadas llevan la misma marca; quien descarta la segunda es Resend, por comprobar en la demo.)
  - [x] Quien no es administrador, o un visitante, no puede hacer que se mande el correo. (Prueba para el no administrador; sin sesión la función responde 401, comprobado en dev.)
  - [x] No se puede provocar un correo de un regalo que no existe ni con otra cantidad. (Prueba.)
  - [ ] El correo llega y se ve bien en teléfono. (Demo.)

### US B2 — Aviso por correo de pago pendiente confirmado   ·   Estado: 🔲 pendiente

- **Historia** — Como usuario que pagó en efectivo o por transferencia, quiero un correo cuando mi pago se confirme, para saber que ya tengo lo que compré.
- **Entrega demostrable** — Cuando un pago en efectivo o por transferencia se acredita, al usuario le llega el correo 1: la versión de tokens o la de lotería temática, según lo que compró.
- **Construcción (propuesta)** — Pruebas primero en `tests/`. `supabase/functions/_shared/paymentFlow.ts` y `supabase/functions/webhook-mercadopago/index.ts`: después de acreditar, y solo si el pago fue en efectivo o transferencia, se pide el envío. Desplegar en dev antes de la demo, y en producción —con confirmación— antes de pasar a `main`.
- **Depende de** — US B1 (la pieza de envío).
- **Cómo se prueba (guion de demo)** — Por afinar al construir, según cómo deje simular Mercado Pago un pago en efectivo confirmado. La idea: en dev, comprar tokens eligiendo pago en efectivo con un usuario de prueba → confirmar ese pago en el entorno de pruebas → el saldo sube y en la bandeja aparece «Tu pago se confirmó: ya tienes tus tokens». Repetir con una lotería temática.
- **Escenarios cubiertos**:
  - [ ] Pago en efectivo o transferencia que se acredita: sale el correo de tokens con la cantidad correcta. (Prueba.)
  - [ ] Lo mismo con una lotería temática: sale el correo con el nombre de la lotería. (Prueba.)
  - [ ] Pago con tarjeta: no sale ningún correo. (Prueba.)
  - [ ] El mismo pago avisado varias veces: un solo correo, y se acredita una sola vez como hoy. (Prueba.)
  - [ ] Si el envío falla, el pago queda acreditado y Mercado Pago recibe la respuesta de siempre. (Prueba.)
  - [ ] El correo no lleva el monto pagado. (Prueba.)
  - [ ] Todas las pruebas de cobro que ya existen siguen pasando. (Prueba.)
  - [ ] El correo llega tras un pago de prueba confirmado. (Demo.)

### US B3 — Alerta al administrador de un pago cobrado sin entregar   ·   Estado: 🔲 pendiente

- **Historia** — Como administrador, quiero un correo cuando un pago se cobra pero el sitio no entrega lo comprado, para resolverlo antes de que el cliente reclame.
- **Entrega demostrable** — En los cuatro casos del diseño llega el correo 3 a la dirección de alertas, con el cliente, lo que compró, el monto, el número de pago y el error; una sola vez por pago.
- **Construcción (propuesta)** — Pruebas primero en `tests/`. Los mismos dos archivos de la US B2. Desplegar en dev antes de la demo, y en producción —con confirmación— antes de pasar a `main`.
- **Depende de** — US B2.
- **Cómo se prueba (guion de demo)** — Por afinar al construir: hay que provocar un fallo en dev sin romper nada. La idea: enviar a dev un aviso de prueba de un pago aprobado con un monto menor al esperado → no se acredita nada y en el buzón de alertas aparece «Alerta: pago cobrado sin entregar» con los datos de ese pago.
- **Escenarios cubiertos**:
  - [ ] Falla al sumar tokens o al entregar la lotería: sale la alerta y Mercado Pago sigue recibiendo el error para reintentar. (Prueba.)
  - [ ] Datos inválidos o monto menor al esperado: sale la alerta y no se acredita. (Prueba.)
  - [ ] Pago aprobado sin referencia: sale la alerta con «no se pudo identificar». (Prueba.)
  - [ ] Lotería temática que la cuenta ya tenía: sale la alerta. (Prueba.)
  - [ ] El mismo pago falla varias veces: una sola alerta. (Prueba.)
  - [ ] Pago acreditado sin problema: no sale ninguna alerta. (Prueba.)
  - [ ] Si el envío de la alerta falla, el cobro se comporta igual que hoy. (Prueba.)
  - [ ] La alerta llega al buzón configurado. (Demo.)
