# FEAT-39 — «Agregar una carta» y «Nombra tus fotos» en teléfono

**Estado: definida con Carlos el 2026-10-11, en la rama `feature/ventanas-de-cartas-en-celular`, creada desde `dev`. Construidas sus cuatro historias (US A1 a A4) ese mismo día y fusionadas a `dev` en un merge directo, sin PR, porque Carlos lo pidió así. Se publican en dev.chorroybuenas.com.mx al subir `dev` a GitHub. Falta la demo de Carlos en un teléfono, con el guion de cada historia: lo del teclado solo se puede comprobar ahí. A producción pasa después, con el PR de `dev` a `main`, cuando Carlos confirme lo probado en dev. `docs/diseno-mockups.md` (M4 y M6) no se editó: Carlos no ha confirmado anotar ahí cómo se ven estas ventanas en teléfono.**

**Contexto.** Carlos reportó el 2026-10-11 que las ventanas nuevas para subir fotos (FEAT-34, US A6) no funcionan bien en teléfono: son muy grandes, al escribir el nombre aparece el teclado y la ventana «se mueve raro», y al quitar el teclado el botón «Siguiente» no se ve completo. Pasa al subir una foto o varias.

**Qué se encontró en el código** (sin verlo todavía en un teléfono):

1. **La ventana mide más que lo visible.** Su alto máximo se calcula con `100vh`, que en teléfono es la pantalla sin descontar la barra del navegador; lo de abajo queda cortado.
2. **El contenido es muy alto.** Foto grande, botón de recorte, nombre, «Así se verá» y botones suman unos 800 px, con los botones al final de lo que se desliza.
3. **Cada letra mueve la ventana.** En «Nombra tus fotos», la miniatura en turno pedía mostrarse (`scrollIntoView`) en cada redibujo, es decir, en cada tecla, y eso pelea con el teclado.
4. **El teclado no encoge la página.** El navegador solo encoge lo visible; la ventana, fija a la pantalla completa, queda en parte tapada.

**Es solo interfaz.** No cambia cómo se valida el nombre, se recorta, se comprime ni se guarda una carta. Tampoco cambian las reglas de negocio ni la versión de escritorio.

**Archivos.** En `src/components/CardEditor/`: `CardUploadModal.tsx` y `.css` (marco), `CardUpload.tsx` y `.css`, `BatchUploadModal.tsx` y `.css`, `CardLivePreview.tsx`, `CardForm.css`. Hooks nuevos en `src/hooks/`.

## Decisiones tomadas con el usuario

Respuestas de Carlos (2026-10-11):

1. **Va como feature nueva, FEAT-39**, con su rama. _(Descartada: una historia más en FEAT-34, que ya está fusionada en `dev`.)_
2. **En teléfono (640 px o menos) las dos ventanas son una hoja compacta que sube desde abajo**, como las ventanas de cuenta: una sola imagen chica —la carta de «Así se verá», con su número y su nombre— junto al campo del nombre, y los botones siempre fijos abajo, también con el teclado abierto. _(Descartadas: dejar todo como hoy con los botones fijos, porque con el teclado abierto casi no se ve contenido; y pantalla completa como «Editar carta».)_
3. **Que se puedan agregar cartas desde el teléfono contra el servidor local se arregla en el código, como US A3.** Carlos no podía subir fotos desde su celular en local. _(Descartada: no tocar código y probar por USB o hasta que la rama esté en dev.)_

Ajustes de Claude al construir, avisados a Carlos al entregar:

4. **En teléfono no sale la foto sin marco ni el recuadro de «Así se verá»:** la carta chica los reemplaza, con la leyenda «Así se verá» debajo. El texto «Número y nombre se ponen solos…» no sale en teléfono.
5. **En teléfono no sale el subtítulo de «Nombra tus fotos»** («Ponle nombre a cada una; puedes cambiarlo después.»), para que quepa el campo con el teclado abierto.
6. **«Ajustar recorte» (y «Cambiar foto») pasan debajo del nombre**, porque no caben bajo la carta chica.
7. **Sin foto elegida, «Agregar una carta» muestra el recuadro para elegirla a lo ancho** y más bajo, con el campo del nombre debajo.
8. **Con la ventana abierta, la página de atrás no se desplaza.** El primer intento bloqueaba `body`, como las ventanas de cuenta y el menú de teléfono, y Carlos vio el mismo día que la página seguía moviéndose: en este sitio quien desplaza es `html` (lleva `overflow-x: hidden`), así que el bloqueo va en `html`. El de las ventanas de cuenta y el del menú no se tocaron.
9. **El alto máximo del marco deja de usar `100vh`.** El marco lo comparten «Editar carta» y la ventana de IA en lote: «Editar carta» no cambia (en teléfono ya iba a pantalla completa) y la de IA deja de cortarse por abajo en teléfono. No se les cambió nada más.
10. **En «Nombra tus fotos», tocar «Omitir» o «Siguiente foto» no le quita el cursor al nombre**, para que el teclado no se cierre y se vuelva a abrir entre una foto y otra.

