# Sistema de diseño

Autoridad de color, tipografía y componentes del sitio. Si este documento y el código no coinciden, **manda el código**: los valores viven en `src/index.css` y aquí solo se describen. Antes de usar un valor, comprobarlo ahí.

**Fuente:** el sitio ya construido (decidido el 2026-10-06). `design_system.md` y `design_system_v2.md`, en la raíz del repo, quedan como histórico y no se consultan.

Creado el 2026-10-06 leyendo `src/index.css`.

---

## Dirección visual

Cálida y festiva, en tonos naranja con acentos turquesa y amarillo sobre fondos crema; formas redondeadas y sombras suaves teñidas de naranja. _(descripción deducida de los valores; por confirmar con Carlos)_

## Tokens

Todos están definidos como variables en `:root`, en `src/index.css`. Se usan con `var(--nombre)`.

### Color

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#ea580c` | Color principal: botones y acentos principales |
| `--color-primary-dark` | `#c2410c` | Primario al pasar el cursor o presionar |
| `--color-primary-light` | `#fb923c` | Primario suave |
| `--color-primary-lighter` | `#fdba74` | Fondos y bordes de énfasis |
| `--color-primary-lightest` | `#ffedd5` | Fondos muy suaves |
| `--color-secondary` | `#2dd4bf` | Color secundario (turquesa) |
| `--color-secondary-dark` | `#14b8a6` | Secundario al pasar el cursor |
| `--color-secondary-light` | `#99f6e4` | Secundario suave |
| `--color-accent` | `#fcd34d` | Acento (amarillo) |
| `--color-accent-light` | `#fde68a` | Acento suave |
| `--color-bg-base` | `#fffbf7` | Fondo general de la página |
| `--color-bg-surface` | `#ffffff` | Tarjetas y ventanas |
| `--color-bg-subtle` | `#fff7ed` | Secciones destacadas |
| `--color-bg-tertiary` | `#f3f4f6` | Fondos neutros |
| `--color-text-main` | `#431407` | Texto principal |
| `--color-text-muted` | `#78350f` | Texto secundario |
| `--color-text-inverted` | `#ffffff` | Texto sobre color |
| `--color-border` | `#e5e7eb` | Bordes |
| `--color-border-dark` | `#d1d5db` | Bordes marcados |
| `--color-card-cream` | `#f4ead4` | Margen crema de una carta dibujada por el sitio (FEAT-32) |
| `--color-card-ink` | `#14100a` | Marco, ícono y contorno de letra de esa carta (FEAT-32) |
| `--color-card-pink` | `#e8a3b8` | Fondo de carta de ocasión: rosa (FEAT-32) |
| `--color-card-blue` | `#93c5fd` | Fondo de carta de ocasión: azul (FEAT-32) |
| `--color-card-lilac` | `#c4b5fd` | Fondo de carta de ocasión: lila (FEAT-32) |

`--color-bg-primary` y `--color-bg-secondary` son alias de `--color-bg-surface` y `--color-bg-base`.

### Tipografía

| Token | Valor |
|---|---|
| `--font-display` | `'Quicksand', system-ui, sans-serif` |
| `--font-body` | `'Quicksand', system-ui, sans-serif` |

Una sola familia, Quicksand, cargada desde Google Fonts en `index.html` con pesos de 300 a 700. No hay tokens de tamaño de letra: cada componente define los suyos.

### La carta impresa no es parte del sitio

La carta de lotería que el sitio produce tiene su propio aspecto, que no usa estos tokens: margen crema `#F4EAD4`, marco y contorno de letra `#14100A`, nombre en blanco y letra Arvo Bold (guardada en `src/fonts/`, con su licencia OFL). Esos valores viven en `src/services/cardCompose/constants.ts` y solo se usan para componer la imagen de la carta; no se usan en botones, textos ni pantallas del sitio (FEAT-29, decisión 9).

