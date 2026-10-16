# FEAT-44 — Ventas en el panel de administración

**Estado: definida con Carlos el 2026-10-15. Decisiones completas y cambio en `docs/diseno-mockups.md` confirmado y aplicado el 2026-10-15. Se trabaja en `feature/admin-ventas`, creada el 2026-10-15 desde `feature/admin-resumen` (decisión 11). Las cinco historias (A1 a A5) construidas el 2026-10-15, con las migraciones 039 a 041 aplicadas en el Supabase de dev; falta la demo de Carlos y aplicarlas en producción antes de pasar a `main`. Llegan a `dev` todas juntas (FEAT-43 a FEAT-48) con el PR de `feature/admin-tematicas-asistente`, abierto el 2026-10-15.**

**Contexto.** Segunda feature del Admin, después del Resumen (FEAT-43). Hoy las ventas están repartidas en dos pestañas que se enciman: Compras (A1.1) y Transacciones MP (A1.6). Esta feature las junta en una sola pestaña, «Ventas», que reutiliza el selector de periodo del Resumen y trae el detalle de Mercado Pago traducido al español.

**No cambia reglas de negocio.** Todo lo que muestra ya está entre lo que el administrador puede ver (`contexto-negocio.md` §10). Sí cambia el índice de pantallas: ver «Cambio en la base de conocimiento».

## Decisiones tomadas con el usuario

Decisiones de Carlos con Claude (2026-10-15):

1. **Una sola pestaña «Ventas».** Se quitan «Compras» y «Transacciones MP» del menú. Quien llega desde las tarjetas del Resumen (Ingresos, pagos pendientes) aterriza en Ventas con el filtro correspondiente.
2. **Filtros:** el mismo selector de periodo del Resumen (Hoy, Semana, Este mes, Año, Rango; arranca en «Este mes»), buscador por nombre o correo, filtro Tipo (Todas / Tokens / Lotería temática) y botones de estado: Todas, Aprobadas, Pendientes, Rechazadas, Devueltas.
3. **Sin «Proveedor»:** se quitan el filtro y la columna, porque solo se cobra con Mercado Pago.
4. **«Repetido» no se muestra** (aviso duplicado de Mercado Pago): ni en la lista, ni en los filtros, ni en los totales.
5. **Totales arriba, que respetan todos los filtros:** número de ventas, cobrado (solo aprobadas), pendiente de pago (cuántas y cuánto) y tokens vendidos. Se calculan en la base, no sumando filas en el navegador.
6. **Tabla de 5 columnas:** Fecha (con hora), Cliente (nombre y correo), Qué compró (etiqueta «Tokens» en tonos primario o «Temática» en `--color-season` / `--color-season-light`, más el nombre del pack o de la lotería), Monto y Estado. Paginación de 20.
7. **Panel de detalle** al tocar una venta, al lado de la lista (en celular, hoja que sube desde abajo), con:
   - monto y estado;
   - *Cliente:* nombre, correo, qué recibió (p. ej. «25 tokens (20 + 5 de regalo)») y enlace «Ver ficha del cliente», que por ahora lleva a Balances filtrado por su correo (la ficha llega en otra feature);
   - *Pago en Mercado Pago*, en español: método («Tarjeta de débito · Visa», «Efectivo · OXXO», «Transferencia SPEI»), resultado (`status_detail` traducido, p. ej. «Rechazado por fondos insuficientes»), fecha de creación, fecha de aprobación y monto cobrado por Mercado Pago;
   - *«Datos técnicos»* plegado: Payment ID, Payer ID e ID de la compra, cada uno con botón «Copiar». (Cumple lo anotado en FEAT-43, decisión 5.)
8. **«Exportar CSV»** con lo que esté filtrado.
9. **Pastillas de estado**, solo con colores de la paleta: Aprobada en `--color-secondary-light`, Pendiente en `--color-accent-light`, Rechazada con borde y texto `--color-danger`, Devuelta en `--color-bg-tertiary`.

Respuestas de Carlos a lo que Claude encontró al revisar el código (2026-10-15):