## Diseño

- **Marco.** `card-modal__overlay--sheet` marca las dos ventanas que son hoja en teléfono: pegadas abajo, a todo lo ancho, con las esquinas de arriba redondeadas. La caja mide como máximo lo que mide el velo.
- **Teclado.** `useVisualViewportFit` deja en el velo el alto y la posición de lo que de verdad se ve (`window.visualViewport`), y el velo se ajusta a eso. Con zoom de pellizco no hace nada. En escritorio el CSS no usa esos valores.
- **Botones fijos.** En teléfono los botones van en `card-modal__footer`, fuera de la parte que se desliza. En escritorio siguen donde estaban.
- **Una sola imagen.** `CardLivePreview` gana la variante `compact`: solo la carta y su leyenda.
- **Miniaturas.** La fila se recorre sola hasta la foto en turno solo al cambiar de foto, y solo de lado.

## Fuera de alcance

- «Editar carta» (M5) y las ventanas de IA, salvo la rueda de la carta en turno (US A4), que Carlos pidió el mismo día.
- Usar la IA desde el teléfono contra el servidor local: la función de IA de dev solo acepta `dev.chorroybuenas.com.mx` y `http://localhost:5173` (secret `ALLOWED_ORIGINS`), así que desde `http://192.168…` el navegador bloquea la respuesta y sale «algo salió mal». Comprobado el 2026-10-11 con la consulta previa del navegador (no llega a cobrar). Carlos agregó ese mismo día la dirección de la red de su computadora (`http://192.168.1.22:5173`) a ese secret de dev; producción no se tocó. Si la computadora cambia de dirección en la red, hay que actualizarlo.
- El recortador de fotos (`ImageEditor`).
- La versión de escritorio de las dos ventanas.

## Cuándo parar y preguntar

- Si en un teléfono real el teclado sigue tapando los botones o la ventana sigue saltando: decir en cuál (modelo y navegador) antes de probar otra técnica.

## Grupo A — Ventanas de cartas en teléfono

### US A1 — «Nombra tus fotos» en teléfono   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como persona que sube varias fotos desde su teléfono, quiero nombrarlas sin que la ventana salte ni se corte.
- **Entrega demostrable** — En teléfono, «Nombra tus fotos» es una hoja pegada abajo: título, avance y miniaturas arriba; la carta chica con «Así se verá» a la izquierda y el nombre con «Ajustar recorte» a la derecha; «Omitir» y «Siguiente foto» fijos abajo, a la vista con y sin teclado.
- **Construido** — 2026-10-11. Marco (`CardUploadModal.css`): el alto máximo de la caja es el del velo, `card-modal__overlay--sheet` la vuelve hoja en 640 px o menos y `card-modal__footer` es el pie fijo. `useVisualViewportFit` (`src/hooks/`) ajusta el velo a lo visible cuando sale el teclado y `usePageScrollLock` detiene la página de atrás. `CardLivePreview` tiene la variante `compact` (estilos en `CardForm.css`). En `BatchUploadModal.tsx`, en teléfono: la carta chica en lugar de la foto, «Ajustar recorte» bajo el nombre y los botones en el pie; la fila de miniaturas se recorre sola solo al cambiar de foto y solo de lado (antes, `scrollIntoView` en cada tecla). No se tocó cómo se valida, recorta, comprime ni guarda una carta. `typecheck`, `lint` y `npm test` en verde; sin pruebas nuevas, porque es acomodo de pantalla.
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — En el teléfono, en Cartas, toca «Subir fotos» y elige cinco: se abre la hoja desde abajo y se ve entera, con «Siguiente foto» completo → toca el nombre: sale el teclado y los botones quedan justo encima de él → escribe un nombre: la ventana no salta y la carta chica va mostrando el nombre → cierra el teclado: la hoja baja y los botones siguen completos → «Siguiente foto»: pasa a la segunda y la fila de miniaturas la marca → en la última dice «Terminar» y las cartas quedan en la lista. En computadora la ventana se ve igual que antes.
- **Escenarios cubiertos**:
  - [ ] La hoja nunca mide más que lo visible, con la barra del navegador a la vista u oculta.
  - [ ] Con el teclado abierto se ven el campo del nombre y los botones.
  - [ ] Escribir no mueve la ventana.
  - [ ] Al cerrar el teclado los botones se ven completos.
  - [ ] «Ajustar recorte», «Omitir», la confirmación al cerrar y Escape hacen lo mismo que antes.
  - [ ] En escritorio no cambia nada.

