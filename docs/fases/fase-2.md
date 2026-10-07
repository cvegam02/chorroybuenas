# Fase 2 — Registro de regalos de tokens

**Estado: ✅ completa en dev (2026-10-06); falta producción** — A1 hecha y probada por Carlos en `dev`. Las tres historias (A1, A2, A3) están hechas, probadas por Carlos y en `dev`. **Falta para producción:** aplicar la migración 026 en la base de producción y pasar `dev` a `main`, las dos con confirmación de Carlos. Nada de esta fase está en producción.

**Contexto.** Un administrador puede regalar tokens a cualquier usuario, pero hasta hoy el regalo solo subía el saldo: no quedaba rastro de quién lo dio, a quién ni cuándo (`contexto-negocio.md` §17). Esta fase guarda cada regalo y lo muestra a quien corresponde. La fase 3 (correos) se apoya en este registro.

**Fuera de esta fase.** Los reembolsos, que venían en la fase 2 original: Carlos los apartó el 2026-10-06 (`plan-fases.md`, «Apartado»). Los correos son la fase 3.

**Clasificación:** toca la base de datos (una tabla nueva y tres funciones; migración 026), dos pantallas (A1.4 Balances y la ventana M11 de historial en Mi cuenta) y los textos en español e inglés de M11. Es un cambio de saldos y permisos: pruebas primero. Estimado: 2 sesiones.

## Decisiones tomadas con el usuario (2026-10-06)

1. **El motivo del regalo es opcional.** El administrador puede escribirlo o dejarlo vacío. _(Descartadas: motivo obligatorio; no guardar motivo.)_
2. **El usuario ve sus regalos, sin el motivo ni quién se los dio.** Ve la cantidad y la fecha. _(Descartadas: historial solo para administradores; que el usuario vea también el motivo.)_
3. **El usuario los ve dentro de su historial de compras,** mezclados por fecha, como una fila marcada "Regalo" y sin precio. _(Descartada: una lista aparte de "tokens regalados".)_
4. **En el panel, una lista general** en la pestaña Balances: todos los regalos, del más reciente al más antiguo, con fecha, quién regaló, a quién, cuánto y motivo. _(Descartadas: historial por usuario; las dos vistas.)_
5. **Los reembolsos se apartan** de esta fase, sin fecha.
6. **Se agrega la historia A3:** el número de "tokens recibidos" de Mi cuenta cuenta también los regalos. Surgió al construir A2; Carlos pidió hacerla en esta fase. _(Descartada: dejarlo como estaba, sumando solo bienvenida y compras.)_

**Decidido al construir, por confirmar con Carlos:** el motivo admite hasta 200 caracteres, y la lista del panel muestra los 200 regalos más recientes (el mismo tope que ya tiene la lista de saldos). Son límites técnicos, no reglas de negocio; se pueden cambiar.

## Diseño

**Qué se guarda.** Por cada regalo: quién lo recibe, qué administrador lo dio, cuántos tokens, el motivo (o vacío) y la fecha. Se guarda en el mismo paso en que sube el saldo: no puede haber regalo sin registro ni registro sin regalo.

**Quién puede ver qué.** Nadie lee ni escribe el registro directamente desde el navegador. El administrador pide la lista general; el usuario pide solo los suyos y recibe únicamente cantidad y fecha. Un visitante no puede pedir nada.

**Lo que no cambia.** Regalar sigue exigiendo ser administrador y una cantidad mayor que 0. No hay tope de cantidad.

**Regalos anteriores.** No se pueden recuperar. El historial empieza cuando la migración se aplica en cada entorno.

**Si se borra una cuenta.** Los regalos que recibió se borran con ella; los que dio como administrador se conservan, sin nombre de quien regaló.

**Pantalla A1.4 (Balances).**
- En la ventana de regalar, bajo la cantidad, un campo "Motivo (opcional)".
- Debajo de la tabla de saldos, una sección "Historial de regalos" con las columnas Fecha, Regaló, Para, Tokens y Motivo. Se actualiza al regalar.
- Vacío: "Todavía no se ha regalado ningún token." Error al cargar: "No se pudo cargar el historial de regalos."

**Ventana M11 (historial en Mi cuenta).** Las compras y los regalos en una sola lista por fecha. La fila de un regalo dice "Regalo" donde las compras dicen el plan, muestra los tokens, y deja sin precio, sin método y sin estado. El título de la ventana y su texto de vacío dejan de hablar solo de compras.

---

## Grupo A — Regalos

