# FEAT-02 — Calidad y CI

**Prioridad:** Alta · **Findings:** H9, L4 · **Plan:** Task 2 (y los tests de los Tasks 3–8, 12–14)

**Objetivo:** tener una red de seguridad automática antes de tocar el código que maneja dinero.

**Contexto:** el repo no tiene ningún test, `npm run lint` falla porque no hay configuración de ESLint, y el workflow de GitHub solo compila y despliega con Node 18.

---

## CYB-201 — Tests unitarios con Vitest

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** En curso — runner y umbral de cobertura listos (commit `fac09f0`); los tests reales llegan con FEAT-03 en adelante
- **Finding:** H9
- **Plan:** Task 2, Steps 1–4
- **Depende de:** nada

### Descripción

Como desarrollador, quiero poder correr tests unitarios con un solo comando, para verificar la lógica de pagos, promociones y validación sin desplegar nada.

### Criterios de aceptación

- [x] `npm test` corre los archivos `tests/**/*.test.ts` y termina en verde.
- [ ] `npm run test:coverage` reporta cobertura y falla si baja de 80 % en `supabase/functions/_shared/**`, `src/services/aiFallback.ts` y `src/utils/avatar.ts`.
- [ ] Los módulos de `supabase/functions/_shared/` se pueden importar desde los tests sin Deno.

### Escenarios

**Escenario 1: corrida en verde**
- Dado el repo con dependencias instaladas
- Cuando se ejecuta `npm test`
- Entonces todos los tests pasan y el comando sale con código 0

**Escenario 2: un test roto detiene el flujo**
- Dado que se introduce un bug en un módulo `_shared`
- Cuando se ejecuta `npm test`
- Entonces el comando sale con código distinto de 0 e indica el test que falló

**Escenario 3: cobertura insuficiente**
- Dado un módulo `_shared` nuevo sin tests
- Cuando se ejecuta `npm run test:coverage`
- Entonces el comando falla por no alcanzar el umbral de 80 %

---

## CYB-202 — Lint funcional

- **Tipo:** Bug
- **Prioridad:** Alta
- **Estado:** Hecho (commits `e97d0ee` y `fac09f0`)
- **Finding:** H9
- **Plan:** Task 2, Steps 5–6
- **Depende de:** nada

### Descripción

Como desarrollador, quiero que `npm run lint` funcione y esté en verde, para que la regla `--max-warnings 0` del proyecto realmente valide algo.

### Criterios de aceptación

- [x] Existe `.eslintrc.cjs` con las reglas recomendadas de TypeScript y React Hooks.
- [x] `npm run lint` termina sin errores ni warnings.
- [x] No se usó `eslint-disable` para silenciar errores del código existente.
- [x] `npm run typecheck` sigue pasando después de las correcciones.

### Escenarios

**Escenario 1: lint en verde**
- Dado el repo en la rama de trabajo
- Cuando se ejecuta `npm run lint`
- Entonces no hay salida y el código de salida es 0

**Escenario 2: variable sin usar**
- Dado que alguien agrega un import que no se usa
- Cuando se ejecuta `npm run lint`
- Entonces el comando falla señalando el archivo y la línea

**Escenario 3: dependencia faltante en un hook**
- Dado un `useEffect` que usa una variable que no está en su arreglo de dependencias
- Cuando se ejecuta `npm run lint`
- Entonces el comando falla con `react-hooks/exhaustive-deps`

---

## CYB-203 — CI que valida antes de desplegar

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** En revisión — workflow actualizado (commit `fac09f0`); falta verlo correr en GitHub tras el primer push
- **Findings:** H9, L4
- **Plan:** Task 2, Step 7
- **Depende de:** CYB-201, CYB-202

### Descripción

Como dueño del proyecto, quiero que el sitio no se despliegue si el código no pasa typecheck, lint y tests, para no publicar a producción un cambio roto.

### Criterios de aceptación

- [x] El workflow `deploy.yml` corre typecheck, lint y tests con cobertura antes del build.
- [ ] Si cualquiera de los tres falla, el job `deploy` no se ejecuta.
- [x] El workflow usa Node 20.

### Escenarios

**Escenario 1: push sano a main**
- Dado un commit que pasa todas las validaciones
- Cuando se hace push a `main`
- Entonces el workflow valida, compila y despliega a GitHub Pages

**Escenario 2: push con un test roto**
- Dado un commit con un test que falla
- Cuando se hace push a `main`
- Entonces el workflow se detiene en "Unit tests" y el sitio publicado no cambia

**Escenario 3: push con error de tipos**
- Dado un commit con un error de TypeScript
- Cuando se hace push a `main`
- Entonces el workflow se detiene en "Typecheck" y no despliega

---

## CYB-204 — Tests de base de datos con pgTAP

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** Hecho — arnés ligero sobre `postgres:16-alpine` en lugar de pgTAP/Supabase local (decisión del 2026-10-06 por falta de disco). Los tests de las migraciones 022–025 llegan con FEAT-03, 04, 05 y 07.
- **Finding:** H9
- **Plan:** Tasks 3, 4, 5 y 13 (Step 1 de cada uno)
- **Depende de:** nada

### Descripción

Como desarrollador, quiero probar las funciones SQL y las políticas RLS contra un Postgres local, para comprobar que la acreditación, el cobro y los permisos se comportan como se espera antes de migrar un entorno real.

### Criterios de aceptación

- [x] `npm run test:db` corre todos los archivos de `supabase/tests/*.test.sql` contra un Postgres desechable con stubs de Supabase.
- [x] Cada archivo de test abre una transacción y termina con `rollback`; además el contenedor se destruye al terminar.
- [ ] Hay un archivo de test por cada migración nueva (022 a 025).
- [x] Las migraciones existentes (000 a 021) aplican sin errores sobre una base vacía; las 022 a 025 se validarán al crearse.
- [x] Una aserción fallida hace que el comando termine con código distinto de 0 (verificado con un test negativo temporal).
- [x] El workflow de CI corre `npm run test:db`.

### Escenarios

**Escenario 1: base local limpia**
- Dado Docker corriendo y `npx supabase start` ejecutado
- Cuando se ejecuta `npx supabase db reset && npm run test:db`
- Entonces las cuatro suites pasan

**Escenario 2: una política RLS se rompe**
- Dado que alguien agrega una policy que deja a `authenticated` escribir en `user_tokens`
- Cuando se ejecuta `npm run test:db`
- Entonces falla la suite `024_initial_tokens`

**Escenario 3: los tests no ensucian la base**
- Dado que se corrió `npm run test:db`
- Cuando se consulta `auth.users` en la base local
- Entonces no existen los usuarios `@test.dev` creados por los tests
