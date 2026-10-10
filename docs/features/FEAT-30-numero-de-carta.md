# FEAT-30 — Número de carta

**Estado: por definir. Está anotado lo que Carlos ya pidió y las preguntas que faltan; no hay decisiones ni historias. Sin rama todavía.**

**Contexto.** Salió el 2026-10-09 al definir [FEAT-29](FEAT-29-pdf-aspecto-de-las-cartas.md): el diseño de carta que trajo Carlos lleva un número en la esquina superior izquierda. Se dejó para una feature aparte porque no es solo aspecto: es una regla de negocio nueva (FEAT-29, decisión 4).

**Lo que Carlos ya pidió** (en su diseño del 2026-10-09; falta confirmarlo como decisión al definir la feature).

1. Cada carta lleva un número único dentro de su lotería, asignado solo (1, 2, 3…) en el orden en que se suben las fotos.
2. El usuario puede editarlo, y no se permiten números repetidos dentro de la misma lotería.
3. La misma carta lleva el mismo número en todos los tableros y en la baraja.
4. Se dibuja en la esquina superior izquierda, sobre la foto, con la misma letra del nombre: unos 110 px en una carta de 1000 × 1500, a unos 35 px del marco.

**Fuera de esta feature.** Que la IA pinte el nombre o el número dentro de la ilustración, y un límite de largo para el nombre: las dos ideas se descartaron el 2026-10-09 (FEAT-29, decisión 14).

**Qué toca de lo ya decidido.** Es una regla nueva: hay que agregarla a `docs/contexto-negocio.md` (reglas de las cartas), a `docs/casos-de-uso.md` (subir y editar carta) y a `docs/diseno-mockups.md` (C1, M4, M5, M6), siguiendo la regla de sincronizar la base de conocimiento. Lleva migración (guardar el número de cada carta): se aplica primero en dev y, con confirmación de Carlos, en producción antes de fusionar a `main`.

**Punto de partida (para no rehacerlo).**

- El lugar del número ya está calculado: `cardComposeLayout` (`src/services/cardCompose/layout.ts`) devuelve `number` con su posición y tamaño, y hoy nadie lo dibuja. Falta pasar el número a `composeCard` (`src/services/cardCompose/compose.ts`, vía `composeInputFor` en `input.ts`); con eso sale en el PDF y en todas las pantallas que ya usan la carta compuesta.
- El almacén de cartas compuestas (`src/services/cardCompose/composedCards.ts`) decide si vuelve a componer por nombre, foto y tipo de carta: hay que agregarle el número.
- Con sesión, las cartas se leen ordenadas por fecha de creación (`src/repositories/CardRepository.ts`); sin sesión viven en el navegador, en el orden de la lista. `Card` (`src/types/index.ts`) no tiene campo de número.
- Las cartas de loterías temáticas ya traen todo dibujado y no pasan por la pieza: no deberían cambiar.

## Preguntas por resolver con Carlos antes de construir

Por definir. Como mínimo:

- Al borrar una carta, ¿las demás se renumeran solas o queda el hueco?
- ¿Qué número reciben las cartas de las loterías que ya existen? (Lo natural: por orden de creación.)
- ¿Se puede cambiar el orden de las cartas, y eso cambia sus números?
- Si el usuario escribe un número que ya tiene otra carta, ¿se rechaza o se intercambian?
- ¿Qué números se permiten (desde 1, hasta cuánto, sin saltos)?
- En la subida por lote, ¿se numeran en el orden de los archivos?
- ¿La baraja del PDF se ordena por número?
- Las cartas convertidas con IA: ¿llevan el número encima, igual que llevan el nombre? (Lo natural, ahora que la IA no va a pintarlo.)
- Sin sesión, las cartas viven en el navegador: ¿aplica igual?

## Historias

Por escribir, una vez resueltas las preguntas.