10. **Rechazadas y Devueltas se ocultan por ahora.** Una compra de tokens solo queda en la base cuando Mercado Pago la aprueba; un pago de temática rechazado o cancelado se borra (`release_pending_seasonal_purchase`), y los reembolsos no se registran (el estado `refunded` existe pero nada lo escribe). Los botones de estado quedan en Todas, Aprobadas y Pendientes, y el detalle no tendrá resultados de rechazo que mostrar. Guardar rechazos y reembolsos se anota para otra feature, porque toca el cobro. _(Descartados: dejarlos visibles aunque vacíos, porque confunden; guardarlos aquí, porque cambia el cobro y crece esta feature.)_ Por lo mismo, «Pendientes» solo trae temáticas, como en el Resumen (FEAT-43, decisión 8).
11. **La rama sale de `feature/admin-resumen`, no de `dev`.** FEAT-43 todavía no está en `dev` y esta feature reutiliza su selector de periodo y su Resumen. El PR de esta rama a `dev` se abre después del de FEAT-43, para que solo muestre lo de Ventas. _(Descartado: esperar a que FEAT-43 llegue a `dev`, porque detiene el trabajo.)_
12. **Cambio en el índice confirmado** («sí, aplícalo»): ver abajo.
13. **«Ver ficha del cliente» abre Balances con un buscador nuevo**, por nombre o correo, que llega con el correo de la venta ya escrito. Al empezar A3 se encontró que Balances no tiene buscador; Claude lo recomendó y Carlos aprobó agregarlo a A3. _(Descartados: abrir Balances sin filtro, porque hay que buscar a mano; quitar el enlace hasta que exista la ficha.)_

