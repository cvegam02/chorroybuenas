# FEAT-05 — Tokens iniciales

**Prioridad:** Alta · **Findings:** H6 · **Plan:** Task 5

**Objetivo:** que los tokens de bienvenida los asigne el servidor al registrarse, y que el navegador no pueda escribir saldos.

**Contexto:** hoy `TokenRepository.initializeUser` hace un `upsert` en `user_tokens` desde el navegador. Según las migraciones, solo `service_role` puede escribir esa tabla, así que la llamada debería fallar para todo usuario nuevo. Si en producción funciona, es porque existe una policy creada a mano que le permite al usuario fijar su propio saldo.

---

## CYB-501 — Asignar tokens iniciales al registrarse

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** En revisión — implementado y probado (migración 024); falta probar el registro por correo y por Google en dev (FEAT-12)
- **Finding:** H6
- **Plan:** Task 5 (migración 024)
- **Depende de:** CYB-204

### Descripción

Como usuario nuevo, quiero recibir mis tokens de bienvenida en cuanto creo mi cuenta, para poder probar la IA sin pasos adicionales.

### Criterios de aceptación

- [x] El trigger `handle_new_user` crea la fila en `user_tokens` con el valor de `app_config.initial_tokens`.
- [x] Si la configuración falta o no es un número, el registro no falla y el saldo inicial es 0.
- [x] Un valor negativo en la configuración se trata como 0.
- [x] El trigger no pisa una fila de saldo que ya exista.
- [ ] Funciona igual para registro por correo y por Google.
- [ ] El panel de Admin sigue pudiendo cambiar `initial_tokens`, y el cambio aplica a los registros posteriores.

### Escenarios

**Escenario 1: registro con configuración en 5**
- Dado `initial_tokens = 5`
- Cuando una persona se registra con correo y contraseña
- Entonces su saldo es 5 al entrar por primera vez

**Escenario 2: registro con Google**
- Dado `initial_tokens = 5`
- Cuando una persona entra por primera vez con Google
- Entonces su saldo es 5

**Escenario 3: configuración inválida**
- Dado `initial_tokens = "abc"`
- Cuando una persona se registra
- Entonces la cuenta se crea normalmente y su saldo es 0

**Escenario 4: configuración ausente**
- Dado que no existe la clave `initial_tokens`
- Cuando una persona se registra
- Entonces la cuenta se crea y su saldo es 0

**Escenario 5: el admin cambia el valor**
- Dado que el admin cambia `initial_tokens` de 5 a 10
- Cuando se registra un usuario nuevo
- Entonces recibe 10; los usuarios anteriores conservan su saldo

---

## CYB-502 — El navegador no puede escribir saldos

- **Tipo:** Bug de seguridad
- **Prioridad:** Alta
- **Estado:** En revisión — implementado y probado (migración 024, `TokenRepository` de solo lectura); falta ver en dev/prod si la migración elimina alguna policy manual
- **Finding:** H6
- **Plan:** Task 5 (migración 024 y `TokenRepository.ts`)
- **Depende de:** CYB-501

### Descripción

Como dueño del negocio, quiero que ningún usuario pueda modificar su saldo desde el navegador, para que el saldo solo cambie por registro, compra o uso de IA.

### Criterios de aceptación

- [x] Las únicas policies en `user_tokens` son: lectura del propio saldo, gestión por `service_role` y lectura por admins.
- [x] La migración elimina cualquier otra policy de esa tabla y deja aviso de cuál borró.
- [x] `TokenRepository` solo tiene `getBalance` e `invalidateBalance`; ya no existen `initializeUser`, `addTokens` ni `spendTokens`.
- [x] `getBalance` devuelve 0 cuando el usuario no tiene fila, sin intentar crearla.
- [x] La caché de 15 segundos y la deduplicación de peticiones se conservan.

### Escenarios

**Escenario 1: `UPDATE` directo del saldo**
- Dado un usuario autenticado con 5 tokens
- Cuando ejecuta desde la consola `supabase.from('user_tokens').update({ balance: 999 })`
- Entonces no se modifica ninguna fila y su saldo sigue en 5

**Escenario 2: `upsert` directo del saldo**
- Dado un usuario autenticado
- Cuando ejecuta `supabase.from('user_tokens').upsert({ user_id, balance: 999 })`
- Entonces recibe un error de permisos

**Escenario 3: policy manual en producción**
- Dado que en prod existe una policy creada desde el dashboard que permite `INSERT` al usuario
- Cuando se aplica la migración 024
- Entonces la policy se elimina y su nombre aparece en los avisos de la migración

**Escenario 4: usuario sin fila consulta su saldo**
- Dado un usuario sin fila en `user_tokens`
- Cuando la app carga su saldo
- Entonces muestra 0 y no se hace ninguna escritura

**Escenario 5: varias pantallas piden el saldo a la vez**
- Dado que Navbar, Dashboard y editor piden el saldo al cargar
- Cuando se monta la página
- Entonces se hace una sola petición a la base

---

## CYB-503 — Usuarios existentes sin fila de saldo

- **Tipo:** Tarea técnica (datos)
- **Prioridad:** Media
- **Estado:** En revisión — backfill implementado y verificado con datos simulados; falta que Carlos anote cuántos usuarios afectará en prod
- **Finding:** H6
- **Plan:** Task 5 (backfill en la migración 024)
- **Depende de:** CYB-501

### Descripción

Como usuario que se registró antes de este cambio y nunca consultó su saldo, quiero recibir mis tokens de bienvenida igual que un usuario nuevo, para no quedar en desventaja por haberme registrado antes.

### Criterios de aceptación

- [x] La migración crea la fila de saldo para cada usuario de `auth.users` que no la tenga, con el valor vigente de `initial_tokens`.
- [x] Los usuarios que ya tienen fila conservan su saldo sin cambios.
- [x] Después de migrar, todo usuario de `auth.users` tiene fila en `user_tokens`.
- [ ] Antes de migrar prod se anotó cuántos usuarios se verán afectados y con qué valor.

### Escenarios

**Escenario 1: usuario antiguo sin fila**
- Dado un usuario registrado hace meses sin fila de saldo y `initial_tokens = 5`
- Cuando se aplica la migración
- Entonces su saldo es 5

**Escenario 2: usuario antiguo con saldo**
- Dado un usuario con 37 tokens
- Cuando se aplica la migración
- Entonces su saldo sigue en 37

**Escenario 3: verificación posterior**
- Dado que la migración terminó
- Cuando se cuentan los usuarios de `auth.users` sin fila en `user_tokens`
- Entonces el resultado es 0
