# Rediseño de «Crear tu lotería» (C1, C2, C3 y sus ventanas) — instrucciones para Claude Code

Cómo usarlo:

1. Copia el contenido del zip en la raíz del repo. Solo agrega archivos en `docs/referencia-diseno/`.
2. Pega en Claude Code el bloque **«Arranque»**.
3. Avanza de una o dos historias por sesión.

Las maquetas se abren con doble clic. Las imágenes de `crear-img/` son solo de ejemplo para las maquetas y **no** se copian al sitio. En la página real se ven las cartas del usuario.

---

## Arranque (pegar en Claude Code)

> Quiero rediseñar el flujo de crear una lotería (C1 Cartas `/cards`, C2 Tableros `/board-count`, C3 Vista previa `/preview` y sus ventanas) para que quede como el diseño de `docs/referencia-diseno/crear-*.html`. Lee primero `docs/referencia-diseno/INSTRUCCIONES-CREAR-LOTERIA.md`.
>
> Es **solo diseño y textos**: no cambies reglas de negocio, cobros, tokens, el guardado ni la forma de generar tableros o el PDF. Si algo de las maquetas pide un comportamiento nuevo que no existe, pregúntame antes.
>
> Sigue `CLAUDE.md`:
> - Crea el archivo de la feature en `docs/features/`, con el siguiente número libre y una User Story por bloque de la lista de abajo.
> - Trabaja en la rama `feature/rediseno-crear-loteria`, creada desde `dev`.
> - No hagas commit ni PR sin que yo lo pida.
> - Para cambios en `docs/diseno-mockups.md`, preséntame los 4 puntos antes de editar.
>
> Propón las User Stories, espera mi visto bueno y después ve de una o dos por sesión.

---

## Archivos de referencia

| Pantalla | Escritorio | Celular |
|---|---|---|
| C1 Cartas, sin sesión | `crear-1-cartas-sin-sesion-escritorio.html` | `crear-1-cartas-sin-sesion-celular.html` |
| C1 Cartas, con sesión | `crear-1-cartas-con-sesion-escritorio.html` | `crear-1-cartas-con-sesion-celular.html` (incluye la hoja de acciones al tocar una carta) |
| C2 Tableros | `crear-2-tableros-escritorio.html` | `crear-2-tableros-celular.html` |
| C3 Vista previa | `crear-3-vista-previa-escritorio.html` | `crear-3-vista-previa-celular.html` |
| Ventanas sin sesión (agregar carta, subir varias, PDF descargado) | `crear-ventanas-sin-sesion.html` | — |
| Ventanas con sesión (IA en lote: confirmar, avance, resultado, sin tokens; PDF con sesión) | `crear-ventanas-con-sesion.html` | — |

