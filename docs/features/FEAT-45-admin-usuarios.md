# FEAT-45 — Usuarios en el panel de administración

**Estado: definida con Carlos el 2026-10-15. Decisiones completas y cambio en `docs/diseno-mockups.md` confirmado y aplicado el 2026-10-15. Se trabaja en `feature/admin-usuarios`, creada el 2026-10-15 desde `feature/admin-ventas` (decisión 11). Las cinco historias (A1 a A5) construidas el 2026-10-15, con las migraciones 042 a 045 aplicadas en el Supabase de dev; falta la demo de Carlos y aplicarlas en producción antes de pasar a `main`. Llegan a `dev` todas juntas (FEAT-43 a FEAT-48) con el PR de `feature/admin-tematicas-asistente`, abierto el 2026-10-15.**

**Contexto.** Tercera feature del Admin, después del Resumen (FEAT-43) y Ventas (FEAT-44). Reemplaza la pestaña Balances (A1.4): hoy carga solo las 200 cuentas con movimiento más reciente, repite tres tarjetas que ya están en el Resumen y no deja ver qué ha hecho una persona. Esta feature la convierte en «Usuarios»: buscador sobre todas las cuentas, ficha de cada usuario con su actividad, y el historial de regalos en su propia sub-pestaña.

**No cambia reglas de negocio.** Todo lo que muestra ya está entre lo que el administrador puede ver (`contexto-negocio.md` §10; caso de uso 22) y el regalo de tokens es el mismo de hoy, con su correo de aviso (fase 3). Sí cambia el índice de pantallas: ver «Cambio en la base de conocimiento».

## Decisiones tomadas con el usuario

Decisiones de Carlos con Claude (2026-10-15):

1. **«Balances» pasa a llamarse «Usuarios»**, con dos sub-pestañas: «Usuarios» y «Regalos de tokens».
2. **Se quitan** las tres tarjetas de arriba (Ingresos totales, Tokens gastados, Costo estimado IA), porque ya viven en el Resumen, y la columna «Última actualización».
3. **Buscador por nombre o correo sobre todas las cuentas**: se quita el tope de 200; la búsqueda se resuelve en la base y se pagina de 20 en 20. Una cuenta sin nombre muestra su correo.
4. **Ordenar por:** Más recientes (al abrir), Última actividad, Más compraron, Mayor saldo.
5. **Filtros rápidos:** Todos, Nuevos este mes, Han comprado, Nunca han comprado.
6. **Tabla:** Usuario (inicial, nombre y correo), Se registró, Saldo, Ha comprado (total pagado en compras aprobadas, tokens y temáticas) y Última actividad (lo más reciente entre compra, uso de IA, regalo o registro).
7. **Ficha del usuario** al tocarlo, al lado de la lista (en celular, hoja que sube desde abajo), con:
   - nombre, correo, fecha de alta y si entró con Google o con correo;
   - saldo actual y botón «Regalar tokens», que abre ahí mismo el formulario de hoy (cantidad y motivo opcional) y avisa que le llegará un correo;
   - cuatro datos: ha pagado (y cuántas compras), imágenes con IA (tokens gastados), loterías guardadas (y temáticas compradas) y tokens regalados por administradores;
   - «Actividad»: línea de tiempo de lo más reciente a lo más antiguo con compras (incluidas pendientes y rechazadas), compras de temáticas, regalos (con motivo), registro (ver decisión 12) y uso de IA **agrupado por lotería y día** («Transformó 12 fotos con IA · lotería X»), no foto por foto;
   - enlace «Ver sus compras en Ventas», que abre Ventas filtrado por su correo.
8. **«Ver ficha del cliente»** en el detalle de Ventas (FEAT-44) abre esta ficha, en lugar de Balances con el correo escrito.
9. **Sub-pestaña «Regalos de tokens»:** el historial general de regalos de hoy (Fecha, Para con nombre y correo, Tokens, Motivo, Regaló), con tres totales arriba para el periodo: tokens regalados, a cuántos usuarios y valor a precio de lista (tokens × precio por token vigente).
10. **Solo colores de la paleta.** Íconos de la actividad: compra en tonos primario, regalo en `--color-secondary-light`, IA y temáticas en `--color-season` / `--color-season-light`, registro en `--color-bg-tertiary`.