**Excepción (2026-10-10, FEAT-32, decisión 4):** las seis cartas de «Perfecta para cualquier ocasión», en la página de inicio, sí usan ese aspecto, porque son cartas decorativas dibujadas con HTML y CSS. Para eso existen los tokens `--color-card-*` de la tabla de color y la letra Arvo Bold declarada en `LandingOccasions.css` con el mismo archivo de `src/fonts/`. Fuera de cartas decorativas la regla sigue igual: ese aspecto no se usa en botones, textos ni pantallas.

### Espaciado, radios y sombras

| Token | Valor |
|---|---|
| `--spacing-xs` | `0.25rem` |
| `--spacing-sm` | `0.5rem` |
| `--spacing-md` | `1rem` |
| `--spacing-lg` | `1.5rem` |
| `--spacing-xl` | `3rem` |
| `--radius-sm` | `8px` |
| `--radius-md` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-full` | `999px` |
| `--shadow-sm` | `0 2px 4px rgba(234, 88, 12, 0.08)` |
| `--shadow-md` | `0 4px 12px -2px rgba(234, 88, 12, 0.12)` |
| `--shadow-lg` | `0 12px 24px -6px rgba(234, 88, 12, 0.15)` |
| `--ease-elastic` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` |

## Componentes

No existe una biblioteca de componentes compartidos (botón, campo, tarjeta). Cada pantalla trae su propio archivo `.css` junto a su `.tsx`, con clases de la forma `bloque__elemento--variante` (por ejemplo `buy-tokens-page__card-promo`).

Los únicos componentes que se reutilizan entre pantallas:

| Componente | Dónde vive | Para qué |
|---|---|---|
| Barra de navegación | `src/components/Navbar/` | Navegación, saldo y menú de usuario |
| Pie de página | `src/components/Footer/` | Pie común |
| Confirmación | `src/components/ConfirmationModal/ConfirmationModal.tsx` | Confirmar acciones que no se deshacen |
| Advertencia | `src/components/ConfirmationModal/WarningModal.tsx` | Avisos y errores |
| Iniciar sesión / Crear cuenta | `src/components/Auth/EmailAuthModal.tsx` | Entrada y registro |
| Selector de modo | `src/components/BoardGenerator/GridModeSelector.tsx` | Clásico o Kids |

Los íconos vienen de `react-icons` (familia `fa`).

**Regla al construir:** antes de crear un botón, campo o ventana, buscar si una pantalla ya tiene uno igual y reutilizar sus clases o extraerlo a un componente. No crear una variante más.

## Deuda conocida

Medida el 2026-10-06 sobre los archivos `.css` de `src/`:

- **Colores sueltos:** hay unos 460 colores escritos a mano frente a unos 1,430 usos de tokens. Los más repetidos no existen como token:

  | Color | Usos | Qué parece ser |
  |---|---|---|
  | `#e0e0e0` | 49 | Un gris de borde, distinto de `--color-border` |
  | `#c41e3a` | 36 | Un rojo que no pertenece a la paleta actual |
  | `#f8f8f8` | 28 | Un gris de fondo, distinto de `--color-bg-tertiary` |
  | `#dc2626` | 15 | Rojo de error; no hay token de error |

- **Faltan tokens** para estados: error, éxito y advertencia.
- **Faltan tokens** de tamaño de letra.

Unificar esto es una feature pendiente; no se corrige de paso al tocar una pantalla, salvo en lo que esa tarea cambie.

**Regla desde ahora:** código nuevo usa tokens. Si hace falta un color que no existe, se propone como token nuevo y se le pregunta a Carlos; no se escribe suelto.

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-10-06 | Documento creado a partir de `src/index.css`. Sin cambios de diseño. |
| 2026-10-09 | Se anota que la carta impresa tiene colores y letra propios, fuera de la paleta del sitio (FEAT-29). Sin cambios en el sitio. |