**Maqueta aprobada:** artifact «Admin · Resumen» en claude.ai, artboard «Ventas» (https://claude.ai/artifact/E9zsqje8zdZeAS8TPdDKb9).

## Cambio en la base de conocimiento

Confirmado por Carlos y aplicado el 2026-10-15:

- `docs/diseno-mockups.md`, «Zona Administración»: A1.1 pasa a ser **Ventas**, marcada «por construir (FEAT-44)» (junta Compras y Transacciones MP); A1.6 queda marcada como retirada y unida a A1.1, sin renumerar las demás; el renglón A1 pasa de ocho a siete pestañas y las nombra; A1.0 dice que sus tarjetas llevan a Ventas; la nota de FEAT-17 ya no cuenta el cambio de A1.1 como pendiente. Al construir cada parte se quitan las marcas.
- `docs/diseno-mockups.md`, renglón A1.4: se agregó el buscador de Balances y que «Ver ficha del cliente» la abre con el correo escrito (decisión 13). Propuesto con los cuatro puntos y confirmado por Carlos el 2026-10-15 («si»).

## Notas técnicas

- Lista y totales salen de funciones de administrador en la base, que juntan `token_purchases` y `seasonal_purchases`, con los cortes de día en hora de Hermosillo como el Resumen. La paginación también se hace en la base.
- El selector de periodo y sus cálculos (`src/utils/adminSummary.ts`) se reutilizan; no se copian.
- Los totales son dinero: se empiezan con su prueba en `supabase/tests/`, que primero falla.
- Las traducciones de método y de `status_detail` viven en un solo lugar del código, con prueba; lo que no esté en la tabla se muestra tal cual, sin inventar.
- Colores solo de la paleta (`docs/sistema-diseno.md`).

## User Stories

### US A1 — La pestaña Ventas   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero ver todas las ventas en una sola lista con filtros, para no brincar entre Compras y Transacciones MP.
- **Entrega demostrable** — En el menú del Admin aparece «Ventas» después de Resumen, y ya no están «Compras» ni «Transacciones MP». Ventas abre en «Este mes» con la tabla de 5 columnas, el buscador, el filtro Tipo, los botones de estado (Todas, Aprobadas, Pendientes) y la paginación de 20. Las ventas «Repetido» no aparecen. Las tarjetas del Resumen que llevaban a Compras ahora llevan a Ventas (sin filtro; el filtro llega en A5).
- **Construido** — 2026-10-15, en la rama `feature/admin-ventas`. Se empezó por las pruebas, que fallaron sin el código: `supabase/tests/039_admin_sales.test.sql` (16 aserciones: periodo en hora de Hermosillo y orden, sin las repetidas, lo que trae cada tipo de venta, buscador por nombre y por correo sin importar mayúsculas, tipo, estado, filtros combinados, paginación, conteo con los mismos filtros, estado «repetido», tipo desconocido y periodo al revés rechazados, usuaria normal y visitante rechazados, consulta interna cerrada) y `tests/src/adminSales.test.ts` (10 pruebas: qué compró, estados en español, fecha y hora en Hermosillo, «Mostrando N–M de T»). Código: la migración `supabase/migrations/039_admin_sales.sql` (consulta interna `admin_sales_filtered`, que también usarán los totales de A2, y las funciones `admin_get_sales` y `admin_get_sales_count`; las de la 034 se conservan para el sitio publicado), `src/utils/adminSales.ts`, `AdminRepository.getSales` y `getSalesCount`, el selector de periodo sacado del Resumen a `src/components/AdminPanel/AdminPeriodPicker.tsx` (el Resumen lo usa igual), y la pestaña `AdminSales.tsx` con `AdminSalesTable.tsx`: buscador (espera 300 ms tras la última tecla), Tipo, botones de estado, tabla de 5 columnas, «Mostrando 1–20 de N» con Anterior y Siguiente, cargando, «No hay ventas con estos filtros» y error con «Reintentar»; en celular cada venta es una tarjeta. Los packs no tienen nombre: se muestran como «Pack de N tokens» y los tokens sin pack como «N tokens»; una compra de una cuenta borrada dice «Cuenta borrada». Se borraron `AdminPurchases.tsx` y `AdminMPTransactions.tsx` (con sus consultas en el repositorio); `AdminPurchases.css` se queda porque la tabla de Temáticas lo usa. Las tarjetas del Resumen que llevaban a Compras llevan a Ventas, y el atajo de Pendientes dice «Ver ventas →». Migración 039 aplicada en el Supabase de **dev** el 2026-10-15 por la Management API, dentro de `begin; … commit;`, tras revisar que la base tenía las columnas esperadas y que las funciones no existían (no había nada que respaldar); comprobado que visitantes no pueden llamar las funciones y que nadie puede llamar las internas. Falta aplicarla en producción —con confirmación de Carlos— antes de pasar a `main`.
- **Depende de** — FEAT-43 (en la rama base) y el cambio en el índice, listo el 2026-10-15.
- **Cómo se prueba (guion de demo)** — En dev, entra a Administración → en el menú están Resumen, Ventas y las demás, sin Compras ni Transacciones MP → abre Ventas: dice «Este mes» y lista las ventas del mes, la más nueva arriba → escribe parte de un correo: queda solo esa persona → elige Tipo «Lotería temática»: solo salen temáticas, con su etiqueta morada → toca «Aprobadas»: solo aprobadas → cambia a «Año» y pasa a la página 2.
- **Escenarios cubiertos**:
  - [x] El menú tiene siete pestañas, con Ventas después de Resumen.
  - [x] Abre en «Este mes», con días en hora de Hermosillo.
  - [x] Buscador, Tipo y estado se combinan.
  - [x] «Repetido» no aparece en la lista.
  - [x] Paginación de 20.
  - [x] Las tarjetas del Resumen ya no llevan a una pestaña que no existe.

### US A2 — Totales que respetan los filtros   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero ver arriba cuántas ventas hay, cuánto se cobró, cuánto está pendiente y cuántos tokens se vendieron, según lo que filtré, para no sumar a mano.
- **Entrega demostrable** — Cuatro totales encima de la tabla: ventas, cobrado (solo aprobadas), pendiente de pago (cuántas y cuánto) y tokens vendidos. Cambian al mover cualquier filtro.
- **Construido** — 2026-10-15, en la rama `feature/admin-ventas`. Se empezó por la prueba, que falló sin el código: `supabase/tests/040_admin_sales_totals.test.sql` (10 aserciones: los cuatro totales del periodo en hora de Hermosillo sin las repetidas, con Tipo, con estado, con el buscador, periodo sin ventas en ceros, cobrado igual a los ingresos del Resumen, estado «repetido» y periodo al revés rechazados, usuaria normal y visitante rechazados). Código: la migración `supabase/migrations/040_admin_sales_totals.sql` (función `admin_get_sales_totals`, sobre la misma consulta interna de la lista), `AdminRepository.getSalesTotals` y `src/components/AdminPanel/AdminSalesTotals.tsx`: cuatro recuadros (Ventas, Cobrado, Pendiente de pago con cuántas y cuánto, Tokens vendidos), en dos columnas en pantallas angostas. Cobrado y tokens vendidos solo cuentan lo aprobado; los tokens vendidos incluyen los de regalo, igual que en el Resumen. Los totales se piden aparte de la lista, así que no se vuelven a calcular al cambiar de página, y su número de ventas sirve para paginar: el navegador ya no pide `admin_get_sales_count` (la función se queda en la base, con su prueba). Migración 040 aplicada en el Supabase de **dev** el 2026-10-15, igual que la 039; falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En Ventas con «Este mes», «Cobrado» coincide con Ingresos del Resumen → filtra Tipo «Tokens»: «Cobrado» baja a lo de tokens y «Tokens vendidos» no cambia → busca un correo: los cuatro totales son solo de esa persona.
- **Escenarios cubiertos**:
  - [x] Cobrado cuenta solo aprobadas y coincide con el Resumen.
  - [x] Los totales respetan periodo, buscador, tipo y estado.
  - [x] «Repetido» no suma en ningún total.

### US A3 — Detalle de una venta   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero abrir una venta y ver quién compró, qué recibió y cómo pagó, en español, para resolver dudas sin entrar a Mercado Pago.
- **Entrega demostrable** — Al tocar una venta se abre el panel de detalle al lado de la lista (en celular, hoja desde abajo) con monto y estado, Cliente, Pago en Mercado Pago traducido y «Datos técnicos» plegado con botones «Copiar». «Ver ficha del cliente» abre Balances con su buscador nuevo y el correo ya escrito (decisión 13).
- **Construido** — 2026-10-15, en la rama `feature/admin-ventas`. Se empezó por la prueba de la base, que falló sin el código: `supabase/tests/041_admin_sale_detail.test.sql` (8 aserciones: el pago de una compra de tokens y de una temática pendiente, venta sin datos de Mercado Pago, el tipo tiene que coincidir, no salen correo, identificación ni IP de quien pagó, tipo desconocido, usuaria normal y visitante rechazados). Código: la migración `supabase/migrations/041_admin_sale_detail.sql` (función `admin_get_sale_detail`, que de todo el objeto de pago guardado solo devuelve Payer ID, tipo y método, estado y resultado, fechas de creación y aprobación y monto; una fecha o un monto con formato raro salen vacíos en lugar de romper el detalle), `AdminRepository.getSaleDetail`; `src/utils/mercadoPagoLabels.ts` con las traducciones de método y resultado (10 pruebas en `tests/src/mercadoPagoLabels.test.ts`; lo desconocido se muestra tal cual) y `saleReceived` en `src/utils/adminSales.ts` (5 pruebas nuevas); los componentes `AdminSaleDetail.tsx` y `CopyButton.tsx` («Copiado» o «No se pudo» por dos segundos). Al tocar una venta (el renglón o su flecha) se abre el panel a la derecha de la lista; en pantallas de 1 100 px o menos baja debajo de la lista y en celular es una hoja que sube desde abajo con el fondo oscurecido. Se cierra con la X, con Escape o tocando el fondo. Balances tiene un buscador por nombre o correo (decisión 13) que filtra entre los 200 usuarios que carga, y avisa si se llegó a ese tope. Las compras de dev anteriores a octubre se guardaron con menos datos de Mercado Pago: su método y su Payer ID salen como «—». Migración 041 aplicada en el Supabase de **dev** el 2026-10-15, igual que la 039; falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En Ventas, toca una compra de tokens pagada con tarjeta → el panel dice el método como «Tarjeta de débito · Visa» (o crédito), qué recibió y las fechas → abre «Datos técnicos» y copia el Payment ID → toca «Ver ficha del cliente»: abre Balances con su correo → en celular, el detalle sube desde abajo.
- **Escenarios cubiertos**:
  - [x] Método y resultado en español; lo desconocido se muestra tal cual.
  - [x] «Qué recibió» separa tokens base y de regalo.
  - [x] «Copiar» copia cada ID.
  - [x] En celular es una hoja que sube desde abajo.
  - [x] «Ver ficha del cliente» abre Balances filtrado por su correo, con un buscador que también se usa a mano.

### US A4 — Exportar CSV   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero bajar en CSV lo que tengo filtrado, para llevarlo a una hoja de cálculo.
- **Entrega demostrable** — El botón «Exportar CSV» baja un archivo con todas las ventas filtradas (no solo la página visible).
- **Construido** — 2026-10-15, en la rama `feature/admin-ventas`, sin migraciones. Se empezó por las pruebas, que fallaron sin el código: `tests/src/salesCsv.test.ts` (8 pruebas: marca UTF-8 para los acentos, encabezado, una compra de tokens con fecha y hora de Hermosillo, comas y comillas, cuenta borrada, un nombre que empieza como fórmula no se ejecuta, un renglón por venta, nombre del archivo). Código: `src/utils/salesCsv.ts` (columnas Fecha, Hora, Cliente, Correo, Tipo, Qué compró, Tokens entregados, Monto, Estado, Payment ID e ID de la compra; fecha en AAAA-MM-DD para que la hoja la ordene; archivo `ventas-<desde>-a-<hasta>.csv`), `AdminRepository.getAllSales` (pide de mil en mil, hasta 50 000; si falla una página no baja un archivo incompleto) y el botón «Exportar CSV» junto al filtro Tipo: dice «Preparando…» mientras junta las ventas, está apagado si no hay ventas, y si falla avisa «No se pudo preparar el archivo».
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En Ventas, filtra Tipo «Tokens» y «Este mes» → «Exportar CSV» → abre el archivo en una hoja de cálculo: tiene las mismas ventas que la lista, todas las páginas, y los acentos se ven bien.
- **Escenarios cubiertos**:
  - [x] El archivo trae todas las páginas del filtro.
  - [x] Abre bien en Excel y Google Sheets, con acentos (marca UTF-8; falta que Carlos lo confirme en la demo).

### US A5 — Del Resumen a Ventas con el filtro puesto   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero que al tocar una tarjeta del Resumen se abra Ventas ya filtrada, para ver el detalle de ese número.
- **Entrega demostrable** — Ingresos abre Ventas en Aprobadas con el mismo periodo; Compras de tokens y Loterías temáticas, con su Tipo; los pagos pendientes, en Pendientes.
- **Construido** — 2026-10-15, en la rama `feature/admin-ventas`, sin migraciones. Se empezó por la prueba, que falló sin el código: en `tests/src/adminSales.test.ts`, 3 nuevas sobre `pendingSalesPeriod` (del día del pendiente más viejo, en Hermosillo, a hoy; un pendiente de hoy; sin fecha, el mes en curso). Código: `pendingSalesPeriod` en `src/utils/adminSales.ts`; `AdminSales` recibe un `preset` con periodo, tipo y estado; el Resumen arma ese preset con su periodo y el filtro de cada tarjeta; `AdminPanel` lo guarda al cambiar de pestaña y lo borra al entrar desde el menú. Ingresos y Compraron abren Ventas en «Aprobadas»; Compras de tokens y Loterías temáticas, en «Aprobadas» con su Tipo, para que «Cobrado» coincida con la tarjeta. «Ver ventas →» de Pendientes abre «Pendientes» con un rango desde el día del pago pendiente más viejo hasta hoy, porque el Resumen cuenta todos los pendientes, no solo los del periodo; con el mismo periodo se habrían escondido los viejos.
- **Depende de** — US A1 y A2.
- **Cómo se prueba (guion de demo)** — En Resumen con «Año», toca Ingresos → Ventas abre en «Año» y «Aprobadas», y «Cobrado» coincide con la tarjeta → regresa y toca «Ver ventas →» en Pendientes → Ventas abre en «Pendientes», con un rango desde el día del pago pendiente más viejo, y «Pendiente de pago» coincide con la tarjeta.
- **Escenarios cubiertos**:
  - [x] Cada tarjeta abre Ventas con su filtro y el mismo periodo (Pendientes, con el rango que cubre todos los pendientes).
  - [x] Los totales de Ventas coinciden con la tarjeta de origen.