**Maqueta aprobada:** artifact «Admin · Resumen» en claude.ai, artboard «Usuarios» (https://claude.ai/artifact/E9zsqje8zdZeAS8TPdDKb9).

Respuestas de Carlos a lo que Claude encontró al revisar código y base (2026-10-15):

11. **La rama sale de `feature/admin-ventas`, no de `dev`.** FEAT-43 y FEAT-44 todavía no están en `dev` y esta feature usa Ventas y el selector de periodo. El PR de esta rama a `dev` se abre después de los de FEAT-43 y FEAT-44. _(Descartados: salir de `dev`, porque A4 y A5 no se podrían hacer; esperar a que 43 y 44 lleguen a `dev`, porque detiene el trabajo.)_
12. **El registro en la actividad dice «Creó su cuenta», sin cantidad.** Los tokens de bienvenida se suman al saldo sin anotar cuántos fueron. _(Descartados: mostrar la cantidad de hoy de `app_config`, porque puede no ser la que recibió; empezar a guardarla, porque toca el alta y los saldos.)_ Esto ajusta la decisión 7.
13. **«Ver sus compras en Ventas» abre Ventas con un rango desde el alta del usuario hasta hoy**, para que salgan todas sus compras. _(Descartados: «Año» y «Este mes», porque esconden compras viejas.)_
14. **Cambio en el índice confirmado** («Sí, aplícalo»): ver abajo.

## Cambio en la base de conocimiento

Propuesto con los cuatro puntos, confirmado por Carlos y aplicado el 2026-10-15:

- `docs/diseno-mockups.md`, «Zona Administración»: renglón A1 (la pestaña se llama Usuarios), A1.1 («Ver ficha del cliente» abre la ficha) y A1.4 (Usuarios con sus dos sub-pestañas, buscador, ficha y Regalos de tokens), marcados «por construir (FEAT-45)». Al construir cada parte se quitan las marcas.

## Notas técnicas

- Revisado en la base de dev el 2026-10-15: `profiles` no tiene fecha de alta; la fecha y el proveedor (`raw_app_meta_data->>'provider'`: `google` o `email`) salen de `auth.users`, que las funciones de administrador ya leen (migración 036). `token_usage.set_id` dice en qué lotería se usó la IA (si la lotería se borró queda vacío: «lotería borrada»). `token_gifts` guarda motivo y quién regaló.
- Lista, conteo, ficha y actividad salen de funciones de administrador nuevas (`is_admin()`, `security definer`, sin acceso para visitantes), con la paginación y la búsqueda en la base. Nada de `auth.users` se expone fuera de esas funciones.
- Saldos, totales pagados y regalos son dinero: se empiezan con su prueba en `supabase/tests/`, que primero falla.
- El regalo usa la función y el repositorio de hoy (`admin_gift_tokens`, `AdminRepository.giftTokens`), que ya pide el correo de aviso (fase 3).
- El selector de periodo (`AdminPeriodPicker`) se reutiliza en Regalos de tokens; no se copia.
- Colores solo de la paleta (`docs/sistema-diseno.md`).

## User Stories

### US A1 — La pestaña Usuarios   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero buscar entre todas las cuentas y ordenarlas, para encontrar a cualquier usuario sin depender de un tope de 200.
- **Entrega demostrable** — En el menú del Admin, «Balances» ya se llama «Usuarios» y abre en la sub-pestaña «Usuarios»: buscador por nombre o correo, «Ordenar por», filtros rápidos, tabla de 5 columnas y paginación de 20, sin las tres tarjetas ni la columna «Última actualización». La sub-pestaña «Regalos de tokens» muestra el historial de hoy tal cual (sus totales llegan en A4). Mientras no exista la ficha (A2), cada renglón conserva su botón «Regalar».
- **Construido** — 2026-10-15, en la rama `feature/admin-usuarios`. Se empezó por las pruebas, que fallaron sin el código: `supabase/tests/042_admin_users.test.sql` (22 aserciones: todas las cuentas por fecha de alta, lo pagado solo en compras aprobadas de tokens y temáticas, cuenta sin nombre, la última actividad entre compra, IA, regalo y registro sin contar los avisos repetidos, buscador por nombre y por correo sin importar mayúsculas ni espacios, los tres filtros rápidos con «nuevos este mes» en hora de Hermosillo, los tres órdenes, filtros combinados, conteo, más de 200 cuentas encontradas y paginadas, filtro y orden desconocidos rechazados, usuaria normal y visitante rechazados, consulta interna cerrada) y `tests/src/adminUsers.test.ts` (7 pruebas: nombre o correo, inicial, fecha de alta, «Hoy» / «Ayer» / fecha en Hermosillo, pesos sin centavos cerrados, renglón de cuentas). Código: la migración `supabase/migrations/042_admin_users.sql` (consulta interna `admin_users_filtered` sobre `auth.users`, y las funciones `admin_get_users` y `admin_get_users_count`; las de Balances se conservan para el sitio publicado), `src/utils/adminUsers.ts`, `AdminRepository.getUsers` y `getUsersCount`, y la pestaña `AdminUsers.tsx` con sus dos sub-pestañas: `AdminUsersList.tsx` y `AdminUsersTable.tsx` (buscador que espera 300 ms tras la última tecla, «Ordenar», filtros rápidos, tabla de 5 columnas más el botón «Regalar», «Mostrando 1–20 de N» con Anterior y Siguiente, cargando, «Nadie coincide con…», error con «Reintentar»; en celular cada usuario es una tarjeta) y `AdminTokenGifts.tsx` (el historial con las columnas de la decisión 9). Bajo el título, «N cuentas · M nuevas este mes», como en la maqueta. El formulario de regalo pasó a `AdminGiftForm.tsx`, con el aviso del correo, para que la ficha (A2) lo reutilice; mientras, se abre en una ventana desde cada renglón y se cierra con Escape. «Usuarios nuevos» y «Ver regalos» del Resumen y «Ver ficha del cliente» de Ventas llevan a Usuarios (el último, con el correo en el buscador, hasta A5). Se borraron `AdminBalances.tsx` y `.css`, y las consultas que solo usaban sus tarjetas (`getPurchasesSummary`, `getTokenUsageSummary`, `getBalancesWithUserInfo`, `getAllUserBalances` y `src/utils/adminRevenue.ts` con su prueba). Migración 042 aplicada en el Supabase de **dev** el 2026-10-15 por la Management API, dentro de `begin; … commit;`, tras revisar que la base tenía las columnas esperadas y que las funciones no existían (no había nada que respaldar); comprobado que visitantes no pueden llamar las funciones y que nadie puede llamar las internas. Falta aplicarla en producción —con confirmación de Carlos— antes de pasar a `main`.
- **Depende de** — FEAT-44 (en la rama base) y el cambio en el índice, listo el 2026-10-15.
- **Cómo se prueba (guion de demo)** — En dev, entra a Administración → en el menú dice «Usuarios», no «Balances» → arriba no hay tarjetas de ingresos ni de IA → la lista empieza por la cuenta más nueva → escribe parte de un correo: queda solo esa persona, aunque sea una cuenta vieja → borra el buscador, toca «Han comprado»: solo quien ha pagado algo, con su total en «Ha comprado» → ordena por «Mayor saldo» → pasa a la página 2 → abre «Regalos de tokens»: está el historial de siempre.
- **Escenarios cubiertos**:
  - [x] El buscador encuentra cuentas fuera de las 200 más recientes.
  - [x] Búsqueda sin importar mayúsculas, por nombre o por correo.
  - [x] Cada orden y cada filtro rápido, y combinados con el buscador.
  - [x] Cuenta sin nombre muestra su correo.
  - [x] «Ha comprado» solo suma compras aprobadas (tokens y temáticas).
  - [x] Paginación de 20 con el total correcto.
  - [x] Usuaria normal y visitante no pueden llamar las funciones.

### US A2 — La ficha del usuario   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero abrir la ficha de un usuario con su saldo y sus números, para entender su situación y regalarle tokens desde ahí.
- **Entrega demostrable** — Al tocar un usuario se abre su ficha al lado de la lista (en celular, hoja desde abajo): nombre, correo, fecha de alta y si entró con Google o con correo; saldo y «Regalar tokens» con el formulario de hoy y el aviso del correo; los cuatro datos. Al regalar, el saldo y los tokens regalados de la ficha y de la lista se actualizan. El botón «Regalar» sale de los renglones.
- **Construido** — 2026-10-15, en la rama `feature/admin-usuarios`. Se empezó por la prueba de la base, que falló sin el código: `supabase/tests/043_admin_user_detail.test.sql` (10 aserciones: correo, nombre, alta, cómo entró y saldo; lo pagado solo en compras aprobadas y cuántas son, sin pendientes ni repetidas; tokens gastados en IA, loterías guardadas, temáticas compradas y tokens regalados; cuenta nueva sin nombre en ceros; cuenta que no existe; regalar con `admin_gift_tokens` cambia saldo y regalados en la ficha y queda en el historial con su motivo limpio y quién regaló; cero tokens rechazado; usuaria normal y visitante rechazados). Código: la migración `supabase/migrations/043_admin_user_detail.sql` (función `admin_get_user_detail`; el proveedor sale de `auth.users`), `AdminRepository.getUserDetail`, `providerLabel`, `purchasesLabel` y `seasonalLabel` en `src/utils/adminUsers.ts` (4 pruebas nuevas en `tests/src/adminUsers.test.ts`) y `src/components/AdminPanel/AdminUserDetail.tsx`. Al tocar un usuario (el renglón o su flecha) se abre la ficha a la derecha de la lista, con el renglón marcado; en pantallas de 1 100 px o menos baja debajo de la lista y en celular es una hoja que sube desde abajo con el fondo oscurecido (el mismo panel del detalle de Ventas). Se cierra con la X, con Escape o tocando el fondo. «Regalar tokens» abre ahí mismo el formulario de A1 (`AdminGiftForm`); al regalar se cierra, la ficha se vuelve a pedir y la lista se recarga. Se quitaron de la lista el botón «Regalar» de cada renglón y su ventana. Si la ficha no carga: «No se pudo cargar la ficha» con «Reintentar». Migración 043 aplicada en el Supabase de **dev** el 2026-10-15, igual que la 042; falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En Usuarios, toca a alguien que haya comprado → la ficha dice cómo entró, cuánto ha pagado y en cuántas compras, cuántas imágenes con IA, sus loterías y temáticas → toca «Regalar tokens», pon 5 y un motivo → el saldo sube 5 en la ficha y en la lista, y «Tokens regalados» también → en celular la ficha sube desde abajo.
- **Escenarios cubiertos**:
  - [x] Los cuatro datos coinciden con la base (prueba en `supabase/tests/`, que primero falla).
  - [x] Regalar desde la ficha cambia el saldo y queda en el historial con su motivo.
  - [x] Cantidad inválida no regala.
  - [x] Usuaria normal y visitante no pueden pedir la ficha.

### US A3 — La actividad del usuario   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero ver en orden lo que ha hecho un usuario, para responderle con datos si me pregunta por un pago, un regalo o sus tokens.
- **Entrega demostrable** — En la ficha, «Actividad» lista de lo más reciente a lo más antiguo: compras de tokens (incluidas pendientes y rechazadas que haya), compras de temáticas, regalos con motivo, el registro, y el uso de IA juntado por lotería y día («Transformó 12 fotos con IA · lotería X»). Cada tipo con su ícono y color (decisión 10).
- **Construido** — 2026-10-15, en la rama `feature/admin-usuarios`. Se empezó por las pruebas, que fallaron sin el código: `supabase/tests/044_admin_user_activity.test.sql` (11 aserciones: todos los movimientos en orden; la IA agrupada por lotería y día en hora de Hermosillo, con la hora del último uso y el nombre de la lotería; lotería borrada sin nombre; compra de tokens con estado, pack, tokens, monto y método de pago; temáticas pendientes y aprobadas sin el aviso repetido; regalo con motivo; cuenta sin movimientos solo con su registro; tope de movimientos; cuenta que no existe; usuaria normal y visitante rechazados) y `tests/src/userActivity.test.ts` (6 pruebas, una por tipo de renglón). Código: la migración `supabase/migrations/044_admin_user_activity.sql` (función `admin_get_user_activity`; del objeto de pago solo saca el método, como el detalle de Ventas), `AdminRepository.getUserActivity`, `src/utils/userActivity.ts` (cómo se lee cada renglón; `activityDay` nuevo en `adminUsers.ts`) y `src/components/AdminPanel/AdminUserActivity.tsx`, debajo de los cuatro datos de la ficha. Renglones: «Compró Pack de 20 tokens · Hoy, 10:42 · Tarjeta de débito · Visa · +25»; una compra sin confirmar dice «Inició pago de…» con «pendiente» y no suma tokens; «Compró Muertos · 5 oct 2026 · $100»; «Recibió un regalo · «motivo» · +15»; «Transformó 12 fotos con IA · Ayer · lotería «Cumple de Sofi» · −12» (o «lotería borrada»); «Creó su cuenta» con su fecha, sin tokens de bienvenida (decisión 12). Íconos con los colores de la decisión 10. Trae los 200 movimientos más recientes y lo avisa si llega a ese tope; al regalar se vuelve a pedir; si falla, «No se pudo cargar la actividad» con «Reintentar». Migración 044 aplicada en el Supabase de **dev** el 2026-10-15, igual que la 042; falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — US A2.
- **Cómo se prueba (guion de demo)** — Abre la ficha de alguien que haya usado la IA varias veces el mismo día → ve un solo renglón por lotería y día con el total de fotos → más abajo, sus compras y regalos con fecha → al final, «Creó su cuenta» con su fecha.
- **Escenarios cubiertos**:
  - [x] Uso de IA agrupado por lotería y día (en hora de Hermosillo).
  - [x] Lotería borrada se muestra como tal.
  - [x] Orden de lo más reciente a lo más antiguo entre tipos distintos.

### US A4 — Regalos de tokens con sus totales   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero saber cuántos tokens regalé en un periodo y cuánto valen, para controlar lo que regalo.
- **Entrega demostrable** — La sub-pestaña «Regalos de tokens» tiene el selector de periodo del Resumen (al abrir, «Este mes») y tres totales: tokens regalados, a cuántos usuarios y valor a precio de lista; abajo, el historial del periodo (Fecha, Para con nombre y correo, Tokens, Motivo, Regaló). El atajo «tokens regalados» de Pendientes en el Resumen abre esta sub-pestaña con su periodo.
- **Construido** — 2026-10-15, en la rama `feature/admin-usuarios`. Se empezó por la prueba de la base, que falló sin el código: `supabase/tests/045_admin_gifts_period.test.sql` (10 aserciones: regalos del periodo en hora de Hermosillo, el más nuevo primero; motivo, quién regaló y para quién; paginación; los totales —regalos, tokens, a cuántos usuarios y valor a precio de lista—; periodo sin regalos en ceros; los tokens coinciden con los del Resumen; sin precio guardado el valor viene vacío; periodo al revés, usuaria normal y visitante rechazados). Código: la migración `supabase/migrations/045_admin_gifts_period.sql` (funciones `admin_get_gifts` y `admin_get_gifts_totals`; `admin_get_token_gifts` se conserva para el sitio publicado), `AdminRepository.getGifts` y `getGiftsTotals` (se quitó `getTokenGifts`, que ya nadie usaba) y `AdminTokenGifts.tsx` reescrita: selector de periodo del Resumen (al abrir, «Este mes»), tres recuadros (Tokens regalados, A cuántos usuarios, Valor a precio de lista; si no hay precio por token guardado dice «Sin precio por token»), el historial del periodo de 20 en 20 con «Mostrando 1–20 de N», «No se regalaron tokens en este periodo» y error con «Reintentar». «Ver regalos» en Pendientes del Resumen abre Usuarios en esta sub-pestaña con el periodo que tenía el Resumen. Migración 045 aplicada en el Supabase de **dev** el 2026-10-15, igual que la 042 (precio por token en dev: $2); falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En Usuarios → «Regalos de tokens» → dice «Este mes» con sus tres totales → cambia a «Año»: los totales y la lista crecen → en el Resumen, toca el atajo de tokens regalados: llega aquí.
- **Escenarios cubiertos**:
  - [x] Totales del periodo en hora de Hermosillo (prueba en `supabase/tests/`, que primero falla).
  - [x] Valor = tokens × precio por token vigente.
  - [x] Periodo sin regalos en ceros.

### US A5 — Enlaces entre Usuarios y Ventas   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero pasar de una venta a la ficha del cliente y de la ficha a sus compras, sin buscar a mano.
- **Entrega demostrable** — En el detalle de una venta, «Ver ficha del cliente» abre Usuarios con su ficha abierta. En la ficha, «Ver sus compras en Ventas» abre Ventas filtrado por su correo.
- **Construido** — 2026-10-15, en la rama `feature/admin-usuarios`. Sin migración. Prueba primero: `signupSalesPeriod` en `src/utils/adminUsers.ts` (2 pruebas nuevas en `tests/src/adminUsers.test.ts`: del día de alta en Hermosillo hasta hoy, y una cuenta de hoy). «Ver ficha del cliente» en el detalle de una venta abre Usuarios con su correo en el buscador y su ficha ya abierta; solo aparece si la venta tiene cuenta (una cuenta borrada no lo ofrece). La ficha ahora se abre con el id del usuario, aunque no esté en la página visible de la lista: el encabezado sale de la ficha y, mientras carga, de su renglón si está a la vista. Al final de la ficha, «Ver sus compras en Ventas →» abre Ventas con su correo escrito y un rango desde su alta hasta hoy (decisión 13); Ventas acepta ahora un correo en sus filtros de entrada. Archivos: `AdminUserDetail.tsx`, `AdminUsersList.tsx`, `AdminUsers.tsx`, `AdminSales.tsx`, `AdminSaleDetail.tsx` y `AdminPanel.tsx`.
- **Depende de** — US A2.
- **Cómo se prueba (guion de demo)** — En Ventas, toca una venta → «Ver ficha del cliente»: abre su ficha en Usuarios → toca «Ver sus compras en Ventas»: vuelve a Ventas solo con sus compras.
- **Escenarios cubiertos**:
  - [x] Venta de una cuenta borrada no ofrece la ficha.
  - [x] Ventas llega con el correo escrito y el rango desde su alta hasta hoy (decisión 13).
