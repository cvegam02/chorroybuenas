# FEAT-07 — Promociones

**Prioridad:** Alta · **Findings:** H4, M2 · **Plan:** Tasks 6, 9, 10 y 13

**Objetivo:** que los códigos promocionales entreguen el bono que prometen, no puedan abusarse y no sean visibles para quien no los conoce.

**Contexto:** la preferencia aplica el código a cualquier compra y lo muestra en el cobro, pero al acreditar el bono se anula si no es la primera compra. Además, cualquiera puede listar todos los códigos con la anon key, porque la policy de `promotions` es `using (true)` y la página de compra los descarga para compararlos en el navegador.

---

## CYB-701 — El bono por código se acredita en cualquier compra

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** En revisión — implementado y probado dentro de FEAT-03 y FEAT-06 (`promotions.ts`, `credit.ts`, `preference.ts`); falta probar en dev
- **Finding:** H4
- **Plan:** Task 6 (`promotions.ts`, `credit.ts`), Tasks 9 y 10
- **Depende de:** CYB-201, CYB-301

### Descripción

Como comprador con un código promocional, quiero recibir el bono que veo al pagar, aunque no sea mi primera compra.

### Criterios de aceptación

- [x] Un código válido tiene prioridad sobre la promoción de primera compra.
- [x] El bono por código se acredita sin importar cuántas compras tenga el usuario.
- [x] La preferencia guarda en su metadata el id y el tipo de promoción aplicada (`code` o `first_purchase`).
- [x] El bono de primera compra se sigue revalidando al acreditar.
- [x] Una preferencia creada antes de este cambio (sin tipo de promoción) se trata como primera compra, igual que hoy.
- [x] El bono es el porcentaje sobre los tokens base, redondeado hacia abajo.
- [x] La compra registra el id de la promoción usada en `promotion_ids`.

### Escenarios

**Escenario 1: código en segunda compra**
- Dado un usuario con una compra previa y el código `VERANO` del 15 %
- Cuando compra 20 tokens con ese código
- Entonces se le acreditan 20 + 3 de bono

**Escenario 2: código y primera compra a la vez**
- Dado un usuario sin compras, primera compra al 20 % y código `VERANO` al 15 %
- Cuando compra con el código
- Entonces se aplica el 15 % del código, no ambos

**Escenario 3: código inválido en primera compra**
- Dado un usuario sin compras
- Cuando compra con el código `NOEXISTE`
- Entonces se aplica la promoción de primera compra

**Escenario 4: código inválido en segunda compra**
- Dado un usuario con compras
- Cuando compra con `NOEXISTE`
- Entonces la compra procede sin bono de promoción

**Escenario 5: preferencia anterior al deploy**
- Dado una preferencia creada antes del cambio, con bono y sin tipo de promoción
- Cuando se paga después del deploy y el usuario ya tenía compras
- Entonces el bono no se acredita (comportamiento anterior)

**Escenario 6: redondeo**
- Dado un código del 15 %
- Cuando se compran 10 tokens
- Entonces el bono es 1 token

---

## CYB-702 — Un código por usuario, una sola vez

- **Tipo:** Historia
- **Prioridad:** Alta
- **Estado:** En revisión — implementado y probado en servidor (`selectPromotion`) y en la validación de la página (`check_promo_code`); falta probar en dev
- **Finding:** H4
- **Plan:** Task 6 (`selectPromotion`), Task 9, Task 13 (`check_promo_code`)
- **Depende de:** CYB-701
- **Decisión de negocio a confirmar:** un uso por usuario por código

### Descripción

Como dueño del negocio, quiero que cada usuario pueda usar un código una sola vez, para que una promoción no se convierta en un descuento permanente.

### Criterios de aceptación

- [x] Al crear la preferencia se consultan las promociones ya usadas por el usuario.
- [x] Un código que el usuario ya usó no aplica bono.
- [x] Si el código ya usado coincide con una primera compra, se evalúa la promoción de primera compra.
- [x] La página de compra deja de mostrar "código aplicado" para un código ya usado.
- [x] Usuarios distintos pueden usar el mismo código.

### Escenarios

**Escenario 1: reutilizar un código**
- Dado un usuario que ya compró con `VERANO`
- Cuando intenta comprar otra vez con `VERANO`
- Entonces la página no muestra el código como aplicado y la compra no lleva bono

**Escenario 2: otro usuario usa el mismo código**
- Dado que el usuario A ya usó `VERANO`
- Cuando el usuario B compra con `VERANO`
- Entonces B recibe el bono

