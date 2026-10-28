# FEAT-59 — Cantador: carta grande con las cantadas al lado, modo manual y ritmo personalizado

**Estado:** definida con Carlos el 2026-10-28 y construida el mismo día (US A1 a A3) y llevada a dev con el PR #81; falta que Carlos la pruebe en dev. Sin migraciones ni edge functions: todo es del navegador. Se trabaja en la rama `feature/cantador-manual` (creada el 2026-10-28 desde `dev`).

**Contexto.** El cantador (U4, FEAT-55) muestra la carta en grande con una tira de las últimas cantadas debajo, y solo canta en automático: «Tradicional» (tres cartas y una pausa) o una carta cada 4, 6, 8 o 10 segundos. Las flechas ← y → solo recorren las cartas ya cantadas. Carlos quiere aprovechar la pantalla de la computadora, poder llevar el juego a mano con el teclado y ajustar los tiempos para jugar más rápido.

**Propuesta.** En computadora, la carta grande a la izquierda y a la derecha todas las cantadas; el teléfono se queda como está. En «Ritmo» se agregan «Personalizado» (segundos entre cartas, cada cuántas cartas una pausa y cuánto dura) y «Manual» (→ saca la siguiente, ← regresa).

**Cambia reglas de negocio:** §20 «Automático» (ritmos) y el caso 30. **Cambia el índice de pantallas:** U4. Carlos aprobó los cambios el 2026-10-28 y quedaron aplicados: §20 «Ritmos», §15 y §17 de `contexto-negocio.md`, el caso 30 de `casos-de-uso.md` y U4 de `diseno-mockups.md`.

## Decisiones tomadas con el usuario

1. **En computadora, la carta grande va a la izquierda y a la derecha todas las cartas cantadas**, en una cuadrícula, la más reciente primero, con su número de salida; si son muchas, se desplaza; al tocar una se ve en grande, como hoy. El teléfono no cambia. 2026-10-28. _(Descartado: solo las últimas 6 a 8 en una columna con «Ver todas».)_
2. **«Manual» es una opción más de «Ritmo»**, que se elige antes de empezar. En manual, → o el botón grande «Siguiente carta» saca y canta la carta nueva; ← o «Anterior» regresa por las cantadas. Si se está revisando atrás, → avanza por las cantadas hasta la última y la siguiente vez saca una nueva. Nada corre solo, así que no hay pausa. 2026-10-28. _(Descartado: un interruptor «Automático / Manual» durante la partida.)_
3. **«Personalizado» es otra opción de «Ritmo» con tres campos:** segundos entre cartas (1 a 15), pausa cada … cartas (nunca, o de 2 a 10) y duración de la pausa (1 a 20 segundos). Empieza en 3 s, cada 3 cartas y 5 s. Se recuerda en ese navegador, como hoy el ritmo, y el tiempo cuenta desde que termina la voz. Los ritmos de hoy se quedan. 2026-10-28. _(Descartado: los mismos campos sin límites, desde 0.)_
4. **En manual no se saca otra carta hasta que termine de sonar la anterior** (voz del navegador o con IA; en silencio, el segundo de espera de siempre). Mientras suena, «Siguiente carta» se ve apagado y →, el espacio y tocar la carta no sacan otra; ← y → por las ya cantadas siguen libres. Dejar aplastada una tecla no repite. Surgió al revisar la US A2: dejando aplastado «Siguiente» se brincaban todas las cartas. 2026-10-28. _(Descartado: bloquear todo mientras suena, también revisar las anteriores.)_

## User Stories

### US A1 — En computadora, la carta grande con las cantadas al lado   ·   Estado: construida, a dev con el PR #81

- **Historia:** Como quien canta en una fiesta con la computadora, quiero ver la carta en grande y todas las que ya salieron al lado, para revisar rápido cuando alguien grita «¡Lotería!».
- **Entrega demostrable:** En U4, en pantallas de computadora, la carta actual ocupa la izquierda en grande y a la derecha una cuadrícula con todas las cantadas (la más reciente primero, con su número de salida y el conteo «N de M»), que se desplaza si no caben; al tocar una se ve en grande, como hoy. Los controles quedan abajo. En teléfono no cambia nada.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En computadora, abrir el cantador de una lotería y cantar 10 cartas → la carta actual a la izquierda, las 10 a la derecha con la más reciente arriba. Tocar una de la derecha → se ve en grande con «Viendo la carta N». Achicar la ventana a tamaño de teléfono → se ve como hoy.
- **Escenarios cubiertos:** sin cartas cantadas; pocas; más de las que caben (se desplaza); revisar una vieja; pantalla de teléfono y de tableta.
- **Construido:** 2026-10-28. Desde 1024 px de ancho (computadora y tableta acostada), `CallerPage` arma dos columnas: la carta, el aviso «Revisando…» y los controles a la izquierda; a la derecha, `CallerCalledPanel` (en `CallerHistory.tsx`) con «Cantadas: N de M», «Ver todas» (sigue dando acceso a las que faltan) y la cuadrícula de todas las cantadas, la más reciente primero (`calledNewestFirst`, con prueba), con su número de salida y un marco en la que se ve en grande; se desplaza si no caben. Tocar una hace lo mismo que la tira de antes. Debajo de 1024 px (teléfono y tableta parada) no cambia nada: tira de las últimas 5 y «Ver todas».

### US A2 — Modo manual con las flechas   ·   Estado: construida, a dev con el PR #81

