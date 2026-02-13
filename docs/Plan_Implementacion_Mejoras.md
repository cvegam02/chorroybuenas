# Plan de Implementación - Mejoras UI/UX

Documento de planificación para implementar las mejoras detectadas en pruebas de UI/UX. Cada punto incluye alcance, archivos afectados, pasos de implementación y criterios de aceptación.

---

## 1. Hero – móvil: Centrar botón "Crear Loteria"

### Alcance
El botón CTA del hero debe estar centrado en la versión móvil para mejorar la UX.

### Archivos afectados
- `src/components/LandingPage/LandingPage.css`
- Posiblemente `src/components/LandingPage/LandingPage.tsx` (si hace falta clase adicional)

### Pasos de implementación

1. **Identificar breakpoint móvil actual**
   - Revisar media queries existentes en `LandingPage.css` (ej. `@media (max-width: 768px)` o similar).
   - La clase `.landing-page__hero-actions` ya existe; actualmente tiene `text-align: left` heredado del `.landing-page__hero-content`.

2. **Añadir regla CSS para móvil**
   - En el media query correspondiente al hero móvil (típicamente ~768px o menos), añadir:
     ```css
     .landing-page__hero-actions {
       display: flex;
       justify-content: center;
       text-align: center;
     }
     ```
   - O si se usa `text-align` en el contenedor: `text-align: center` en el bloque móvil.

3. **Verificar**
   - Probar en viewport móvil (375px, 414px) que el botón quede centrado.

### Criterios de aceptación
- [ ] En viewport ≤768px el botón "Crear Loteria" está centrado horizontalmente.
- [ ] No afecta el diseño en desktop.

### Prioridad / Esfuerzo
- **Prioridad:** Baja
- **Esfuerzo:** ~15 min

---

## 2. Modal de registro – contraseña: mostrar/ocultar y reveal temporal

### Alcance

**Obligatorio:**
- Añadir icono de mostrar/ocultar contraseña en los campos de contraseña y confirmar contraseña.

**Opcional:**
- Comportamiento "reveal temporal": mostrar cada carácter brevemente al escribirlo y luego ocultarlo.

### Archivos afectados
- `src/components/Auth/EmailAuthModal.tsx`
- `src/components/Auth/EmailAuthModal.css`
- Traducciones: `src/locales/es/translation.json`, `src/locales/en/translation.json` (labels opcionales)

### Pasos de implementación

#### Partir 1: Icono mostrar/ocultar (obligatorio)

1. **Estado para cada campo**
   - Añadir `showPassword` y `showConfirmPassword` (boolean) en `EmailAuthModal`.

2. **Wrapper con icono**
   - Envolver cada input de contraseña en un div con:
     - `input` con `type={showPassword ? 'text' : 'password'}`
     - Botón/icono (FaEye / FaEyeSlash de react-icons) que alterna el estado.

3. **Estilos**
   - Posicionar el icono en el lado derecho del input (similar a `.email-auth-modal__input-wrapper`).
   - Asegurar que el botón sea accesible (aria-label).

4. **Traducciones**
   - Añadir keys: `common.auth.showPassword`, `common.auth.hidePassword` (o `togglePassword`).

#### Parte 2: Reveal temporal (opcional)

1. **Lógica**
   - Mantener `charRevealTimeout` en `useRef`.
   - Al `onChange`: mostrar último carácter por ~300–500ms, luego ocultar (o usar `setTimeout` para resetear tipo a `password`).

2. **Complejidad**
   - Más complejo: requiere sincronizar con el input y estado de visibilidad.
   - Evaluar si el valor de UX justifica el esfuerzo.

### Criterios de aceptación
- [ ] En registro y login hay un icono de ojo en cada campo de contraseña.
- [ ] Al hacer clic se alterna entre mostrar y ocultar contraseña.
- [ ] (Opcional) Reveal temporal funciona correctamente.

### Prioridad / Esfuerzo
- **Prioridad:** Media
- **Esfuerzo:** ~45 min (obligatorio), +30 min (opcional)

---

## 3. Post-registro: Mensaje de confirmación de correo

