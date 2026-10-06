# FEAT-11 — Mantenibilidad

**Prioridad:** Baja · **Findings:** L1, L2, L3 · **Plan:** Tasks 16, 17 y 18

**Objetivo:** dejar el código del frontend más fácil de leer y de cambiar, sin modificar lo que hace.

**Contexto:** hay 115 llamadas a `console.*` y 18 usos de `any` en `src/`, y tres archivos están al borde del límite de 800 líneas del proyecto. Ninguna de estas historias cambia el comportamiento visible; se verifican con typecheck, lint, build y una prueba manual.

---

## CYB-1101 — Logger único para el frontend

- **Tipo:** Tarea técnica
- **Prioridad:** Baja
- **Estado:** Hecho — `logger.ts` con tests; 108 llamadas reemplazadas en 25 archivos; regla `no-console` activa
- **Finding:** L1
- **Plan:** Task 16
- **Depende de:** CYB-202

### Descripción

Como desarrollador, quiero que todo el registro del frontend pase por un solo módulo, para poder silenciar avisos en producción y que el lint impida nuevos `console.*` sueltos.

### Criterios de aceptación

- [x] Existe `src/utils/logger.ts` con `warn` y `error`.
- [x] `logger.warn` no escribe nada en producción; `logger.error` escribe siempre.
- [x] No queda ninguna llamada a `console.*` en `src/` fuera de `logger.ts`.
- [x] La regla `no-console` está en `error` para `src/`.
- [x] En las edge functions `console.error` sigue permitido (es el log del servidor).
- [x] `npm run typecheck`, `npm run lint` y `npm run build` pasan.

### Escenarios

**Escenario 1: aviso en desarrollo**
- Dado `npm run dev`
- Cuando el código llama `logger.warn('x')`
- Entonces el aviso aparece en la consola del navegador

**Escenario 2: aviso en producción**
- Dado el build de producción
- Cuando el código llama `logger.warn('x')`
- Entonces no se escribe nada en la consola

**Escenario 3: error en producción**
- Dado el build de producción
- Cuando el código llama `logger.error('x')`
- Entonces el error sí aparece en la consola

**Escenario 4: alguien agrega un `console.log`**
- Dado un archivo de `src/` con `console.log('debug')`
- Cuando se ejecuta `npm run lint`
- Entonces falla con `no-console`

---

## CYB-1102 — Eliminar `any`

- **Tipo:** Tarea técnica
- **Prioridad:** Baja
- **Estado:** En revisión — sin `any` en `src/` y regla activa; falta comprobar en el navegador las pantallas tocadas (login, tableros)
- **Finding:** L2
- **Plan:** Task 17
- **Depende de:** CYB-202

### Descripción

Como desarrollador, quiero que el código no use `any`, para que TypeScript detecte errores que hoy pasan inadvertidos.

### Criterios de aceptación

- [x] No queda `: any` ni `as any` en `src/`.
- [x] Los `catch` usan `unknown` y obtienen el mensaje con `getErrorMessage`.
- [x] `PDFService` usa los tipos `PDFImage` y `PDFPage` de `pdf-lib`.
- [x] `BoardRepository` tiene un tipo para las filas de `board_cards`.
- [x] `GridModeSelector` tipa `t` como `TFunction`.
- [x] La regla `@typescript-eslint/no-explicit-any` está en `error`.
- [ ] El comportamiento de las pantallas afectadas no cambia.

### Escenarios

**Escenario 1: error de inicio de sesión**
- Dado credenciales incorrectas
- Cuando el usuario intenta entrar
- Entonces ve el mismo mensaje de error que antes del cambio

**Escenario 2: error que no es un `Error`**
- Dado que una promesa rechaza con un texto o un objeto `{ message }`
- Cuando se llama `getErrorMessage`
- Entonces devuelve el texto correspondiente sin lanzar

**Escenario 3: tablero con una carta borrada**
- Dado un tablero cuya fila en `board_cards` no tiene carta asociada
- Cuando se listan los tableros
- Entonces la fila se omite y la pantalla no falla

**Escenario 4: alguien agrega un `any`**
- Dado un archivo con `const x: any = …`
- Cuando se ejecuta `npm run lint`
- Entonces falla

---

## CYB-1103 — Dividir `PDFService.ts`

- **Tipo:** Tarea técnica (refactor)
- **Prioridad:** Baja
- **Estado:** En revisión — dividido en 4 archivos (235, 329, 194 y 37 líneas), verificado que el código se movió sin cambios; falta comparar un PDF generado contra uno de `main`
- **Finding:** L3
- **Plan:** Task 18, Step 1
- **Depende de:** CYB-1102

### Descripción

