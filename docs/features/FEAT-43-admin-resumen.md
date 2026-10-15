# FEAT-43 — Resumen del panel de administración

**Estado: definida con Carlos el 2026-10-14 y 2026-10-15. Decisiones completas y cambio en `docs/diseno-mockups.md` confirmado y aplicado el 2026-10-15 (A1.0 en el índice). Se trabaja en `feature/admin-resumen`, creada desde `dev` el 2026-10-15. Las cinco historias (A1 a A5) construidas el 2026-10-15, con las migraciones 035 a 038 aplicadas en el Supabase de dev; falta la demo de Carlos y aplicarlas en producción antes de pasar a `main`.**

**Contexto.** Carlos pidió el 2026-10-14 mejorar el panel de administración y quitar información que no ayuda. Al revisarlo, Claude encontró que para saber «cómo vamos» hay que juntar números de tres pestañas: los ingresos están en Balances, el gasto de IA en Uso de IA y las ventas en Compras, y nunca se comparan entre sí. Esta feature es la primera de varias para el Admin; las demás (reacomodo de pestañas, limpieza de columnas, ficha de usuario, rediseño visual) se definen después, una por una.

**Qué quiere ver Carlos al entrar.** «Cómo va la cosa»: cuántas personas nuevas se han registrado, cuánto se ha gastado en IA, cuánto se ha ganado, cuántas ventas de loterías ha habido, y todo lo que ayude a ver cómo vamos.

**No cambia reglas de negocio.** Todo lo que muestra ya está entre lo que el administrador puede ver (`contexto-negocio.md` §10). Sí agrega una pantalla al índice: ver «Cambio en la base de conocimiento».

## Decisiones tomadas con el usuario

Respuestas de Carlos (2026-10-14):

1. **El Resumen es la primera pantalla del Admin.** Al entrar a `/admin` se abre el Resumen, no Compras.
2. **Contenido aprobado («me gusta todo eso»):**
   - *Dinero:* ingresos (separados en tokens y loterías temáticas), gasto en IA en pesos, y ganancia = ingresos − gasto en IA.
   - *Gente:* usuarios nuevos, cuántos compraron (y cuántos por primera vez), cuántos usaron la IA.
   - *Ventas:* compras de tokens (cuántas y cuántos tokens), loterías temáticas vendidas (cuántas, cuánto dinero, la más vendida) y el pack más vendido.
   - *Tendencia:* gráfica de ingresos contra gasto en IA por día.
   - *Pendientes:* pagos pendientes de confirmar en Mercado Pago y tokens regalados en el periodo.
   - Cada tarjeta muestra cuánto subió o bajó contra el periodo anterior y lleva a la pestaña con el detalle.
3. **Periodo al abrir: este mes** (del día 1 a hoy), comparado contra el mismo tramo del mes pasado, con un selector para cambiar a hoy, semana, mes, año o un rango de fechas. Claude lo recomendó y Carlos aprobó la propuesta completa. _(Descartados: últimos 30 días, porque es menos natural para pensar en ventas y la factura de la IA es mensual; desde siempre, porque no dice si se va mejor o peor.)_
4. **La ganancia no descuenta la comisión de Mercado Pago**, porque hoy no se guarda. Se dice en letra chica bajo la tarjeta.

Anotado para una feature posterior del Admin (no se construye aquí):

5. **Los IDs de Mercado Pago** (Payment ID, Payer ID) se conservan, pero dentro del detalle de cada compra, no como columna. Carlos no los ha usado, pero pueden servir.
- **Guardar los pagos pendientes de tokens** desde que se inician, para que también cuenten en Pendientes (anotado el 2026-10-15, decisión 8).

Respuestas de Carlos (2026-10-15):

6. **«Hoy» y «este mes» se cuentan en hora de Hermosillo** (`America/Hermosillo`, UTC−7 todo el año): el día termina a la medianoche de Carlos. Como la pestaña Uso de IA corta hoy los días en UTC (a las 5 de la tarde de Hermosillo), también se pasa a hora de Hermosillo, para que sus números coincidan con el Resumen; va dentro de la US A1. _(Descartados: hora del centro de México, porque el día terminaría a las 11 de la noche de Carlos; dejar UTC, porque «hoy» cambiaría a las 5 de la tarde y las ventas de la noche caerían en el día siguiente.)_
7. **Cambio en el índice confirmado** («sí, cámbialos»): ver abajo.
8. **«Pagos pendientes» cuenta solo lo que el sitio guarda.** Al construir A5 se encontró que un pago de tokens en efectivo no queda en la base hasta que Mercado Pago lo confirma; solo los de loterías temáticas se guardan mientras esperan. Se cuentan esos, con una nota en el bloque, y el guion de A5 se hace con una temática. Claude lo recomendó y Carlos aprobó. _(Descartados: guardar también los pendientes de tokens, porque cambia el cobro y crece esta feature; preguntarle en vivo a Mercado Pago, porque necesita otra función del servidor con su clave.)_