**Escenario 3: preferencia creada pero no pagada**
- Dado un usuario que abrió el checkout con `VERANO` y no pagó
- Cuando vuelve a intentar con `VERANO`
- Entonces el código sigue disponible

**Escenario 4: dos checkouts con el mismo código, ambos pagados**
- Dado un usuario que abre dos checkouts con `VERANO` antes de pagar
- Cuando paga los dos
- Entonces ambos acreditan el bono (limitación conocida: el uso se registra al pagar)

---

## CYB-703 — Los códigos no son visibles públicamente

- **Tipo:** Bug de seguridad
- **Prioridad:** Media
- **Estado:** En revisión — implementado y probado (migración 025); falta comprobar en dev que el panel de Admin sigue gestionando promociones
- **Finding:** M2
- **Plan:** Task 13 (migración 025)
- **Depende de:** CYB-204

### Descripción

Como dueño del negocio, quiero que solo quien conoce un código pueda usarlo, para que no se puedan listar todos mis códigos (incluidos los inactivos o futuros) con la clave pública.

### Criterios de aceptación

- [x] La tabla `promotions` solo es legible por administradores.
- [x] Existe una función pública que devuelve únicamente el porcentaje de primera compra vigente y si hay códigos activos, sin exponer ninguno.
- [x] Las edge functions leen promociones con service role.
- [ ] El panel de Admin sigue pudiendo listar, crear, editar y borrar promociones.

### Escenarios

**Escenario 1: listado anónimo**
- Dado la anon key del proyecto
- Cuando se consulta `GET /rest/v1/promotions?select=*`
- Entonces la respuesta es `[]`

**Escenario 2: listado como usuario normal**
- Dado un usuario autenticado que no es admin
- Cuando consulta la tabla `promotions`
- Entonces no recibe filas

**Escenario 3: resumen público**
- Dado un visitante sin sesión
- Cuando la página de compra pide el resumen de promociones
- Entonces recibe el porcentaje de primera compra y `has_code_promos`, sin códigos

**Escenario 4: admin gestiona promociones**
- Dado un administrador
- Cuando abre la pestaña Promociones
- Entonces ve todas las promociones y puede editarlas

---

## CYB-704 — Validar el código en el servidor desde la página de compra

- **Tipo:** Historia
- **Prioridad:** Media
- **Estado:** En revisión — implementado (`usePromoCode`, `check_promo_code`); la parte SQL está probada, la de la página no se ha probado en el navegador
- **Finding:** M2
- **Plan:** Task 13 (`check_promo_code`, `TokenPricingRepository`, `BuyTokensPage`)
- **Depende de:** CYB-703

### Descripción

Como comprador, quiero saber si mi código es válido mientras lo escribo, para ver cuántos tokens recibiré antes de pagar.

### Criterios de aceptación

- [x] La página valida el código contra el servidor, con una espera de 400 ms tras dejar de escribir.
- [x] La validación no distingue mayúsculas ni espacios al inicio o final.
- [x] Devuelve 0 para códigos inexistentes, inactivos, vencidos, aún no vigentes o ya usados por el usuario.
- [x] El campo de código solo aparece si hay sesión y existen códigos activos.
- [x] Los totales de cada pack se actualizan con el bono cuando el código es válido.
- [x] La validación solo está disponible para usuarios autenticados.
- [x] La respuesta de una validación anterior no pisa la de un código escrito después.

### Escenarios

**Escenario 1: código válido**
- Dado un usuario con sesión
- Cuando escribe `verano`
- Entonces ve "✓ código aplicado (15 %)" y los packs muestran el bono

**Escenario 2: código inexistente**
- Cuando escribe `NOPE`
- Entonces no aparece el indicador y los totales no cambian

**Escenario 3: código vencido**
- Dado un código cuya vigencia terminó ayer
- Cuando el usuario lo escribe
- Entonces no se aplica

**Escenario 4: el usuario borra el código**
- Dado un código aplicado
- Cuando vacía el campo
- Entonces los totales vuelven a los valores sin bono

**Escenario 5: escritura rápida**
- Dado que el usuario escribe `VER`, luego `VERANO` en menos de 400 ms
- Cuando termina de escribir
- Entonces solo se valida `VERANO`

**Escenario 6: no hay códigos activos**
- Dado que no existe ninguna promoción de tipo código vigente
- Cuando un usuario abre la página de compra
- Entonces el campo de código no se muestra

**Escenario 7: visitante sin sesión**
- Dado un visitante sin sesión
- Cuando intenta llamar la validación directamente
- Entonces recibe un error de permisos