### Alcance
Tras registrarse con email, mostrar mensaje indicando que se envió un correo para confirmar la cuenta y que debe confirmarlo para poder acceder.

### Archivos afectados
- `src/components/Auth/EmailAuthModal.tsx`
- `src/contexts/AuthContext.tsx` (opcional, si se necesita diferenciar éxito de signup)
- `src/locales/es/translation.json`, `src/locales/en/translation.json`

### Pasos de implementación

1. **Detectar signup exitoso**
   - `signUpWithEmail` en Supabase no lanza si el usuario no está confirmado; el usuario queda en estado "no confirmado".
   - Opción A: No cerrar el modal en signup; en `handleSubmit` distinguir `isLogin` vs signup y si `signUpWithEmail` no lanza, mostrar estado de éxito.
   - Opción B: Comprobar si Supabase devuelve algún indicador de "email confirmación requerida" (p. ej. `user.confirmed_at === null`).

2. **Nuevo estado en el modal**
   - Añadir `signUpSuccess: boolean` (o `showSignUpConfirmation`).
   - Tras `signUpWithEmail` exitoso:
     - `setSignUpSuccess(true)` en lugar de `onClose()`.
     - Mostrar mensaje tipo: "Te hemos enviado un correo para confirmar tu cuenta. Revisa tu bandeja de entrada y haz clic en el enlace para confirmar antes de iniciar sesión."

3. **UI**
   - Bloquear el formulario y mostrar un bloque con el mensaje y un botón "Entendido" que llama a `onClose()`.

4. **Traducciones**
   - Añadir keys: `common.auth.signUpConfirmationTitle`, `common.auth.signUpConfirmationMessage`, `common.auth.signUpConfirmationButton`.

### Criterios de aceptación
- [ ] Tras registrarse, se muestra un mensaje de confirmación de correo.
- [ ] El usuario puede cerrar el modal con "Entendido".
- [ ] No se cierra el modal automáticamente hasta que el usuario confirme.

### Prioridad / Esfuerzo
- **Prioridad:** Media
- **Esfuerzo:** ~30 min

---

## 4. Subida de imágenes: Modal con mensaje y barra de progreso

### Alcance
Mostrar un modal durante la subida de imágenes con:
- Mensaje "Subiendo imágenes"
- Barra de progreso que indique el avance

### Archivos afectados
- `src/components/CardEditor/CardUpload.tsx` – subida individual
- `src/components/CardEditor/CardUploadModal.tsx` – modal que usa CardUpload
- `src/components/CardEditor/BatchUploadModal.tsx` – subida masiva
- `src/hooks/useCards.ts` – posiblemente exponer progreso de subida
- `src/components/CardEditor/CardUpload.tsx` – `handleSubmit` y `handleBatchCardsAdd`

### Contexto actual
- **CardUpload:** sube una imagen por subida; usa `setIsUploading(true)` y muestra "Cargando..." en el botón.
- **BatchUploadModal:** procesa imágenes en secuencia (crop/título, etc.) pero no sube a Storage; la subida real ocurre en `onCardsAdd` → `addCards` en `useCards`.
- **SyncService / useCards:** la subida a Supabase Storage puede ocurrir cuando el usuario está autenticado.

### Pasos de implementación

1. **Identificar punto de subida**
   - Revisar `useCards.addCard` y `addCards` para ver si suben a Storage.
   - Ver `SyncService` y cómo se integra con IndexedDB.

2. **Modal de progreso global**
   - Crear componente `UploadProgressModal` con:
     - Mensaje "Subiendo imágenes"
     - Barra de progreso (progress bar) que recibe `progress: number` (0–100).
     - Opcional: no permitir cerrar hasta terminar.

3. **Integrar progreso**
   - Si `addCards` es síncrono desde el punto de vista de Storage (no hay subida real), habrá que detectar si la subida ocurre en otro momento (p. ej. SyncService en background).
   - Si la subida ocurre en `addCard`/`addCards`: modificar para aceptar callback de progreso o devolver una Promise que se resuelva con el progreso.
   - En `BatchUploadModal`, al llamar `onCardsAdd`, si hay subida: abrir el modal antes, actualizar progreso en cada imagen añadida, cerrar al terminar.

