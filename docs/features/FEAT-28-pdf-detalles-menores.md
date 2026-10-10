# FEAT-28 — Detalles menores del PDF: nombre del archivo, descarga y limpieza

**Estado: construida el 2026-10-09. Va a `dev` con el PR de la rama `feature/pdf-detalles-menores`; ahí falta seguir los guiones de demo y llenar la tabla de comprobación de la US A2. Hechas: US A1, A2 (la corrección) y A3. Sin decisiones pendientes. Rama: `feature/pdf-detalles-menores`, creada desde `dev` con FEAT-26 y FEAT-27 ya fusionadas.**

**Contexto.** Cuarta y última de las features que salieron de la revisión del PDF del 2026-10-09 (la primera es [FEAT-25](FEAT-25-pdf-sin-cartas-danadas.md)). Reúne los puntos 12 a 14 de esa revisión:

12. El archivo siempre se llama `loteria-tableros.pdf` y no lleva título interno (el que muestran los lectores de PDF en la pestaña).
13. La descarga puede fallar en algunos navegadores: el enlace temporal se libera justo después del clic. Es una sospecha por cómo está escrito el código (`downloadPDF` en `src/services/PDFService.ts`); **no está comprobada** en iPhone ni en los navegadores internos de Facebook o Instagram.
14. Código sin uso y sin pruebas: `generateCardPDF` no se llama desde ningún lado y usa otra proporción de carta (7:11); el acomodo de la baraja vive dentro de una función de más de 150 líneas.

**Fuera de esta feature.** Impresión y recorte ([FEAT-26](FEAT-26-pdf-impresion-y-recorte.md)) y velocidad y peso ([FEAT-27](FEAT-27-pdf-velocidad-y-peso.md)). No cambia cómo se ve el PDF.

**Clasificación:** ajustes pequeños en la descarga del PDF y limpieza de código. No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones. Estimado: 1 a 2 sesiones.

**Punto de partida (para no rehacerlo).**

- Las loterías temáticas ya tienen su propio nombre de archivo (`seasonalPdfFileName` en `src/utils/seasonalLoteria.ts`: el nombre de la lotería en minúsculas, sin acentos y con guiones). Se puede reutilizar la misma forma.
- El visitante trabaja con una sola lotería guardada en su navegador y esa lotería **no tiene nombre** (revisado el 2026-10-09): su archivo lleva siempre el nombre por defecto.
- FEAT-26 y FEAT-27 ya están en `dev` y dejaron las medidas de la baraja en su propia función con pruebas (`deckGridLayout` en `src/services/pdf/layout.ts`, `tests/src/pdfDeckLayout.test.ts`). Para la US A3 queda retirar `generateCardPDF` y sacar del ciclo de dibujo el cálculo de la posición de cada carta.

## Decisiones tomadas con el usuario

Tomadas con Carlos el 2026-10-09.

1. **Nombre del archivo: el de la lotería.** «Cumple de Ana» baja como `loteria-cumple-de-ana.pdf`; si el nombre ya empieza con «Lotería», la palabra no se repite (`loteria-de-ana.pdf`). Sin sesión o sin nombre, `loteria-tableros.pdf`, como antes. El título interno del PDF es el nombre de la lotería tal cual; sin nombre no lleva título y el lector muestra el nombre del archivo. Descartadas: agregar la fecha al nombre (queda más largo) y dejarlo como estaba. **Ampliación del mismo día:** las loterías temáticas también llevan su nombre como título interno (su nombre de archivo ya era correcto y no cambia); las que ya estaban armadas lo reciben solo si se vuelven a armar.
2. **Navegadores internos (Facebook, Instagram): no se hace nada especial.** Solo se corrige la liberación del enlace temporal; si aun así la descarga falla ahí, se queda así. Descartadas: mostrar el aviso «Abre esta página en tu navegador para descargar el PDF» y decidir después de probar.
3. **`generateCardPDF` se borra.** No se usa. Si algún día se ofrece «descargar una carta», se define como feature nueva. Descartada: conservarla.

## Grupo A — Detalles menores

### US A1 — El archivo se llama como la lotería   ·   Estado: construida, falta la demo en `dev`