### US A1 — Cada regalo queda registrado y el administrador lo consulta   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como administrador, quiero que cada regalo de tokens quede guardado con su motivo, y poder ver la lista de todos, para saber qué se regaló, a quién y por qué.
- **Entrega demostrable** — Al regalar tokens desde Balances puedo escribir un motivo, y el regalo aparece enseguida en "Historial de regalos" con fecha, quién regaló, a quién, cuánto y motivo.
- **Construcción (propuesta)** — Prueba primero en `supabase/tests/026_token_gifts.test.sql`; migración `supabase/migrations/026_token_gifts_log.sql` (tabla de regalos, función de regalar con motivo opcional, función de lista general); `src/repositories/AdminRepository.ts`; `src/components/AdminPanel/AdminBalances.tsx`. Aplicar la migración en dev antes de la demo, y en producción —con confirmación— antes de pasar a `main`.
- **Construido** — 2026-10-06, en la rama `feature/fase-2-regalos`. Se empezó por las pruebas de base: fallaron (la función con motivo no existía) y pasaron con la migración 026 (28 comprobaciones nuevas; 120 en total). La migración crea el registro, cambia la función de regalar para que guarde el regalo en el mismo paso que sube el saldo, y agrega la lista general para administradores. Incluye también la función con la que el usuario pide sus propios regalos, que usará A2. En el panel, la ventana de regalar tiene el campo "Motivo (opcional)" y hay una sección "Historial de regalos" bajo la tabla de saldos, hecha con los estilos que ya tenía esa pestaña. Revisión de tipos, lint y pruebas en verde (291). La migración se aplicó en la base de **dev** el 2026-10-06, tras revisar que la función de regalo real coincidía con la del repositorio y respaldarla; comprobado después: el registro existe, vacío, sin acceso directo para usuarios ni visitantes, y las tres funciones solo las puede ejecutar un usuario con sesión. **No hecho todavía:** la migración no está en producción.
  - **Demo confirmada (2026-10-06).** Carlos regaló tokens en `dev.chorroybuenas.com.mx` con la cuenta administradora de dev y confirmó que funciona. Comprobado en la base de dev: un regalo de 10 tokens con el motivo "prueba", con quién lo dio y a quién. El regalo sin motivo y la vista en teléfono no se probaron en la demo.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En `dev.chorroybuenas.com.mx`, con tu cuenta de administrador → Administración → Balances. (1) Baja al final: debería verse "Historial de regalos" con el texto "Todavía no se ha regalado ningún token." (2) En la tabla de saldos, pulsa Regalar en un usuario → escribe 3 tokens y el motivo "prueba de registro" → Regalar. El saldo de ese usuario sube 3 y en el historial aparece un renglón con la fecha de hoy, tu nombre, el del usuario, 3 y "prueba de registro". (3) Regala otra vez dejando el motivo vacío: aparece arriba otro renglón, con una raya en Motivo.
- **Escenarios cubiertos**:
  - [x] Regalar con motivo: sube el saldo y queda el registro con el motivo. (Prueba de base.)
  - [x] Regalar sin motivo, o con el motivo en blanco: sube el saldo y el registro queda sin motivo. (Prueba de base.)
  - [x] Cantidad de 0 o negativa: se rechaza, y no cambia el saldo ni queda registro. (Prueba de base.)
  - [x] Motivo de más de 200 caracteres: se rechaza. (Prueba de base; el campo además no deja escribir más.)
  - [x] Quien no es administrador no puede regalar ni ver la lista general. (Prueba de base.)
  - [x] Un visitante no puede regalar, ni leer el registro, ni pedir ninguna lista. (Prueba de base.)
  - [x] Un usuario no puede leer el registro directamente ni inventarse un regalo. (Prueba de base.)
  - [x] En el panel: el regalo aparece en el historial sin recargar la página. (Demo de Carlos.)
  - [ ] En el panel: el historial se ve bien en teléfono. (Demo.)
  - [ ] La versión publicada hoy del sitio (que regala sin motivo) sigue pudiendo regalar después de aplicar la migración. (Cubierto en la prueba de base con la llamada de dos parámetros; falta verlo en dev.)