Construye con los componentes, clases y tokens del proyecto (`src/index.css`, `docs/sistema-diseno.md`), sin colores sueltos. Si el morado de la IA (#7c3aed) no está en la paleta, agrégalo como token. Los textos van en `src/locales/es` y `src/locales/en`; borra las claves que dejen de usarse.

---

## Historias, en orden

### 1. Barra de pasos (C1, C2 y C3)

- Debajo de la barra superior va una franja blanca con «1 Tus cartas — 2 Tableros — 3 Descarga».
  - El paso actual va con círculo naranja; los anteriores con palomita.
  - En celular, solo el paso actual muestra su nombre.
- A la derecha:
  - Sin sesión: «Sin cuenta, tu lotería se guarda solo en este navegador».
  - Con sesión: «✓ Guardado en tu cuenta», en verde.

### 2. C1 Cartas — sin sesión

**Columna izquierda**, de arriba abajo:
- «Arma tu baraja» y su subtítulo.
- **Tipo de lotería:** dos tarjetas, Clásico 4×4 y Kids 3×3, cada una con una mini cuadrícula dibujada.
- **Avance:** «15 de 24 cartas», «Faltan 9», una barra y una explicación corta. El mínimo sale del modo: 24 en Clásico y 15 en Kids, como hoy.
- **Botones:** «Subir fotos» (principal, abre la subida de varias) y «Agregar una carta» (secundario).
- **Tarjeta de IA**, con la foto y la carta de La Chata (`/media/beneficios/antes-la-chata.jpg` e `ia-la-chata.jpg`), «Conviértelas en cartas con IA», «5 tokens gratis al crear tu cuenta» y los botones «Google» y «Crear tu cuenta». Sustituye al texto «Inicia sesión para usar la IA».
- **«Consejos para buenas cartas»**, cerrado (`<details>`). Sustituye al acordeón de instrucciones.
- **Enlaces pequeños:** «Vaciar cartas» en rojo, que conserva su confirmación, y «Salir sin guardar», que reemplaza a «Cancelar proceso».

**Columna derecha:**
- «Tus cartas (15)» y la cuadrícula de 6 columnas.
- Al pasar el mouse sobre una carta salen botones redondos: editar, transformar con IA y borrar.
- Al final, un recuadro grande para arrastrar fotos o hacer clic: «Arrastra tus fotos aquí».
- **Barra inferior fija:**
  - Fondo café oscuro con el resumen («15 cartas · Modo Clásico 4×4 · agrega 9 más para continuar») y «Siguiente: tableros».
  - Si faltan cartas, el botón se ve desactivado y el texto dice cuántas faltan. Si ya alcanzan, el botón va naranja.

**Celular:**
- Todo va en una columna. La cuadrícula es de 3 columnas y empieza con la casilla «Agregar».
- La barra inferior fija dice «15 de 24 cartas · Faltan 9» y lleva el botón «Siguiente».

### 3. C1 Cartas — con sesión (revisar `CardEditor` y `CardPreview`; hoy ya existe todo esto, solo cambia cómo se ve)

- **Arriba a la izquierda:** «TU LOTERÍA», el nombre de la lotería y un lápiz para renombrarla. Usa el renombrado que ya existe.
- **Panel «Cartas con IA»**, en lugar de la tarjeta de crear cuenta:
  - «N de M ya transformadas · 1 token por foto».
  - «Tienes X tokens», con el enlace «Comprar».
  - El botón morado «Transformar las N restantes», que abre la ventana de IA en lote.
  - Si no alcanzan los tokens, el botón no se desactiva en silencio: al tocarlo se abre la ventana «Te faltan N tokens» (ver la historia 6).
- **Cartas:**
  - Etiqueta morada «IA» en las que ya están transformadas.
  - La carta en proceso lleva un degradado morado a naranja y el texto «Pintando con IA… hasta 1 minuto», en lugar del 🎨.
- **Al pasar el mouse:**
  - Carta normal: editar, borrar y «Transformar · 1 token».
  - Carta con IA: «Volver a la foto» (gratis, con su confirmación de hoy) y «Otra versión · 1 token» (con su confirmación de hoy).
- **En celular** no hay mouse: al tocar una carta se abre una hoja desde abajo con Ver en grande, Editar nombre o foto, Otra versión con IA · 1 token, Volver a la foto original · gratis y Borrar carta.
- Los enlaces de abajo son «Vaciar cartas» e «Ir a Mis loterías».
- Se conservan la sincronización, los bloqueos durante el lote y el límite de transformaciones.

### 4. C2 Tableros (`BoardCountSelector`)

- Título «¿Cuántos tableros imprimimos?» y debajo «Modo Clásico 4×4 · 24 cartas en tu baraja».
- **Selector:** botones − y + y el número grande en medio.
  - Atajos: 8, 10, el sugerido marcado como «· sugerido», 16 y 20. Si el sugerido coincide con un atajo, se marca ese; si no, se agrega a la lista.
  - Se respetan el mínimo y el máximo que ya calcula el componente, con sus mensajes de error.
- **Sugerencia:** recuadro con un foco: «Te sugerimos N para que los tableros salgan variados con tus X cartas. Calcula uno por jugador y algunos de repuesto. El mínimo es 8».
- **Botones:** «← Volver a mis cartas» a la izquierda y «Generar N tableros →» a la derecha.
- **Ilustración dinámica** (decidido con el usuario):
  - A la derecha (arriba en celular) va un tablerito «TABLERO 1» armado con las cartas del usuario: 16 al azar en Clásico (4×4) o 9 en Kids (3×3).
  - Detrás, una pila de hojas que también usan sus cartas. La pila **crece o se achica** con el número de tableros: unas 2 hojas con 8 o menos, 3 hasta 12, 4 hasta 20 y 5 con más de 20.
  - Es solo una muestra: no son los tableros finales y no se guarda nada.
  - Usa las imágenes que ya están cargadas.

### 5. C3 Vista previa (`BoardPreview`, `BoardThumbnail`)

- **Encabezado:** «¡Tus N tableros están listos!» con pastillas (N tableros, X cartas, modo y «PDF tamaño carta»). A la derecha van los botones:
  - **«Descargar PDF»**, el principal, arriba y no solo al final.
  - «Revolver tableros», que es el actual «Generar nuevos tableros». Con sesión conserva su confirmación porque reemplaza los guardados.
  - «Editar cartas».
- **Tableros:** cuadrícula de 4 columnas (1 en celular). Cada tablero se ve como en el PDF: hoja crema, «TABLERO N» entre líneas y las cartas.
  - En la esquina, un botón redondo con lupa que abre el tablero en grande. Sustituye al texto «Click para ver completo».
- **Al final de la cuadrícula**, una tarjeta punteada: «+ la baraja para recortar · X cartas en N hojas, al final del PDF».
- En celular, los botones van apilados arriba.

### 6. Ventanas

**Agregar una carta** (`CardUploadModal`) y **Nombra tus fotos** (`BatchUploadModal`):
- Foto a la izquierda, con «Ajustar recorte» (el editor que ya existe) y «Cambiar foto».
- A la derecha:
  - El campo «Nombre de la carta», con la ayuda «Corto y fácil de cantar».
  - **«Así se verá»:** una miniatura de la carta con su número y su nombre, que se actualiza mientras escribe. Usa el mismo componente o estilo con que se dibuja la carta en la cuadrícula.
- En la subida de varias:
  - Barra de avance, «Foto 1 de 3 · nombre del archivo» y miniaturas de la cola, con la actual marcada.
  - Botones «Omitir» y **«Siguiente foto →» en naranja**. Hoy es gris y parece desactivado.

**IA en lote** (`AIBatchModal`, con sesión). Cuatro estados:
1. **Confirmar.** Miniaturas, «N cartas sin transformar. Las M que ya tienen IA no se tocan» y una tabla:
   - Fotos a transformar.
   - Tokens que se usan (en naranja).
   - Tu saldo después.
   - Tiempo aproximado.

   Debajo, una nota verde: «Si una foto no se puede transformar, su token se te devuelve». Botones «Cancelar» y «Transformar N cartas», en morado.
2. **Avance.** «La IA está pintando…» y «7 de 10». Debajo, una barra y una cuadrícula con las cartas: palomita en las listas, borde morado en la actual y las pendientes semitransparentes. Se cierra con «Cerrar y seguir trabajando», que ya existe en segundo plano.
3. **Resultado.** «¡N cartas transformadas!» con sus miniaturas. Si hubo rechazadas: «N foto(s) no se pudieron transformar por el filtro de contenido. Te devolvimos su token». Y la nota «¿No te gusta alguna? Puedes volver a la foto original gratis».
4. **Sin tokens suficientes**, nueva vista en lugar del botón desactivado:
   - «Te faltan N tokens. Necesitas X y tienes Y».
   - «Comprar tokens».
   - «Transformar solo Y cartas», si tiene al menos 1 token. Esta opción transforma las primeras Y pendientes; si eso no existe hoy, pregúntame antes.

**PDF descargado**, que sustituye al mensaje «¿Estás listo para salir?…»:
- **Sin sesión:**
  - Palomita verde y «¡Tu PDF ya se descargó!».
  - Tres consejos: imprimir en tamaño carta, recortar la baraja y «¿Primera vez jugando? Mira cómo se juega».
  - Recuadro «¿Quieres guardar esta lotería?», con «Entrar con Google» y «Crear tu cuenta».
  - Botones «Seguir editando» y «Terminar».
  - Al final, la nota «Si terminas sin cuenta, esta lotería se borra de este navegador».
- **Con sesión:**
  - Los mismos dos primeros consejos.
  - Recuadro verde: «"Nombre" está guardada en Mi cuenta. Puedes volver a descargarla cuando quieras».
  - Botones «Seguir editando» e «Ir a Mis loterías», más el enlace «+ Crear otra lotería».

### 7. Limpieza

En `aiBatchModal.styles` hay estilos «Simpsons» y «Studio Ghibli», y hay textos de estilos y fidelidad que ya no se usan. Bórralos en los dos idiomas si no se usan. Son marcas de terceros.

---

## Al terminar cada historia

1. Corre `npm run typecheck`, `npm run lint` y `npm test`.
2. Marca la historia en el archivo de la feature.
3. Descríbeme el recorrido para revisarla en dev.chorroybuenas.com.mx, con y sin sesión y en escritorio y celular.
