# FEAT-66 — Que Mercado Pago apruebe más pagos con tarjeta

**Estado: 🟡 en construcción — definida con Carlos el 2026-11-21, en la rama `feature/pagos-tarjeta`. P1, P2 y P3 construidas; funciones desplegadas en Supabase dev el 2026-11-21 y llevadas a `dev` con el PR #94. Falta probar en dev y desplegarlas en producción antes de fusionar a `main`. Se numeró FEAT-64 al crearla; se cambió a FEAT-66 porque FEAT-64 ya era «subir fotos».**

**Contexto.** Carlos notó que las compras de tokens con tarjeta («Mercado Pago Standard» en su actividad) salen rechazadas y las que pasan son con Wallet. Al revisar los dos rechazos en la app de Mercado Pago:

- **20/nov, $100, operación 190712794020 (Visa débito BBVA):** «Tu cliente ingresó uno o más datos de la tarjeta de forma incorrecta». Error del comprador al teclear; dos minutos después pagó con Wallet. No es falla del sitio.
- **7/nov, $75, operación 188452911014 (Visa débito):** «Te protegimos de un pago sospechoso». Lo frenó el antifraude de Mercado Pago.

El sitio sí llega al cobro con tarjeta: no hay falla que lo bloquee. Pero la preferencia que arma `supabase/functions/_shared/preference.ts` manda muy pocos datos: no lleva comprador (`payer`), se quitó a propósito porque con credenciales de prueba Mercado Pago rechaza el checkout si el correo es de una cuenta real. Tampoco lleva el código ni la categoría del producto ni el nombre para el estado de cuenta. Con tan pocos datos, el antifraude tiende a rechazar tarjetas de compradores que no conoce. Además, cuando un pago no se aprueba, el webhook solo anota el estado (`rejected`), no el motivo (`status_detail`), así que hoy hay que ir a la app de Mercado Pago para saber por qué.

Todas las ventas aprobadas que se ven en la actividad de Carlos son con Wallet; no hay una aprobada con tarjeta que sirva de referencia.

**Clasificación:** sin pantallas nuevas. Toca las edge functions de cobro (`create-payment-preference`, `create-seasonal-preference`, `webhook-mercadopago`) y quizá el aviso de privacidad (zona Pública). No toca saldos ni la base. Por tocar cobros, cada historia empieza con la prueba que falla (`tests/`). Estimado: 1 o 2 sesiones.

## Decisiones tomadas con el usuario

1. **Abrirla como feature nueva** (2026-11-21). _(Descartado: hacer primero solo una compra de prueba con tarjeta.)_
2. **Se manda a Mercado Pago el correo y el nombre del comprador, solo en producción** (2026-11-21). En pruebas se siguen sin mandar, porque con credenciales de prueba Mercado Pago rechaza el checkout si el correo es de una cuenta real. Si la cuenta no tiene nombre, va solo el correo. _(Descartados: solo el correo; ningún dato del comprador.)_

3. **Aplica a las dos compras: tokens y loterías temáticas** (2026-11-21). _(Descartado: solo tokens por ahora.)_

4. **Se ajusta el aviso de privacidad** (2026-11-21). Se habló de español e inglés, pero al construir resultó que el aviso existe solo en español: es texto legal y la versión en español es la única que vale (`privacyNoticeContent.ts`), también en el sitio en inglés. La viñeta de Mercado Pago en §5 «Con quién se comparten» queda: «Mercado Pago: procesa los pagos. Para validar tu compra, el sitio le envía tu correo y tu nombre. Los datos de tu tarjeta o de tu medio de pago los capturas directamente con Mercado Pago; el sitio nunca los ve ni los guarda.» _(Descartado: dejarlo como está.)_

5. **Nombre en el estado de cuenta del comprador: «CHORROYBUENAS»** (2026-11-21). _(Descartados: «LOTERIA CHORRO», que algunos bancos podrían cortar; dejar el nombre por defecto de la cuenta de Mercado Pago.)_

**Decisiones técnicas (de quien construye, por confirmar al probar):**

- «Producción» es lo que ya decide `resolveCheckoutMode` en `_shared/checkout.ts`: credenciales que no empiezan con `TEST-` y sin `MP_USE_SANDBOX_CHECKOUT="true"`. Ahí se manda el comprador (`payer.email`, y `payer.first_name`/`payer.last_name` si la cuenta tiene nombre); en `sandbox` no se manda.
- El nombre sale de `profiles.full_name`; se parte en nombre y apellido en el primer espacio. El correo sale de la sesión del usuario, nunca de lo que mande el navegador.
- El producto lleva `id` (el id del paquete, `tokens-libre` en cantidad libre, o el id de la lotería temática) y `category_id: "virtual_goods"`. La preferencia lleva `statement_descriptor: "CHORROYBUENAS"` en los dos modos.
- No cambia el monto, los tokens, la metadata ni cómo se acredita el pago.

## US P1 — Saber por qué Mercado Pago rechazó un pago   ·   Estado: 🟡 construida, por probar en dev