**Maqueta aprobada por Carlos el 2026-10-15** («está excelente»): artifact «Admin · Resumen» en claude.ai (https://claude.ai/artifact/E9zsqje8zdZeAS8TPdDKb9). Orden de arriba a abajo: encabezado con el selector de periodo → Dinero (Ingresos, Gasto en IA, Ganancia resaltada) → Gente → Ventas (incluye «Lo más vendido») → gráfica → Pendientes. La pastilla «subió» usa el turquesa de la paleta (`--color-secondary-light`); «bajó» usa `--color-danger`.

## Cambio en la base de conocimiento

Confirmado por Carlos y aplicado el 2026-10-15:

- `docs/diseno-mockups.md`, «Zona Administración»: se agregó **A1.0 — Resumen** como primera pestaña y pantalla de entrada del panel, marcada «por construir (FEAT-43)» y actualizada al construir cada historia; el renglón A1 pasa a ocho pestañas (decía «seis; serán siete», aunque ya eran siete); A1.5 anota que sus días pasarán a hora de Hermosillo. Al construir cada parte se quitan las marcas.

## Notas técnicas

- Los números se calculan en la base con una sola función de administrador que reciba el periodo, no en el navegador. Hoy `getPurchasesSummary` baja hasta 10 000 filas para sumar en el navegador; el Resumen no repite eso.
- Los usuarios nuevos salen de la fecha de alta de la cuenta: `profiles` no tiene fecha de creación, así que la función la lee de `auth.users` (con `security definer` y comprobando que quien llama es administrador).
- El gasto de IA usa el mismo costo por imagen y el mismo tipo de cambio que la pestaña Uso de IA, para que los dos números coincidan.
- Zona horaria: los cortes de día y de mes se hacen con `at time zone 'America/Hermosillo'`. Uso de IA hoy agrupa con `at time zone 'UTC'` (`supabase/migrations/018_admin_usage_stats.sql`); se cambia en una migración nueva.
- Es dinero: la función se empieza con su prueba en `supabase/tests/`, que primero falla.
- Colores solo de la paleta (`docs/sistema-diseno.md`).

## User Stories

### US A1 — El Resumen con el dinero del mes   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero ver al entrar cuánto ingresó, cuánto gasté en IA y cuánto gané este mes, para saber cómo va el negocio sin brincar entre pestañas.
- **Entrega demostrable** — Al abrir `/admin` sale la pestaña Resumen con el periodo «Este mes» y tres tarjetas: Ingresos (con tokens y temáticas por separado), Gasto en IA y Ganancia (con la nota de la comisión). El selector cambia el periodo y los números se actualizan. Uso de IA cuenta los días en hora de Hermosillo.
- **Construido** — 2026-10-15, en la rama `feature/admin-resumen`. Se empezó por las pruebas, que fallaron sin el código: `supabase/tests/035_admin_dashboard_summary.test.sql` (8 aserciones: solo lo aprobado, tokens y temáticas por separado, cortes de día en Hermosillo, periodo vacío en ceros, periodo inválido, Uso de IA por día en Hermosillo, usuaria normal y visitante rechazados) y `tests/src/adminSummary.test.ts` (21 pruebas: hoy en Hermosillo, los cuatro periodos, rango a mano, filtro de Uso de IA, ingresos, gasto en IA y ganancia). Código: la migración `supabase/migrations/035_admin_dashboard_summary.sql` (función `admin_get_dashboard_summary` y `admin_get_usage_by_day` con días de Hermosillo), `src/utils/adminSummary.ts`, `AdminRepository.getDashboardSummary` y el filtro de fechas de Uso de IA en hora de Hermosillo, la pestaña `src/components/AdminPanel/AdminSummary.tsx` (selector de periodo y las tres tarjetas de Dinero; cargando, error con «Reintentar») y `AdminPanel.tsx`, que ahora abre en Resumen. El gasto en IA se calcula en el panel con el mismo costo por imagen y tipo de cambio que Uso de IA. Migración 035 aplicada en el Supabase de **dev** el 2026-10-15 por la Management API, dentro de `begin; … commit;`, tras revisar que la base tenía las columnas esperadas y respaldar la definición anterior de `admin_get_usage_by_day`; comprobado que la función nueva no se concede a visitantes y que rechaza a quien no es administrador. Falta aplicarla en producción —con confirmación de Carlos— antes de pasar a `main`.
- **Depende de** — Nada (decisiones y cambio en el índice listos el 2026-10-15).
- **Cómo se prueba (guion de demo)** — En dev, entra a Administración → abre en Resumen, con «Este mes» elegido → compara Ingresos con la suma de las compras aprobadas del mes en Compras: coinciden → compara Gasto en IA con Uso de IA filtrado al mes: coincide → cambia a «Año»: los tres números crecen o se mantienen → elige un rango sin ventas: Ingresos en $0.
- **Escenarios cubiertos**:
  - [x] El Admin abre en Resumen con «Este mes».
  - [x] Ingresos cuenta solo compras aprobadas, separadas en tokens y temáticas.
  - [x] Gasto en IA coincide con la pestaña Uso de IA para el mismo periodo.
  - [x] Ganancia = ingresos − gasto en IA, con la nota de la comisión.
  - [x] Una compra hecha a las 11 de la noche de Hermosillo cuenta para ese día, en Resumen y en Uso de IA.
  - [x] Un usuario que no es administrador no puede pedir estos números.

### US A2 — Gente y ventas   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero ver cuántas personas nuevas llegaron, cuántas compraron y qué se vendió, para saber si el sitio está creciendo.
- **Entrega demostrable** — Debajo del dinero, tarjetas de Usuarios nuevos, Compraron (con «N por primera vez»), Usaron la IA, Compras de tokens (cuántas y cuántos tokens), Loterías temáticas vendidas (cuántas y cuánto dinero) y lo más vendido (pack y lotería temática).
- **Construido** — 2026-10-15, en la rama `feature/admin-resumen`. Se empezó por la prueba, que falló sin el código: `supabase/tests/036_admin_dashboard_people_sales.test.sql` (8 aserciones: usuarios nuevos con corte en Hermosillo, compraron y por primera vez, personas que usaron la IA, ventas de tokens y de temáticas por separado, lo más vendido, periodo sin ventas, usuaria normal rechazada). Código: la migración `supabase/migrations/036_admin_dashboard_people_sales.sql`, que amplía `admin_get_dashboard_summary` (la borra y la crea de nuevo porque cambia lo que devuelve; los usuarios nuevos salen de `auth.users`), `AdminRepository.getDashboardSummary` y las secciones Gente y Ventas en `AdminSummary.tsx`. Los packs no tienen nombre en la base: «lo más vendido» los muestra como «Pack de N tokens», por sus tokens base. Una compra de una cuenta borrada cuenta como venta pero no como persona. Migración 036 aplicada en el Supabase de **dev** el 2026-10-15, igual que la 035; falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En dev, crea una cuenta nueva → en Resumen, Usuarios nuevos sube en 1 → compra un pack con esa cuenta → Compraron y «por primera vez» suben en 1, y Compras de tokens también → compra una lotería temática → Loterías temáticas vendidas sube en 1 y aparece como la más vendida si es la única.
- **Escenarios cubiertos**:
  - [x] Usuarios nuevos cuenta las cuentas creadas en el periodo.
  - [x] «Por primera vez» solo cuenta a quien no había comprado antes del periodo.
  - [x] Ventas de tokens y de temáticas se cuentan por separado.
  - [x] Si no hay ventas, «lo más vendido» dice que no hay datos en lugar de quedar vacío.

### US A3 — Comparación con el periodo anterior y atajos   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero saber si voy mejor o peor que antes y poder ir al detalle de un número, para entenderlo sin buscar.
- **Entrega demostrable** — Cada tarjeta muestra «↑ / ↓ N % vs. periodo anterior» (o «sin datos previos») y al tocarla abre la pestaña correspondiente: Ingresos → Compras, Gasto en IA → Uso de IA, Usuarios → Balances.
- **Construido** — 2026-10-15, en la rama `feature/admin-resumen`, sin migraciones (la misma función se pide dos veces, para el periodo y para el anterior). Se empezó por las pruebas, que fallaron sin el código: en `tests/src/adminSummary.test.ts`, 15 nuevas sobre el periodo anterior (ayer; los mismos días de la semana pasada; el mismo tramo del mes o del año pasado, terminando en el último día si ese mes es más corto; para un rango, los mismos días justo antes) y el porcentaje (entero; sin porcentaje si el periodo anterior está en cero o negativo). Código: `previousPeriod` y `percentChange` en `src/utils/adminSummary.ts`; las tarjetas pasaron a `src/components/AdminPanel/AdminSummarySections.tsx`, con la pastilla «↑ / ↓ N %» (turquesa al subir, roja al bajar) o «sin datos previos»; el encabezado dice con qué periodo se compara. Atajos: Ingresos, Compraron, Compras de tokens y Loterías temáticas → Compras; Gasto en IA y Usaron la IA → Uso de IA; Usuarios nuevos → Balances. Ganancia y Lo más vendido no llevan a ninguna pestaña, porque no hay una con ese detalle. El cambio del gasto en IA se mide en imágenes, que es lo mismo que en pesos con el mismo tipo de cambio.
- **Depende de** — US A2.
- **Cómo se prueba (guion de demo)** — En Resumen con «Este mes», mira Ingresos: dice cuánto cambió contra el mes pasado → cambia a un rango sin datos anteriores: dice «sin datos previos» → toca Gasto en IA: se abre Uso de IA.
- **Escenarios cubiertos**:
  - [x] El porcentaje compara contra el mismo tramo del periodo anterior.
  - [x] Sin datos previos no se muestra un porcentaje engañoso.
  - [x] Cada tarjeta lleva a su pestaña.

### US A4 — Gráfica de ingresos contra gasto en IA   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero ver día por día lo que entra y lo que gasto en IA, para notar si la IA se está comiendo la ganancia.
- **Entrega demostrable** — Una gráfica con dos series por día del periodo elegido: ingresos y gasto en IA, en pesos. En celular se puede recorrer de lado.
- **Construido** — 2026-10-15, en la rama `feature/admin-resumen`. Se empezó por las pruebas, que fallaron sin el código: `supabase/tests/037_admin_dashboard_daily.test.sql` (7 aserciones: un renglón por día con los días en cero, solo lo aprobado, días de Hermosillo, sumas iguales a las del Resumen, periodo al revés o de más de 367 días rechazado, usuaria normal y visitante rechazados) y, en `tests/src/adminSummary.test.ts`, 6 nuevas sobre la serie en pesos (el gasto en IA con el mismo cálculo que las tarjetas; la suma de los días igual a Ingresos) y los días de un periodo. Código: la migración `supabase/migrations/037_admin_dashboard_daily.sql` (función `admin_get_dashboard_daily`, con un tope de 367 días para no generar series sin fin), `AdminRepository.getDashboardDaily`, `dailyMoney` y `periodDays` en `src/utils/adminSummary.ts`, y `src/components/AdminPanel/AdminSummaryChart.tsx`: barras por día (ingresos en el naranja de la paleta, gasto en IA en su morado; los dos colores pasan la revisión para daltonismo), leyenda, recuadro al pasar el dedo o el ratón con la fecha y los dos montos, desplazamiento de lado cuando no cabe y «Ver los números por día» con la tabla. Con un rango de más de 367 días la gráfica pide un periodo más corto. Migración 037 aplicada en el Supabase de **dev** el 2026-10-15; falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En Resumen con «Este mes», la gráfica tiene un punto por día hasta hoy → pasa el dedo o el ratón sobre un día con una compra: muestra el monto de ese día → la suma de los días coincide con la tarjeta de Ingresos.
- **Escenarios cubiertos**:
  - [x] Un punto por día del periodo, incluidos los días en cero.
  - [x] Las sumas coinciden con las tarjetas.
  - [x] Se lee en celular.

### US A5 — Pendientes   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero ver lo que requiere mi atención, para que no se me pase un pago o un regalo.
- **Entrega demostrable** — Un bloque «Pendientes» con los pagos pendientes de confirmar en Mercado Pago (cuántos y desde cuándo el más viejo; solo los de loterías temáticas, decisión 8) y los tokens regalados en el periodo; cada uno lleva a su pestaña.
- **Construido** — 2026-10-15, en la rama `feature/admin-resumen`. Se empezó por las pruebas, que fallaron sin el código: `supabase/tests/038_admin_dashboard_pending.test.sql` (6 aserciones: todos los pendientes aunque sean de antes del periodo y el más viejo, tokens regalados y a cuántas personas con días de Hermosillo, todo en cero, periodo al revés, usuaria normal y visitante rechazados) y, en `tests/src/adminSummary.test.ts`, 3 sobre la antigüedad del más viejo. Código: la migración `supabase/migrations/038_admin_dashboard_pending.sql` (función `admin_get_dashboard_pending`, aparte de la del Resumen porque los pendientes no dependen del periodo), `AdminRepository.getDashboardPending`, `waitingSince` en `src/utils/adminSummary.ts` y `src/components/AdminPanel/AdminSummaryPending.tsx`: pagos pendientes con «Ver compras →», tokens regalados con «Ver regalos →» (abre Balances, donde está el historial de regalos), o «Todo en orden». Migración 038 aplicada en el Supabase de **dev** el 2026-10-15; falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — En dev, inicia la compra de una lotería temática con pago en efectivo sin pagarla → en Resumen, Pendientes muestra 1 pago pendiente → regala 3 tokens a un usuario → Pendientes muestra 3 tokens regalados → sin pendientes, el bloque dice «Todo en orden».
- **Escenarios cubiertos**:
  - [x] Cuenta los pagos que siguen pendientes.
  - [x] Suma los tokens regalados en el periodo.
  - [x] Sin pendientes dice «Todo en orden».
