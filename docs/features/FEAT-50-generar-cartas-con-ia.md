# FEAT-50 — Generar cartas temáticas con IA en el asistente

**Estado: 🚧 en curso. Definida con Carlos el 2026-10-17; base de conocimiento actualizada. Se trabaja en `feature/cartas-con-ia`, creada desde `dev` el 2026-10-17 (decisión 10). US A1 y A2 construidas el 2026-10-17, con las migraciones 056 y 057 aplicadas y la función `generate-seasonal-card` desplegada en el Supabase de dev; falta la demo de Carlos. Hay que aplicarlas y desplegarla en producción antes de pasar a `main`.**

**Contexto.** Hoy Carlos genera cada carta de una lotería temática a mano en Replicate (`openai/gpt-image-2`): escribe un prompt general de la temática, le agrega número, nombre y escena de la carta, manda como imagen de entrada la carta tradicional que corresponde (o una carta ya generada que le gustó, como referencia de estilo), elige 2:3, calidad «low» y salida WebP, descarga el resultado y, al final, sube todas las cartas al asistente (FEAT-48, paso 2). Esta feature lleva ese trabajo al asistente: generar, revisar, rehacer y quedarse con la buena, sin descargar ni volver a subir nada.

**Clasificación:** toca el asistente de loterías temáticas (paso 2, Cartas), una función nueva en el servidor que llama a Replicate, almacenamiento privado para la baraja base y los intentos, y tablas nuevas. No toca tokens, cobros ni el catálogo público. Estimado: 4 a 5 sesiones.

## Decisiones tomadas con el usuario (2026-10-17)

1. **Vive dentro del asistente,** como un tercer modo del paso 2, «Generar con IA», junto a «Subir mis cartas» y «Ya tengo el PDF». Las cartas elegidas quedan como las cartas de la lotería y siguen a Tableros, Vitrina y PDF como hoy. Todo se guarda en el borrador privado (FEAT-48, decisión 18), así que se puede dejar a medias y seguir otro día. _(Descartado: una pantalla aparte «Generador de cartas» que después manda las cartas a una lotería.)_
2. **Flujo:** generar de una en una para ajustar el prompt; cuando va bien, «Generar las que faltan» de una sola vez; rehacer solo las que no gusten, ajustando su escena o el prompt general.
3. **Baraja base privada, se sube una vez:** las 54 cartas tradicionales, cada una con su número y nombre, en un espacio que solo ve el administrador. Todas las temáticas la reusan; una carta se puede reemplazar. Nunca se muestra al público. _(Descartado: subir las 54 en cada lotería.)_
4. **No toda temática sale de la baraja tradicional** (por ejemplo, estados o números). La lista de cartas es libre: cada carta tiene número, nombre, escena y, opcionalmente, una imagen de entrada. La baraja tradicional es una plantilla que llena número y nombre de las 54.
5. **Imagen de entrada de cada carta:** su carta de la baraja base, la carta generada que se marque como «referencia de estilo», o ninguna (solo el prompt). Así se cubre el flujo de las temáticas no tradicionales: se genera la primera solo con el prompt y, cuando gusta, se usa de referencia para las demás.
6. **Captura pegando una lista,** un renglón por carta: `número | NOMBRE | escena`. Después cada carta se edita sola. Con la plantilla tradicional, número y nombre ya vienen llenos y solo se agregan escenas. _(Descartado: capturar una por una con formulario.)_
7. **Los intentos se guardan y se elige:** cada carta guarda sus últimos intentos (hasta 5) y el administrador marca cuál se queda. _(Descartado: que el nuevo reemplace al anterior.)_
8. **Ajustes de generación:** modelo `openai/gpt-image-2`, proporción 2:3 y salida WebP fijas; calidad «low» por defecto, con selector low / medium / high. _(Descartado: calidad siempre «low». WebP en vez de JPG porque pesa menos con la misma calidad.)_

9. **La baraja base se administra en la pestaña Temáticas:** un botón «Baraja base» junto a «Administrar temáticas» despliega el panel en la misma pantalla. _(Descartado: subirla dentro del asistente la primera vez.)_

