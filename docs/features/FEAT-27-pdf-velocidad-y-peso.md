# FEAT-27 — El PDF se genera más rápido, pesa menos y muestra su avance

**Estado: por definir. Historias en borrador; faltan 2 decisiones de Carlos (sección «Preguntas por resolver») antes de construir. Sin rama todavía.**

**Contexto.** Tercera de las cuatro features que salieron de la revisión del PDF del 2026-10-09 (la primera es [FEAT-25](FEAT-25-pdf-sin-cartas-danadas.md)). Reúne los puntos 9 a 11 de esa revisión:

9. Cada imagen da vueltas de más: pasa de archivo a texto (base64) y de vuelta a bytes, y además se carga en el navegador solo para medirla, medida que después no se usa (`src/services/pdf/images.ts`).
10. Las imágenes PNG y WebP engordan el PDF: las WebP se convierten a PNG, que no comprime fotos. Convertirlas a JPEG daría archivos bastante más ligeros.
11. No hay avance visible: con muchos tableros la pantalla se queda en «generando» sin decir cuánto falta.

**Fuera de esta feature.** Impresión y recorte ([FEAT-26](FEAT-26-pdf-impresion-y-recorte.md)) y detalles menores ([FEAT-28](FEAT-28-pdf-detalles-menores.md)). No cambia cómo se ve el PDF. Mover la generación fuera del hilo principal del navegador (para que la página no se trabe) queda fuera: es un cambio grande y solo se plantea si, después de esta feature, sigue haciendo falta.

**Clasificación:** rendimiento de la generación del PDF y un aviso de avance en las pantallas que lo generan (C3, U2 y A1.7a). No toca base de datos, saldos, cobros ni permisos; sin migración ni cambios en funciones. Estimado: 2 sesiones.

**Punto de partida (para no rehacerlo).**

- FEAT-25 (US A4) ya dejó que cada imagen se lea una sola vez por PDF (`src/services/pdf/loadOnce.ts`). Esta feature se construye encima; conviene que FEAT-25 esté en `dev` antes de abrir la rama.
- Las fotos que sube el usuario ya se guardan como JPEG de hasta 768 px de ancho, y las cartas de loterías temáticas como JPEG de hasta 1000 px. PNG y WebP llegan sobre todo por otras vías (por ejemplo, las imágenes transformadas con IA); hay que comprobar cuáles antes de estimar el ahorro.
- No hay ninguna medición de tiempo ni de peso. La primera tarea de la feature es medir, para poder demostrar la mejora.

## Preguntas por resolver con Carlos antes de construir

Una por turno. Las recomendaciones son propuestas, no decisiones.

1. **Imágenes que no son JPEG.** (a) Convertirlas a JPEG de alta calidad con fondo blanco donde haya transparencia — recomendada: es lo que más baja el peso y una carta impresa no necesita transparencia. (b) Dejar las PNG como están y convertir solo las WebP. Decidir con las mediciones de la US A1 a la vista.
2. **Cómo se muestra el avance.** (a) Un texto junto al botón, «Preparando imágenes…» y luego «Tablero 3 de 10» — recomendada: no agrega componentes nuevos. (b) Una barra de avance. En cualquier caso, revisar `docs/diseno-mockups.md` y `docs/sistema-diseno.md` antes de diseñarlo, y confirmar el texto en español e inglés.

## Grupo A — Velocidad y peso (borrador)

### US A1 — Saber cuánto tarda y cuánto pesa hoy el PDF   ·   Estado: por hacer (sin decisiones pendientes)

