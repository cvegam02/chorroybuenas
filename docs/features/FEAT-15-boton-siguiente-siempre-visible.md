# FEAT-15 — El botón «Siguiente: Generar Tableros» siempre visible en Cartas

**Estado: 🟡 construida y probada por Carlos en local («funciona bien», 2026-10-06); falta pasarla a dev**

**Contexto.** En la pantalla de Cartas (C1), el botón «Siguiente: Generar Tableros» solo aparecía cuando ya había el mínimo de cartas del modo elegido. Con menos cartas no se veía, así que no quedaba claro cuál era el paso siguiente. Carlos lo señaló el 2026-10-06.

**Fuera de esta feature.** El mínimo de cartas por modo no cambia, ni el aviso de cuántas faltan, ni la pantalla de Cantidad de tableros (C2).

**Clasificación:** solo interfaz, una pantalla (C1). No toca base de datos, saldos, cobros ni permisos. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-10-06)

1. **El botón se ve siempre; si no hay el mínimo de cartas, aparece deshabilitado.** _(Descartado: lo que había, ocultarlo hasta llegar al mínimo.)_
2. **Se registra como feature suelta**, en la rama `feature/boton-siguiente-cartas`. _(Descartado: agregarla como historia a FEAT-14, que ya está fusionada en dev.)_

**Decidido al construir, por confirmar con Carlos:** deshabilitado, el botón conserva su color y se ve atenuado, igual que los demás botones deshabilitados de esa pantalla; no se agrega ningún texto nuevo, porque la pantalla ya dice cuántas cartas faltan.

## Diseño

**Pantalla C1 (Cartas).** El botón «Siguiente: Generar Tableros» ocupa siempre su lugar: en computadora, en el panel lateral; en teléfono y tableta, debajo de la lista de cartas. Con menos cartas que el mínimo del modo (Clásico o Kids) se ve atenuado y no responde al clic. Al llegar al mínimo se activa solo, y si se borran cartas o se cambia de modo y vuelven a faltar, se desactiva otra vez.

**Lo que se reutiliza.** El mismo botón y el mismo aspecto de deshabilitado que ya usan los otros botones de la pantalla. No hay colores, textos ni componentes nuevos.

**Lo que no cambia.** El índice de pantallas (`diseno-mockups.md` ya dice que C1 tiene «Botón para pasar al paso siguiente») ni las reglas de negocio.

## Grupo A — Botón de paso siguiente

### US A1 — Ver el botón «Siguiente» aunque falten cartas   ·   Estado: 🟡 probada por Carlos en local, falta la demo en dev (2026-10-06)

- **Historia** — Como persona que arma su lotería, quiero ver siempre el botón «Siguiente: Generar Tableros» en la pantalla de Cartas, para saber cuál es el paso siguiente aunque todavía no pueda darlo.
- **Entrega demostrable** — En Cartas, con menos cartas que el mínimo, el botón se ve atenuado y no hace nada; al completar el mínimo se activa y lleva a Cantidad de tableros.
- **Construido** — 2026-10-06, en la rama `feature/boton-siguiente-cartas`. El botón ya no depende del mínimo para dibujarse (en sus dos lugares: panel lateral y debajo de la lista); se deshabilita cuando faltan cartas, con el aspecto atenuado de los demás botones de la pantalla. Sin pruebas automáticas nuevas: no toca dinero ni permisos y el proyecto no tiene pruebas de componentes.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En `dev.chorroybuenas.com.mx` → Crear → Cartas, con una lotería nueva sin cartas → debería verse el botón «Siguiente: Generar Tableros» atenuado → haz clic → no debería pasar nada → sube cartas hasta completar el mínimo que indica la pantalla → el botón debería ponerse en su color normal → haz clic → deberías llegar a Cantidad de tableros. Repite el inicio desde el celular: el botón atenuado debería verse debajo de la lista de cartas.
- **Escenarios cubiertos**:
  - [ ] Sin cartas o con menos del mínimo, el botón se ve atenuado y no avanza. (Demo.)
  - [ ] Al completar el mínimo, el botón se activa y lleva a Cantidad de tableros. (Demo.)
  - [ ] Si se borra una carta y vuelve a faltar, o se cambia de Kids a Clásico sin tener suficientes, el botón se desactiva otra vez. (Demo.)
  - [ ] Se ve en computadora (panel lateral) y en teléfono (debajo de la lista). (Demo.)