- **Historia** — Como dueño del sitio, quiero que el registro del servidor diga el motivo exacto de cada pago no aprobado, para no tener que buscarlo en la app de Mercado Pago.
- **Entrega demostrable** — Cuando Mercado Pago avisa de un pago no aprobado (de tokens o de lotería temática), el registro de `webhook-mercadopago` muestra estado y motivo, por ejemplo `rejected/cc_rejected_high_risk`.
- **Construido** — 2026-11-21, en la rama `feature/pagos-tarjeta`. `findApprovedPayment` (`_shared/paymentFlow.ts`) devuelve también `detail` con el `status_detail` del pago («-» si no viene); `unapprovedLabel` arma «estado/motivo» y `webhook-mercadopago` lo usa en su log. El estado sigue igual, así que las devoluciones y contracargos no cambian. Las órdenes (`merchant_order`) ya anotaban el motivo. Pruebas en `tests/functions/paymentFlow.test.ts`. Desplegada en Supabase dev el 2026-11-21 (PR #94).
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En dev, compra tokens con una tarjeta de prueba de Mercado Pago a nombre de titular «OTHE» (la que Mercado Pago usa para simular un rechazo) → el cobro sale rechazado → abre los registros de la función `webhook-mercadopago` en Supabase (proyecto dev) → la línea del aviso debería decir `rejected/cc_rejected_other_reason`, no solo `rejected`.
- **Escenarios cubiertos**:
  - [x] Un pago rechazado de tokens anota estado y motivo. (Prueba automática.)
  - [x] Un pago rechazado de lotería temática anota estado y motivo. (Misma consulta que los tokens: el webhook no distingue la compra antes de anotar.)
  - [x] Si Mercado Pago no manda motivo, se anota `-` en su lugar y nada falla. (Prueba automática.)

## US P2 — Mandar a Mercado Pago los datos que pide para aprobar tarjetas   ·   Estado: 🟡 construida, por probar en dev y producción

- **Historia** — Como comprador que paga con tarjeta, quiero que mi pago no se rechace como sospechoso, para comprar tokens o una lotería temática sin tener que usar Wallet.
- **Entrega demostrable** — En producción, la preferencia de las dos compras lleva el correo y el nombre del comprador, el código y la categoría del producto y «CHORROYBUENAS» para el estado de cuenta. En pruebas lleva todo menos el comprador.
- **Construido** — 2026-11-21, en la rama `feature/pagos-tarjeta`. Módulo nuevo `_shared/mpBuyer.ts` (`buildPayer`, `STATEMENT_DESCRIPTOR`, `ITEM_CATEGORY`). `buildPreference` y `buildSeasonalPreference` aceptan `payer` opcional y agregan `id` y `category_id` al producto y `statement_descriptor`. `create-payment-preference` y `create-seasonal-preference` leen `profiles.full_name` solo en producción y pasan el correo de la sesión. Pruebas en `tests/functions/mpBuyer.test.ts`, `preference.test.ts` y `seasonal.test.ts`. Desplegadas en Supabase dev el 2026-11-21 (PR #94).
- **Depende de** — nada (puede ir en paralelo con P1).
- **Cómo se prueba (guion de demo)** — En dev (credenciales de prueba): compra tokens con una tarjeta de prueba → el cobro debería funcionar igual que hoy. En producción, después de publicar: compra $10 de tokens con una tarjeta tuya real desde el celular, sin entrar a tu cuenta de Mercado Pago y con una cuenta del sitio cuyo correo **no** sea el de tu cuenta vendedora de Mercado Pago (Mercado Pago no deja que el vendedor se pague a sí mismo) → el pago debería aprobarse y los tokens llegar → en tu estado de cuenta el cargo debería decir «CHORROYBUENAS» → en tu actividad de Mercado Pago la venta debería mostrar el correo del comprador.
- **Escenarios cubiertos**:
  - [x] En producción, la preferencia de tokens lleva correo y nombre del comprador. (Prueba automática.)
  - [x] En producción, sin nombre en el perfil, lleva solo el correo. (Prueba automática.)
  - [x] En pruebas no lleva comprador. (Prueba automática.)
  - [x] Las dos compras llevan código y categoría del producto y «CHORROYBUENAS». (Prueba automática.)
  - [x] La lotería temática se comporta igual que los tokens en los casos anteriores. (Prueba automática.)
  - [x] Monto, tokens y metadata no cambian. (Pruebas existentes siguen pasando.)

## US P3 — El aviso de privacidad dice qué datos recibe Mercado Pago   ·   Estado: 🟡 construida, por probar en dev

- **Historia** — Como usuario, quiero que el aviso de privacidad diga que mi correo y mi nombre se le envían a Mercado Pago al comprar, para saber qué pasa con mis datos.
- **Entrega demostrable** — La viñeta de Mercado Pago en «5. Con quién se comparten» dice el texto de la decisión 4, y la fecha de última actualización es la del cambio.
- **Construido** — 2026-11-21, en la rama `feature/pagos-tarjeta`. Texto nuevo en `src/components/PrivacyNotice/privacyNoticeContent.ts` y «Última actualización: 21 de noviembre de 2026» (la §9 del propio aviso dice que cada versión lleva su fecha). No hay versión en inglés que cambiar.
- **Depende de** — nada; se publica junto con P2.
- **Cómo se prueba (guion de demo)** — Abre el pie de página → «Aviso de privacidad» → baja a «5. Con quién se comparten» → la viñeta de Mercado Pago debería decir «Para validar tu compra, el sitio le envía tu correo y tu nombre» → arriba debería decir «Última actualización: 21 de noviembre de 2026».
- **Escenarios cubiertos**:
  - [x] Texto nuevo en la viñeta de Mercado Pago. (Revisión.)
  - [x] Fecha de última actualización al día. (Revisión.)
