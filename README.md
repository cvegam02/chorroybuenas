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

## Despliegue

El frontend se despliega en **Vercel**: cada push a `main` publica en producción (`https://chorroybuenas.com.mx`, contra el proyecto PROD de Supabase) y cada push a `dev` publica en `https://dev.chorroybuenas.com.mx` (contra el proyecto DEV).

- Configuración de Vercel, variables por entorno y dominios: [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)
- Migraciones, Edge Functions y secrets de Supabase: [docs/ENTORNOS_DEV_PROD.md](docs/ENTORNOS_DEV_PROD.md)

GitHub Actions solo verifica el código (typecheck, lint y tests); no despliega.

### Optimización SEO

La aplicación está optimizada para motores de búsqueda con:
- Meta tags optimizados con palabras clave relevantes
- Open Graph tags para redes sociales
- Structured Data (JSON-LD) para mejor indexación
- Sitemap.xml para ayudar a los buscadores a encontrar el contenido
- Robots.txt configurado correctamente

**Para mejorar la visibilidad en Google:**
1. Registra tu sitio en [Google Search Console](https://search.google.com/search-console)
2. Verifica la propiedad del dominio
3. Envía el sitemap: `https://chorroybuenas.com.mx/sitemap.xml`
4. Espera a que Google indexe tu sitio (puede tardar varios días)

### Despliegue manual

Si prefieres desplegar manualmente:

```bash
npm run build
# Luego sube la carpeta dist/ a la rama gh-pages o usa GitHub Desktop
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