- **Historia** — Como persona que descarga varias loterías, quiero que cada archivo lleve el nombre de su lotería, para encontrarlo después entre mis descargas.
- **Entrega demostrable** — El PDF se descarga con el nombre de la decisión 1 y lleva el nombre de la lotería como título interno.
- **Construido** — 2026-10-09. `pdfFileName` en `src/services/pdf/fileName.ts` arma el nombre (comparte con las loterías temáticas la forma de quitar acentos y signos, `src/utils/fileNameSlug.ts`); `generatePDF` acepta `title` y lo pone como título del PDF. Lo usan la vista previa (`src/AppRouter.tsx`) y la lotería guardada (`src/components/SetView/SetView.tsx`); el armado de loterías temáticas (`src/components/AdminPanel/SeasonalBuilder/SeasonalBuilderSave.tsx`) pasa solo el título. Pruebas: `tests/src/pdfFileName.test.ts`, `tests/src/pdfTitle.test.ts`.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Con sesión iniciada, abre una lotería llamada «Cumple de Ana» y descarga su PDF → el archivo debería llamarse `loteria-cumple-de-ana.pdf` → ábrelo → la pestaña del lector debería decir «Cumple de Ana». Abre otra llamada «Lotería de Ana» → debería bajar como `loteria-de-ana.pdf`. Sin sesión, descarga desde la vista previa → el archivo debería llamarse `loteria-tableros.pdf`. En Administración, arma (o vuelve a armar) una lotería temática y abre su PDF → la pestaña del lector debería decir el nombre de la lotería.
- **Escenarios cubiertos**:
  - [x] El nombre del archivo se arma sin acentos, espacios ni signos. (Prueba automática.)
  - [x] Una lotería sin nombre usa el nombre por defecto. (Prueba automática.)
  - [x] El PDF lleva título interno. (Prueba automática.)
  - [ ] Descarga con el nombre correcto desde C3 y U2. (Demo.)
  - [ ] El PDF de una lotería temática recién armada lleva su nombre como título interno. (Demo.)

### US A2 — La descarga funciona en iPhone y en navegadores internos   ·   Estado: corrección construida; faltan la tabla y la demo en `dev`

- **Historia** — Como persona que llega al sitio desde su teléfono, a veces desde un enlace de Facebook o Instagram, quiero poder descargar mi PDF.
- **Entrega demostrable** — Primero, una comprobación: una tabla en este archivo con el resultado de descargar en iPhone (Safari), Android (Chrome) y dentro de Facebook e Instagram. Después, la corrección: no liberar el enlace temporal antes de que el navegador empiece la descarga. En los navegadores internos no se agrega nada más (decisión 2).
- **Construido** — 2026-10-09. `downloadPDF` pasó a `src/services/pdf/download.ts` y libera el enlace temporal un minuto después del clic, no al instante. Prueba: `tests/src/pdfDownload.test.ts`. La tabla la llena Carlos: la columna «Antes» se puede llenar ya, porque `dev` todavía tiene el código anterior.
- **Depende de** — nada. La comprobación la hace Carlos con sus teléfonos en `dev`.
- **Cómo se prueba (guion de demo)** — En cada navegador de la tabla, abre `dev.chorroybuenas.com.mx`, arma una lotería mínima y pulsa descargar → el PDF debería bajar o abrirse. Anota el resultado en la tabla; dentro de Facebook e Instagram puede no bajar, y eso se deja así.
- **Escenarios cubiertos**:
  - [ ] Tabla de comprobación «antes» escrita en este archivo.
  - [x] El enlace temporal no se libera al hacer clic, sino después. (Prueba automática.)
  - [ ] La descarga funciona en Safari de iPhone y en Chrome de Android. (Demo.)
  - [ ] El resultado en navegadores internos queda anotado en la tabla; no se agrega aviso. (Demo.)

| Navegador | Antes (código anterior) | Después (con la corrección) |
|---|---|---|
| iPhone — Safari | | |
| Android — Chrome | | |
| Dentro de Facebook | | |
| Dentro de Instagram | | |

### US A3 — Código del PDF ordenado y con pruebas   ·   Estado: construida, falta la demo en `dev`

- **Historia** — Como responsable del sitio, quiero que el código del PDF no tenga partes muertas y que el acomodo de la baraja tenga pruebas, para poder cambiarlo sin romperlo.
- **Entrega demostrable** — Se borra `generateCardPDF` (decisión 3) y el acomodo de la baraja queda en su propia función, con sus medidas junto a las del tablero y con pruebas. El PDF resultante es idéntico al de antes.
- **Construido** — 2026-10-09. Se borró `generateCardPDF`. Las páginas de la baraja se dibujan en `drawDeckPages` (`src/services/pdf/draw.ts`); la posición de cada carta, el reparto en páginas y el título de cada página salen de `deckCardPosition`, `deckPages` y `deckPageTitle` (`src/services/pdf/layout.ts`), con pruebas en `tests/src/pdfDeckLayout.test.ts`. Las medidas de la baraja pasaron a `src/services/pdf/constants.ts`, junto a las del tablero. Comprobación de que el PDF no cambió: el archivo generado antes y después del cambio es idéntico byte por byte en 8 combinaciones (barajas de 1, 7, 10 y 24 cartas, normales y de temporada); se hizo con una prueba temporal que no se conserva.
- **Depende de** — nada (FEAT-26 y FEAT-27 ya están en `dev`).
- **Cómo se prueba (guion de demo)** — A simple vista no cambia nada. Descarga un PDF con baraja de más de 10 cartas → las páginas de «Baraja Completa» deberían verse igual que antes, con sus títulos de continuación.
- **Escenarios cubiertos**:
  - [x] Las medidas y posiciones de las cartas de la baraja se calculan en una función con pruebas. (Prueba automática.)
  - [x] No queda código del PDF sin uso. (Revisión del 2026-10-09: todo lo que exportan `src/services/PDFService.ts` y `src/services/pdf/` se usa.)
  - [ ] El PDF se ve igual que antes. (Demo.)
