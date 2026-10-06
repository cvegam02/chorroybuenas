# FEAT-01 — Gestión de secretos

**Prioridad:** Crítica · **Findings:** C1 · **Plan:** Task 1

**Objetivo:** que ningún secreto vigente esté en el repositorio público y que no pueda volver a colarse uno.

**Contexto:** `.env.example` tiene commiteado un personal access token de Supabase (`sbp_…`) desde el commit `186f6fb`, y el repo `cvegam02/chorroybuenas` es público. Ese token da acceso de gestión a la cuenta de Supabase.

---

## CYB-101 — Revocar el access token de Supabase expuesto

- **Tipo:** Bug de seguridad
- **Prioridad:** Crítica
- **Estado:** Hecho — el token viejo responde "Unauthorized" (verificado el 2026-10-06) y hay uno nuevo en `.env`. Pendiente de Carlos: revisar los logs del proyecto por el tiempo que estuvo expuesto
- **Finding:** C1
- **Plan:** Task 1, Steps 1–3
- **Depende de:** nada
- **Responsable:** Carlos (acción manual en el dashboard)

### Descripción

Como dueño del proyecto, quiero que el token publicado deje de funcionar, para que nadie que lo haya copiado del repo pueda administrar mi cuenta de Supabase.

Borrar el token del archivo no basta: sigue en el historial de git y cualquiera pudo haberlo copiado ya.

### Criterios de aceptación

- [ ] El token que empieza con `sbp_7dfc` ya no existe en Supabase → Account → Access Tokens.
- [ ] Existe un token nuevo, guardado únicamente en el `.env` local.
- [ ] Se revisaron los logs de Auth y Postgres de los últimos 30 días del proyecto `vjglrfofyzvyvaetakpu`.
- [ ] Se revisó que los secrets de Edge Functions no fueron leídos ni cambiados por terceros.
- [ ] Si se encontró actividad sospechosa, se rotaron `SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` y `REPLICATE_API_TOKEN`.

### Escenarios

**Escenario 1: el token viejo ya no autentica**
- Dado que el token fue revocado en el dashboard
- Cuando se ejecuta `SUPABASE_ACCESS_TOKEN=<token_viejo> npx supabase projects list`
- Entonces el CLI responde con error de autenticación y no lista proyectos

**Escenario 2: el token nuevo funciona desde el entorno local**
- Dado que el token nuevo está en `.env`
- Cuando se ejecuta `npm run deploy:functions` contra el proyecto de dev
- Entonces el deploy se autentica correctamente

**Escenario 3: se detecta actividad sospechosa**
- Dado que los logs muestran accesos que Carlos no reconoce
- Cuando termina la revisión
- Entonces se rotan los tres secretos de las edge functions y se actualizan en `supabase secrets`

---

## CYB-102 — Quitar credenciales reales de `.env.example`

- **Tipo:** Bug de seguridad
- **Prioridad:** Crítica
- **Estado:** Hecho (commit `a86db3e` en `fix/code-review-remediation`, sin push)
- **Finding:** C1
- **Plan:** Task 1, Steps 4–5
- **Depende de:** CYB-101

### Descripción

Como desarrollador que clona el repo, quiero que `.env.example` solo tenga marcadores de ejemplo, para saber qué variables configurar sin recibir credenciales reales de otra persona.

El cambio ya está hecho en el working tree, pero sin commitear.

### Criterios de aceptación

- [x] `.env.example` no contiene ningún valor real: ni token `sbp_`, ni anon key, ni URL de proyecto, ni URL de ngrok.
- [x] El cambio está commiteado en la rama `fix/code-review-remediation`.
- [x] El archivo sigue documentando todas las variables necesarias con valores de ejemplo.

### Escenarios

**Escenario 1: búsqueda de secretos en el árbol**
- Dado el repo en la rama de trabajo
- Cuando se ejecuta `git grep -n -I -E 'sbp_[a-f0-9]{20}|r8_[A-Za-z0-9]{20}|APP_USR-[0-9]{6}'`
- Entonces no hay ninguna coincidencia

**Escenario 2: un desarrollador nuevo configura su entorno**
- Dado un clon limpio del repo
- Cuando copia `.env.example` a `.env`
- Entonces todas las variables están comentadas o con marcadores como `<REF-DEV>` y la app no arranca hasta que pone sus propios valores

---

## CYB-103 — Activar detección de secretos en GitHub

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** En curso — falta cerrar la alerta #1 después de revocar el token (CYB-101)
- **Finding:** C1
- **Plan:** Task 1, Step 6
- **Depende de:** nada
- **Responsable:** Carlos (configuración del repo)

### Descripción

Como dueño del proyecto, quiero que GitHub bloquee un push que contenga un secreto, para que este incidente no se repita.

### Criterios de aceptación

- [x] "Secret scanning" está activo en el repo. (verificado 2026-10-06, ya estaba activo)
- [x] "Push protection" está activo en el repo. (verificado 2026-10-06, ya estaba activo)
- [ ] Las alertas existentes de secret scanning (si las hay) están revisadas y cerradas como revocadas. Pendiente: alerta #1 "Supabase Personal Access Token" en `.env.example`, abierta desde 2026-04-21.

### Escenarios

**Escenario 1: push con un token**
- Dado que push protection está activo
- Cuando alguien intenta hacer push de un commit con un token con formato `sbp_…`
- Entonces GitHub rechaza el push e indica el archivo y la línea

**Escenario 2: alerta histórica**
- Dado que el token viejo sigue en el historial
- Cuando GitHub escanea el repo
- Entonces genera una alerta, que se cierra marcándola como "revocado"
