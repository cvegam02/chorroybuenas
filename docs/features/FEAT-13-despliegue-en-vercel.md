# FEAT-13 — Despliegue en Vercel

**Prioridad:** Alta · **Findings:** — (decisión de Carlos del 2026-10-06) · **Guía:** [`docs/VERCEL_DEPLOY.md`](../VERCEL_DEPLOY.md)

**Objetivo:** publicar el frontend con Vercel en lugar de GitHub Actions + GitHub Pages, con un entorno de dev y uno de producción, cada uno contra su propio proyecto de Supabase.

**Contexto:** existen dos proyectos de Supabase (DEV y PROD), pero el despliegue con GitHub Pages solo publica un sitio y toma las variables de los secrets de Actions, así que no hay un frontend de dev publicado y cambiar de entorno es engorroso. Vercel maneja variables por entorno: Production para `main` y Preview para las demás ramas.

**Lo que Vercel no cambia:** las migraciones, las Edge Functions y sus secrets se siguen desplegando a cada proyecto de Supabase con su CLI. Vercel solo construye y publica el frontend.

---

## CYB-1301 — Preparar el repositorio para Vercel

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** Hecho
- **Depende de:** CYB-201, CYB-202

### Descripción

Como desarrollador, quiero que el repositorio tenga todo lo que Vercel necesita para construir y servir la app, y que no queden restos del despliegue en GitHub Pages.

### Criterios de aceptación

- [x] `vercel.json` define el build (`npm run verify && npm run build`), la carpeta `dist` y la regla que sirve `index.html` en cualquier ruta.
- [x] Los archivos de `/assets/` se sirven con caché de larga duración.
- [x] Se eliminaron `public/CNAME`, `public/404.html`, el plugin que copiaba `404.html` y el job de despliegue a GitHub Pages.
- [x] GitHub Actions conserva un workflow `ci.yml` que solo verifica el código.
- [x] `package.json` declara Node 20 o superior.
- [x] La guía `docs/VERCEL_DEPLOY.md` reemplaza a `docs/GITHUB_PAGES_DEPLOY.md`, y el README y el checklist de producción apuntan a ella.
- [x] `npm run verify` y `npm run build` pasan en local.

### Escenarios

**Escenario 1: ruta interna abierta directamente**
- Dado el sitio publicado en Vercel
- Cuando alguien abre `https://<dominio>/comprar-tokens` o recarga esa página
- Entonces se carga la app y muestra la página de compra, no un 404

**Escenario 2: archivo estático**
- Cuando se pide `/robots.txt`, `/sitemap.xml` o una imagen de `/assets/`
- Entonces se sirve el archivo, no `index.html`

**Escenario 3: build con un test roto**
- Dado un commit con un test unitario que falla
- Cuando Vercel intenta construirlo
- Entonces el deployment queda en error y el sitio publicado no cambia

---

## CYB-1302 — Crear el proyecto en Vercel y sus variables

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** En revisión — proyecto de Vercel conectado y publicando `main` como Production (`chorroybuenas.vercel.app` usa Supabase PROD). Falta confirmar que las variables de Preview apuntan a DEV
- **Depende de:** CYB-1301
- **Responsable:** Carlos (requiere su cuenta de Vercel)

### Descripción

Como dueño del proyecto, quiero un proyecto de Vercel conectado al repositorio, con las variables de cada entorno apuntando al proyecto de Supabase correcto.

### Criterios de aceptación

- [ ] El proyecto de Vercel está conectado a `cvegam02/chorroybuenas` y `main` es la rama de producción.
- [ ] En Production: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son los de Supabase PROD, y `VITE_APP_URL` es `https://chorroybuenas.com.mx`.
- [ ] En Preview: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son los de Supabase DEV, y `VITE_APP_URL` no está definida.
- [ ] En Vercel no hay ninguna clave privada (`service_role`, Mercado Pago, Replicate).
- [ ] El primer deployment termina en estado Ready.

### Escenarios

**Escenario 1: Production apunta a PROD**
- Dado el deployment de producción
- Cuando se abre el sitio y se inspecciona una petición a Supabase
- Entonces el host es el del proyecto PROD

**Escenario 2: Preview apunta a DEV**
- Dado un deployment de Preview
- Cuando se inspecciona una petición a Supabase
- Entonces el host es el del proyecto DEV

**Escenario 3: variable mal puesta**
- Dado que en Preview se puso por error la URL de PROD
- Cuando se registra un usuario de prueba en un deployment de Preview
- Entonces aparece en el proyecto PROD: revisar las variables antes de usar Preview con datos de prueba

---

## CYB-1303 — Entorno de dev publicado

