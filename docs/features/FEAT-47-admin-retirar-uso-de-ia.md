# FEAT-47 — Retirar Uso de IA del panel de administración

**Estado: definida con Carlos el 2026-10-15. Decisiones completas; cambios en `docs/contexto-negocio.md` §10 y `docs/diseno-mockups.md` confirmados y aplicados el 2026-10-15. Se trabaja en `feature/admin-retirar-uso-de-ia`, creada el 2026-10-15 desde `feature/admin-precios-y-promos` (decisión 6). Las dos historias (A1 y A2) construidas el 2026-10-15, con las migraciones 049 y 050 aplicadas en el Supabase de dev; falta la demo de Carlos y aplicarlas en producción antes de pasar a `main`.**

**Contexto.** Quinta feature del Admin, después del Resumen (FEAT-43), Ventas (FEAT-44), Usuarios (FEAT-45) y Precios y promos (FEAT-46). Quita la pestaña Uso de IA (A1.5) y mueve lo único útil que tenía: el costo por imagen con que se estima el gasto en IA, que ahora se guarda en la base y se edita en Precios y promos. El gasto del periodo ya está en el Resumen y el uso de cada usuario, en su ficha (FEAT-45). Con esto el menú queda en cinco pestañas: Resumen, Ventas, Usuarios, Precios y promos y Temáticas.

**Cambia una regla de negocio:** `contexto-negocio.md` §10 (ver «Cambio en la base de conocimiento»). Hallazgo (revisado con Carlos el 2026-10-15): el gasto de IA se calcula con `AIService.COST_PER_IMAGE = 0.013` USD, con el comentario «OpenAI GPT-Image-1.5 Low», pero el sitio llama a Replicate con GPT-Image y `quality: 'low'` (`supabase/functions/_shared/transform.ts`), y Replicate cobra US$0.012 por imagen en calidad low (medium US$0.047, high y auto US$0.128).

## Decisiones tomadas con el usuario

Decisiones de Carlos con Claude (2026-10-15):

1. **Se retira la pestaña Uso de IA** del menú y se borra su código (`AdminTokenUsage.tsx` y `.css`) junto con las funciones del repositorio y las RPCs que solo ella usaba. Los datos de `token_usage` **no** se tocan. Antes de borrar cada función se revisa con grep qué más la usa; una migración que retire RPCs solo retira las que nadie más usa. _(Descartado: rediseñar la pestaña con tarjetas, gráfica, tops y detalle, porque con un margen cercano al 85 % por imagen esos datos no cambian ninguna decisión.)_
2. **Costo de IA por imagen en la base**, no en el código: arranca en 0.012 USD y solo un administrador lo cambia.
3. **Se edita en una tercera tarjeta de «Lo básico» en Precios y promos (FEAT-46): «Costo de IA por imagen»**, con campo en US$, su equivalente en pesos con el tipo de cambio actual (`TokenPricingRepository.getExchangeRateMxnUsd`) y el texto «Lo que te cobra Replicate por cada imagen (GPT-Image, calidad low). El Resumen usa este valor para calcular el gasto en IA.» Sin ventana de confirmación.
4. **El Resumen (FEAT-43) y cualquier otro cálculo de gasto de IA leen ese valor;** se elimina `AIService.COST_PER_IMAGE` y su comentario incorrecto.
5. **El uso de IA por usuario queda en su ficha de Usuarios (FEAT-45),** agrupado por lotería y día. La tarjeta «Gasto en IA» del Resumen deja de llevar a Uso de IA: queda sin enlace.

Respuestas de Carlos a lo que Claude encontró al revisar código y base (2026-10-15):

