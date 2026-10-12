# FEAT-41 — Entrar a tu cuenta y llegar a la lotería que hiciste sin sesión

**Estado: definida con Carlos el 2026-10-12, en la rama `feature/entrar-y-ver-tu-loteria`, creada desde `dev`. Construidas sus dos historias (US A1 y A2) ese mismo día; Carlos las probó en local y confirmó que funcionan. Fusionada a `dev` en un merge directo, sin PR, porque Carlos lo pidió así. Se publica en dev.chorroybuenas.com.mx al subir `dev` a GitHub. Falta la demo de Carlos ahí, con el guion de cada historia. A producción pasa después, con el PR de `dev` a `main`, cuando Carlos confirme lo probado en dev.**

**Contexto.** Carlos reportó el 2026-10-12: hizo una lotería sin sesión, descargó el PDF, la ventana le ofreció crear cuenta para guardarla, la creó y llegó a Mi cuenta sin ver su lotería; tuvo que tocar «Crear nueva lotería» para que aparecieran las cartas. Pidió llegar directo a la lotería que había hecho.

**Qué se encontró en el código.** Había dos traspasos del trabajo de visitante a la cuenta, sin coordinarse:

1. **Al iniciar sesión** (`AuthContext` → `SyncService`): subía cartas y tableros por detrás a la primera lotería de la cuenta, sin avisar ni esperar, y nunca limpiaba lo del navegador. Mi cuenta se abría antes de que terminara.
2. **Al abrir la pantalla de cartas** (`useCards`): si la lotería abierta estaba vacía y en el navegador quedaban cartas, las copiaba a esa lotería y borraba lo del navegador, hubieran pasado todas o no.

Lo que vio Carlos fue el segundo, sobre la lotería nueva que acababa de crear. Si los dos corrían a la vez, las cartas podían repartirse entre dos loterías. Además: el traspaso no guardaba el modo (una lotería Kids quedaba como Clásica) y, si una carta fallaba, guardaba tableros incompletos.

**No toca** tokens, cobros, promociones ni permisos. Sí cambia dos reglas ya escritas (decisiones 1 y 3).

**Archivos.** `src/services/visitorTransfer.ts` (nuevo, la lógica), `src/services/SyncService.ts`, `src/hooks/useVisitorTransfer.ts` (nuevo), `src/utils/storage.ts`, `src/contexts/AuthContext.tsx`, `src/hooks/useCards.ts`, `src/AppRouter.tsx`, `src/components/CardEditor/UploadProgressModal.tsx`; textos en `src/locales`; pruebas en `tests/src/visitorTransfer.test.ts`.

## Decisiones tomadas con el usuario

Respuestas de Carlos (2026-10-12):

1. **Al entrar con trabajo de visitante en el navegador, se llega a «Lotería guardada» (U2) de esa lotería**, cuando terminó de guardarse. Cambia el paso 3 del caso de uso «Iniciar sesión», que decía «Llega a su panel». _(Descartadas: la pantalla de cartas con esa lotería cargada; Mi cuenta como hoy, esperando a que la lotería aparezca.)_
2. **Aplica siempre que haya trabajo de visitante**, se entre por donde se entre (ventana del PDF, barra de arriba, enlace del correo en el mismo navegador). Si el inicio de sesión empezó en una página con regreso propio (Comprar tokens o una lotería temática), se respeta ese regreso: el trabajo se guarda igual, por detrás y sin cambiar de página. _(Descartada: solo desde la ventana del PDF.)_
3. **Si la cuenta ya tenía cartas, el trabajo de visitante va a una lotería nueva**, sin mezclarse. Una cuenta nueva lo sigue recibiendo en «Mi primera lotería». Cambia `docs/contexto-negocio.md` §4, que decía «dentro de una lotería por defecto». _(Descartada: dejarlo como hoy, en la primera lotería de la cuenta aunque ya tuviera cartas.)_
4. **Va como feature nueva, FEAT-41**, con su rama.
5. **La base de conocimiento se actualiza con esta feature:** `docs/casos-de-uso.md` (caso 2), `docs/contexto-negocio.md` (§4) y `docs/diseno-mockups.md` (la ventana de progreso M7 y la navegación al entrar).

Ajustes de Claude al construir, avisados a Carlos al entregar:

6. **«Ya tenía cartas» se decide por la primera lotería de la cuenta:** si está vacía, el trabajo va ahí; si tiene cartas, a una nueva llamada como las de «Crear nueva lotería» («Nueva lotería N»).
7. **Mientras se guarda sale la ventana de progreso que ya existía (M7)**, con el título «Guardando tu lotería en tu cuenta…» y el porcentaje. Al terminar la página se recarga en la lotería, como ya hacen «Terminar» e «Ir a mis loterías», para soltar lo que quedó en memoria.
8. **El modo se conserva:** si los tableros del visitante eran de 9 cartas, la lotería queda como Kids.
9. **Si alguna carta no se puede guardar, las demás pasan igual** (regla ya escrita en el caso 2) y se avisa cuántas faltaron. Las que faltaron se quedan en el navegador y se reintentan en la siguiente visita, en la misma lotería, hasta tres intentos; después se descartan. Los tableros solo se guardan cuando todas sus cartas ya están en la cuenta: nunca un tablero incompleto.
10. **Si no se pudo guardar ninguna** (sin conexión, por ejemplo), se avisa, la lotería sigue en el navegador y no se cambia de página.
11. **Con el correo confirmado en otro navegador o dispositivo no hay nada que pasar:** se llega a Mi cuenta, como antes.