4. **Subida individual (CardUpload)**
   - Si solo sube una imagen: mostrar el modal con barra indeterminada o progreso 0→100 al completar.

5. **Traducciones**
   - Añadir keys: `common.uploadingImages`, `common.uploadProgress`.

### Criterios de aceptación
- [ ] Al subir imágenes (individual o batch), se muestra un modal con mensaje "Subiendo imágenes".
- [ ] Hay una barra de progreso que refleja el avance.
- [ ] El modal se cierra al finalizar la subida.

### Prioridad / Esfuerzo
- **Prioridad:** Media
- **Esfuerzo:** ~1–2 h (depende de dónde ocurra la subida real)

### Nota
Revisar si la subida a Supabase Storage ocurre en `addCard`/`addCards` o en `SyncService`. Si es en SyncService en background, el modal puede mostrarse solo cuando se detecte una operación de subida explícita (p. ej. en BatchUpload).

---

## 5. Móvil – Paso de cartas: Botón "Siguiente" en la parte inferior

### Alcance
En móvil, el botón "Siguiente: generar tableros" debe mostrarse en la parte inferior, no arriba de las cartas.

### Archivos afectados
- `src/components/CardEditor/CardEditor.tsx`
- `src/components/CardEditor/CardEditor.css`

### Contexto actual
- El botón está en `.card-editor__actions` dentro del sidebar.
- En móvil el sidebar puede estar arriba o colapsado; el layout puede hacer que el botón quede arriba de la cuadrícula de cartas.

### Pasos de implementación

1. **Revisar layout móvil**
   - Ver media queries en `CardEditor.css` y cómo se muestran `.card-editor__sidebar` y `.card-editor__main` en móvil.

2. **Opción A: Duplicar botón en móvil**
   - Añadir un segundo botón "Siguiente" dentro de `.card-editor__main` o `.card-editor__mobile-actions` que solo se muestre en móvil.
   - Usar la misma clase para consistencia visual.

3. **Opción B: Reordenar con flex**
   - Usar `order` o flexbox para que en móvil el bloque de acciones quede al final del flujo visual.
   - Posiblemente mover `.card-editor__actions` dentro del main en móvil.

4. **Opción C: Sticky**
   - Hacer el botón `position: sticky; bottom: 0` en móvil para que quede fijo en la parte inferior.
   - Asegurar que no tape contenido importante.

### Criterios de aceptación
- [ ] En viewport móvil, el botón "Siguiente: generar tableros" aparece en la parte inferior (visible sin scroll).
- [ ] Desktop: sin cambios.

### Prioridad / Esfuerzo
- **Prioridad:** Media
- **Esfuerzo:** ~45 min

---

## 6. Convertir todas con IA: filtrar ya generadas y mostrar tokens

### Alcance

- **A:** Filtrar imágenes ya generadas con IA de la conversión (no incluirlas).
- **B:** En el modal de confirmación, mostrar el costo real y los tokens que se consumirán.

### Archivos afectados
- `src/components/CardEditor/CardEditor.tsx` – pre-filtrado antes de abrir AIBatchModal
- `src/components/CardEditor/AIBatchModal.tsx` – filtrar cartas y mostrar tokens en UI
- `src/locales/es/translation.json`, `src/locales/en/translation.json`

### Pasos de implementación

#### Parte A: Filtrar cartas ya generadas con IA

1. **Al abrir AIBatchModal**
   - Filtrar: `cards.filter(c => !c.isAiGenerated)`.
   - Pasar solo las cartas no transformadas a `AIBatchModal`.

2. **Si todas están ya transformadas**
   - Mostrar mensaje: "Todas las cartas ya están transformadas con IA" y no abrir el modal.

3. **Si algunas están transformadas**
   - Opcional: mostrar mensaje tipo "X cartas ya están transformadas y se omitirán. Se transformarán Y cartas."

#### Parte B: Mostrar tokens en modal de confirmación