6. **El rediseño de Uso de IA que ya estaba hecho se descarta y FEAT-47 pasa a ser esta feature; la rama sale de `feature/admin-precios-y-promos`, no de `dev`.** Ese rediseño (rama `feature/admin-uso-de-ia`, commit `7b037e4`, sin subir) se quedó local hasta que Carlos pidió borrarla, el 2026-10-15; nunca se subió. De él se reutiliza lo que esta feature necesita: la migración 049 (costo por imagen en la base) y el campo para editarlo. Sus funciones de las migraciones 050 a 053 ya estaban aplicadas en el Supabase de dev: se quitaron de ahí el 2026-10-15 (`admin_get_ai_usage_period`, `admin_get_ai_free_images`, `admin_get_ai_top_users`, `admin_get_ai_top_lotteries` y `admin_get_ai_usage_detail`, en una transacción, tras listarlas); nunca llegan a producción. Quedan en dev la tabla y las dos funciones de la 049, que esta feature reutiliza. La rama sale de FEAT-46 porque la tarjeta va en «Lo básico» y el Resumen (FEAT-43) todavía no está en `dev`; su PR a `dev` se abre después del de FEAT-46. _(Descartados: conservar el rediseño; llamar a esta feature FEAT-48; salir de `dev`.)_
7. **«Usaron la IA» del Resumen también queda sin enlace,** como «Gasto en IA». _(Descartado: llevar a Usuarios, porque su lista no tiene un filtro «usaron la IA».)_ Completa la decisión 5.

