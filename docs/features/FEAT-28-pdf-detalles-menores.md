# FEAT-28 — Detalles menores del PDF: nombre del archivo, descarga y limpieza

**Estado: por definir. Historias en borrador; faltan 3 decisiones de Carlos (sección «Preguntas por resolver») antes de construir. Sin rama todavía.**

**Contexto.** Cuarta y última de las features que salieron de la revisión del PDF del 2026-10-09 (la primera es [FEAT-25](FEAT-25-pdf-sin-cartas-danadas.md)). Reúne los puntos 12 a 14 de esa revisión:

12. El archivo siempre se llama `loteria-tableros.pdf` y no lleva título interno (el que muestran los lectores de PDF en la pestaña).
13. La descarga puede fallar en algunos navegadores: el enlace temporal se libera justo después del clic. Es una sospecha por cómo está escrito el código (`downloadPDF` en `src/services/PDFService.ts`); **no está comprobada** en iPhone ni en los navegadores internos de Facebook o Instagram.
14. Código sin uso y sin pruebas: `generateCardPDF` no se llama desde ningún lado y usa otra proporción de carta (7:11); el acomodo de la baraja vive dentro de una función de más de 150 líneas.

**Fuera de esta feature.** Impresión y recorte ([FEAT-26](FEAT-26-pdf-impresion-y-recorte.md)) y velocidad y peso ([FEAT-27](FEAT-27-pdf-velocidad-y-peso.md)). No cambia cómo se ve el PDF.

**Clasificación:** ajustes pequeños en la descarga del PDF y limpieza de código. No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones. Estimado: 1 a 2 sesiones.

**Punto de partida (para no rehacerlo).**

- Las loterías temáticas ya tienen su propio nombre de archivo (`seasonalPdfFileName` en `src/utils/seasonalLoteria.ts`: el nombre de la lotería en minúsculas, sin acentos y con guiones). Se puede reutilizar la misma forma.
- El visitante trabaja con una sola lotería guardada en su navegador; hay que revisar qué nombre tiene antes de decidir cómo se llama su archivo.
- La US A3 mueve el acomodo de la baraja, que FEAT-26 también toca (hoja carta y centrado). Conviene construir FEAT-26 primero, o hacer la US A3 antes de abrir FEAT-26, pero no las dos a la vez.

## Preguntas por resolver con Carlos antes de construir

Una por turno. Las recomendaciones son propuestas, no decisiones.

1. **Nombre del archivo.** (a) El nombre de la lotería, por ejemplo `loteria-cumple-de-ana.pdf`, y `loteria-tableros.pdf` cuando no tiene nombre — recomendada. (b) Nombre de la lotería más la fecha. (c) Dejarlo como está.
2. **Si la descarga falla en navegadores internos (Facebook, Instagram).** Depende de lo que salga en la comprobación de la US A2. (a) Mostrar un aviso «Abre esta página en tu navegador para descargar el PDF» — recomendada si se confirma el fallo. (b) No hacer nada especial.
3. **`generateCardPDF` (PDF de una sola carta).** (a) Borrarlo: no se usa — recomendada. (b) Conservarlo porque se piensa ofrecer «descargar una carta» más adelante; en ese caso sería una función nueva y habría que definirla aparte.

## Grupo A — Detalles menores (borrador)

### US A1 — El archivo se llama como la lotería   ·   Estado: por definir (pregunta 1)

- **Historia** — Como persona que descarga varias loterías, quiero que cada archivo lleve el nombre de su lotería, para encontrarlo después entre mis descargas.
- **Entrega demostrable** — El PDF se descarga con el nombre decidido en la pregunta 1 y lleva ese mismo nombre como título interno.
- **Construido** — —
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — Con sesión iniciada, abre una lotería llamada «Cumple de Ana» y descarga su PDF → el archivo debería llamarse `loteria-cumple-de-ana.pdf` → ábrelo → la pestaña del lector debería decir «Cumple de Ana». Sin sesión, descarga desde la vista previa → el archivo debería llevar el nombre acordado para ese caso.
- **Escenarios cubiertos**:
  - [ ] El nombre del archivo se arma sin acentos, espacios ni signos. (Prueba automática.)
  - [ ] Una lotería sin nombre usa el nombre por defecto. (Prueba automática.)
  - [ ] El PDF lleva título interno. (Prueba automática.)
  - [ ] Descarga con el nombre correcto desde C3 y U2. (Demo.)

### US A2 — La descarga funciona en iPhone y en navegadores internos   ·   Estado: por definir (pregunta 2)

- **Historia** — Como persona que llega al sitio desde su teléfono, a veces desde un enlace de Facebook o Instagram, quiero poder descargar mi PDF.
- **Entrega demostrable** — Primero, una comprobación: una tabla en este archivo con el resultado de descargar en iPhone (Safari), Android (Chrome) y dentro de Facebook e Instagram. Después, la corrección que haga falta según esa tabla: como mínimo, no liberar el enlace temporal antes de que el navegador empiece la descarga.
- **Construido** — —
- **Depende de** — nada. La comprobación la hace Carlos con sus teléfonos en `dev`.
- **Cómo se prueba (guion de demo)** — En cada navegador de la tabla, abre `dev.chorroybuenas.com.mx`, arma una lotería mínima y pulsa descargar → el PDF debería bajar o abrirse; donde el navegador no lo permita, debería verse el aviso acordado.
- **Escenarios cubiertos**:
  - [ ] Tabla de comprobación «antes» escrita en este archivo.
  - [ ] La descarga funciona en Safari de iPhone y en Chrome de Android. (Demo.)
  - [ ] En navegadores internos ocurre lo decidido en la pregunta 2. (Demo.)

### US A3 — Código del PDF ordenado y con pruebas   ·   Estado: por definir (pregunta 3)

- **Historia** — Como responsable del sitio, quiero que el código del PDF no tenga partes muertas y que el acomodo de la baraja tenga pruebas, para poder cambiarlo sin romperlo.
- **Entrega demostrable** — Se retira lo que no se usa (según la pregunta 3) y el acomodo de la baraja queda en su propia función, con sus medidas junto a las del tablero y con pruebas. El PDF resultante es idéntico al de antes.
- **Construido** — —
- **Depende de** — coordinar con FEAT-26 (ver «Punto de partida»).
- **Cómo se prueba (guion de demo)** — A simple vista no cambia nada. Descarga un PDF con baraja de más de 10 cartas → las páginas de «Baraja Completa» deberían verse igual que antes, con sus títulos de continuación.
- **Escenarios cubiertos**:
  - [ ] Las medidas y posiciones de las cartas de la baraja se calculan en una función con pruebas. (Prueba automática.)
  - [ ] No queda código del PDF sin uso. (Revisión.)
  - [ ] El PDF se ve igual que antes. (Demo.)