- **Tipo:** Historia
- **Prioridad:** Alta
- **Estado:** En curso — rama `dev` creada; `ALLOWED_ORIGINS` y las Redirect URLs de Supabase DEV ya incluyen `dev.chorroybuenas.com.mx`. Falta asignar el dominio a la rama en Vercel y crear el CNAME en GoDaddy
- **Depende de:** CYB-1302
- **Responsable:** Carlos (DNS y configuración de Supabase DEV)
- **Decisión a confirmar:** rama `dev` con el dominio `dev.chorroybuenas.com.mx`

### Descripción

Como desarrollador, quiero una URL fija de dev conectada a Supabase DEV, para probar compras, IA e inicio de sesión sin tocar producción y sin depender de ngrok.

La URL debe ser fija porque las Edge Functions solo aceptan orígenes de una lista blanca, y Supabase Auth solo redirige a URLs registradas.

### Criterios de aceptación

- [ ] Existe la rama `dev` y Vercel publica cada push en `https://dev.chorroybuenas.com.mx`.
- [ ] El secret `ALLOWED_ORIGINS` de Supabase DEV incluye `https://dev.chorroybuenas.com.mx` y `http://localhost:5173`.
- [ ] En Supabase DEV → Authentication → URL Configuration, el Site URL es el dominio de dev y las Redirect URLs incluyen `https://dev.chorroybuenas.com.mx/**` y `http://localhost:5173/**`.
- [ ] Supabase DEV tiene `MP_USE_SANDBOX_CHECKOUT=true`.
- [ ] El inicio de sesión con Google funciona en el dominio de dev.

### Escenarios

**Escenario 1: push a dev**
- Cuando se hace push a la rama `dev`
- Entonces en pocos minutos `dev.chorroybuenas.com.mx` muestra el cambio

**Escenario 2: compra de prueba en dev**
- Dado el sitio de dev y una tarjeta de prueba
- Cuando se compra un pack
- Entonces se abre el checkout de sandbox y al volver se regresa a `dev.chorroybuenas.com.mx`

**Escenario 3: login con Google en dev**
- Cuando un usuario entra con Google desde el dominio de dev
- Entonces vuelve a `dev.chorroybuenas.com.mx/dashboard` con sesión iniciada

**Escenario 4: deployment de otra rama**
- Dado el deployment de Preview de una rama cualquiera, con su URL generada por Vercel
- Cuando se intenta comprar tokens o usar la IA ahí
- Entonces el navegador bloquea la llamada por CORS (limitación conocida: usar el dominio de dev)

---

## CYB-1304 — Pasar el dominio de producción a Vercel

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** Por hacer
- **Depende de:** CYB-1302
- **Responsable:** Carlos (DNS en GoDaddy, GitHub Pages)

### Descripción

Como dueño del proyecto, quiero que `chorroybuenas.com.mx` se sirva desde Vercel sin que el sitio se caiga durante el cambio.

### Criterios de aceptación

- [ ] El deployment de producción se probó en su URL `*.vercel.app` antes de tocar el DNS.
- [ ] `chorroybuenas.com.mx` y `www.chorroybuenas.com.mx` están asignados a Production en Vercel, con certificado válido.
- [ ] Los registros DNS en GoDaddy apuntan a Vercel.
- [ ] `ALLOWED_ORIGINS` de Supabase PROD contiene el dominio con y sin `www`.
- [ ] Las Redirect URLs de Supabase PROD incluyen el dominio con y sin `www`.
- [ ] GitHub Pages está desactivado y su dominio personalizado quitado.
- [ ] Se borraron de GitHub los secrets `VITE_*` de Actions.
- [ ] `sitemap.xml`, `robots.txt` y la imagen de Open Graph se sirven desde el dominio.

### Escenarios

**Escenario 1: durante la propagación del DNS**
- Dado que el DNS aún no propaga
- Cuando un usuario abre el sitio
- Entonces ve la versión anterior servida por GitHub Pages, sin errores

**Escenario 2: después del corte**
- Cuando se abre `https://chorroybuenas.com.mx`
- Entonces responde Vercel con certificado válido y la app funciona

**Escenario 3: `www`**
- Cuando se abre `https://www.chorroybuenas.com.mx`
- Entonces carga el sitio (o redirige al dominio principal) y las compras funcionan

**Escenario 4: login con Google en producción**
- Cuando un usuario entra con Google después del corte
- Entonces vuelve a `chorroybuenas.com.mx/dashboard` con sesión iniciada

**Escenario 5: hay que volver atrás**
- Dado que el sitio falla tras el corte
- Cuando se restauran los registros DNS anteriores (antes de desactivar GitHub Pages)
- Entonces el dominio vuelve a servir la versión de GitHub Pages