**Maqueta aprobada:** artifact «Admin · Resumen» en claude.ai, artboard «Precios y promos», tarjeta «Costo de IA por imagen» (https://claude.ai/artifact/E9zsqje8zdZeAS8TPdDKb9).

## Preguntas abiertas (se resuelven antes de la historia que las necesita)

1. _(Resuelta: decisión 7.)_

## Cambio en la base de conocimiento

Propuesto con los cuatro puntos, confirmado por Carlos («sí») y aplicado el 2026-10-15:

- `docs/contexto-negocio.md` §10: «ver el uso de la IA (por día, por usuario y por lotería) y su costo estimado» pasa a «ver el gasto en IA del periodo (Resumen) y el uso de cada usuario (su ficha), y ajustar el costo por imagen que se usa para estimarlo».
- `docs/diseno-mockups.md`, «Zona Administración»: A1 (menú de cinco pestañas), A1.0 (las tarjetas de IA del Resumen sin enlace), A1.2 («Lo básico» con la tarjeta «Costo de IA por imagen») y A1.5 (retirada), marcados «por construir (FEAT-47)». Al construir cada parte se quitan las marcas.

## Notas técnicas

- Revisado con grep el 2026-10-15. La pestaña usa seis RPCs a través de `AdminRepository`: `admin_get_token_usage_with_users` y `admin_get_token_usage_count` (migración 017), y `admin_get_usage_summary`, `admin_get_usage_by_day`, `admin_get_usage_by_user` y `admin_get_usage_by_set` (018; `admin_get_usage_by_day` se rehízo en 035). Fuera de la pestaña nadie las llama: ni otras pantallas, ni las edge functions, ni otras funciones de la base. Solo `supabase/tests/035_admin_dashboard_summary.test.sql` revisa `admin_get_usage_by_day` (que Uso de IA cuente los días en hora de Hermosillo); esa aserción sale con la función.
- `AIService.COST_PER_IMAGE` lo usan la pestaña, `AdminSummarySections.tsx` y `AdminSummaryChart.tsx` (Resumen) y `AIService.getEstimation` (`totalCost`; el editor de cartas solo usa de ahí los segundos estimados).
- `app_config` lo puede leer cualquiera (migración 020). El costo por imagen dice cuánto deja cada venta, así que se guarda donde solo un administrador lo lee y lo cambia (migración 049, del rediseño descartado; ya aplicada en el Supabase de dev el 2026-10-15).
- En el Resumen, «Gasto en IA» y «Usaron la IA» llevan a la pestaña (`open('uso-ia')`), y `SummaryTargetTab` incluye `'uso-ia'`.
- Costo por imagen y permisos son dinero: A1 se empieza con su prueba en `supabase/tests/`, que primero falla.
- Colores solo de la paleta (`docs/sistema-diseno.md`).

## User Stories

### US A1 — Costo de IA por imagen en la base, editable en Precios y promos   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero ajustar el costo por imagen de IA en Precios y promos, para que el gasto en IA del Resumen siga siendo correcto si Replicate cambia su precio.
- **Entrega demostrable** — En Precios y promos, «Lo básico» tiene una tercera tarjeta, «Costo de IA por imagen»: campo en US$ con 0.012, su equivalente en pesos y el texto de la decisión 3. Se cambia y se guarda sin confirmación, y el gasto en IA del Resumen se recalcula con el valor nuevo. En el código ya no hay un costo fijo.
- **Construido** — 2026-10-15, en la rama `feature/admin-retirar-uso-de-ia`. Se empezó por las pruebas, que fallaron sin el código: `supabase/tests/049_admin_ai_cost.test.sql` (13 aserciones: arranca en 0.012; el administrador lo cambia y se lee el nuevo; cero, negativo y vacío rechazados; usuaria normal no lo ve ni lo cambia, ni por las funciones ni directo en la tabla; visitante sin permiso; tras los intentos sigue el del administrador) y 4 pruebas nuevas en `tests/src/adminPricing.test.ts` (leer «0.012», «0,047», «$0.128» con hasta seis decimales y rechazar vacío, cero, negativos, texto y más decimales; equivalente en pesos con el tipo de cambio y sin él; lo que muestra el campo). La migración y su prueba vienen del rediseño descartado (decisión 6), con los comentarios ajustados. Código: la migración `supabase/migrations/049_admin_ai_cost_per_image.sql` (tabla de una sola fila `ai_cost_settings`, sin reglas de acceso, con 0.012; funciones `admin_get_ai_cost_per_image` y `admin_set_ai_cost_per_image`, solo administradores, costo mayor que cero), `AdminRepository.getAiCostPerImage` / `setAiCostPerImage`, `parseAiCostInput`, `aiCostDraft` y `aiCostPesosLabel` en `src/utils/adminPricing.ts`, y `AdminAiCostCard.tsx`, tercera tarjeta de «Lo básico» (`AdminPricingBasics.tsx`), como en la maqueta: «Costo de IA por imagen», «US$ ___» con «≈ $0.22 MXN» al lado (sigue a lo que se escribe), Guardar (apagado si no cambió; «Guardado.» o el error ahí mismo, sin confirmación) y el texto de la decisión 3. Carga sola el costo y el tipo de cambio; si no puede leer el costo, lo dice en la tarjeta. El Resumen (`AdminSummary.tsx`, `AdminSummarySections.tsx`, `AdminSummaryChart.tsx`) lee el costo guardado; si no puede, muestra «No se pudo cargar el resumen» con Reintentar. Se borró `AIService.COST_PER_IMAGE` con su comentario y el `totalCost` de `getEstimation`, que nadie usaba. Mientras A2 la retira, la pestaña Uso de IA también lee el costo guardado. Typecheck, lint, las 1156 pruebas y las 448 aserciones de base pasan. La migración 049 ya estaba aplicada en el Supabase de **dev** desde el 2026-10-15 (decisión 6; el archivo solo cambió en comentarios). Falta en producción —con confirmación de Carlos— antes de pasar a `main`.
- **Depende de** — Decisión 6 y el cambio en la base de conocimiento, listos el 2026-10-15.
- **Cómo se prueba (guion de demo)** — En dev, entra a Administración → Precios y promos → en «Lo básico», la tarjeta «Costo de IA por imagen» dice US$ 0.012 y su equivalente en pesos → abre Resumen y anota «Gasto en IA» → regresa, cambia el costo a 0.024 y guarda → dice «Guardado.» y el equivalente en pesos cambia → en el Resumen el gasto en IA se duplicó → regresa el costo a 0.012.
- **Escenarios cubiertos**:
  - [x] Arranca en 0.012 USD.
  - [x] Solo un administrador lo lee y lo cambia; usuarios normales y visitantes, no.
  - [x] Cero, negativo o vacío se rechazan.
  - [x] Equivalente en pesos con el tipo de cambio actual.
  - [x] El Resumen calcula el gasto con el valor guardado.
  - [x] No queda ningún costo por imagen fijo en el código.

### US A2 — Retirar la pestaña Uso de IA   ·   Estado: construida, falta la demo

- **Historia** — Como administrador, quiero un menú sin la pestaña Uso de IA, para no revisar números que no cambian ninguna decisión.
- **Entrega demostrable** — El menú tiene cinco pestañas: Resumen, Ventas, Usuarios, Precios y promos y Temáticas. Las tarjetas de IA del Resumen ya no llevan a Uso de IA. El código de la pestaña, sus funciones del repositorio y sus seis RPCs ya no existen; los datos de `token_usage` siguen intactos y la ficha de cada usuario sigue mostrando su uso.
- **Construido** — 2026-10-15, en la rama `feature/admin-retirar-uso-de-ia`. Se empezó por la prueba, que falló sin el código: `supabase/tests/050_retire_admin_usage_tab.test.sql` (5 aserciones: ya no existen las seis RPCs, ni en otra versión; `token_usage` sigue; el Resumen conserva `admin_get_dashboard_summary` y `admin_get_dashboard_daily`, y la ficha `admin_get_user_activity`). Código: la migración `supabase/migrations/050_retire_admin_usage_tab.sql` (retira `admin_get_token_usage_with_users`, `admin_get_token_usage_count`, `admin_get_usage_summary`, `admin_get_usage_by_day`, `admin_get_usage_by_user` y `admin_get_usage_by_set`, con sus parámetros exactos; no toca datos). Se borraron `AdminTokenUsage.tsx` y `.css`; del menú (`AdminPanel.tsx`) salió «Uso de IA» con su ícono; en el Resumen (`AdminSummarySections.tsx`) «Gasto en IA» y «Usaron la IA» ya no llevan a ninguna pestaña (decisiones 5 y 7) y `SummaryTargetTab` ya no tiene `'uso-ia'`; de `AdminRepository` salieron las seis funciones que llamaban a esas RPCs, los tipos `AdminTokenUsage` y `AdminTokenUsageWithInfo` y el filtro de fechas `usageDateParams`; de `src/utils/adminSummary.ts`, `hermosilloDayRange`, que solo servía a ese filtro (con sus 2 pruebas); de `AdminPanel.css`, la tarjeta `admin-stat-card`, que solo usaba la pestaña. Revisado con grep antes de borrar cada pieza que nada más la usa. De `supabase/tests/035_admin_dashboard_summary.test.sql` salió la aserción sobre `admin_get_usage_by_day`, que probaba la pestaña. Typecheck, lint, las 1154 pruebas y las 452 aserciones de base pasan. Migración 050 aplicada en el Supabase de **dev** el 2026-10-15, dentro de `begin; … commit;`, tras listar ahí las seis funciones (las mismas firmas, sin otras versiones; su código queda en las migraciones 017, 018 y 035 como respaldo); comprobado después que no queda ninguna, que `token_usage` sigue con sus 84 renglones y que el Resumen y la ficha conservan sus funciones. Falta en producción, con confirmación de Carlos, antes de pasar a `main`.
- **Depende de** — A1 y la decisión 7.
- **Cómo se prueba (guion de demo)** — En dev, entra a Administración → el menú tiene cinco pestañas, sin Uso de IA → en el Resumen, «Gasto en IA» ya no es un enlace → abre Usuarios → la ficha de alguien que usó la IA sigue mostrando «Transformó N fotos con IA» por lotería y día.
- **Escenarios cubiertos**:
  - [x] Menú de cinco pestañas.
  - [x] El Resumen no lleva a Uso de IA.
  - [x] Se borran `AdminTokenUsage.tsx` y `.css`, las funciones del repositorio y las seis RPCs que solo usaba la pestaña.
  - [x] Los datos de `token_usage` no se tocan.
  - [x] La ficha de Usuarios sigue mostrando el uso de IA.
