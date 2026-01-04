# Lotería Personalizada

Aplicación web para generar tableros personalizados de Lotería Mexicana con cartas personalizadas.

## Características

- Carga de cartas personalizadas (imagen + título)
- Validación de mínimo 30 cartas (recomendado 54 para experiencia clásica)
- Generación de múltiples tableros (mínimo 8)
- Cada tablero tiene 16 cartas únicas (sin repetir dentro del tablero)
- Las cartas pueden repetirse entre diferentes tableros
- Previsualización de todos los tableros generados
- Generación y descarga de PDF con todos los tableros
- Almacenamiento temporal en localStorage
- Confirmación antes de eliminar datos

## Requisitos

- Node.js 18+ 
- npm o yarn

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Estructura del Proyecto

```
src/
├── components/
│   ├── CardEditor/          # Componentes para carga de cartas
│   ├── BoardGenerator/      # Componentes para generación de tableros
│   ├── Recommendations/     # Componente de recomendaciones
│   └── ConfirmationModal/   # Modal de confirmación post-descarga
├── hooks/
│   ├── useCards.ts          # Hook para manejo de cartas
│   └── useBoard.ts          # Hook para generación de tableros
├── services/
│   └── PDFService.ts        # Servicio para generación de PDFs
├── types/
│   └── index.ts             # Tipos TypeScript
└── utils/
    ├── storage.ts           # Utilidades de localStorage
    └── imageUtils.ts        # Utilidades para procesamiento de imágenes
```

## Tecnologías

- React 18
- TypeScript
- Vite
- pdf-lib (para generación de PDFs)
- CSS Modules

## Uso

1. Carga al menos 30 cartas (imagen + título)
2. Selecciona la cantidad de tableros a generar (mínimo 8)
3. Revisa la previsualización de los tableros generados
4. Descarga el PDF con todos los tableros
5. Confirma si deseas eliminar los datos o modificar las cartas