### US A2 — El usuario ve los regalos en su historial   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como usuario, quiero ver en mi historial los tokens que me regalaron, para entender por qué subió mi saldo.
- **Entrega demostrable** — En Mi cuenta, el historial muestra mis compras y mis regalos mezclados por fecha; cada regalo es una fila marcada "Regalo" con sus tokens y su fecha.
- **Construcción (propuesta)** — La función de base ya existe (migración 026). Prueba primero de la mezcla por fecha de compras y regalos, en `tests/src/`; función nueva en `src/repositories/TokenPricingRepository.ts` para pedir los regalos propios; `src/components/Dashboard/PurchaseHistoryModal.tsx` y `Dashboard.tsx`; textos en `src/locales/es/translation.json` y `src/locales/en/translation.json` (título, vacío y la etiqueta "Regalo").
- **Construido** — 2026-10-06, en la rama `feature/fase-2-regalos`. Se empezó por la prueba de la mezcla: 7 pruebas nuevas en `tests/src/tokenHistory.test.ts`, que fallaron y pasaron con `src/utils/tokenHistory.ts` (une compras y regalos del más reciente al más antiguo, y de cada regalo conserva solo cantidad y fecha). `getMyTokenGifts` en `src/repositories/TokenPricingRepository.ts` pide los regalos propios; si falla, el historial muestra solo las compras. La ventana de historial pinta cada regalo como una fila "Regalo" con sus tokens y una raya en monto, método y estado. Textos cambiados en los dos idiomas: título "Historial de compras y regalos", vacío "Aún no tienes compras ni regalos." y la etiqueta "Regalo" (redactados al construir; por confirmar con Carlos). Sin cambios de base: usa la función de la migración 026. Revisión de tipos, lint y pruebas en verde (298). Enviada a `dev` el 2026-10-06.
  - **Demo confirmada (2026-10-06).** Carlos abrió el historial en su máquina, que usa la base de dev, y confirmó que se ve bien. No se probó en `dev.chorroybuenas.com.mx`.
- **Depende de** — A1 (la migración aplicada en el entorno).
- **Cómo se prueba (guion de demo)** — En dev, con la cuenta a la que le regalaste en A1 → Mi cuenta → abre el historial. Debería verse una fila "Regalo" con 3 tokens y la fecha de hoy, sin precio, entre tus compras según su fecha. No debe aparecer el motivo ni quién lo regaló.
- **Escenarios cubiertos**:
  - [x] Usuario con compras y regalos: los ve mezclados, del más reciente al más antiguo. (Prueba automática.)
  - [x] Usuario solo con regalos: ve sus regalos, no el mensaje de historial vacío. (Prueba automática.)
  - [x] Usuario sin compras ni regalos: ve el mensaje de historial vacío. (Prueba automática de la lista vacía.)
  - [ ] La fila de regalo no muestra precio, método, estado, motivo ni quién regaló.
  - [x] Un usuario no ve regalos de otros. (Prueba de base de A1.)
  - [ ] Si falla la carga de regalos, se siguen viendo las compras.
  - [ ] Textos en español y en inglés.

### US A3 — "Tokens recibidos" cuenta también los regalos   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como usuario, quiero que el número de tokens recibidos de Mi cuenta incluya los que me regalaron, para que cuadre con mi saldo y con mi historial.
- **Entrega demostrable** — En Mi cuenta, "tokens recibidos" es la suma de los tokens de bienvenida, los comprados y los regalados.
- **Construcción (propuesta)** — Prueba primero del cálculo, en `tests/src/`; el cálculo sale de `src/components/Dashboard/Dashboard.tsx` a una función propia junto a la del historial; el panel pide los regalos propios al cargar. Sin cambios de base ni de textos.
- **Construido** — 2026-10-06, en la rama `feature/fase-2-regalos`. Se empezó por las pruebas: 7 nuevas en `tests/src/tokenSummary.test.ts`, que fallaron y pasaron con `summarizeTokens` y `sumGiftTokens` en `src/utils/tokenHistory.ts`. Mi cuenta pide los regalos propios al cargar y los suma a los recibidos. "Tokens gastados" se calcula igual que antes, con un ajuste: mientras el saldo no ha cargado muestra lo registrado, en vez de mostrar por un instante todo lo recibido como gastado. Revisión de tipos, lint y pruebas en verde (305). Enviada a `dev` el 2026-10-06.
  - **Demo confirmada (2026-10-06).** Carlos la probó en su máquina, que usa la base de dev, y confirmó que funciona. No se probó en `dev.chorroybuenas.com.mx`.
- **Límites conocidos, sin cambiar** — Los regalos anteriores al registro no cuentan, porque no quedaron guardados. Los tokens de bienvenida se toman del valor configurado hoy, no de lo que la cuenta recibió al crearse: si el administrador cambia ese valor, el número cambia para todos. Las dos cosas ya eran así.
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — Con la cuenta a la que le regalaste 10 tokens → Mi cuenta. "Tokens recibidos" debería ser 10 más alto que antes, y "tokens gastados" no debería haber cambiado.
- **Escenarios cubiertos**:
  - [x] Recibidos = bienvenida + compras + regalos. (Prueba automática.)
  - [x] Un regalo no se cuenta como gasto. (Prueba automática.)
  - [x] Sin regalos, los dos números son los de antes. (Prueba automática.)
  - [x] Lo gastado nunca es negativo. (Prueba automática.)
  - [ ] Si falla la carga de regalos, el panel se muestra igual, sin sumarlos.
  - [x] Los números en la pantalla de Mi cuenta. (Demo de Carlos.)