## Diseño

- **Un solo traspaso.** `runVisitorTransfer` (`src/services/visitorTransfer.ts`) decide a qué lotería va, pasa las cartas una por una, guarda los tableros completos y limpia el navegador. No conoce Supabase: recibe lo que necesita como funciones, y `SyncService` se las da. Así se prueba sin base de datos.
- **Cuándo corre.** `useVisitorTransfer`, montado en `AppRouter`: cuando hay sesión y en el navegador hay cartas de visitante. Ya no depende del aviso de «sesión iniciada» de Supabase ni de abrir la pantalla de cartas. Las cartas solo se guardan en el navegador sin sesión, así que encontrarlas ahí significa trabajo de visitante.
- **A dónde lleva.** A `/loteria/:id`, salvo en `/comprar-tokens` y `/tematicas…`, donde guarda por detrás.
- **Reintentos.** Lo que faltó, la lotería destino y el número de intentos se anotan en el navegador (`loteria_transfer_pending`). En la misma pestaña no se reintenta solo, para no repetir el aviso al recargar.

## User Stories

### US A1 — Entrar y llegar a tu lotería   ·   Estado: construida el 2026-10-12; probada por Carlos en local ese día, pendiente de la demo en dev

- **Historia** — Como visitante que hizo su lotería y luego creó su cuenta, quiero llegar directo a esa lotería ya guardada, para no buscarla ni creer que se perdió.
- **Entrega demostrable** — Al entrar con una lotería de visitante en el navegador sale «Guardando tu lotería en tu cuenta…» con su avance y, al terminar, se abre la página de esa lotería con sus cartas y sus tableros. Mi cuenta ya no se queda sin la lotería, y abrir la pantalla de cartas ya no copia nada.
- **Construido** — 2026-10-12. `runVisitorTransfer` con sus pruebas; `SyncService` le da el acceso a la cuenta y al navegador; `useVisitorTransfer` lo dispara y muestra `UploadProgressModal` (que ahora acepta un título). Se quitaron el traspaso que lanzaba `AuthContext` al iniciar sesión y el de `useCards`.
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — Con una cuenta nueva: sin sesión, crea una lotería completa y descarga el PDF → en la ventana «PDF descargado», entra con Google: al volver sale «Guardando tu lotería en tu cuenta…» con el porcentaje → al terminar se abre la página de la lotería, «Mi primera lotería», con todas sus cartas, sus tableros y «Lista para imprimir» → ve a Mi cuenta: hay una sola lotería → repite sin sesión con una lotería Kids y entra con correo y contraseña desde esa ventana: lo mismo, y la lotería dice Kids → sin sesión, sube 10 fotos sin armar tableros y entra desde la barra de arriba: llegas a la lotería, que avisa cuántas cartas faltan → sin sesión, sube fotos, ve a Comprar tokens y entra ahí: te quedas en Comprar tokens y la lotería aparece en Mi cuenta.
- **Escenarios cubiertos**:
  - [ ] Entrando desde la ventana del PDF, con Google o con correo, se llega a la lotería guardada.
  - [ ] Entrando desde la barra de arriba, también.
  - [ ] La lotería tiene todas las cartas y los tableros del visitante, y su modo.
  - [ ] En Mi cuenta no queda una lotería vacía de más ni cartas repartidas en dos loterías.
  - [ ] Desde Comprar tokens o una lotería temática no se cambia de página.
  - [ ] Sin trabajo de visitante en el navegador, entrar lleva a Mi cuenta como antes.
  - [ ] Sin conexión al entrar: se avisa y la lotería sigue en el navegador.

### US A2 — Con loterías previas, el trabajo de visitante va a una lotería nueva   ·   Estado: construida el 2026-10-12; probada por Carlos en local ese día, pendiente de la demo en dev

- **Historia** — Como persona que ya tiene loterías en su cuenta, quiero que lo que hice sin sesión quede en su propia lotería, para que no se mezcle con las que ya tenía.
- **Entrega demostrable** — Al entrar a una cuenta cuya primera lotería ya tiene cartas, el trabajo de visitante se guarda en una lotería nueva («Nueva lotería N») y se llega a ella.
- **Construido** — 2026-10-12. `pickTransferTarget`, dentro de `src/services/visitorTransfer.ts`, con sus pruebas.
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Con una cuenta que ya tenga una lotería con cartas: cierra sesión → crea otra lotería sin sesión, con fotos distintas → inicia sesión: sale «Guardando tu lotería en tu cuenta…» → se abre una lotería nueva, solo con las fotos recién subidas → en Mi cuenta, la lotería anterior sigue igual.
- **Escenarios cubiertos**:
  - [ ] Cuenta cuya primera lotería tiene cartas: se crea una lotería nueva.
  - [ ] Cuenta nueva, o cuya primera lotería está vacía: se usa esa.
  - [ ] La lotería anterior no cambia.
