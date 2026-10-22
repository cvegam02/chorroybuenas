# FEAT-52 — Aviso mientras se preparan las fotos

**Estado:** definida con Carlos el 2026-10-20. Se trabaja en `feature/aviso-subir-fotos`, creada el 2026-10-20 desde `dev`. La US A1 se construyó el 2026-10-20 y Carlos la revisó en su servidor local ese mismo día. Llega a `dev` con el PR de `feature/aviso-subir-fotos`, abierto el 2026-10-22; falta que Carlos la pruebe en `dev` antes de pasar a `main`.

**Contexto.** Carlos subió 54 fotos sin sesión con «Subir fotos» y pasaron unos segundos sin que nada se viera en pantalla. Revisado en el código el 2026-10-20: la ventana «Nombra tus fotos» (M6) lee todas las fotos, una por una, y solo se abre al terminar (`BatchUploadModal.tsx`). Mientras tanto no se muestra nada. La espera al terminar de nombrarlas sí tiene su barra de «Subiendo imágenes».

**No cambia reglas de negocio.** Solo agrega un aviso de espera en M6.

## Decisiones tomadas con el usuario

Decisiones de Carlos con Claude (2026-10-20):

1. **Se arregla en una feature aparte**, con su propia rama y PR. _(Descartado: meterlo en FEAT-51, que ya estaba en `dev`.)_
2. **El aviso es la misma ventanita de progreso que ya existe** («Subiendo imágenes»), con otro título y el porcentaje de fotos leídas. Al terminar se abre «Nombra tus fotos» como siempre.

## User Stories

### US A1 — Ver el avance mientras se preparan las fotos   ·   Estado: hecha, revisada por Carlos en local

- **Historia:** Como usuario que sube muchas fotos a la vez, quiero ver que el sitio las está preparando, para no pensar que se trabó.
- **Entrega demostrable:** Al elegir varias fotos con «Subir fotos», o al arrastrarlas, aparece de inmediato la ventanita «Preparando tus fotos…» con una barra y el porcentaje. Al llegar al 100 % se abre «Nombra tus fotos».
- **Construido:** El 2026-10-20. Primero se escribió la prueba, que falló sin el código: en `tests/src/uploadQueue.test.ts`, `readingPercent` va de 0 a 100 según las fotos leídas y no se sale de ese rango.

  Código:
  - `readingPercent`, en `src/utils/uploadQueue.ts`.
  - `BatchUploadModal` lleva la cuenta de fotos leídas y, mientras lee, muestra `UploadProgressModal` con el título «Preparando tus fotos…». Si la ventana se cierra o se eligen otras fotos a media lectura, la lectura anterior se descarta y el aviso no se queda pegado. Si una foto no se puede leer, el aviso se quita y el error queda en la consola.
  - Hay un texto nuevo en español e inglés (`batchUpload.preparing`).

  Typecheck, lint y las 1397 pruebas pasan.
- **Depende de:** Nada.
- **Cómo se prueba (guion de demo):** En dev, sin sesión, abre «Cartas» → pulsa «Subir fotos» y elige unas 50 fotos → debería aparecer en seguida «Preparando tus fotos…» con la barra avanzando → al terminar se abre «Nombra tus fotos» con la primera foto → repite arrastrando las fotos al recuadro y debería pasar lo mismo.
- **Escenarios cubiertos:**
  - El porcentaje va de 0 a 100 según las fotos leídas.
  - Con una sola foto el aviso casi no se nota, pero no estorba.
  - Si se cierra la ventana o se eligen otras fotos a media lectura, el aviso no se queda pegado.
