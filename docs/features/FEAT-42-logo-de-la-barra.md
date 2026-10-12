# FEAT-42 — El logo de la barra de arriba se ve más grande

**Estado: pedida por Carlos el 2026-10-12, en la rama `feature/logo-de-la-barra`, creada desde `dev`. Construida su única historia (US A1) ese mismo día y fusionada a `dev` en un merge directo, sin PR, porque Carlos lo pidió así. Se publica en dev.chorroybuenas.com.mx al subir `dev` a GitHub. Falta la demo de Carlos con el guion de la historia. A producción pasa después, con el PR de `dev` a `main`, cuando Carlos confirme lo probado en dev.**

**Contexto.** Carlos reportó el 2026-10-12 que el logo de la barra de arriba se ve muy chico y casi no se distingue.

**Qué se encontró.** `src/img/logo.png` es un cuadrado de 500×500 con margen transparente alrededor: el dibujo ocupa el 62 % del alto. Con los 44 px de la barra compacta el dibujo medía unos 27 px; con los 50 px de la barra ancha, unos 31 px.

**Es solo interfaz.** No cambia la navegación, ni el alto de la barra, ni el logo del PDF.

**Archivos.** `src/img/logo-barra.png` (nuevo), `src/components/Navbar/Navbar.tsx`, `MobileMenu.tsx` y `Navbar.css`.

## Decisiones tomadas con el usuario

Respuestas de Carlos (2026-10-12):

1. **Va como feature nueva, FEAT-42.** Claude lo propuso al entregar y Carlos pidió mandarlo a `dev` sin objetarlo.

Ajustes de Claude al construir, avisados a Carlos al entregar:

2. **La barra y el menú de teléfono usan una copia recortada del logo**, sin el margen transparente y reducida a 192 px de alto (pesa 79 KB; la original, 171 KB). _(Descartado: recortar `logo.png`, porque el PDF de los tableros también la usa y ya compensa ese margen en `src/services/pdf/constants.ts`.)_
3. **En pantallas anchas el logo sube de 50 a 60 px de alto;** la barra sigue en 72 px.
4. **En teléfono se queda en 44 px,** que con el recorte ya es todo dibujo, para no hacer más alta la barra. Si Carlos lo sigue viendo chico, la opción es 52 px con la barra 8 px más alta.

## User Stories

### US A1 — Logo legible en la barra   ·   Estado: construida el 2026-10-12, pendiente de la demo de Carlos

- **Historia** — Como persona que entra al sitio, quiero distinguir el logo en la barra de arriba, para reconocer dónde estoy.
- **Entrega demostrable** — El dibujo del logo llena el alto que se le da: 60 px en pantallas anchas (antes unos 31) y 44 px en la barra compacta y en el menú de teléfono (antes unos 27).
- **Construido** — 2026-10-12. `logo-barra.png` es `logo.png` recortada a lo que no es transparente, con 4 px de margen, y reducida a 192 px de alto. `Navbar.tsx` y `MobileMenu.tsx` la usan; en `Navbar.css`, el alto del logo en pantallas anchas pasó de 50 a 60 px.
- **Depende de** — Nada.
- **Cómo se prueba (guion de demo)** — En computadora, abre cualquier página: el logo llena casi todo el alto de la barra y se lee «LOTERIA» → la barra mide lo mismo que antes y los enlaces siguen alineados → en teléfono: el logo de la barra se ve más grande y la barra no creció → abre el menú: el logo de arriba también se ve más grande → descarga un PDF de tableros: el logo sale igual que antes.
- **Escenarios cubiertos**:
  - [ ] En pantallas anchas el logo se distingue y la barra no cambió de alto.
  - [ ] En teléfono, en la barra y en el menú, el logo se ve más grande.
  - [ ] El logo sigue llevando a Inicio.
  - [ ] El PDF de tableros no cambió.
