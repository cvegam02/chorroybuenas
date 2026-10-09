# FEAT-29 — Aspecto de las cartas en el PDF: nombre dentro de la imagen y marcos disparejos

**Estado: por definir. Solo están anotadas las dos observaciones de Carlos; faltan las preguntas y las historias. Sin rama todavía.**

**Contexto.** Salió el 2026-10-09 mientras Carlos probaba [FEAT-27](FEAT-27-pdf-velocidad-y-peso.md): al ver la baraja del PDF notó dos cosas del aspecto de las cartas y decidió tratarlas en una feature aparte.

1. **Las imágenes se ven con borde a los lados pero no arriba.** Revisado en el PDF que descargó (lotería de 24 cartas de la base de pruebas): el borde no lo pone el PDF, viene pintado dentro de la ilustración. Las cartas con IA de febrero de 2026 traen su propio marco (una orilla clara y una línea oscura). El PDF acomoda la imagen llenando la casilla y recortando lo que sobra arriba y abajo, así que el marco de arriba se pierde y el de los lados se queda. Falta comprobar si las cartas con IA actuales también traen marco.
2. **El nombre no le gusta en su franja blanca al pie.** Carlos quiere que el nombre quede incorporado a la imagen.

**Fuera de esta feature.** Peso y velocidad del PDF (FEAT-27), y nombre del archivo y limpieza (FEAT-28).

**Qué toca de lo ya decidido.** El punto 2 reabre, a pedido de Carlos, dos decisiones de [FEAT-26](FEAT-26-pdf-impresion-y-recorte.md): la 5 (el nombre va en un solo renglón, en su franja) y la 6 (la letra no baja de 8 puntos). Al definir esta feature hay que revisar también si `docs/contexto-negocio.md` o `docs/diseno-mockups.md` describen la carta con su franja, y seguir la regla de sincronizar la base de conocimiento antes de editarlos.

**Punto de partida (para no rehacerlo).**

- La carta se dibuja en `drawCardOnPage` (`src/services/pdf/draw.ts`): imagen recortada a la casilla, franja blanca con el nombre al pie y borde negro al final. El acomodo de la imagen está en `placeImageInCard` y el alto de la franja en `titleSpaceFor` (`src/services/pdf/layout.ts`).
- Las cartas de loterías temáticas ya traen su nombre dibujado y van enteras, sin franja (FEAT-23): no deberían cambiar.
- El mismo dibujo se usa en tableros y en baraja: lo que se decida aplica a los dos, salvo que se defina otra cosa.

## Preguntas por resolver con Carlos antes de construir

Por definir. Como mínimo: cómo se ve el nombre sobre la imagen (posición, fondo, tamaño de letra y qué pasa con los nombres largos), si aplica a tableros y baraja por igual, y qué se hace con el marco pintado de las ilustraciones (recortarlo, dejarlo completo o no tocarlo).

## Historias

Por escribir, una vez resueltas las preguntas.