Como desarrollador, quiero que la generación de PDF esté separada en módulos pequeños, para poder cambiar el dibujo o la carga de imágenes sin navegar un archivo de casi 800 líneas.

### Criterios de aceptación

- [x] Existen `src/services/pdf/constants.ts`, `images.ts` y `draw.ts`.
- [x] `PDFService.ts` conserva su API pública: `generatePDF`, `downloadPDF`, `generateCardPDF`, `GeneratePDFOptions`.
- [x] Ningún archivo resultante supera 400 líneas.
- [x] Ningún componente que importa `PDFService` necesita cambios.
- [ ] Los PDF generados son visualmente idénticos a los de `main`.

### Escenarios

**Escenario 1: PDF de tableros**
- Dado un set con 4 tableros
- Cuando se descarga el PDF
- Entonces tiene las mismas páginas, tamaños y posiciones que el generado desde `main`

**Escenario 2: PDF de una carta**
- Dado una carta con imagen
- Cuando se descarga su PDF
- Entonces es idéntico al generado desde `main`

**Escenario 3: carta sin imagen o con imagen que no carga**
- Dado un tablero con una carta cuya imagen falla al cargar
- Cuando se genera el PDF
- Entonces el comportamiento es el mismo que antes del refactor

**Escenario 4: logo del encabezado**
- Cuando se genera cualquier PDF de tableros
- Entonces el logo aparece en el encabezado

---

## CYB-1104 — Extraer la lógica de IA de `CardEditor`

- **Tipo:** Tarea técnica (refactor)
- **Prioridad:** Baja
- **Estado:** En revisión — `useCardAI.ts` extraído; `CardEditor.tsx` quedó en 667 líneas, no por debajo de 600 como pedía el criterio. Falta probar en el navegador
- **Finding:** L3
- **Plan:** Task 18, Step 2
- **Depende de:** CYB-804

### Descripción

Como desarrollador, quiero que la lógica de transformación con IA viva en un hook propio, para que `CardEditor` se ocupe solo de la edición de cartas.

### Criterios de aceptación

- [x] Existe `src/components/CardEditor/useCardAI.ts` con los estados y handlers de IA.
- [ ] `CardEditor.tsx` queda por debajo de 600 líneas.
- [x] No hay estado duplicado entre el hook y el componente.
- [x] Las props de `CardEditor` no cambian.
- [ ] El flujo individual y el de lote se comportan igual que antes.

### Escenarios

**Escenario 1: transformación individual**
- Cuando el usuario transforma una carta
- Entonces la carta muestra el indicador de proceso, luego la imagen nueva, y el saldo se actualiza

**Escenario 2: lote con una foto bloqueada**
- Dado un lote de 3 cartas donde una dispara el filtro de contenido
- Cuando termina el lote
- Entonces 2 quedan transformadas y el contador de omitidas marca 1

**Escenario 3: error en transformación individual**
- Cuando la transformación falla
- Entonces se muestra el mensaje de error y la carta deja de estar "en proceso"

**Escenario 4: revertir una carta transformada**
- Dado una carta transformada con IA
- Cuando el usuario la revierte
- Entonces recupera su imagen original

---

## CYB-1105 — Extraer la edición de perfil de `Dashboard`

- **Tipo:** Tarea técnica (refactor)
- **Prioridad:** Baja
- **Estado:** En revisión — `useProfileEditing.ts` extraído; `Dashboard.tsx` quedó en 709 líneas, no por debajo de 680 como pedía el criterio. Falta probar en el navegador
- **Finding:** L3
- **Plan:** Task 18, Step 3
- **Depende de:** CYB-1001

### Descripción

Como desarrollador, quiero que la edición de nombre y avatar viva en un hook propio, para que `Dashboard` se ocupe de listar las loterías del usuario.

### Criterios de aceptación

- [x] Existe `src/components/Dashboard/useProfileEditing.ts` con los estados y handlers de nombre y avatar.
- [ ] `Dashboard.tsx` queda por debajo de 680 líneas.
- [x] No hay estado duplicado entre el hook y el componente.
- [ ] Cambiar nombre y avatar funciona igual que antes.

### Escenarios

**Escenario 1: cambiar el nombre**
- Cuando el usuario edita su nombre y guarda
- Entonces el nombre nuevo aparece en el Dashboard y en la barra de navegación

**Escenario 2: nombre vacío**
- Cuando el usuario intenta guardar un nombre en blanco
- Entonces no se guarda

**Escenario 3: cambiar el avatar**
- Cuando el usuario sube una imagen
- Entonces aparece el indicador de carga y luego el avatar nuevo

**Escenario 4: falla la subida**
- Cuando la subida del avatar falla
- Entonces se muestra el aviso de error y el input queda listo para reintentar