- **Historia** — Como responsable del sitio, quiero conocer el tiempo y el peso actuales del PDF con una lotería de ejemplo, para comprobar que los cambios de esta feature de verdad mejoran.
- **Entrega demostrable** — Una tabla en este archivo con el tiempo de generación y el peso del PDF para dos casos (por ejemplo: 24 cartas con 8 tableros, y 54 cartas con 10 tableros), medidos antes de tocar nada, y la lista de qué formato de imagen llega por cada vía (subida, IA, temáticas).
- **Construido** — —
- **Depende de** — FEAT-25 en `dev`.
- **Cómo se prueba (guion de demo)** — Carlos genera los dos PDF de ejemplo en `dev` y compara el peso de los archivos con la tabla; deberían coincidir de forma aproximada.
- **Escenarios cubiertos**:
  - [ ] Tabla «antes» escrita en este archivo, con cómo se midió.
  - [ ] Lista de formatos de imagen por vía de entrada.

### US A2 — Las imágenes llegan al PDF sin vueltas de más   ·   Estado: por hacer (sin decisiones pendientes)

- **Historia** — Como persona que descarga una lotería grande, quiero que el PDF se genere sin demoras innecesarias ni trabar mi teléfono.
- **Entrega demostrable** — Cada imagen pasa directo de archivo a bytes, sin convertirse a texto ni cargarse en el navegador solo para medirla. El PDF resultante es idéntico al de antes y el tiempo de generación baja respecto a la tabla de la US A1.
- **Construido** — —
- **Depende de** — US A1.
- **Cómo se prueba (guion de demo)** — Genera en `dev` el caso grande de la US A1 → el PDF debería verse igual que antes, carta por carta → el tiempo anotado en la tabla «después» debería ser menor que el de «antes».
- **Escenarios cubiertos**:
  - [ ] Una imagen JPEG o PNG se reconoce por sus primeros bytes sin pasar por base64. (Prueba automática.)
  - [ ] El PDF se ve igual que antes. (Demo.)
  - [ ] Tabla «después» escrita en este archivo.

### US A3 — El PDF pesa menos   ·   Estado: por definir (pregunta 1)

- **Historia** — Como persona que descarga o comparte su lotería desde el teléfono, quiero que el archivo no pese de más.
- **Entrega demostrable** — Las imágenes que no son JPEG se convierten antes de entrar al PDF, según lo decidido en la pregunta 1. El peso del PDF baja respecto a la tabla de la US A1 en las loterías que traían esas imágenes, sin pérdida visible al imprimir.
- **Construido** — —
- **Depende de** — US A1 y US A2.
- **Cómo se prueba (guion de demo)** — Genera un PDF con cartas transformadas con IA → compara su peso con el de la tabla «antes» → debería ser menor → imprime una página y compárala con una impresa antes → no debería notarse diferencia de calidad.
- **Escenarios cubiertos**:
  - [ ] Una imagen con transparencia sale con fondo blanco, no negro. (Demo.)
  - [ ] Una imagen que ya era JPEG no se vuelve a comprimir. (Prueba automática.)
  - [ ] Peso «después» anotado en la tabla.
  - [ ] El PDF de una lotería temática armado en administración conserva su calidad. (Demo.)

### US A4 — Ver el avance mientras se arma el PDF   ·   Estado: por definir (pregunta 2)

- **Historia** — Como persona que espera su PDF, quiero ver cuánto falta, para saber que el sitio sigue trabajando y no cerrar la página.
- **Entrega demostrable** — Mientras se genera el PDF, la pantalla muestra en qué paso va, en la vista previa (C3), en la lotería guardada (U2) y en el armado de loterías temáticas (A1.7a).
- **Construido** — —
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En la vista previa, con 10 tableros, pulsa descargar → junto al botón debería verse el avance cambiando hasta terminar → al terminar, baja el PDF y el avance desaparece. Repite desde una lotería guardada.
- **Escenarios cubiertos**:
  - [ ] La generación informa su avance paso por paso (imágenes, cada tablero, baraja). (Prueba automática.)
  - [ ] El avance se ve en C3, U2 y A1.7a, en español e inglés. (Demo.)
  - [ ] Si la generación falla, el avance desaparece y queda el aviso de error de FEAT-25. (Demo.)
