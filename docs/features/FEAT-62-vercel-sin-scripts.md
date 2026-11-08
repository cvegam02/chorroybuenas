# FEAT-62 — Que una caída de GitHub no tumbe los despliegues de Vercel

**Estado:** construida el 2026-11-08 (US A1) y llevada ese mismo día a dev y a producción (`main`) por pedido de Carlos: PR de `feature/vercel-sin-scripts` a `dev` y PR de `dev` a `main`. Rama `feature/vercel-sin-scripts` (creada el 2026-11-08 desde `dev`). Sin migraciones ni edge functions.

**Contexto.** El 2026-11-08 el despliegue de FEAT-61 falló en Vercel (dev y producción) al instalar dependencias: el paquete `supabase` (la herramienta de línea de comandos, de desarrollo) baja su programa desde GitHub al instalarse, y GitHub respondía 504. Vercel no usa esa herramienta: su construcción corre `npm run verify` (typecheck, lint y pruebas) y `npm run build`. Solo dos paquetes corren pasos al instalarse: `supabase` y `esbuild`; el de `esbuild` solo revisa su programa, que llega como paquete aparte por plataforma.

**No cambia reglas de negocio ni el índice de pantallas.**

## Decisiones tomadas con el usuario

1. **Vercel instala sin correr los pasos extra de los paquetes (`npm ci --ignore-scripts`).** CI se queda igual: necesita la herramienta de Supabase para `npm run test:db`. 2026-11-08. _(Descartado: solo esperar a que GitHub se recupere y volver a desplegar.)_

## User Stories

### US A1 — Vercel construye aunque GitHub esté caído   ·   Estado: hecha, en producción

- **Historia:** Como dueño del sitio, quiero que un despliegue no falle porque GitHub no responde, para que los arreglos lleguen a producción.
- **Entrega demostrable:** El despliegue de Vercel instala dependencias sin bajar la herramienta de Supabase y termina bien, en dev y en producción.
- **Depende de:** —
- **Cómo se prueba (guion de demo):** En Vercel → Deployments → el despliegue de `dev` y luego el de `main` terminan en «Ready»; en su registro, `npm ci --ignore-scripts` no baja nada de `github.com/supabase/cli`. Abrir el sitio → carga normal.
- **Escenarios cubiertos:** despliegue de dev; despliegue de producción; GitHub caído.
- **Construido:** 2026-11-08. `vercel.json`: `installCommand` pasa de `npm ci` a `npm ci --ignore-scripts`. Para deshacerlo basta regresar esa línea.