### US A2 — «Agregar una carta» en teléfono   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como persona que agrega una carta desde su teléfono, quiero ver la foto, el nombre y el botón sin tener que deslizar.
- **Entrega demostrable** — En teléfono, «Agregar una carta» es la misma hoja: sin foto, el recuadro para elegirla a lo ancho y el nombre debajo; con foto, la carta chica a la izquierda y el nombre con «Ajustar recorte» y «Cambiar foto» a la derecha; «Agregar carta» fijo abajo.
- **Construido** — 2026-10-11. `CardUploadModal.tsx` usa la hoja, `useVisualViewportFit` y `usePageScrollLock`; su cuerpo (`card-modal__body--fill`) deja que el formulario reparta el alto. En `CardUpload.tsx`, en teléfono: la carta chica en lugar de la foto, «Ajustar recorte» y «Cambiar foto» bajo el nombre y «Agregar carta» en el pie; sin foto, el recuadro para elegirla va a lo ancho. Estilos en `CardUpload.css`. No se tocó cómo se valida, recorta, comprime ni guarda la carta.
- **Depende de** — US A1 (marco de hoja, teclado y carta chica).
- **Cómo se prueba (guion de demo)** — En el teléfono, en Cartas, toca «Agregar una carta»: hoja desde abajo con el recuadro para elegir foto y «Agregar carta» apagado abajo → elige una foto: aparece la carta chica a la izquierda y el cursor pasa al nombre → escribe: el botón «Agregar carta» queda encima del teclado y la carta muestra el nombre → «Agregar carta»: la ventana se cierra y la carta está en la lista. En computadora la ventana se ve igual que antes.
- **Escenarios cubiertos**:
  - [ ] Sin foto y con foto, la hoja cabe en lo visible.
  - [ ] Con el teclado abierto se ven el campo y «Agregar carta».
  - [ ] «Ajustar recorte» y «Cambiar foto» hacen lo mismo que antes.
  - [ ] En escritorio no cambia nada.

### US A3 — Agregar cartas desde el teléfono contra el servidor local   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como Carlos, quiero probar desde mi celular lo que corre en mi computadora, para revisar las ventanas antes de mandarlas a dev.
- **Entrega demostrable** — Desde el teléfono, abriendo el servidor local por la dirección de la red (`http://192.168…:5173`), se pueden agregar cartas, una o varias.
- **Construido** — 2026-10-11. El identificador de cada carta nueva se pedía con `crypto.randomUUID`, que los navegadores solo dan en páginas seguras (https o localhost); por http y la dirección de la red no existe y la carta fallaba al guardarse. `newUuid` (`src/utils/newUuid.ts`) usa esa función cuando está y, si no, arma un UUID v4 con `crypto.getRandomValues`. `CardEditor.tsx` lo usa al agregar una carta y al agregar varias. En dev y en producción (https) no cambia nada. La prueba se escribió antes que el código (`tests/src/newUuid.test.ts`). No se tocaron los otros usos de `crypto.randomUUID`, que son de Administración.
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — Con el servidor local andando, abre en el celular la dirección de la red de tu computadora → en Cartas, «Agregar una carta», elige foto, ponle nombre y «Agregar carta»: la carta aparece en la lista → «Subir fotos», elige tres, nómbralas y «Terminar»: las tres aparecen.
- **Escenarios cubiertos**:
  - [x] Con `crypto.randomUUID` disponible se usa esa (prueba automática).
  - [x] Sin ella, el identificador es un UUID v4 válido y no se repite (prueba automática).
  - [ ] Agregar una carta y varias desde el teléfono contra el servidor local.

### US A4 — Rueda en la carta que se está convirtiendo (IA en lote)   ·   Estado: construida el 2026-10-11, pendiente de la demo de Carlos

- **Historia** — Como persona que convierte varias cartas con IA, quiero ver cuál se está convirtiendo en este momento.
- **Entrega demostrable** — En la ventana de avance de la IA en lote, la carta en turno lleva, además de su borde, el velo de IA con una rueda girando, como la carta que se convierte en la cuadrícula. Antes solo tenía el borde, sin movimiento.
- **Construido** — 2026-10-11. En `AIBatchModal.tsx`, la celda en turno dibuja `ai-batch__cell-working` con `ai-batch__cell-spinner` (estilos en `AIBatchModal.css`; sin movimiento para quien pide menos animación). No se tocó `aiBatchPlan`, `useCardAI`, `AIService` ni nada que cobre o devuelva tokens. Carlos lo pidió en la conversación; se anotó aquí por ser la feature activa.
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — Con sesión y tokens, en Cartas toca «Transformar todas» y confirma: en la cuadrícula de la ventana, la carta en turno se ve con el velo morado y la rueda girando → al terminar esa, queda con su palomita y la rueda pasa a la siguiente.
- **Escenarios cubiertos**:
  - [ ] La carta en turno muestra la rueda girando.
  - [ ] Las ya convertidas muestran su palomita y las que faltan siguen atenuadas, como antes.