- **Historia:** Como quien canta, quiero sacar cada carta cuando yo quiera con las flechas del teclado, para llevar el ritmo de la mesa.
- **Entrega demostrable:** «Ritmo» trae «Manual». En manual, el botón grande dice «Siguiente carta» y → saca y canta la siguiente; ← y «Anterior» regresan por las cantadas; si se está revisando atrás, → avanza hasta la última antes de sacar una nueva. Nada avanza solo. No se saca otra carta mientras suena la anterior (decisión 4).
- **Depende de:** —
- **Cómo se prueba (guion de demo):** Elegir «Manual» y empezar → dice «Se va y se corre con…» y espera. Presionar → tres veces → salen tres cartas, cada una con su voz. ← dos veces → se ven las anteriores; → dos veces → regresa a la última; → otra vez → sale una nueva. Dejar aplastada → → sale una sola carta; mientras se dice, «Siguiente carta» se ve apagado. Recargar a media partida → sigue donde iba y en manual.
- **Escenarios cubiertos:** manual con voz del navegador y con voz con IA; revisar atrás y volver; última carta de la baraja; recargar a media partida.
- **Construido:** 2026-10-28. «Ritmo» trae «Manual: tú sacas cada carta» al final de la lista (`AUTO_RHYTHMS`, `isManual`, con prueba) y se recuerda como los demás. En manual, «Empezar a cantar» dice «Se va y se corre con…» y deja la frase en pantalla con el botón «Siguiente carta». Durante la partida, el botón grande es «Siguiente carta» y desaparece el chico «Siguiente», que vuelve al acabar la baraja; el botón, → , el espacio y tocar la carta hacen lo mismo: si se está revisando atrás avanzan hasta la última y, si no, sacan y cantan la siguiente. `useAutoCaller` nunca corre solo en manual. Candado (decisión 4): `useAutoCaller` expone `speaking`, que dura desde que se saca una carta hasta que termina su voz, y en manual no se saca otra mientras dure; el teclado ignora la repetición de espacio y de → aplastadas. Recargar durante la espera de la primera carta regresa a la pantalla de inicio.

### US A3 — Ritmo personalizado   ·   Estado: construida, a dev con el PR #81

- **Historia:** Como quien canta, quiero ajustar los segundos entre cartas y las pausas, para jugar más rápido o más lento.
- **Entrega demostrable:** «Ritmo» trae «Personalizado»; al elegirlo aparecen «Entre cartas» (1 a 15 s), «Pausa cada» (nunca, o 2 a 10 cartas) y «Duración de la pausa» (1 a 20 s), con 3 s, cada 3 cartas y 5 s de inicio. Se recuerda en el navegador. El automático usa esos tiempos, contando desde que termina la voz.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** Elegir «Personalizado» con 1 s, pausa cada 2 cartas de 5 s → las cartas salen casi seguidas y cada 2 hay una pausa de 5 s. Poner 20 en «Entre cartas» → se queda en 15. Recargar → los valores siguen.
- **Escenarios cubiertos:** valores en los límites y fuera de ellos; «nunca» en pausa; recargar; cambiar a otro ritmo y regresar.
- **Construido:** 2026-10-28. «Ritmo» trae «Personalizado» antes de «Manual». Al elegirlo aparecen, debajo, «Entre cartas» y «Duración de la pausa» (campos de número con «segundos»; se escribe libre y al salir del campo, o con Enter, se queda dentro de sus límites; vacío regresa a lo que tenía) y «Pausa cada» (lista: «Nunca», «2 cartas» … «10 cartas»); con «Nunca», «Duración de la pausa» se ve apagado. Los límites, los valores de inicio y la lectura de lo guardado están en `callerAuto.ts` (`CUSTOM_LIMITS`, `DEFAULT_CUSTOM_RHYTHM`, `clampCustomRhythm`, `parseCustomRhythm`, con pruebas); `delayAfterCard` los usa contando desde que termina la voz, como los demás ritmos. Se guardan en el navegador aparte del ritmo (`cantador:ritmo-personalizado`), así que cambiar a otro ritmo y regresar los conserva.

### US A4 — «Cantar» alineado con los demás botones cuando faltan cartas   ·   Estado: construida, a dev con el PR #82

- **Historia:** Como dueño de una lotería a la que le faltan cartas, quiero ver «Cantar» alineado con los demás botones, para que el encabezado no se vea desacomodado.
- **Entrega demostrable:** En U2, con menos cartas del mínimo, «Cantar» queda a la misma altura que «Agregar fotos», «Invitar a subir fotos» y «⋮», y «Te faltan N cartas para cantar» se lee debajo del botón sin empujarlo. En teléfono no cambia. Surgió al revisar FEAT-59 en dev; Carlos la agregó a esta feature el 2026-10-28.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En computadora, abrir una lotería con menos cartas del mínimo → «Cantar» (apagado) a la misma altura que los otros botones y debajo «Te faltan N cartas para cantar». Abrir una con cartas suficientes → «Cantar» sin texto debajo, como hoy. En teléfono → igual que antes.
- **Escenarios cubiertos:** faltan cartas; cartas suficientes; con y sin tableros; computadora y teléfono.
- **Construido:** 2026-10-28. En computadora, el aviso se coloca debajo del botón sin ocupar lugar en la fila (`SetHeader.css`, `.set-header__sing-reason`), así la fila centra los botones por igual; cabe en el margen inferior del encabezado y, si los botones bajan a un segundo renglón (ventanas medianas), ese renglón se separa más para que el aviso no se encime. En teléfono, donde los botones van uno bajo otro, el aviso sigue en su lugar.
