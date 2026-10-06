# Procedimiento para construir o cambiar una pantalla

Qué pasos seguir cada vez que se toca la interfaz: una pantalla, una ventana, un botón, incluso algo temporal.

- Pantallas con datos (leen o guardan información): **camino completo**, pasos 1 a 6.
- Cambios simples (un texto, un ajuste visual, una pantalla sin datos): **camino ligero**, pasos 1 → 3 → 6.

---

## 1. Ubicar la pantalla

- Buscarla en [`diseno-mockups.md`](diseno-mockups.md) por su código (`C1`, `U3`).
- Confirmar a qué zona de la navegación pertenece: Pública, Crear, Mi cuenta o Administración.
- Como la fuente del diseño es el sitio construido, abrir el archivo de la pantalla en `src/components/` y ver cómo está hecha hoy.
- Si lo que se va a construir **no aparece** en el índice o lo contradice, parar y preguntarle a Carlos dónde va. No improvisar la ubicación.

## 2. Resolver lo que no está dibujado

Antes de escribir código, decidir cómo se ve la pantalla en cada estado:

- **Vacío:** no hay nada que mostrar todavía.
- **Cargando:** los datos están en camino.
- **Error:** algo falló; qué se le dice al usuario y qué puede hacer.
- **Sin permiso o sin sesión:** qué ve un visitante.

Si alguno no está claro, preguntar. Recordar el principio central (`contexto-negocio.md` §2): nada debe bloquear a quien solo quiere hacer e imprimir su lotería.

## 3. Construir con lo que ya existe

- Colores, espaciados, radios y sombras: solo tokens de [`sistema-diseno.md`](sistema-diseno.md). Comprobar el valor en `src/index.css`.
- No escribir colores sueltos. Si falta uno, proponerlo como token y preguntar.
- Antes de crear un botón, campo o ventana, buscar uno igual en otra pantalla y reutilizarlo.
- Textos: siempre en `src/locales/es/translation.json` y `src/locales/en/translation.json`, nunca escritos en el componente.
- Avisos y registro de errores: con `logger` (`src/utils/logger.ts`), no con `console`.

## 4. Revisar contra el sistema de diseño

- ¿Usa la tipografía y los colores de los tokens?
- ¿Se parece a las pantallas vecinas de su zona?
- ¿Se ve bien en teléfono? El sitio se usa mucho desde el celular.

## 5. Accesibilidad

- Todo lo que se puede pulsar es un botón o un enlace de verdad, y se alcanza con el teclado.
- Las ventanas emergentes se cierran con Escape.
- Las imágenes con significado llevan texto alternativo; las decorativas, vacío.
- Los campos tienen su etiqueta.
- El texto se lee sobre su fondo.

## 6. Barra técnica y demo

- `npm run typecheck` y `npm run lint` en verde.
- Describirle a Carlos el cambio como recorrido: "abre X → haz Y → debería verse Z". Sin nombres de archivos ni de clases.
- La prueba final es que Carlos siga el guion de demo de la historia y vea el resultado.

---

## Checklist

- [ ] La pantalla está en `diseno-mockups.md`, o Carlos confirmó dónde va y se agregó.
- [ ] Estados vacío, cargando y error resueltos (camino completo).
- [ ] Sin colores sueltos nuevos; solo tokens.
- [ ] Sin componentes duplicados.
- [ ] Textos en español e inglés.
- [ ] Se ve bien en teléfono.
- [ ] Teclado, Escape y etiquetas revisados (camino completo).
- [ ] `typecheck` y `lint` en verde.
- [ ] Guion de demo escrito en la historia.