10. **La rama `feature/cartas-con-ia` sale de `dev`,** creada el 2026-10-17. Sus migraciones empiezan en la 056. Al crearla resultó que FEAT-49 ya estaba en `dev` (PR #63), así que no había choque de numeración. _(Descartados: esperar a que FEAT-49 llegue a `dev`; salir de `feature/ofertas-con-banner`.)_
11. **Las escenas se cargan de una vez sobre la lista ya cargada** (por ejemplo, la baraja tradicional), pegando un renglón por carta: sirven «6 | escena» y «6 | LA SIRENA | escena» (si el nombre coincide con el de la carta, se ignora). Cada escena va a la carta de ese número; los números que no están en la lista se señalan. No borra lo ya generado: solo cambia escenas. Pedido por Carlos el 2026-10-17 al revisar A2; cumple la decisión 6, así que entra en US A2. _(Descartados: solo «número | escena»; solo escenas en orden, sin número.)_

## Diseño

**El prompt que se manda a Replicate** es el prompt general de la lotería seguido de los datos de la carta, en el formato que Carlos ya usa:

```
<prompt general>

Número: "6"
Nombre: "LA SIRENA"
Escena: una sirena con gorro de Santa y cola verde brillante, sentada sobre un témpano de hielo, adornando un pequeño pino con conchas y estrellas de mar.
```

**Paso 2 · Generar con IA (propuesta, por revisar contra la maqueta de FEAT-48):**

- Arriba: prompt general (texto largo, se guarda con la lotería), calidad, y «Cargar lista» (pegar renglones) o «Usar baraja tradicional».
- Una fila por carta: número y nombre, escena editable, imagen de entrada (base / referencia / ninguna), el intento elegido grande y los demás chicos para cambiar de elección, y los botones «Generar» / «Rehacer» y «Usar como referencia».
- Abajo: «Generar las que faltan» (pide confirmar cuántas se van a generar), avance «N de M listas» y «Usar estas cartas», que pasa los intentos elegidos a las cartas de la lotería, en el orden de la lista.
- Mientras una carta se genera se ve su estado («Generando…»); si falla, se muestra el error en esa fila y se puede reintentar sin perder las demás.

**Servidor.** La llave de Replicate nunca llega al navegador: una función nueva del servidor, solo para administradores, arma la llamada, espera el resultado y guarda la imagen en el espacio privado como un intento de esa carta. Al administrador no se le descuentan tokens; el costo lo paga la cuenta de Replicate.

**Datos (propuesta).** Baraja base: tabla con número, nombre y archivo en un bucket privado. Por lotería: el prompt general y la calidad; por carta: posición, número, nombre, escena, tipo de imagen de entrada e intento elegido; por intento: archivo, fecha y estado. Todo se borra al borrar la lotería, como las cartas de FEAT-48. Las migraciones empiezan en la 056 (decisión 10).

## Preguntas abiertas (se resuelven antes de la historia que las necesita)

1. _(Resuelta: decisión 9.)_
2. _(Resuelta: decisión 10.)_

## Cambio en la base de conocimiento

Propuesto con los cuatro puntos, confirmado por Carlos («si, aplícalo») y aplicado el 2026-10-17: `docs/contexto-negocio.md` §18 (generar las cartas con IA y la baraja base) y §15 (fila del 2026-10-17); `docs/casos-de-uso.md` CU 28 (flujo alterno «Generar con IA»); `docs/diseno-mockups.md` A1.7 (panel «Baraja base») y A1.7a (modo «Generar con IA» del paso 2), marcados «por construir (FEAT-50)».

---

## Grupo A — Generar cartas con IA

### US A1 — Subir la baraja base   ·   Estado: 🚧 construida, falta la demo

- **Historia** — Como administrador, quiero subir una sola vez las 54 cartas tradicionales con su número y nombre, para usarlas como imagen de entrada en cualquier temática.
- **Entrega demostrable** — En el Admin hay un lugar donde se ven las 54 cartas base, se suben (varias a la vez, asignadas por orden) y se reemplaza una sola.
- **Construcción (propuesta)** — Migración con la tabla de la baraja base y un bucket privado solo para administradores (con su prueba en `supabase/tests/`); repositorio; panel en la pestaña Temáticas (decisión 9).
- **Construido** — 2026-10-17. Migración `056_base_deck.sql`: espacio privado `base-deck` (JPEG, PNG o WebP, hasta 10 MB), solo administradores; cada carta se guarda con su número como nombre (`1` … `54`) y la base rechaza cualquier otro nombre. No hizo falta la tabla que proponía la construcción: el nombre de cada carta sale de la baraja tradicional (`src/utils/traditionalDeck.ts`) y reemplazar es volver a subir al mismo número. `src/utils/baseDeck.ts` asigna los archivos a sus números (por el número al inicio del nombre del archivo o, si no lo traen todos, en orden de nombre desde la 1) y rechaza lo que no es imagen, pesa más de 10 MB o pasa de 54; `BaseDeckRepository`; panel `AdminBaseDeck` abierto con «Baraja base» junto a «Administrar temáticas». Verificado con `supabase/tests/056_base_deck.test.sql` (17 aserciones, escrita antes de la migración y vista fallar), `tests/src/baseDeck.test.ts` (5), typecheck, lint y `npm test`. Migración aplicada en dev el 2026-10-17, tras revisar que no existía nada con esos nombres.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Admin → Temáticas → Baraja base → sube las 54 → deberían verse en orden con su número y nombre → reemplaza La Sirena → debería verse la nueva. Con una cuenta que no es de administrador, la baraja no se puede leer.
- **Escenarios cubiertos**:
  - [ ] Subir las 54 de una vez. (Demo.)
  - [ ] Reemplazar una carta. (Demo.)
  - [x] Un usuario normal no puede ver ni bajar la baraja base. (Prueba de base de datos; también el visitante.)
  - [x] La base rechaza números fuera del 1 al 54, con ceros a la izquierda o en carpetas. (Prueba de base de datos.)
  - [x] Archivos que no son imagen, de más de 10 MB o que pasan de 54 no se suben y se dice por qué. (Prueba automática.)

### US A2 — Generar una carta desde el asistente   ·   Estado: 🚧 construida, falta la demo

- **Historia** — Como administrador, quiero escribir el prompt general, cargar mi lista de cartas y generar una carta, para ver cómo sale antes de seguir.
- **Entrega demostrable** — En el paso 2, modo «Generar con IA»: prompt general, «Cargar lista» o «Usar baraja tradicional», y «Generar» en una carta muestra la imagen generada en 2:3.
- **Construcción (propuesta)** — Función del servidor (solo administradores) que llama a `openai/gpt-image-2` con el prompt armado, la imagen de entrada, 2:3, calidad y WebP, y guarda el intento; reutiliza `_shared/replicate.ts`. Migración de cartas e intentos por lotería. Lector de la lista pegada, con prueba. Modo nuevo en `WizardCardsStep`.
- **Construido** — 2026-10-17. Migración `057_seasonal_ai_cards.sql`: `seasonal_ai_builds` (prompt general, calidad, carta de referencia), `seasonal_ai_cards` (posición, número 1–999, nombre, escena, imagen de entrada; la baraja base solo para 1–54) y `seasonal_ai_attempts` (archivo, calidad, prompt completo), más el espacio privado `seasonal-ai`; el administrador ve, cambia y borra, pero los intentos solo los registra y sube el servidor; todo se borra con la lotería. Función `generate-seasonal-card` (solo administradores, sin tokens): arma el prompt con el formato de Carlos (`_shared/seasonalCard.ts`), toma la carta base o ninguna como entrada, llama a `openai/gpt-image-2` por su nombre (`createPrediction` acepta ahora la ruta del modelo), espera hasta 140 s, guarda la imagen y la deja como intento elegido. Navegador: `src/utils/aiCardList.ts` (lista pegada y plantilla tradicional), `AiCardsRepository`, `useWizardAi` y el modo «Generar con IA» (`WizardAiGenerator`, `WizardAiListLoader`); los pasos siguientes tratan este modo como «Subir mis cartas» (`buildsOnSite`). Borrar una lotería borra también los archivos de sus intentos. «Cargar escenas» (decisión 11, `parseSceneList` y `WizardAiSceneLoader`): pega las escenas de todas las cartas por número sobre la lista ya cargada, sin borrar lo generado; tras «Usar baraja tradicional» se abre solo. La opción «Usar como referencia» queda para A3. Verificado con `supabase/tests/057_seasonal_ai_cards.test.sql` (27 aserciones, escrita antes de la migración y vista fallar), `tests/functions/seasonalCard.test.ts` (7), un caso nuevo en `replicate.test.ts`, `tests/src/aiCardList.test.ts` (8), typecheck, lint y `npm test`. En dev, el 2026-10-17: migración aplicada tras revisar que no existía nada con esos nombres, función desplegada y probada sin sesión (responde 401).
- **Depende de** — A1 (para la imagen de entrada tradicional).
- **Cómo se prueba (guion de demo)** — Admin → Temáticas → + Nueva lotería temática → paso 2 → Generar con IA → escribe el prompt general → Usar baraja tradicional → se abre «Cargar escenas»: pega varias escenas («6 | escena» o «6 | LA SIRENA | escena») → Cargar escenas → cada una aparece en su carta → en La Sirena, Generar → en unos segundos debería verse la sirena generada. Sal del asistente y vuelve: la carta y el prompt siguen ahí.
- **Escenarios cubiertos**:
  - [ ] Generar con la carta base como entrada. (Demo.)
  - [ ] Generar sin imagen de entrada. (Demo.)
  - [x] Lista pegada con un renglón mal escrito: se señala ese renglón y no se pierden los demás. (Prueba automática; en pantalla, demo.)
  - [ ] Replicate falla o tarda demasiado: error en esa carta, se puede reintentar. (Los mensajes, con prueba automática; en pantalla, demo.)
  - [x] Escenas pegadas de una vez sobre la baraja tradicional, con «número | escena» o «número | NOMBRE | escena»; los renglones que no sirven se señalan. (Prueba automática; en pantalla, demo.)
  - [x] La función rechaza a quien no es administrador. (Sin sesión, probado en dev; con sesión de usuario normal, revisa `admin_users` antes de llamar a Replicate.)
  - [x] Un usuario o visitante no ve el prompt, las cartas ni los intentos, y nadie más que el servidor registra intentos. (Prueba de base de datos.)

### US A3 — Rehacer, elegir intento y usar de referencia   ·   Estado: 🔲 pendiente

- **Historia** — Como administrador, quiero rehacer una carta ajustando su escena, quedarme con el mejor intento y usar una carta que me gustó como referencia de estilo para las demás.
- **Entrega demostrable** — Cada carta muestra sus intentos (hasta 5) y se elige cuál se queda; «Usar como referencia» hace que las demás cartas puedan generarse con esa imagen de entrada; selector de calidad.
- **Construcción (propuesta)** — Elección de intento y referencia en la base; borrar el intento más viejo al pasar de 5; opción de imagen de entrada por carta.
- **Construido** — 
- **Depende de** — A2.
- **Cómo se prueba (guion de demo)** — En una carta ya generada → Rehacer dos veces → deberían verse tres intentos → elige el primero → queda grande. Marca otra carta como referencia → genera una carta sin carta base → debería salir con el estilo de la referencia.
- **Escenarios cubiertos**:
  - [ ] Elegir un intento anterior.
  - [ ] Al sexto intento se borra el más viejo (nunca el elegido).
  - [ ] Generar usando la referencia como entrada.

### US A4 — Generar las que faltan y usarlas en la lotería   ·   Estado: 🔲 pendiente

- **Historia** — Como administrador, quiero generar de una vez todas las cartas que faltan y pasar las elegidas a la lotería, para seguir con tableros y PDF.
- **Entrega demostrable** — «Generar las que faltan» con confirmación y avance «N de M listas»; «Usar estas cartas» las deja como las cartas de la lotería y el paso 3 ya puede generar tableros.
- **Construcción (propuesta)** — Cola en el navegador con pocas generaciones a la vez (para no topar con el límite de Replicate); conversión de los intentos elegidos a las cartas privadas de FEAT-48, en el orden de la lista.
- **Construido** — 
- **Depende de** — A3.
- **Cómo se prueba (guion de demo)** — Con 3 cartas generadas de 54 → Generar las que faltan → confirma «51 cartas» → el avance sube hasta 54 → rehaz una que no guste → Usar estas cartas → paso 3 → Generar tableros → los tableros salen con las cartas generadas.
- **Escenarios cubiertos**:
  - [ ] Generar las que faltan sin tocar las que ya están.
  - [ ] Si algunas fallan, las demás siguen y las fallidas se pueden reintentar.
  - [ ] Salir a mitad de la generación y volver: lo ya generado sigue ahí.
  - [ ] «Usar estas cartas» respeta el orden y el mínimo del modo.
