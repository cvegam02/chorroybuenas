# FEAT-14 — Ver una carta en grande desde la pantalla de Cartas

**Estado: ✅ hecha — dada por hecha por Carlos el 2026-10-07 («marca todo como completado»). En producción desde el 2026-10-06 (`dev` pasó a `main` con el PR #23).**

**Contexto.** En la lotería guardada (U2) se puede tocar una carta y verla en grande (ventana M10). En la pantalla de Cartas (C1), que es donde se suben y se convierten con IA, no: en teléfono, tocar una carta abre un menú con Editar, Restaurar, Convertir y Eliminar, y la miniatura es muy chica para juzgar cómo quedó la conversión. Carlos lo señaló el 2026-10-06.

**Fuera de esta feature.** La computadora: ahí el clic sigue abriendo la ventana de editar, donde la imagen ya se ve a buen tamaño. Tampoco se cambia la ventana M10 ni la lotería guardada.

**Clasificación:** solo interfaz, una pantalla (C1) y los textos en español e inglés. No toca base de datos, saldos, cobros ni permisos. Estimado: 1 sesión.

## Decisiones tomadas con el usuario (2026-10-06)

1. **En teléfono, la carta en grande se abre desde el menú de la carta**, con una opción nueva arriba: «Ver en grande». _(Descartadas: que tocar la carta la abra en grande y las acciones vivan dentro de esa ventana, porque cambia el recorrido actual y obliga a rediseñar la ventana; agregar además un botón en computadora.)_
2. **Se registra como feature suelta**, no como parte de una fase, en la rama `feature/vista-previa-carta-cartas`.
3. **El índice de pantallas se actualiza**: M10 aparece también en C1. Confirmado por Carlos con los cuatro puntos de la regla de la base de conocimiento.

**Decidido al construir, por confirmar con Carlos:** la opción solo aparece si la carta tiene imagen (sin imagen no hay nada que ver en grande).

## Diseño

**Pantalla C1 (Cartas), en teléfono.** El menú que sale al tocar una carta gana un primer renglón, «Ver en grande», con el mismo aspecto que los demás. Al tocarlo, el menú se cierra y se abre la ventana M10 con la imagen y el título de la carta. Se cierra con la ✕, tocando fuera o con Escape, y se vuelve a la lista de cartas.

**Lo que se reutiliza.** La ventana M10 tal cual, sin cambios. No hay colores ni componentes nuevos.

**Lo que no cambia.** El resto del menú, la computadora y el bloqueo durante la conversión en lote (mientras una carta está en la cola, su menú no se abre, así que tampoco se puede ver en grande).

## Grupo A — Vista previa

### US A1 — Ver una carta en grande desde Cartas, en teléfono   ·   Estado: ✅ hecha — dada por hecha por Carlos el 2026-10-07 («marca todo como completado»)

- **Historia** — Como persona que arma su lotería desde el celular, quiero ver una carta en grande desde la pantalla de Cartas, para revisar cómo quedó la imagen (sobre todo después de convertirla con IA) sin tener que entrar a editarla.
- **Entrega demostrable** — En teléfono, al tocar una carta en Cartas, el menú tiene arriba «Ver en grande» y al tocarlo la carta se abre en grande con su título.
- **Construido** — 2026-10-06, en la rama `feature/vista-previa-carta-cartas`. Renglón nuevo en el menú de la carta, que abre la ventana M10 ya existente; textos nuevos en español («Ver en grande») e inglés («View larger»). `diseno-mockups.md` actualizado (C1 y M10). Sin pruebas automáticas nuevas: no toca dinero ni permisos y el proyecto no tiene pruebas de componentes.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En `dev.chorroybuenas.com.mx`, desde el celular → Crear → Cartas, con al menos una carta subida → toca la carta → debería salir el menú con «Ver en grande» como primera opción → tócala → debería verse la carta en grande con su título abajo → ciérrala con la ✕ o tocando fuera → deberías volver a la lista de cartas, sin cambios.
- **Escenarios cubiertos**:
  - [x] En teléfono, el menú de la carta muestra «Ver en grande» arriba y abre la carta en grande. (Demo.)
  - [x] La ventana se cierra con la ✕ y tocando fuera, y la lista queda igual. (Demo.)
  - [x] Una carta recién convertida con IA se ve en grande con la imagen nueva. (Demo.)
  - [x] El resto del menú (Editar, Restaurar, Convertir, Eliminar) funciona como antes. (Demo.)
  - [x] En computadora no cambia nada: el clic sigue abriendo la ventana de editar. (Demo.)
  - [x] Con el sitio en inglés, la opción dice «View larger». (Demo.)