1. **En AIBatchModal estado idle**
   - Ya se muestra `estimation.totalCost` y `tokensNeeded`.
   - Verificar que `tokensNeeded` coincida con `cardsToTransform.length`.
   - Añadir texto explícito: "Tokens que se consumirán: X" en el bloque de estimación.

2. **Traducciones**
   - Añadir keys: `aiBatchModal.tokensToConsume`, `aiBatchModal.allAlreadyTransformed`, `aiBatchModal.someAlreadyTransformed`.

### Criterios de aceptación
- [ ] Las cartas con `isAiGenerated: true` no se incluyen en la conversión batch.
- [ ] Si todas están transformadas, se muestra mensaje y no se abre el modal.
- [ ] El modal de confirmación muestra claramente los tokens que se consumirán.

### Prioridad / Esfuerzo
- **Prioridad:** Alta
- **Esfuerzo:** ~1 h

---

## 7. Modal de transformación batch con IA: cerrar y continuar en segundo plano

### Alcance
Permitir cerrar el modal mientras la transformación continúa en segundo plano. Las cartas en proceso deben mostrar el mismo indicador de carga que en "Regenerar con IA" individual.

### Archivos afectados
- `src/components/CardEditor/AIBatchModal.tsx`
- `src/components/CardEditor/CardEditor.tsx` – callback `onComplete` y estado de procesamiento
- `src/components/CardEditor/CardPreview.tsx` – ya usa `isProcessing` para mostrar estado

### Pasos de implementación

1. **Botón "Continuar en segundo plano"**
   - En `status === 'processing'`, añadir botón "Cerrar y continuar" (o similar).
   - Al hacer clic: `onClose()` pero mantener el proceso en ejecución.
   - El modal debe seguir ejecutando `startTransformation` sin montarse; el estado vive en el componente padre o en un hook/context que persista.

2. **Problema de arquitectura**
   - Si se cierra el modal (`isOpen=false`), el componente puede desmontar y `startTransformation` se cortaría.
   - **Solución:** Mover la lógica de transformación al padre (`CardEditor`):
     - `CardEditor` tiene `isAIBatchProcessing` y `onAIBatchComplete`.
     - Al abrir el modal y dar "Iniciar", se ejecuta la transformación en CardEditor.
     - El modal solo muestra estado; cuando el usuario cierra, el modal se oculta pero CardEditor sigue procesando.
     - Cada carta actualizada vía `updateCard` ya tendrá `isProcessing: true` durante el proceso y `false` al terminar.

3. **Indicador por carta**
   - En el batch, al procesar la carta i: `updateCard(cards[i].id, { isProcessing: true })`.
   - Al terminar: `updateCard(cards[i].id, { image, ..., isProcessing: false })`.
   - `CardPreview` ya usa `card.isProcessing` para mostrar el spinner de carga.
   - El modal puede cerrarse y las cartas seguirán mostrando el indicador hasta que terminen.

4. **Implementación**
   - Refactorizar `AIBatchModal`: pasar `onStart` que reciba una función que ejecute el loop.
   - O: `AIBatchModal` recibe `isProcessing` y `onClose`; al cerrar, `onClose` no cancela el proceso.
   - La transformación se ejecuta en CardEditor o en un hook que persista: el modal es solo UI.
   - Al iniciar cada carta: llamar `updateCard(id, { isProcessing: true })`.
   - Al terminar cada carta: llamar `updateCard(id, { image, ..., isProcessing: false })`.
   - Al terminar todo: `onComplete(updatedCards)`.

5. **Traducciones**
   - Añadir: `aiBatchModal.continueInBackground`, `aiBatchModal.closeAndContinue`.

### Criterios de aceptación
- [ ] Cuando está procesando, hay un botón para cerrar el modal.
- [ ] Al cerrar, el proceso continúa en segundo plano.
- [ ] Cada carta en proceso muestra el indicador de carga como en "Regenerar con IA".
- [ ] Al terminar todas, las cartas se actualizan correctamente.

### Prioridad / Esfuerzo
- **Prioridad:** Alta
- **Esfuerzo:** ~2–3 h (refactor de arquitectura)

