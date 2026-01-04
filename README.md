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

## Despliegue en GitHub Pages

La aplicación está configurada para desplegarse automáticamente en GitHub Pages. Cada vez que hagas push a la rama `main`, GitHub Actions construirá y desplegará la aplicación automáticamente.

### Configuración inicial de GitHub Pages

1. Ve a la configuración de tu repositorio en GitHub
2. Navega a **Settings** > **Pages**
3. En **Source**, selecciona **GitHub Actions**
4. Guarda los cambios

### Dominio Personalizado

La aplicación está configurada para usar el dominio personalizado **chorroybuenas.com.mx**.

**Configuración del dominio:**
- El archivo `public/CNAME` contiene el dominio personalizado
- El base path está configurado como `/` (raíz) para el dominio personalizado
- Asegúrate de configurar los registros DNS en GoDaddy según las instrucciones de GitHub Pages

**Nota:** Puede tardar hasta 24 horas para que los cambios de DNS se propaguen completamente.

La aplicación estará disponible en:
- **Dominio personalizado:** `https://chorroybuenas.com.mx`
- **GitHub Pages (alternativo):** `https://cvegam02.github.io/chorroybuenas/`

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

