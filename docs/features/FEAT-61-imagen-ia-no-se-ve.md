# FEAT-61 — La carta transformada con IA no se ve en la lotería (hotfix)

**Estado:** construida el 2026-11-08 (US A1 a A3) y llevada ese mismo día a dev y a producción (`main`) por pedido de Carlos, como hotfix, sin probarla antes en dev: PR de `feature/hotfix-imagen-ia` a `dev` y PR de `dev` a `main`. Rama `feature/hotfix-imagen-ia` (creada el 2026-11-08 desde `dev`). Sin migraciones ni edge functions: todo es del navegador.

**Contexto.** Carlos vio en producción que, al transformar una carta con IA, la imagen sí se transforma pero la lotería (las cartas compuestas, los tableros y el PDF) sigue mostrando la foto de antes. Revisado en producción: la carta sí apunta a la imagen nueva (`<usuario>/ai/<carta>_<hora>.webp`) y el archivo existe; la carpeta `ai` no es el problema (los permisos de Storage solo miran la primera carpeta, la del usuario).

Qué pasaba: el navegador guarda una copia local de la imagen de cada carta (IndexedDB), por el id de la carta, y la prefiere sobre Storage. Antes de FEAT-58 la IA guardaba la imagen nueva desde el navegador y esa copia se reemplazaba. Desde FEAT-58 (US A7) la guarda el servidor, y la copia local se quedaba con la foto anterior; además nunca se sobrescribía al recargar, así que el problema no se quitaba solo.

**No cambia reglas de negocio ni el índice de pantallas.**

## Decisiones tomadas con el usuario

1. **El arreglo de que la página se recarga al transformar con IA entra en esta misma feature, como US A2.** Carlos lo reportó al revisar el hotfix y pidió revisar antes por qué se renovaba la sesión. 2026-11-08. _(Descartado: una feature aparte.)_
2. **Al entrar a otra página, se empieza arriba; también entra aquí, como US A3.** Con «atrás» o «adelante» del navegador se respeta dónde iba. 2026-11-08. _(Descartados: una feature aparte; ir arriba también con «atrás».)_

## User Stories

### US A1 — La copia local de la imagen sigue al archivo de la carta   ·   Estado: hecha, en producción

- **Historia:** Como dueño de una lotería, quiero que al transformar una carta con IA la lotería, los tableros y el PDF muestren la imagen nueva, para no imprimir la foto vieja.
- **Entrega demostrable:** Con sesión, transformar una carta con IA → en la lotería y en los tableros se ve la carta nueva, al momento y al recargar. Las cartas que ya se transformaron antes de este arreglo se ven bien al abrir la lotería.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En dev, con sesión, abrir una lotería → transformar una carta con IA → ver la carta en la lotería y en un tablero: es la transformada → recargar → sigue la transformada → bajar el PDF → sale la transformada.
- **Escenarios cubiertos:** transformar una carta; transformar en lote; recargar; PDF; cartas transformadas antes del arreglo; sin sesión (sin cambios).
- **Construido:** 2026-11-08. La copia local guarda la ruta del archivo de Storage del que salió (`cacheImageBlob`, `src/utils/indexedDB.ts`); `getImage` y `getImageBlob` solo la usan si es de la misma ruta que tiene la carta (`isCachedFor`, con pruebas en `tests/src/cardImageCache.test.ts`); si no, se baja otra vez y se reemplaza. Lo usan `readStoredCardImage` (`src/services/cardImage.ts`) y la carga de cartas de `useCards`. Sin sesión no hay ruta y todo sigue igual. Efecto secundario: las copias guardadas antes de este cambio no tienen ruta y se bajan una vez más.

### US A2 — Transformar con IA no recarga la página   ·   Estado: hecha, en producción

- **Historia:** Como dueño de una lotería, quiero que al transformar una carta con IA la página se quede como está, para no perder de vista lo que estaba haciendo.
- **Entrega demostrable:** Con sesión, en la lotería, al darle «Transformar con IA» a una carta, la página no parpadea ni vuelve a mostrar la carga: solo la carta muestra que se está transformando y luego cambia.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En dev, con sesión, abrir una lotería con tableros → bajar hasta una carta → «Transformar con IA» → la página no se va arriba ni muestra la carga; al terminar solo cambia esa carta. Repetir en lote → igual.
- **Escenarios cubiertos:** una carta; en lote; la renovación automática de la sesión (cada hora); entrar, salir o cambiar de cuenta (sí se recarga, como debe).
- **Construido:** 2026-11-08. La IA renueva la sesión antes de transformar (`AIService.transformToLoteria`) para mandar un permiso vigente a la función; eso se conserva. El aviso de esa renovación cambiaba el usuario en `AuthContext` por un objeto nuevo, y `useCards` y `useBoard` volvían a cargar cartas y tableros. Ahora `nextAuthUser` (`src/utils/authUser.ts`, con pruebas en `tests/src/authUser.test.ts`) conserva el mismo usuario cuando solo se renovó el permiso.

### US A3 — Cada página empieza arriba   ·   Estado: hecha, en producción

- **Historia:** Como visitante o dueño, quiero que al entrar a otra página empiece arriba, para no tener que subir a buscar el inicio.
- **Entrega demostrable:** Al ir de una página a otra con los enlaces y botones del sitio, la nueva empieza arriba. Con «atrás» del navegador se regresa a la altura en que iba. Los enlaces a una parte de la página (como «Mis loterías») siguen bajando a ella.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En dev, bajar hasta el pie de la página de inicio → entrar a una temática o a «Mi cuenta» → empieza arriba. Abrir una lotería desde «Mis loterías» habiendo bajado → empieza arriba. Dar «atrás» → regresa a «Mis loterías» a la altura en que iba.
- **Escenarios cubiertos:** enlaces de la barra y del pie; botones que llevan a otra página; «atrás» y «adelante»; enlaces con ancla; cambiar de paso en la creación (cartas → tableros → vista previa).
- **Construido:** 2026-11-08. Solo seis páginas subían arriba por su cuenta. Ahora `AppRouter` usa `useScrollToTopOnNavigate` (`src/hooks/`), que decide con `shouldScrollToTop` (`src/utils/scrollOnNavigate.ts`, con pruebas en `tests/src/scrollOnNavigate.test.ts`): sube al cambiar de ruta por un enlace o botón, salvo con «atrás»/«adelante» o con ancla. Las seis páginas conservan su propio `scrollTo`, que no estorba.