---

## 8. Conversión batch – subida incremental

### Alcance
Cambiar el flujo de: (convertir todo → subir todo) a: (convertir + subir por imagen). Cada imagen se sube en cuanto se convierte.

### Archivos afectados
- `src/components/CardEditor/AIBatchModal.tsx`
- `src/hooks/useCards.ts` – `addCard`/`updateCard` y subida a Storage
- `src/services/SyncService.ts`
- `src/repositories/CardRepository.ts`
- `src/utils/indexedDB.ts`

### Contexto actual
- AIBatchModal: convierte todas las imágenes en secuencia, guarda en base64 en memoria, luego `onComplete(updatedCards)`.
- `updateCards` en useCards actualiza las cartas; la subida a Supabase Storage puede ocurrir en SyncService o en el repositorio.

### Pasos de implementación

1. **Identificar flujo de subida**
   - Revisar `useCards.updateCard` y `updateCards`: ¿suben a Storage inmediatamente o solo a IndexedDB?
   - Revisar `SyncService` y cuándo sube a Storage.

2. **Enfoque**
   - Tras convertir cada imagen: llamar `updateCard(card.id, { image: normalizedImage, ... })` inmediatamente.
   - Si `updateCard` ya sube a Storage: con eso se logra subida incremental.
   - Si la subida es en SyncService en background: hay que hacer que `updateCard` (o un método que use internamente) suba a Storage por cada carta.

3. **Cambios en AIBatchModal**
   - En lugar de acumular `updatedCards` y llamar `onComplete` al final:
     - En cada iteración del loop, tras convertir: llamar `onCardConverted(card)` o `updateCard` directamente.
   - `onComplete` podría llamarse solo al terminar el loop (sin pasar datos si ya se actualizó cada carta).

4. **Callback**
   - `AIBatchModal` recibe `onCardConverted?: (card: Card) => void` o `onCardUpdate?: (id: string, updates: Partial<Card>) => void`.
   - En CardEditor: `onCardConverted` llama a `updateCard` y a la subida (si aplica).

5. **Consideraciones**
   - Si la subida es en SyncService en batch: puede requerir refactor de SyncService para subir por carta.
   - Rate limits de Storage: subir una por una puede ser más lento pero más seguro.

### Criterios de aceptación
- [ ] Cada imagen se sube en cuanto se termina de convertir.
- [ ] No hay que esperar a que todas se conviertan para subir.
- [ ] El flujo es más ágil para el usuario.

### Prioridad / Esfuerzo
- **Prioridad:** Alta
- **Esfuerzo:** ~2–3 h (depende de arquitectura actual de subida)

### Nota
Revisar si `updateCard` ya sube a Storage. Si no, habrá que integrar la subida en el flujo de actualización.

---

## 9. Persistir modo de cuadrícula (3x3 / 4x4)

### Alcance
Guardar y respetar el modo de cuadrícula elegido al crear/editar el set. Al entrar a `/loteria/:setId` el usuario debe poder generar tableros según el modo (3x3 requiere mínimo 12 cartas, 4x4 requiere 16 o 20).

### Archivos afectados
- `supabase_migrations/` – nueva migración para `loteria_sets.grid_size`
- `src/repositories/SetRepository.ts` – `LoteriaSet` con `grid_size`, `createSet`, `updateSet`, `getSet`
- `src/contexts/SetContext.tsx` – propagar `gridSize` por set
- `src/components/SetView/SetView.tsx` – usar `gridSize` del set y calcular `minCardsForBoards`
- `src/AppRouter.tsx` – si se usa flujo desde dashboard; `gridSize` puede venir del set
- `src/components/BoardGenerator/BoardCountSelector.tsx` – ya recibe `gridSize`
- `src/hooks/useBoard.ts` – ya usa `gridSize`

### Contexto actual
- `gridSize` está en estado local de `AppRouter` (`useState<GridSize>(16)`).
- Se pasa a CardEditor y BoardCountSelector.
- SetView usa `minCardsForBoards = 16` fijo; no considera 3x3.
- `loteria_sets` no tiene columna `grid_size`.
- `LoteriaSet` solo tiene: id, user_id, name, created_at.

### Pasos de implementación

1. **Migración de base de datos**
   - Añadir columna `grid_size smallint not null default 16` a `loteria_sets`.
   - Crear archivo `supabase_migrations/006_add_grid_size_to_sets.sql`:
     ```sql
     ALTER TABLE public.loteria_sets
     ADD COLUMN IF NOT EXISTS grid_size smallint NOT NULL DEFAULT 16;
     ```

2. **SetRepository**
   - Añadir `grid_size` a `LoteriaSet`.
   - En `createSet`: aceptar `gridSize?: GridSize` y guardarlo.
   - En `updateSet`: permitir `grid_size` en `updates`.
   - En `getSet` y `_fetchSets`: incluir `grid_size` en el select.

3. **SetContext**
   - Si se guarda `gridSize` por set, asegurar que el set actual tenga `gridSize` disponible.
   - Cuando el usuario crea/edita un set desde CardEditor, guardar el `gridSize` elegido.

4. **Flujo de creación**
   - En `handleCardsNext` o al crear set: si hay `currentSetId`, actualizar el set con `grid_size: gridSize`.
   - En `createSet`: pasar `gridSize` desde el estado actual (p. ej. desde CardEditor).

5. **SetView**
   - Obtener `gridSize` del set: `set?.grid_size ?? 16`.
   - Calcular `minCardsForBoards = gridSize === 9 ? 12 : 16` (o 20 según criterio actual).
   - Pasar `gridSize` a `BoardCountSelector` y `useBoard` al generar tableros.

6. **AppRouter / Dashboard**
   - Cuando el usuario entra a `/cards` desde crear un set nuevo: el set se crea al guardar; incluir `grid_size` en la creación.
   - Cuando entra a `/loteria/:setId`: el set viene de la BD con `grid_size`; SetView lo usa.

7. **Persistencia**
   - Al cambiar `gridSize` en CardEditor: si hay `currentSetId`, llamar `SetRepository.updateSet(setId, userId, { grid_size: gridSize })`.

### Criterios de aceptación
- [ ] El modo 3x3 o 4x4 se guarda al crear/editar el set.
- [ ] En `/loteria/:setId` se usa el `grid_size` guardado.
- [ ] Con 3x3 se puede generar tableros con ≥12 cartas.
- [ ] Con 4x4 se requiere ≥16 cartas (según regla actual).

### Prioridad / Esfuerzo
- **Prioridad:** Alta
- **Esfuerzo:** ~2 h

---

## Resumen de prioridades y estimaciones

| # | Mejora | Prioridad | Esfuerzo estimado |
|---|--------|-----------|-------------------|
| 1 | Hero móvil – centrar botón | Baja | ~15 min |
| 2 | Modal registro – contraseña mostrar/ocultar | Media | ~45 min |
| 3 | Post-registro – mensaje confirmación correo | Media | ~30 min |
| 4 | Subida imágenes – modal con progreso | Media | ~1–2 h |
| 5 | Móvil – botón Siguiente abajo | Media | ~45 min |
| 6 | Convertir con IA – filtrar y tokens | Alta | ~1 h |
| 7 | Transformación batch – cerrar y continuar | Alta | ~2–3 h |
| 8 | Conversión batch – subida incremental | Alta | ~2–3 h |
| 9 | Persistir modo cuadrícula | Alta | ~2 h |

**Total estimado:** ~10–14 h

---

## Orden de implementación sugerido

1. **Sprint 1 (rápidas):** 1, 2, 3, 5  
2. **Sprint 2 (IA):** 6, 7  
3. **Sprint 3 (arquitectura):** 8, 9  
4. **Sprint 4 (subida):** 4  

---

## Notas adicionales

- Las traducciones (`translation.json`) deben actualizarse en cada cambio que afecte textos.
- Probar cada mejora en móvil y desktop.
- Considerar que algunas mejoras (7, 8) requieren refactors de arquitectura; conviene revisar el flujo de subida y sincronización antes de implementar.
