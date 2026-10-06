# Remediación del Code Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar todos los findings del code review del 2026-10-06 (3 CRITICAL, 6 HIGH, 8 MEDIUM, 4 LOW), en ese orden de severidad.

**Architecture:** Todo lo que toca dinero (cobro de tokens de IA, acreditación de pagos, tokens iniciales) se mueve a Postgres con operaciones atómicas e idempotentes, ejecutables solo por `service_role`. Las edge functions quedan como handlers delgados que componen módulos puros en `supabase/functions/_shared/` (sin `Deno.*` ni imports remotos), lo que permite probarlos con Vitest en Node. El cliente deja de escribir saldo y de decidir cobros.

**Tech Stack:** React 18 + Vite 5 + TypeScript, Supabase (Postgres, RLS, Edge Functions en Deno), Mercado Pago, Replicate. Nuevo: Vitest 2 (unit), pgTAP vía `supabase test db` (SQL), ESLint 8 con config real.

**Spec:** No hay documento de spec; la fuente es el code review hecho en la conversación del 2026-10-06, resumido en la tabla "Findings" de abajo.

## Findings (fuente del plan)

| ID | Sev | Finding | Task |
|----|-----|---------|------|
| C1 | CRITICAL | PAT de Supabase (`sbp_…`) commiteado en `.env.example:38`, repo público | 1 |
| C2 | CRITICAL | `transform-loteria` no cobra tokens; el cobro lo hace el navegador | 4, 11, 12 |
| C3 | CRITICAL | Doble acreditación: check-then-insert sin `unique` en `payment_id` | 3, 10 |
| C4 | CRITICAL | `add_tokens_after_purchase` es ejecutable por `anon` y `authenticated`: la migración 004 solo revoca de `public`, y Supabase concede `EXECUTE` a esos roles por privilegios por defecto. Detectado con el arnés y confirmado en la base DEV real el 2026-10-06 (corregido ahí); PROD pendiente | 3 |
| C5 | CRITICAL | En la base real `user_tokens` tiene la policy `"Service role can manage credits"` (`FOR ALL TO public USING (true)`): cualquiera con la anon key puede leer y modificar todos los saldos. Las bases se crearon a mano y no coinciden con las migraciones. Confirmado en DEV el 2026-10-06 y corregido ahí; PROD pendiente | 5 (migración 024, PR #7) |
| H4 | HIGH | Bono de código promocional se muestra y no se acredita; sin límite por usuario | 6, 9, 10 |
| H5 | HIGH | `spend_tokens` permite saldo negativo (race) | 4 |
| H6 | HIGH | Tokens iniciales escritos desde el cliente (`initializeUser`, `addTokens`) | 5 |
| H7 | HIGH | `custom_tokens` sin validar tipo/entero | 6, 9 |
| H8 | HIGH | `transform-loteria` sin topes: recursión 429, polling infinito, imagen sin validar, sin rate limit | 4, 6, 8, 11 |
| H9 | HIGH | Sin tests; `npm run lint` roto; CI solo compila | 2 |
| M1 | MEDIUM | `isTestMode` siempre true; sandbox por default | 7, 9 |
| M2 | MEDIUM | Códigos promocionales legibles por cualquiera | 13 |
| M3 | MEDIUM | Webhook responde 200 ante excepción; no valida `x-signature` | 7, 10 |
| M4 | MEDIUM | `app_url` del cliente sin lista blanca | 7, 9 |
| M5 | MEDIUM | Fuga de detalles internos en errores | 9, 10, 11, 12 |
| M6 | MEDIUM | Falso éxito de IA (devuelve la imagen original) | 12 |
| M7 | MEDIUM | Avatar con URL firmada de 1 año en metadata | 14 |
| M8 | MEDIUM | CORS `*` | 7, 9, 10, 11 |
| L1 | LOW | 115 `console.*` en `src/` | 16 |
| L2 | LOW | 18 `any` | 17 |
| L3 | LOW | Archivos al borde de 800 líneas; `transformToLoteria` ~110 líneas | 12, 18 |
| L4 | LOW | CI en Node 18 | 2 |

Hallazgos nuevos encontrados al preparar el plan (se arreglan en el task indicado):
- `create-payment-preference` cuenta compras con cliente anon sin JWT de usuario, así que RLS devuelve 0 y `isFirstPurchase` siempre es true al crear la preferencia (Task 9: usar service role).
- `AIService.transformToLoteria` reintenta sin fin si Replicate responde `NSFW_FILTER` (`AIService.ts:207-210`) (Task 12: tope de 2 reintentos).

## Rulings (cambios al plan durante la ejecución)

- **2026-10-06 — Tests SQL con arnés ligero en vez de pgTAP/`supabase start`.** La partición raíz no tiene espacio para las imágenes de Supabase local. `npm run test:db` ejecuta `scripts/test-db.sh`: levanta `postgres:16-alpine` en memoria, aplica `supabase/tests/harness/supabase_stubs.sql` (roles, `auth`, `storage`, privilegios por defecto de Supabase) y todas las migraciones, y corre `supabase/tests/*.test.sql`. Costo si está mal: los stubs no son Supabase real, así que cada migración se valida además en el proyecto dev (Task 15).
- Los bloques de test SQL de los Tasks 3, 4, 5 y 13 están escritos en pgTAP; al ejecutarlos se traducen así:

| pgTAP (en este plan) | Arnés |
|---|---|
| `select plan(n);` / `select * from finish();` | se omiten |
| `select is(a, b, 'msg');` | `select test.is(a, b, 'msg');` |
| `select lives_ok($$sql$$, 'msg');` | `select test.lives($$sql$$, 'msg');` |
| `select throws_ok($$sql$$, 'X', 'msg');` / `throws_ok($$sql$$, '42501', null, 'msg')` | `select test.throws($$sql$$, 'X', 'msg');` (SQLSTATE o fragmento del mensaje) |
| `select hasnt_function('public', 'f', 'msg');` | `select test.is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'f'), 0, 'msg');` |
| `set local role authenticated; set local request.jwt.claims = '{"sub":"<id>",…}';` | `select test.as_user('<id>');` |
| `set local role anon;` | `select test.as_anon();` |
| `reset role;` | `select test.as_postgres();` |
| `npx supabase start` / `npx supabase db reset` | no hacen falta: cada corrida parte de una base vacía |

- **2026-10-06 — Task 10: el flujo de pago vive en módulos probados, no en los handlers.** Además de `credit.ts`, `mpSignature.ts` y `cors.ts`, se crearon `supabase/functions/_shared/paymentFlow.ts` (`parseNotification`, `findApprovedPayment`, `creditPayment`) y `mpClient.ts` (`createMpGet`), con tests en `tests/functions/`. Los `index.ts` de `webhook-mercadopago` y `credit-payment-on-return` solo arman dependencias y traducen el resultado a HTTP. Costo si está mal: ninguno funcional; el código del Task 10 en este plan queda como referencia, no como texto final.
- **2026-10-06 — Typecheck de edge functions sin Deno.** `npm run typecheck` ahora también corre `tsc --project supabase/functions/tsconfig.json` con `deno-shim.d.ts`. Cada `index.ts` reescrito se agrega al `include` de ese tsconfig (Tasks 9 y 11).
- **2026-10-06 — Hallazgo: el frontend nunca llama a `credit-payment-on-return`.** `BuyTokensPage` solo hace `refreshBalance()` al volver de Mercado Pago, así que hoy la acreditación depende únicamente del webhook y el saldo puede verse sin actualizar. Conectarlo no está en el alcance de los findings; queda como recomendación para Carlos.

- **2026-10-06 — FEAT-04 adelantó partes de los Tasks 5, 6, 8, 11 y 12.** Para no reescribir `transform-loteria` dos veces se implementaron completos `replicate.ts` (Task 8) y el handler (Task 11), con la lógica en un módulo nuevo y probado, `supabase/functions/_shared/transform.ts` (`parseTransformRequest`, `buildPredictionBody`, `assertPredictionSucceeded`, `mapSpendError`, `toErrorResponse`). De `validation.ts` solo existe la parte de imagen (`validateImageDataUri`, `isUuid`, `fail`); `parsePreferenceRequest` se agrega en el Task 6. En el cliente se quitó `TokenRepository.spendTokens`, se agregó `invalidateBalance` y `AIService` ya no cobra, envía `set_id`, usa el código de error del servidor y limita a 2 los reintentos NSFW. Quedan para el Task 12: `aiFallback.ts`, quitar el falso éxito (mock) y los mensajes por código. `runCharged` recibe `onRefundError` en vez de escribir en consola. Costo si está mal: ninguno funcional; los bloques de código de esos tasks en este plan son referencia.

- **2026-10-06 — Task 9: la preferencia se arma en un módulo probado.** Se creó `supabase/functions/_shared/preference.ts` (`resolvePurchaseItem`, `buildPreference`) y el handler de `create-payment-preference` solo lee de la base, llama a Mercado Pago y traduce a HTTP. Una promoción cuyo bono redondea a 0 no se registra como usada (`promotion_id` queda nulo). Los errores de lectura de `token_packs`, `token_pricing` y `promotions` ahora devuelven 500 en vez de continuar con valores por defecto. El `include` del tsconfig de funciones pasó a `*/index.ts`: las cuatro funciones se verifican. Costo si está mal: una caída de la base impide comprar en vez de cobrar con el precio por defecto, que es el comportamiento buscado.

- **2026-10-06 — Task 13: la validación del código vive en un hook.** Se creó `src/hooks/usePromoCode.ts` (debounce de 400 ms, descarta respuestas viejas, pone el bono en 0 mientras valida un código nuevo) en lugar de un `useEffect` dentro de `BuyTokensPage`. El tipo del resumen se llama `PromoSummary`. Orden de despliegue: la migración 025 debe salir junto con la función `create-payment-preference` nueva y el frontend nuevo; si se aplica sola, la función y el frontend actuales dejan de ver promociones (compran sin bono, no fallan).

- **2026-10-06 — Task 12: se reutilizan los textos que ya existían.** `aiErrorToI18nKey` usa las claves existentes `cardEditor.errors.insufficientTokens`, `aiSensitivePhotoNotSupported` y `aiSensitiveContent`; solo se agregaron `aiNotLoggedIn`, `aiRateLimited` y `aiTimeout`. Se añadió `isSensitiveContentError` para el lote: una foto rechazada por el filtro (incluido NSFW, que antes se reintentaba sin fin y nunca llegaba al lote) se omite y el lote continúa; cualquier otro error lo detiene con su mensaje propio. Se quitó la verificación previa de saldo en el cliente: el servidor es quien decide. Costo si está mal: un lote con fotos NSFW las omite en vez de detenerse.

- **2026-10-06 — Task 14: `useAvatarUrl` sin `eslint-disable`.** El efecto depende de valores primitivos (`kind`, `value`, `version`) en vez del objeto `source`, así que no hizo falta silenciar `react-hooks/exhaustive-deps`. `resolveAvatarSource` trata una URL firmada con codificación inválida como URL externa en lugar de lanzar. Costo si está mal: ninguno.

- **2026-10-06 — Tasks 16–18 (FEAT-11).** `logger` lee `import.meta.env.PROD` en cada llamada (para poder probarlo) y también reemplaza referencias sin paréntesis como `.catch(console.error)`. `handleSubmit` de `CardUpload` acepta `React.SyntheticEvent`. `BoardRepository` omite filas de `board_cards` sin carta en vez de fallar. Los hooks `useCardAI` y `useProfileEditing` devuelven los mismos nombres que antes tenía el componente, que los desestructura: el JSX no cambió. `useCardAI` recibe además `isAIModalOpen`; `useProfileEditing` expone `startNameEdit(nombre)` porque el nombre visible se calcula en el componente. Tamaños finales: `CardEditor.tsx` 667 líneas y `Dashboard.tsx` 709; no se alcanzaron las metas de 600 y 680 del plan, y ambos quedan bajo el límite de 800.

- **2026-10-06 — Task 15 (pasos locales).** El orden de despliegue y la tabla de secrets quedaron en `docs/ENTORNOS_DEV_PROD.md` (sección 10 nueva). `credit-payment-on-return` pasa a `verify_jwt = false` en `config.toml`, igual que las otras funciones que llama el navegador: valida el JWT ella misma y necesita responder al preflight. Los pasos 4 a 6 del Task 15 (despliegue en dev y prod) no se ejecutaron: modifican entornos reales y requieren confirmación de Carlos. Solo existe `.env` en la máquina (no hay `.env.production`) y no hay proyecto enlazado en el CLI: falta confirmar si dev y prod son proyectos distintos.

- **2026-10-06 — El frontend se despliega con Vercel, no con GitHub Actions/Pages (decisión de Carlos).** Hay dos proyectos de Supabase: Production de Vercel (`main`) usa PROD, y Preview usa DEV, con la rama `dev` en `dev.chorroybuenas.com.mx`. Se agregó `vercel.json`, el workflow pasó a `ci.yml` (solo verifica) y se quitaron `public/CNAME`, `public/404.html` y el plugin `copy-404`. Esto reemplaza lo que el Task 2 Step 7 y el Task 15 decían sobre `deploy.yml`, GitHub Pages y ngrok. Guía: `docs/VERCEL_DEPLOY.md`; historias: `docs/features/FEAT-13-despliegue-en-vercel.md`. Costo si está mal: mientras no se haga el corte de DNS, un merge a `main` ya no actualiza el sitio de GitHub Pages.

- **2026-10-06 — Despliegue en DEV.** Las bases no tienen historial de migraciones (`supabase_migrations.schema_migrations` no existe): `supabase db push` intentaría correr las 26 migraciones, así que las 022–025 se aplicaron una por una, cada una en su transacción, por la Management API, tras respaldar saldos, policies y funciones. Las funciones se desplegaron con `--use-api` (sin Docker, por espacio en disco). Antes de aplicar se corrigieron las migraciones 024 y 025 para no depender del nombre de las policies (PR #7). No se borró `MP_USE_PRODUCTION_CHECKOUT` de DEV hasta comprobar que el checkout de sandbox funciona. Pendiente: registrar el historial de migraciones en ambas bases para poder volver a usar `db push`.

- **2026-10-06 — El checkout vuelve a comportarse como antes (corrige el Task 7/9).** En la prueba real en DEV, forzar `sandbox_init_point` hizo fallar el checkout de Mercado Pago. Ahora se usa `init_point` por defecto en todos los entornos y no se envía `payer`, que es lo que hacía en la práctica el código original; `MP_USE_SANDBOX_CHECKOUT=true` queda solo como opción explícita. Costo si está mal: ninguno respecto al comportamiento anterior a la remediación.

## Global Constraints

- Trabajar en la rama `fix/code-review-remediation` creada desde `main`; nunca commitear directo a `main`.
- Commits en formato `<type>: <description>` (feat, fix, refactor, docs, test, chore, perf, ci), sin líneas de atribución.
- Ningún secreto en el repo: ni en código, ni en `.env.example`, ni en este plan.
- Migraciones nuevas numeradas desde `022_`, idempotentes donde sea posible, nunca editar las `000`–`021`.
- Toda función SQL `security definer` lleva `set search_path = public` y `revoke … from public, anon, authenticated` explícito si es solo para `service_role`.
- Los módulos en `supabase/functions/_shared/` no usan `Deno.*` ni imports `https://`/`npm:`; los imports relativos llevan extensión `.ts`.
- Mensajes de error al cliente: genéricos y en español; el detalle solo va a `console.error` en el servidor.
- Textos de UI nuevos en `src/locales/es/translation.json` y `src/locales/en/translation.json` (son los que importa `src/i18n.ts`).
- Cobertura ≥ 80 % sobre los módulos nuevos (`supabase/functions/_shared/**`, `src/services/aiFallback.ts`, `src/utils/avatar.ts`). El resto de la app no tiene tests y queda fuera del umbral.
- Orden de despliegue por entorno (dev primero, luego prod): migraciones → secrets → edge functions → frontend. Ver Task 15.

## Review Focus

1. Mercado Pago entrega el mismo pago por webhook `payment`, webhook `merchant_order` y el retorno del usuario casi a la vez → debe acreditarse una sola vez. Test: Task 3 (pgTAP, llamada doble) + índice único.
2. Replicate falla o expira después de cobrar el token → el token se devuelve y no queda fila en `token_usage`. Test: Task 8 (`runCharged`) y Task 4 (refund idempotente).
3. Preferencia creada antes del deploy (metadata sin `promotion_type`) y pagada después → se trata como promo de primera compra, igual que hoy. Test: Task 6 (`buildCreditParams`, caso legacy).
4. `app_config.initial_tokens` con un valor no numérico → el registro de usuarios no debe fallar; saldo inicial 0. Test: Task 5 (pgTAP).
5. Datos existentes que violan las nuevas restricciones (saldos negativos, `payment_id` duplicados) → la migración debe detenerse con un mensaje claro, no corromper ni fallar a medias. Test: guardas `do $$` en Tasks 3 y 4, más paso manual de consulta previa.

---

## Estructura de archivos

**Crear**
- `.eslintrc.cjs`, `vitest.config.ts`
- `supabase/migrations/022_payment_idempotency.sql`, `023_server_side_token_spend.sql`, `024_initial_tokens_on_signup.sql`, `025_promotions_privacy.sql`
- `supabase/tests/022_payments.test.sql`, `023_spend.test.sql`, `024_initial_tokens.test.sql`, `025_promotions.test.sql`
- `supabase/functions/_shared/validation.ts` — parseo de requests e imagen
- `supabase/functions/_shared/promotions.ts` — elección de promo y bono
- `supabase/functions/_shared/credit.ts` — parámetros de acreditación a partir de pago + metadata
- `supabase/functions/_shared/checkout.ts` — `app_url` y modo sandbox/producción
- `supabase/functions/_shared/cors.ts` — CORS por lista blanca
- `supabase/functions/_shared/mpSignature.ts` — verificación HMAC de Mercado Pago
- `supabase/functions/_shared/replicate.ts` — crear/esperar predicción con topes, `runCharged`
- `tests/functions/*.test.ts` — un archivo por módulo `_shared`
- `src/services/aiFallback.ts`, `tests/src/aiFallback.test.ts`
- `src/utils/avatar.ts`, `tests/src/avatar.test.ts`, `src/hooks/useAvatarUrl.ts`
- `src/utils/logger.ts`, `src/utils/errors.ts`
- `src/services/pdf/constants.ts`, `src/services/pdf/images.ts`, `src/services/pdf/draw.ts`
- `src/components/CardEditor/useCardAI.ts`, `src/components/Dashboard/useProfileEditing.ts`

**Modificar**
- `.env.example`, `package.json`, `.github/workflows/deploy.yml`, `supabase/config.toml`
- Las 4 `supabase/functions/*/index.ts`
- `src/repositories/TokenRepository.ts`, `src/repositories/TokenPricingRepository.ts`, `src/services/AIService.ts`, `src/services/PurchaseService.ts`, `src/services/SyncService.ts`
- `src/contexts/AuthContext.tsx`, `src/components/Dashboard/Dashboard.tsx`, `src/components/Navbar/Navbar.tsx`, `src/components/BuyTokens/BuyTokensPage.tsx`, `src/components/CardEditor/CardEditor.tsx`
- `src/locales/{es,en}/translation.json`, `docs/ENTORNOS_DEV_PROD.md`

---

# Fase 0 — Contención (CRITICAL C1)

### Task 1: Revocar el token expuesto y limpiar `.env.example`

**Files:**
- Modify: `.env.example` (el working tree ya tiene el cambio correcto sin commitear)

**Interfaces:**
- Consumes: nada.
- Produces: rama `fix/code-review-remediation`, sobre la que trabajan todos los demás tasks.

- [ ] **Step 1 (manual, lo hace Carlos): revocar el token en Supabase**

Ir a https://supabase.com/dashboard/account/tokens, borrar el token que empieza con `sbp_7dfc` y generar uno nuevo. Guardar el nuevo solo en `.env` local (ya está en `.gitignore`).

- [ ] **Step 2: confirmar que el token viejo ya no sirve**

Run: `SUPABASE_ACCESS_TOKEN=<token_viejo> npx supabase projects list`
Expected: error de autenticación (`Unauthorized` / `Invalid access token`). Si lista proyectos, el token sigue vivo: volver al Step 1.

- [ ] **Step 3: revisar actividad sospechosa**

En el dashboard de Supabase, revisar para el proyecto `vjglrfofyzvyvaetakpu`: Logs → Auth y Postgres de los últimos 30 días, y Edge Functions → Secrets (que nadie haya leído/cambiado `SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `REPLICATE_API_TOKEN`). Si hay algo raro, rotar esos tres secretos también.

- [ ] **Step 4: crear la rama y commitear la limpieza**

```bash
git checkout -b fix/code-review-remediation
git diff -- .env.example   # debe mostrar solo la eliminación de las 4 líneas con valores reales
git add .env.example
git commit -m "fix: remove real credentials from .env.example"
```

- [ ] **Step 5: verificar que no quedan secretos en el árbol**

Run: `git grep -n -I -E 'sbp_[a-f0-9]{20}|r8_[A-Za-z0-9]{20}|APP_USR-[0-9]{6}' -- . ':!docs/superpowers'`
Expected: sin salida.

- [ ] **Step 6 (manual): activar protección en GitHub**

En `github.com/cvegam02/chorroybuenas` → Settings → Code security: activar "Secret scanning" y "Push protection". El historial conserva el token viejo; como ya está revocado no hace falta reescribirlo.

---

# Fase 1 — Red de seguridad (HIGH H9, LOW L4)

### Task 2: Vitest, ESLint funcional y CI que valida

**Files:**
- Create: `vitest.config.ts`, `.eslintrc.cjs`, `tests/functions/smoke.test.ts`
- Modify: `package.json`, `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: scripts `npm test`, `npm run test:coverage`, `npm run test:db`, `npm run lint` (verde), `npm run typecheck`. Todos los tasks siguientes los usan.

- [ ] **Step 1: instalar dependencias**

Run: `npm i -D vitest@^2.1.0 @vitest/coverage-v8@^2.1.0`

- [ ] **Step 2: crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: [
        'supabase/functions/_shared/**/*.ts',
        'src/services/aiFallback.ts',
        'src/utils/avatar.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

- [ ] **Step 3: agregar scripts en `package.json`** (dentro de `"scripts"`)

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:coverage": "vitest run --coverage",
"test:db": "supabase test db",
```

- [ ] **Step 4: crear `tests/functions/smoke.test.ts` y correrlo**

```ts
import { describe, expect, it } from 'vitest';

describe('test runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 5: crear `.eslintrc.cjs`**

`no-explicit-any` y `no-console` quedan en `off` aquí y se activan en los Tasks 16 y 17, para que este task no dependa de esa limpieza.

```js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  // Los index.ts de edge functions usan el global Deno e imports https://; se validan con sus módulos _shared.
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'supabase/functions/*/index.ts'],
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': 'off',
  },
  overrides: [
    { files: ['vite.config.ts', 'vitest.config.ts'], env: { node: true } },
  ],
};
```

- [ ] **Step 6: dejar el lint en verde**

Run: `npm run lint`
Expected al primer intento: una lista de errores del código existente. Corregir cada uno en su archivo con el arreglo mínimo:
- `@typescript-eslint/no-unused-vars` → borrar la variable/import; si es un parámetro requerido por la firma, prefijarlo con `_`.
- `react-hooks/exhaustive-deps` → agregar la dependencia faltante; si agregarla cambia el comportamiento (efecto que hoy corre una vez), envolver la función en `useCallback` en lugar de silenciar la regla.
- `no-empty` → poner dentro del bloque un comentario que diga por qué se ignora.
- `prefer-const` → cambiar `let` por `const`.

No usar `eslint-disable`. Repetir hasta que `npm run lint` termine sin salida y `npm run typecheck` siga pasando.

- [ ] **Step 7: CI — agregar verificación antes del build y subir a Node 20**

En `.github/workflows/deploy.yml`, cambiar `node-version: '18'` por `node-version: '20'` y agregar estos pasos entre "Install dependencies" y "Build":

```yaml
      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:coverage
```

- [ ] **Step 8: commit**

```bash
rm tests/functions/smoke.test.ts
git add -A
git commit -m "ci: add vitest, working eslint config and verification steps"
```

(El smoke test solo comprueba que el runner funciona; se borra porque el Task 6 agrega tests reales. `passWithNoTests` evita que `npm test` falle mientras tanto.)

---

# Fase 2 — Base de datos (CRITICAL C2/C3, HIGH H5/H6)

Los tests SQL usan pgTAP contra el Supabase local. Requisito único: `npx supabase start` (usa Docker, ya instalado). `npx supabase test db` corre todo `supabase/tests/*.sql`. Cada archivo abre transacción y hace `rollback`, así que no dejan datos.

### Task 3: Acreditación de pagos idempotente (C3)

**Files:**
- Create: `supabase/migrations/022_payment_idempotency.sql`, `supabase/tests/022_payments.test.sql`

**Interfaces:**
- Produces: `public.add_tokens_after_purchase(p_user_id uuid, p_tokens_to_add integer, p_pack_id uuid, p_base_tokens integer, p_bonus_tokens integer, p_total_tokens integer, p_amount_cents integer, p_payment_provider text, p_payment_id text, p_payment_status text, p_payment_metadata jsonb default null, p_promotion_ids uuid[] default null) returns integer` — devuelve el saldo; si el pago ya estaba registrado no acredita y devuelve el saldo actual. Solo `service_role`.

- [ ] **Step 1: escribir el test que falla — `supabase/tests/022_payments.test.sql`**

```sql
begin;
select plan(5);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'pagos@test.dev');

select lives_ok($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 12, null, 10, 2, 12, 2000,
    'mercadopago', 'PAY-1', 'approved', '{}'::jsonb, null)
$$, 'primera acreditación funciona');

select lives_ok($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 12, null, 10, 2, 12, 2000,
    'mercadopago', 'PAY-1', 'approved', '{}'::jsonb, null)
$$, 'segunda llamada con el mismo payment_id no falla');

select is(
  (select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000001'),
  12, 'el saldo se acredita una sola vez');

select is(
  (select count(*)::int from public.token_purchases where payment_id = 'PAY-1'),
  1, 'hay una sola fila de compra');

set local role authenticated;
select throws_ok($$
  select public.add_tokens_after_purchase(
    '00000000-0000-0000-0000-000000000001', 99, null, 99, 0, 99, 1,
    'mercadopago', 'PAY-2', 'approved', '{}'::jsonb, null)
$$, '42501', null, 'un usuario autenticado no puede ejecutar la función');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2: correrlo y ver que falla**

Run: `npx supabase start && npm run test:db`
Expected: FAIL — la función con 12 argumentos no existe (`function public.add_tokens_after_purchase(...) does not exist`).

- [ ] **Step 3: escribir `supabase/migrations/022_payment_idempotency.sql`**

```sql
-- Idempotencia de acreditación: un payment_id se acredita una sola vez.

-- Guarda: si ya hay duplicados, detener con mensaje claro (resolver a mano antes de migrar).
do $$
begin
  if exists (
    select 1 from public.token_purchases
    where payment_id is not null
    group by payment_provider, payment_id
    having count(*) > 1
  ) then
    raise exception 'token_purchases tiene payment_id duplicados; resolverlos antes de aplicar 022 (ver plan, Task 3 Step 5)';
  end if;
end $$;

create unique index if not exists token_purchases_provider_payment_uidx
  on public.token_purchases (payment_provider, payment_id)
  where payment_id is not null;

drop function if exists public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb);

create function public.add_tokens_after_purchase(
  p_user_id uuid,
  p_tokens_to_add integer,
  p_pack_id uuid,
  p_base_tokens integer,
  p_bonus_tokens integer,
  p_total_tokens integer,
  p_amount_cents integer,
  p_payment_provider text,
  p_payment_id text,
  p_payment_status text,
  p_payment_metadata jsonb default null,
  p_promotion_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_balance integer;
begin
  if p_tokens_to_add <= 0 then
    raise exception 'p_tokens_to_add must be positive';
  end if;
  if p_payment_id is null or p_payment_id = '' then
    raise exception 'p_payment_id is required';
  end if;

  -- Primero la compra: el índice único decide quién gana si llegan dos llamadas a la vez.
  insert into public.token_purchases (
    user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents,
    promotion_ids, payment_provider, payment_id, payment_status, payment_metadata
  )
  values (
    p_user_id, p_pack_id, p_base_tokens, p_bonus_tokens, p_total_tokens, p_amount_cents,
    p_promotion_ids, p_payment_provider, p_payment_id, p_payment_status, p_payment_metadata
  )
  on conflict (payment_provider, payment_id) where payment_id is not null do nothing
  returning id into v_purchase_id;

  if v_purchase_id is null then
    select balance into v_balance from public.user_tokens where user_id = p_user_id;
    return coalesce(v_balance, 0);
  end if;

  insert into public.user_tokens (user_id, balance, updated_at)
  values (p_user_id, p_tokens_to_add, now())
  on conflict (user_id) do update set
    balance = public.user_tokens.balance + excluded.balance,
    updated_at = now()
  returning balance into v_balance;

  return v_balance;
end;
$$;

comment on function public.add_tokens_after_purchase is
  'Acredita una compra de forma idempotente por (payment_provider, payment_id). Solo service_role.';

revoke all on function public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb, uuid[])
  from public, anon, authenticated;
grant execute on function public.add_tokens_after_purchase(
  uuid, integer, uuid, integer, integer, integer, integer, text, text, text, jsonb, uuid[])
  to service_role;
```

- [ ] **Step 4: aplicar y correr el test**

Run: `npx supabase db reset && npm run test:db`
Expected: `022_payments.test.sql .. ok`, 5/5.

- [ ] **Step 5 (manual, antes de migrar dev y prod): buscar duplicados reales**

Correr en el SQL Editor de cada proyecto:

```sql
select payment_provider, payment_id, count(*), sum(total_tokens) as tokens_acreditados,
       array_agg(id order by created_at) as purchase_ids, min(user_id::text) as user_id
from public.token_purchases
where payment_id is not null
group by 1, 2 having count(*) > 1;
```

Si devuelve filas, cada una es un pago acreditado más de una vez. Para cada una: conservar la compra más antigua (`purchase_ids[1]`), borrar las demás y restar del saldo del usuario los tokens de las borradas. Es una corrección de dinero: revisarla caso por caso con Carlos, no automatizarla.

- [ ] **Step 6: commit**

```bash
git add supabase/migrations/022_payment_idempotency.sql supabase/tests/022_payments.test.sql
git commit -m "fix: make payment crediting idempotent per payment_id"
```

### Task 4: Cobro y reembolso de tokens solo desde el servidor (C2, H5, rate limit de H8)

**Files:**
- Create: `supabase/migrations/023_server_side_token_spend.sql`, `supabase/tests/023_spend.test.sql`

**Interfaces:**
- Produces:
  - `public.spend_tokens_for_user(p_user_id uuid, p_amount integer, p_set_id uuid default null) returns uuid` — devuelve el `id` de la fila en `token_usage`. Lanza `INSUFFICIENT_TOKENS` o `RATE_LIMITED` (más de 10 usos en 60 s). Solo `service_role`.
  - `public.refund_token_usage(p_usage_id uuid) returns void` — borra el uso y devuelve los tokens; llamarla dos veces no hace nada la segunda. Solo `service_role`.
  - Se eliminan `public.spend_tokens(integer)` y `public.spend_tokens(integer, uuid)`.
  - `user_tokens.balance` con `check (balance >= 0)`.

- [ ] **Step 1: escribir el test que falla — `supabase/tests/023_spend.test.sql`**

```sql
begin;
select plan(10);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000002', 'gasto@test.dev');
insert into public.user_tokens (user_id, balance)
values ('00000000-0000-0000-0000-000000000002', 2)
on conflict (user_id) do update set balance = 2;

create temp table usos (id uuid) on commit drop;

insert into usos select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null);
insert into usos select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null);

select is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000002'),
  0, 'dos gastos dejan el saldo en 0');

select throws_ok($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, 'INSUFFICIENT_TOKENS', 'sin saldo no se puede gastar');

select is((select count(*)::int from public.token_usage where user_id = '00000000-0000-0000-0000-000000000002'),
  2, 'el gasto rechazado no deja registro');

select lives_ok(format($$ select public.refund_token_usage(%L) $$, (select id from usos limit 1)),
  'reembolso funciona');
select lives_ok(format($$ select public.refund_token_usage(%L) $$, (select id from usos limit 1)),
  'reembolsar dos veces no falla');

select is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000002'),
  1, 'el reembolso devuelve el token una sola vez');

select throws_ok($$
  update public.user_tokens set balance = -1 where user_id = '00000000-0000-0000-0000-000000000002'
$$, '23514', null, 'el saldo no puede ser negativo');

-- Rate limit: queda 1 uso registrado; con 9 más se llega a 10 y el siguiente se rechaza.
update public.user_tokens set balance = 100 where user_id = '00000000-0000-0000-0000-000000000002';
select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
from generate_series(1, 9);

select throws_ok($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, 'RATE_LIMITED', 'más de 10 usos por minuto se rechazan');

select hasnt_function('public', 'spend_tokens', 'la RPC del cliente ya no existe');

set local role authenticated;
select throws_ok($$
  select public.spend_tokens_for_user('00000000-0000-0000-0000-000000000002', 1, null)
$$, '42501', null, 'un usuario autenticado no puede cobrar tokens directamente');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2: correrlo y ver que falla**

Run: `npm run test:db`
Expected: FAIL en `023_spend.test.sql` — `function public.spend_tokens_for_user(...) does not exist`.

- [ ] **Step 3: escribir `supabase/migrations/023_server_side_token_spend.sql`**

```sql
-- El cobro de tokens de IA pasa al servidor (edge function transform-loteria con service role).

-- Guarda: saldos negativos existentes impedirían crear el check.
do $$
begin
  if exists (select 1 from public.user_tokens where balance < 0) then
    raise exception 'user_tokens tiene saldos negativos; corregirlos antes de aplicar 023 (ver plan, Task 4 Step 5)';
  end if;
end $$;

alter table public.user_tokens
  drop constraint if exists user_tokens_balance_nonneg;
alter table public.user_tokens
  add constraint user_tokens_balance_nonneg check (balance >= 0);

create index if not exists token_usage_user_created_idx
  on public.token_usage (user_id, created_at desc);

create or replace function public.spend_tokens_for_user(
  p_user_id uuid,
  p_amount integer,
  p_set_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set_id uuid;
  v_usage_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if (
    select count(*) from public.token_usage
    where user_id = p_user_id and created_at > now() - interval '60 seconds'
  ) >= 10 then
    raise exception 'RATE_LIMITED';
  end if;

  -- Un solo UPDATE condicional: no hay ventana entre leer y descontar.
  update public.user_tokens
  set balance = balance - p_amount, updated_at = now()
  where user_id = p_user_id and balance >= p_amount;

  if not found then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  -- Solo se registra el set si es del usuario.
  select id into v_set_id from public.loteria_sets
  where id = p_set_id and user_id = p_user_id;

  insert into public.token_usage (user_id, amount, reason, set_id)
  values (p_user_id, p_amount, 'ai_conversion', v_set_id)
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

create or replace function public.refund_token_usage(p_usage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_amount integer;
begin
  delete from public.token_usage where id = p_usage_id
  returning user_id, amount into v_user_id, v_amount;

  if v_user_id is null then
    return; -- ya reembolsado o inexistente
  end if;

  update public.user_tokens
  set balance = balance + v_amount, updated_at = now()
  where user_id = v_user_id;
end;
$$;

comment on function public.spend_tokens_for_user is
  'Cobra tokens de IA. Lanza INSUFFICIENT_TOKENS o RATE_LIMITED. Solo service_role (edge function transform-loteria).';
comment on function public.refund_token_usage is
  'Devuelve un cobro cuando la IA falla. Idempotente. Solo service_role.';

revoke all on function public.spend_tokens_for_user(uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.refund_token_usage(uuid) from public, anon, authenticated;
grant execute on function public.spend_tokens_for_user(uuid, integer, uuid) to service_role;
grant execute on function public.refund_token_usage(uuid) to service_role;

-- El navegador ya no puede decidir cuándo (no) cobrar.
drop function if exists public.spend_tokens(integer);
drop function if exists public.spend_tokens(integer, uuid);
```

- [ ] **Step 4: aplicar y correr el test**

Run: `npx supabase db reset && npm run test:db`
Expected: `023_spend.test.sql .. ok`, 10/10, y `022` sigue en verde.

- [ ] **Step 5 (manual, antes de migrar dev y prod): saldos negativos**

```sql
select user_id, balance, updated_at from public.user_tokens where balance < 0;
```

Si hay filas, decidir con Carlos (lo normal: `update public.user_tokens set balance = 0 where balance < 0;`) y volver a correr la migración.

- [ ] **Step 6: commit**

```bash
git add supabase/migrations/023_server_side_token_spend.sql supabase/tests/023_spend.test.sql
git commit -m "fix: move AI token spending to service-role-only atomic RPCs"
```

### Task 5: Tokens iniciales en el registro, no desde el cliente (H6)

**Files:**
- Create: `supabase/migrations/024_initial_tokens_on_signup.sql`, `supabase/tests/024_initial_tokens.test.sql`
- Modify: `src/repositories/TokenRepository.ts` (archivo completo), `src/services/SyncService.ts:16` (comentario)

**Interfaces:**
- Produces:
  - Toda fila nueva en `auth.users` crea su fila en `user_tokens` con `app_config.initial_tokens`.
  - `TokenRepository.getBalance(userId: string): Promise<number>` (sin cambios de firma; devuelve 0 si no hay fila).
  - `TokenRepository.invalidateBalance(userId: string): void` (nuevo; lo usa el Task 12).
  - Se eliminan `TokenRepository.initializeUser`, `addTokens` y `spendTokens`.

- [ ] **Step 1: escribir el test que falla — `supabase/tests/024_initial_tokens.test.sql`**

```sql
begin;
select plan(5);

update public.app_config set value = '5'::jsonb where key = 'initial_tokens';
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000003', 'nuevo@test.dev');

select is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000003'),
  5, 'el usuario nuevo recibe los tokens iniciales configurados');

update public.app_config set value = '"abc"'::jsonb where key = 'initial_tokens';
select lives_ok($$
  insert into auth.users (id, email)
  values ('00000000-0000-0000-0000-000000000004', 'config-rota@test.dev')
$$, 'una config inválida no rompe el registro');

select is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000004'),
  0, 'con config inválida el saldo inicial es 0');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
update public.user_tokens set balance = 999 where user_id = '00000000-0000-0000-0000-000000000003';
select throws_ok($$
  insert into public.user_tokens (user_id, balance)
  values ('00000000-0000-0000-0000-000000000003', 999)
  on conflict (user_id) do update set balance = 999
$$, '42501', null, 'el usuario no puede hacer upsert de su saldo');
reset role;

select is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000000003'),
  5, 'el UPDATE del usuario no cambió el saldo');

select * from finish();
rollback;
```

- [ ] **Step 2: correrlo y ver que falla**

Run: `npm run test:db`
Expected: FAIL — el primer `is` recibe `NULL` en lugar de 5 (no existe la fila).

- [ ] **Step 3: escribir `supabase/migrations/024_initial_tokens_on_signup.sql`**

```sql
-- Los tokens iniciales se asignan en el trigger de registro; el cliente ya no escribe user_tokens.

create or replace function public.get_initial_tokens()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_value integer;
begin
  select (value #>> '{}')::integer into v_value
  from public.app_config where key = 'initial_tokens';
  return greatest(coalesce(v_value, 0), 0);
exception when others then
  return 0; -- config ausente o no numérica: nunca bloquear el registro
end;
$$;

revoke all on function public.get_initial_tokens() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')::text
  )
  on conflict (id) do nothing;

  insert into public.user_tokens (user_id, balance, updated_at)
  values (new.id, public.get_initial_tokens(), now())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Usuarios existentes sin fila (nunca pidieron su saldo): mismo trato que un usuario nuevo.
insert into public.user_tokens (user_id, balance, updated_at)
select au.id, public.get_initial_tokens(), now()
from auth.users au
where not exists (select 1 from public.user_tokens ut where ut.user_id = au.id);

-- Quitar cualquier policy de user_tokens creada fuera de las migraciones (p. ej. desde el dashboard).
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'user_tokens'
      and policyname not in (
        'Users can see their own tokens',
        'Service role can manage tokens',
        'Admins can read all user_tokens'
      )
  loop
    raise notice 'Eliminando policy no esperada en user_tokens: %', r.policyname;
    execute format('drop policy %I on public.user_tokens', r.policyname);
  end loop;
end $$;
```

- [ ] **Step 4: aplicar y correr el test**

Run: `npx supabase db reset && npm run test:db`
Expected: `024_initial_tokens.test.sql .. ok`, 5/5; `022` y `023` en verde.

- [ ] **Step 5: reemplazar `src/repositories/TokenRepository.ts` completo**

```ts
import { supabase } from '../utils/supabaseClient';

const BALANCE_CACHE_TTL_MS = 15 * 1000; // 15 segundos
const balanceCache = new Map<string, { balance: number; expiresAt: number }>();
const balanceInFlight = new Map<string, Promise<number>>();

/**
 * Lectura del saldo de tokens. El saldo solo lo modifica el servidor:
 * - alta de usuario: trigger handle_new_user (app_config.initial_tokens)
 * - compra: RPC add_tokens_after_purchase (edge functions de Mercado Pago)
 * - uso de IA: RPC spend_tokens_for_user (edge function transform-loteria)
 */
export class TokenRepository {
    /** Fuerza que el próximo getBalance consulte al servidor (p. ej. tras usar IA). */
    static invalidateBalance(userId: string): void {
        balanceCache.delete(userId);
    }

    /** Saldo del usuario, con caché corta y deduplicación de peticiones en vuelo. */
    static async getBalance(userId: string): Promise<number> {
        const now = Date.now();
        const cached = balanceCache.get(userId);
        if (cached && cached.expiresAt > now) {
            return cached.balance;
        }
        const inFlight = balanceInFlight.get(userId);
        if (inFlight) {
            return inFlight;
        }
        const promise = this.fetchBalance(userId);
        balanceInFlight.set(userId, promise);
        try {
            const balance = await promise;
            balanceCache.set(userId, { balance, expiresAt: now + BALANCE_CACHE_TTL_MS });
            return balance;
        } finally {
            balanceInFlight.delete(userId);
        }
    }

    private static async fetchBalance(userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('user_tokens')
            .select('balance')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data?.balance ?? 0;
    }
}
```

- [ ] **Step 6: actualizar el comentario en `src/services/SyncService.ts:16`**

Reemplazar la línea por:

```ts
        // La fila en user_tokens la crea el trigger handle_new_user al registrarse (app_config.initial_tokens).
```

- [ ] **Step 7: verificar**

Run: `npm run typecheck`
Expected: un único error, en `src/services/AIService.ts`, por `TokenRepository.spendTokens` (se elimina en el Task 12). Para no dejar la rama rota entre tasks, en este mismo paso borrar en `AIService.ts` los tres bloques `if (userId) { try { await TokenRepository.spendTokens(userId, 1, setId); } catch … }` (líneas 169-175, 193-199, 230-236). Volver a correr `npm run typecheck` → sin errores. `npm run lint` → sin errores.

- [ ] **Step 8: commit**

```bash
git add supabase/migrations/024_initial_tokens_on_signup.sql supabase/tests/024_initial_tokens.test.sql src/repositories/TokenRepository.ts src/services/SyncService.ts src/services/AIService.ts
git commit -m "fix: grant initial tokens in signup trigger and remove client-side balance writes"
```

---

# Fase 3 — Edge functions (C2, C3, H4, H7, H8, M1, M3, M4, M5, M8)

### Task 6: Módulos puros de validación, promociones y acreditación (H7, H4, parte de H8)

**Files:**
- Create: `supabase/functions/_shared/validation.ts`, `supabase/functions/_shared/promotions.ts`, `supabase/functions/_shared/credit.ts`
- Test: `tests/functions/validation.test.ts`, `tests/functions/promotions.test.ts`, `tests/functions/credit.test.ts`

**Interfaces:**
- Produces:
  - `type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string }`
  - `isUuid(v: unknown): v is string`
  - `parsePreferenceRequest(body: unknown): ParseResult<{ packId: string | null; customTokens: number | null; promoCode: string | null; appUrl: string | null }>`
  - `validateImageDataUri(image: unknown, maxChars?: number): ParseResult<string>`
  - `type PromotionRow = { id: string; code: string | null; type: string; config: { percent?: unknown } | null; valid_from: string | null; valid_until: string | null; is_active: boolean }`
  - `selectPromotion(input: { promos: PromotionRow[]; promoCode: string | null; isFirstPurchase: boolean; usedPromotionIds: string[]; now: Date }): { id: string; type: 'code' | 'first_purchase'; percent: number } | null`
  - `computePromotionBonus(baseTokens: number, percent: number): number`
  - `type PreferenceMetadata = { user_id?: string; pack_id?: string | null; base_tokens?: number; bonus_tokens?: number; promotion_bonus?: number; total_tokens?: number; amount_cents?: number; promotion_id?: string | null; promotion_type?: 'code' | 'first_purchase' | null }`
  - `type CreditParams` (las 12 claves `p_*` de `add_tokens_after_purchase`)
  - `buildCreditParams(input: { userId: string; paymentId: string; status: string; payment: Record<string, unknown>; metadata: PreferenceMetadata; isFirstPurchase: boolean }): CreditParams | null`

- [ ] **Step 1: tests que fallan**

`tests/functions/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isUuid, parsePreferenceRequest, validateImageDataUri } from '../../supabase/functions/_shared/validation.ts';

const PACK = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('parsePreferenceRequest', () => {
  it('acepta un pack_id uuid', () => {
    expect(parsePreferenceRequest({ pack_id: PACK })).toEqual({
      ok: true,
      value: { packId: PACK, customTokens: null, promoCode: null, appUrl: null },
    });
  });

  it('acepta custom_tokens entero y normaliza el código', () => {
    const r = parsePreferenceRequest({ custom_tokens: 25, promo_code: '  verano2026 ', app_url: 'https://x.dev' });
    expect(r).toEqual({
      ok: true,
      value: { packId: null, customTokens: 25, promoCode: 'VERANO2026', appUrl: 'https://x.dev' },
    });
  });

  it.each([
    ['no es objeto', 'hola'],
    ['null', null],
    ['sin pack ni tokens', {}],
    ['ambos a la vez', { pack_id: PACK, custom_tokens: 5 }],
    ['pack_id no uuid', { pack_id: 'abc' }],
    ['tokens fraccionarios', { custom_tokens: 1.5 }],
    ['tokens como string', { custom_tokens: '5' }],
    ['tokens NaN', { custom_tokens: Number.NaN }],
    ['tokens en 0', { custom_tokens: 0 }],
    ['tokens sobre el máximo', { custom_tokens: 501 }],
    ['promo_code no string', { custom_tokens: 5, promo_code: 123 }],
    ['promo_code demasiado largo', { custom_tokens: 5, promo_code: 'A'.repeat(65) }],
  ])('rechaza: %s', (_name, body) => {
    expect(parsePreferenceRequest(body).ok).toBe(false);
  });

  it('trata promo_code vacío como ausente', () => {
    const r = parsePreferenceRequest({ custom_tokens: 5, promo_code: '   ' });
    expect(r.ok && r.value.promoCode).toBe(null);
  });
});

describe('validateImageDataUri', () => {
  it('acepta jpeg, png y webp en base64', () => {
    for (const mime of ['jpeg', 'png', 'webp']) {
      expect(validateImageDataUri(`data:image/${mime};base64,AAAA`).ok).toBe(true);
    }
  });

  it.each([
    ['no string', 42],
    ['url http', 'https://evil.test/a.jpg'],
    ['svg', 'data:image/svg+xml;base64,AAAA'],
    ['sin base64', 'data:image/png,AAAA'],
    ['payload vacío', 'data:image/png;base64,'],
    ['caracteres inválidos', 'data:image/png;base64,<script>'],
  ])('rechaza: %s', (_name, image) => {
    expect(validateImageDataUri(image).ok).toBe(false);
  });

  it('rechaza imágenes sobre el tope', () => {
    expect(validateImageDataUri('data:image/png;base64,' + 'A'.repeat(50), 40).ok).toBe(false);
  });
});

describe('isUuid', () => {
  it('distingue uuids', () => {
    expect(isUuid(PACK)).toBe(true);
    expect(isUuid('nope')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
```

`tests/functions/promotions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computePromotionBonus, selectPromotion, type PromotionRow } from '../../supabase/functions/_shared/promotions.ts';

const now = new Date('2026-10-06T12:00:00Z');
const promo = (over: Partial<PromotionRow>): PromotionRow => ({
  id: 'p1', code: null, type: 'first_purchase', config: { percent: 20 },
  valid_from: null, valid_until: null, is_active: true, ...over,
});
const first = promo({ id: 'first' });
const code = promo({ id: 'code', type: 'code', code: 'Verano', config: { percent: 15 } });

describe('selectPromotion', () => {
  it('el código tiene prioridad sobre primera compra', () => {
    expect(selectPromotion({ promos: [first, code], promoCode: 'VERANO', isFirstPurchase: true, usedPromotionIds: [], now }))
      .toEqual({ id: 'code', type: 'code', percent: 15 });
  });

  it('el código aplica aunque no sea la primera compra', () => {
    expect(selectPromotion({ promos: [first, code], promoCode: 'VERANO', isFirstPurchase: false, usedPromotionIds: [], now }))
      .toEqual({ id: 'code', type: 'code', percent: 15 });
  });

  it('un código ya usado por el usuario no aplica y cae a primera compra', () => {
    expect(selectPromotion({ promos: [first, code], promoCode: 'VERANO', isFirstPurchase: true, usedPromotionIds: ['code'], now }))
      .toEqual({ id: 'first', type: 'first_purchase', percent: 20 });
  });

  it('sin código y sin ser primera compra no hay promo', () => {
    expect(selectPromotion({ promos: [first, code], promoCode: null, isFirstPurchase: false, usedPromotionIds: [], now })).toBe(null);
  });

  it('ignora promos inactivas, futuras, vencidas o con percent inválido', () => {
    const bad = [
      promo({ id: 'a', is_active: false }),
      promo({ id: 'b', valid_from: '2026-11-01T00:00:00Z' }),
      promo({ id: 'c', valid_until: '2026-10-01T00:00:00Z' }),
      promo({ id: 'd', config: { percent: 0 } }),
      promo({ id: 'e', config: { percent: '20' } }),
      promo({ id: 'f', config: null }),
    ];
    expect(selectPromotion({ promos: bad, promoCode: null, isFirstPurchase: true, usedPromotionIds: [], now })).toBe(null);
  });
});

describe('computePromotionBonus', () => {
  it('redondea hacia abajo', () => {
    expect(computePromotionBonus(10, 15)).toBe(1);
    expect(computePromotionBonus(50, 20)).toBe(10);
    expect(computePromotionBonus(10, 0)).toBe(0);
  });
});
```

`tests/functions/credit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCreditParams, type PreferenceMetadata } from '../../supabase/functions/_shared/credit.ts';

const meta = (over: Partial<PreferenceMetadata> = {}): PreferenceMetadata => ({
  pack_id: null, base_tokens: 10, bonus_tokens: 2, promotion_bonus: 2, amount_cents: 2000,
  promotion_id: 'promo-1', promotion_type: 'code', ...over,
});
const input = (over: Partial<Parameters<typeof buildCreditParams>[0]> = {}) => ({
  userId: 'user-1', paymentId: '123', status: 'approved',
  payment: { transaction_amount: 20 }, metadata: meta(), isFirstPurchase: false, ...over,
});

describe('buildCreditParams', () => {
  it('acredita base + bono de pack + bono de código aunque no sea primera compra', () => {
    expect(buildCreditParams(input())).toMatchObject({
      p_user_id: 'user-1', p_tokens_to_add: 14, p_base_tokens: 10, p_bonus_tokens: 4,
      p_total_tokens: 14, p_amount_cents: 2000, p_payment_id: '123',
      p_payment_provider: 'mercadopago', p_promotion_ids: ['promo-1'],
    });
  });

  it('anula el bono de primera compra si ya no es la primera', () => {
    const r = buildCreditParams(input({ metadata: meta({ promotion_type: 'first_purchase' }) }));
    expect(r).toMatchObject({ p_tokens_to_add: 12, p_bonus_tokens: 2, p_promotion_ids: null });
  });

  it('conserva el bono de primera compra si sí es la primera', () => {
    const r = buildCreditParams(input({ metadata: meta({ promotion_type: 'first_purchase' }), isFirstPurchase: true }));
    expect(r).toMatchObject({ p_tokens_to_add: 14, p_promotion_ids: ['promo-1'] });
  });

  it('metadata legacy sin promotion_type se trata como primera compra', () => {
    const r = buildCreditParams(input({ metadata: meta({ promotion_type: undefined, promotion_id: undefined }) }));
    expect(r).toMatchObject({ p_tokens_to_add: 12, p_promotion_ids: null });
  });

  it('rechaza si el monto pagado es menor al esperado', () => {
    expect(buildCreditParams(input({ payment: { transaction_amount: 1 } }))).toBe(null);
  });

  it('acepta si el pago no trae transaction_amount (merchant_order resumido)', () => {
    expect(buildCreditParams(input({ payment: {} }))).not.toBe(null);
  });

  it.each([
    ['sin tokens', { base_tokens: 0, bonus_tokens: 0, promotion_bonus: 0 }],
    ['tokens fraccionarios', { base_tokens: 1.5 }],
    ['tokens negativos', { base_tokens: -5 }],
    ['monto no entero', { amount_cents: 10.5 }],
  ])('rechaza metadata inválida: %s', (_name, over) => {
    expect(buildCreditParams(input({ metadata: meta(over) }))).toBe(null);
  });
});
```

- [ ] **Step 2: correr y ver que fallan**

Run: `npm test`
Expected: FAIL — no se pueden resolver los tres módulos `_shared`.

- [ ] **Step 3: implementar `supabase/functions/_shared/validation.ts`**

```ts
export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

export const MIN_CUSTOM_TOKENS = 1;
export const MAX_CUSTOM_TOKENS = 500;
const MAX_PROMO_CODE_LENGTH = 64;
const MAX_APP_URL_LENGTH = 500;
/** ~2.2 MB de imagen; el cliente envía JPEG de máx. 768 px (~200 KB). */
export const MAX_IMAGE_DATA_URI_CHARS = 3_000_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_DATA_URI_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export interface PreferenceRequest {
  packId: string | null;
  customTokens: number | null;
  promoCode: string | null;
  appUrl: string | null;
}

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

export function parsePreferenceRequest(body: unknown): ParseResult<PreferenceRequest> {
  if (typeof body !== 'object' || body === null) return fail('Body inválido.');
  const { pack_id, custom_tokens, promo_code, app_url } = body as Record<string, unknown>;

  const hasPack = pack_id !== undefined && pack_id !== null;
  const hasCustom = custom_tokens !== undefined && custom_tokens !== null;
  if (hasPack === hasCustom) return fail('Debes proporcionar pack_id o custom_tokens (solo uno).');

  if (hasPack && !isUuid(pack_id)) return fail('pack_id inválido.');

  if (hasCustom) {
    const valid =
      typeof custom_tokens === 'number' &&
      Number.isInteger(custom_tokens) &&
      custom_tokens >= MIN_CUSTOM_TOKENS &&
      custom_tokens <= MAX_CUSTOM_TOKENS;
    if (!valid) {
      return fail(`custom_tokens debe ser un entero entre ${MIN_CUSTOM_TOKENS} y ${MAX_CUSTOM_TOKENS}.`);
    }
  }

  let promoCode: string | null = null;
  if (promo_code !== undefined && promo_code !== null) {
    if (typeof promo_code !== 'string' || promo_code.length > MAX_PROMO_CODE_LENGTH) {
      return fail('promo_code inválido.');
    }
    promoCode = promo_code.trim().toUpperCase() || null;
  }

  const appUrl = typeof app_url === 'string' && app_url.length <= MAX_APP_URL_LENGTH ? app_url : null;

  return {
    ok: true,
    value: {
      packId: hasPack ? (pack_id as string) : null,
      customTokens: hasCustom ? (custom_tokens as number) : null,
      promoCode,
      appUrl,
    },
  };
}

export function validateImageDataUri(
  image: unknown,
  maxChars: number = MAX_IMAGE_DATA_URI_CHARS,
): ParseResult<string> {
  if (typeof image !== 'string') return fail('Se requiere image (data URI base64).');
  if (image.length > maxChars) return fail('La imagen es demasiado grande.');
  if (!IMAGE_DATA_URI_RE.test(image)) return fail('Formato de imagen no soportado (png, jpeg o webp en base64).');
  return { ok: true, value: image };
}
```

- [ ] **Step 4: implementar `supabase/functions/_shared/promotions.ts`**

```ts
export interface PromotionRow {
  id: string;
  code: string | null;
  type: string;
  config: { percent?: unknown } | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface SelectedPromotion {
  id: string;
  type: 'code' | 'first_purchase';
  percent: number;
}

function isVigente(p: PromotionRow, now: Date): boolean {
  if (!p.is_active) return false;
  if (p.valid_from && new Date(p.valid_from) > now) return false;
  if (p.valid_until && new Date(p.valid_until) < now) return false;
  return true;
}

function percentOf(p: PromotionRow): number {
  const percent = p.config?.percent;
  return typeof percent === 'number' && percent >= 1 && percent <= 100 ? Math.round(percent) : 0;
}

/**
 * Prioridad: 1) código válido que el usuario no haya usado antes; 2) promo de primera compra.
 */
export function selectPromotion(input: {
  promos: PromotionRow[];
  promoCode: string | null;
  isFirstPurchase: boolean;
  usedPromotionIds: string[];
  now: Date;
}): SelectedPromotion | null {
  const candidates = input.promos.filter((p) => isVigente(p, input.now) && percentOf(p) > 0);

  if (input.promoCode) {
    const wanted = input.promoCode.toUpperCase();
    const byCode = candidates.find(
      (p) => p.type === 'code' && p.code?.trim().toUpperCase() === wanted && !input.usedPromotionIds.includes(p.id),
    );
    if (byCode) return { id: byCode.id, type: 'code', percent: percentOf(byCode) };
  }

  if (input.isFirstPurchase) {
    const first = candidates.find((p) => p.type === 'first_purchase');
    if (first) return { id: first.id, type: 'first_purchase', percent: percentOf(first) };
  }

  return null;
}

export function computePromotionBonus(baseTokens: number, percent: number): number {
  return percent > 0 ? Math.floor(baseTokens * (percent / 100)) : 0;
}
```

- [ ] **Step 5: implementar `supabase/functions/_shared/credit.ts`**

```ts
/** Metadata que create-payment-preference guarda en la preferencia de Mercado Pago. */
export interface PreferenceMetadata {
  user_id?: string;
  pack_id?: string | null;
  base_tokens?: number;
  bonus_tokens?: number;
  promotion_bonus?: number;
  total_tokens?: number;
  amount_cents?: number;
  promotion_id?: string | null;
  /** Ausente en preferencias creadas antes de este cambio: se trata como 'first_purchase'. */
  promotion_type?: 'code' | 'first_purchase' | null;
}

export interface CreditParams {
  p_user_id: string;
  p_tokens_to_add: number;
  p_pack_id: string | null;
  p_base_tokens: number;
  p_bonus_tokens: number;
  p_total_tokens: number;
  p_amount_cents: number;
  p_payment_provider: 'mercadopago';
  p_payment_id: string;
  p_payment_status: string;
  p_payment_metadata: Record<string, unknown>;
  p_promotion_ids: string[] | null;
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/**
 * Traduce un pago aprobado + la metadata de su preferencia a los parámetros de add_tokens_after_purchase.
 * Devuelve null si la metadata es inválida o el monto pagado es menor al esperado.
 */
export function buildCreditParams(input: {
  userId: string;
  paymentId: string;
  status: string;
  payment: Record<string, unknown>;
  metadata: PreferenceMetadata;
  isFirstPurchase: boolean;
}): CreditParams | null {
  const { metadata, payment } = input;
  const baseTokens = metadata.base_tokens ?? 0;
  const packBonus = metadata.bonus_tokens ?? 0;
  const promotionBonus = metadata.promotion_bonus ?? 0;
  const amountCents = metadata.amount_cents ?? 0;

  if (![baseTokens, packBonus, promotionBonus, amountCents].every(isCount)) return null;

  const paid = payment.transaction_amount;
  if (typeof paid === 'number' && Math.round(paid * 100) < amountCents) return null;

  // El bono por código se respeta siempre; el de primera compra se revalida al acreditar
  // (el usuario pudo crear dos preferencias "de primera compra" y pagar ambas).
  const promoApplies = metadata.promotion_type === 'code' || input.isFirstPurchase;
  const effectivePromoBonus = promoApplies ? promotionBonus : 0;
  const totalTokens = baseTokens + packBonus + effectivePromoBonus;
  if (totalTokens <= 0) return null;

  const promotionIds =
    effectivePromoBonus > 0 && typeof metadata.promotion_id === 'string' ? [metadata.promotion_id] : null;

  return {
    p_user_id: input.userId,
    p_tokens_to_add: totalTokens,
    p_pack_id: metadata.pack_id ?? null,
    p_base_tokens: baseTokens,
    p_bonus_tokens: packBonus + effectivePromoBonus,
    p_total_tokens: totalTokens,
    p_amount_cents: amountCents,
    p_payment_provider: 'mercadopago',
    p_payment_id: input.paymentId,
    p_payment_status: input.status,
    p_payment_metadata: payment,
    p_promotion_ids: promotionIds,
  };
}
```

- [ ] **Step 6: correr y ver que pasan**

Run: `npm test && npm run lint`
Expected: todos los tests en verde; lint sin salida.

- [ ] **Step 7: commit**

```bash
git add supabase/functions/_shared tests/functions
git commit -m "feat: add tested shared modules for request validation, promotions and crediting"
```

### Task 7: Módulos puros de checkout, CORS y firma de Mercado Pago (M1, M3, M4, M8)

**Files:**
- Create: `supabase/functions/_shared/checkout.ts`, `supabase/functions/_shared/cors.ts`, `supabase/functions/_shared/mpSignature.ts`
- Test: `tests/functions/checkout.test.ts`, `tests/functions/cors.test.ts`, `tests/functions/mpSignature.test.ts`

**Interfaces:**
- Produces:
  - `parseAllowedOrigins(raw: string | undefined): string[]`
  - `buildCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string>`
  - `resolveAppUrl(requested: string | null, allowedOrigins: string[], fallback: string): string`
  - `type CheckoutMode = 'sandbox' | 'production'`
  - `resolveCheckoutMode(flag: string | undefined): CheckoutMode`
  - `pickInitPoint(mode: CheckoutMode, mp: { init_point?: string; sandbox_init_point?: string }): string | null`
  - `verifyMpSignature(input: { signatureHeader: string | null; requestId: string | null; dataId: string | null; secret: string }): Promise<boolean>`

- [ ] **Step 1: tests que fallan**

`tests/functions/cors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCorsHeaders, parseAllowedOrigins } from '../../supabase/functions/_shared/cors.ts';

const allowed = ['https://chorroybuenas.com.mx', 'http://localhost:5173'];

describe('parseAllowedOrigins', () => {
  it('separa por coma, recorta y quita diagonal final', () => {
    expect(parseAllowedOrigins(' https://a.dev/ , http://localhost:5173 ,, ')).toEqual(['https://a.dev', 'http://localhost:5173']);
  });
  it('sin valor devuelve lista vacía', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});

describe('buildCorsHeaders', () => {
  it('refleja un origen permitido', () => {
    const h = buildCorsHeaders('http://localhost:5173', allowed);
    expect(h['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(h['Vary']).toBe('Origin');
  });
  it('para un origen no permitido responde con el primero de la lista', () => {
    expect(buildCorsHeaders('https://evil.test', allowed)['Access-Control-Allow-Origin']).toBe('https://chorroybuenas.com.mx');
  });
  it('sin lista configurada no emite Allow-Origin', () => {
    expect(buildCorsHeaders('https://evil.test', [])['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
```

`tests/functions/checkout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickInitPoint, resolveAppUrl, resolveCheckoutMode } from '../../supabase/functions/_shared/checkout.ts';

const allowed = ['https://chorroybuenas.com.mx', 'https://dev.ngrok-free.dev'];
const fallback = 'https://chorroybuenas.com.mx';

describe('resolveAppUrl', () => {
  it('acepta un origen de la lista y descarta path y query', () => {
    expect(resolveAppUrl('https://dev.ngrok-free.dev/algo?x=1', allowed, fallback)).toBe('https://dev.ngrok-free.dev');
  });
  it.each([
    ['origen ajeno', 'https://evil.test'],
    ['no es url', 'javascript:alert(1)'],
    ['null', null],
    ['subdominio parecido', 'https://chorroybuenas.com.mx.evil.test'],
  ])('usa el fallback: %s', (_name, requested) => {
    expect(resolveAppUrl(requested, allowed, fallback)).toBe(fallback);
  });
});

describe('modo de checkout', () => {
  it('producción por default; sandbox solo con el flag en "true"', () => {
    expect(resolveCheckoutMode(undefined)).toBe('production');
    expect(resolveCheckoutMode('false')).toBe('production');
    expect(resolveCheckoutMode('true')).toBe('sandbox');
  });
  it('elige el init_point según el modo', () => {
    const mp = { init_point: 'https://mp/prod', sandbox_init_point: 'https://mp/sandbox' };
    expect(pickInitPoint('production', mp)).toBe('https://mp/prod');
    expect(pickInitPoint('sandbox', mp)).toBe('https://mp/sandbox');
    expect(pickInitPoint('sandbox', { init_point: 'https://mp/prod' })).toBe('https://mp/prod');
    expect(pickInitPoint('production', {})).toBe(null);
  });
});
```

`tests/functions/mpSignature.test.ts`:

```ts
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyMpSignature } from '../../supabase/functions/_shared/mpSignature.ts';

const secret = 'test-secret';
const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex');

describe('verifyMpSignature', () => {
  it('acepta una firma válida', async () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;');
    expect(await verifyMpSignature({
      signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '123456', secret,
    })).toBe(true);
  });

  it('normaliza data.id a minúsculas', async () => {
    const v1 = sign('id:abc123;request-id:req-1;ts:1700000000;');
    expect(await verifyMpSignature({
      signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: 'ABC123', secret,
    })).toBe(true);
  });

  it('rechaza si cambia el data.id', async () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;');
    expect(await verifyMpSignature({
      signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '999999', secret,
    })).toBe(false);
  });

  it.each([
    ['header ausente', null],
    ['header sin v1', 'ts=1700000000'],
    ['header basura', 'hola'],
  ])('rechaza: %s', async (_name, signatureHeader) => {
    expect(await verifyMpSignature({ signatureHeader, requestId: 'req-1', dataId: '123456', secret })).toBe(false);
  });
});
```

- [ ] **Step 2: correr y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven `cors.ts`, `checkout.ts`, `mpSignature.ts`.

- [ ] **Step 3: implementar `supabase/functions/_shared/cors.ts`**

```ts
const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type';

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter((o) => o.length > 0);
}

/**
 * CORS por lista blanca (secret ALLOWED_ORIGINS). Un origen no permitido recibe como
 * Allow-Origin el primero de la lista, así que el navegador bloquea la respuesta.
 */
export function buildCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (allowedOrigins.length === 0) return headers;
  const normalized = origin?.replace(/\/$/, '') ?? '';
  headers['Access-Control-Allow-Origin'] = allowedOrigins.includes(normalized) ? normalized : allowedOrigins[0];
  return headers;
}
```

- [ ] **Step 4: implementar `supabase/functions/_shared/checkout.ts`**

```ts
export type CheckoutMode = 'sandbox' | 'production';

/** URL base para las back_urls: solo orígenes de la lista blanca; si no, el fallback del servidor. */
export function resolveAppUrl(requested: string | null, allowedOrigins: string[], fallback: string): string {
  if (requested) {
    try {
      const origin = new URL(requested).origin;
      if (allowedOrigins.includes(origin)) return origin;
    } catch {
      // URL inválida: se usa el fallback
    }
  }
  return fallback.replace(/\/$/, '');
}

/** Producción por default. Sandbox solo si el secret MP_USE_SANDBOX_CHECKOUT es exactamente "true". */
export function resolveCheckoutMode(flag: string | undefined): CheckoutMode {
  return flag === 'true' ? 'sandbox' : 'production';
}

export function pickInitPoint(
  mode: CheckoutMode,
  mp: { init_point?: string; sandbox_init_point?: string },
): string | null {
  if (mode === 'sandbox') return mp.sandbox_init_point || mp.init_point || null;
  return mp.init_point || null;
}
```

- [ ] **Step 5: implementar `supabase/functions/_shared/mpSignature.ts`**

```ts
/**
 * Verifica el header x-signature de Mercado Pago (HMAC-SHA256 en hex del manifest
 * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;").
 */
export async function verifyMpSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): Promise<boolean> {
  if (!input.signatureHeader) return false;

  const parts = new Map<string, string>();
  for (const chunk of input.signatureHeader.split(',')) {
    const [key, value] = chunk.split('=').map((s) => s.trim());
    if (key && value) parts.set(key, value);
  }
  const ts = parts.get('ts');
  const v1 = parts.get('v1');
  if (!ts || !v1) return false;

  let manifest = '';
  if (input.dataId) manifest += `id:${input.dataId.toLowerCase()};`;
  if (input.requestId) manifest += `request-id:${input.requestId};`;
  manifest += `ts:${ts};`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(input.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');

  // Comparación en tiempo constante.
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
```

- [ ] **Step 6: correr y ver que pasan; commit**

Run: `npm test && npm run lint`
Expected: verde.

```bash
git add supabase/functions/_shared tests/functions
git commit -m "feat: add tested shared modules for CORS allowlist, checkout mode and MP signature"
```

### Task 8: Cliente de Replicate con topes y cobro con reembolso (H8, parte de C2)

**Files:**
- Create: `supabase/functions/_shared/replicate.ts`
- Test: `tests/functions/replicate.test.ts`

**Interfaces:**
- Produces:
  - `type Prediction = { id: string; status: string; output?: string | string[] | null; error?: string | null; logs?: string | null }`
  - `type ReplicateDeps = { fetchFn: typeof fetch; sleep: (ms: number) => Promise<void>; now: () => number }`
  - `createPrediction(deps: ReplicateDeps, apiKey: string, body: Record<string, unknown>, maxRetries?: number): Promise<Prediction>` — máx. 3 reintentos por 429, espera tope 30 s.
  - `waitForPrediction(deps: ReplicateDeps, apiKey: string, initial: Prediction, opts?: { timeoutMs: number; intervalMs: number }): Promise<Prediction>` — al exceder 120 s cancela la predicción y lanza `Error('AI_TIMEOUT')`.
  - `firstOutput(p: Prediction): string` — lanza `Error('AI_EMPTY_OUTPUT')` si no hay salida.
  - `runCharged<T>(ops: { spend: () => Promise<string>; refund: (usageId: string) => Promise<void>; run: () => Promise<T> }): Promise<T>`

- [ ] **Step 1: test que falla — `tests/functions/replicate.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  createPrediction, firstOutput, runCharged, waitForPrediction, type ReplicateDeps,
} from '../../supabase/functions/_shared/replicate.ts';

const res = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function deps(responses: Response[]): ReplicateDeps & { calls: string[]; clock: { t: number } } {
  const calls: string[] = [];
  const clock = { t: 0 };
  return {
    calls,
    clock,
    fetchFn: (async (url: string | URL | Request) => {
      calls.push(String(url));
      const next = responses.shift();
      if (!next) throw new Error('sin más respuestas simuladas');
      return next;
    }) as typeof fetch,
    sleep: async (ms: number) => { clock.t += ms; },
    now: () => clock.t,
  };
}

describe('createPrediction', () => {
  it('devuelve la predicción creada', async () => {
    const d = deps([res(201, { id: 'p1', status: 'starting' })]);
    expect(await createPrediction(d, 'key', {})).toMatchObject({ id: 'p1' });
  });

  it('reintenta en 429 y respeta retry_after con tope de 30 s', async () => {
    const d = deps([res(429, { retry_after: 999 }), res(201, { id: 'p1', status: 'starting' })]);
    await createPrediction(d, 'key', {});
    expect(d.calls).toHaveLength(2);
    expect(d.clock.t).toBe(30_000);
  });

  it('se rinde tras maxRetries 429 seguidos', async () => {
    const d = deps([res(429, {}), res(429, {}), res(429, {})]);
    await expect(createPrediction(d, 'key', {}, 2)).rejects.toThrow('AI_BUSY');
    expect(d.calls).toHaveLength(3);
  });

  it('propaga el detalle de un error de la API', async () => {
    const d = deps([res(422, { detail: 'bad input' })]);
    await expect(createPrediction(d, 'key', {})).rejects.toThrow('Replicate API (422): bad input');
  });
});

describe('waitForPrediction', () => {
  it('hace polling hasta succeeded', async () => {
    const d = deps([res(200, { id: 'p1', status: 'processing' }), res(200, { id: 'p1', status: 'succeeded', output: 'https://out' })]);
    const p = await waitForPrediction(d, 'key', { id: 'p1', status: 'starting' });
    expect(p.status).toBe('succeeded');
  });

  it('devuelve de inmediato si ya terminó', async () => {
    const d = deps([]);
    expect((await waitForPrediction(d, 'key', { id: 'p1', status: 'failed', error: 'x' })).status).toBe('failed');
    expect(d.calls).toHaveLength(0);
  });

  it('al exceder el timeout cancela la predicción y lanza AI_TIMEOUT', async () => {
    const d = deps([
      res(200, { id: 'p1', status: 'processing' }),
      res(200, { id: 'p1', status: 'processing' }),
      res(200, { id: 'p1', status: 'canceled' }),
    ]);
    await expect(waitForPrediction(d, 'key', { id: 'p1', status: 'starting' }, { timeoutMs: 5000, intervalMs: 3000 }))
      .rejects.toThrow('AI_TIMEOUT');
    expect(d.calls.at(-1)).toContain('/predictions/p1/cancel');
  });

  it('un error de polling se propaga', async () => {
    const d = deps([res(500, { detail: 'boom' })]);
    await expect(waitForPrediction(d, 'key', { id: 'p1', status: 'starting' })).rejects.toThrow('Replicate poll (500)');
  });
});

describe('firstOutput', () => {
  it('acepta string o arreglo', () => {
    expect(firstOutput({ id: 'p', status: 'succeeded', output: 'a' })).toBe('a');
    expect(firstOutput({ id: 'p', status: 'succeeded', output: ['b', 'c'] })).toBe('b');
  });
  it('lanza si no hay salida', () => {
    expect(() => firstOutput({ id: 'p', status: 'succeeded', output: [] })).toThrow('AI_EMPTY_OUTPUT');
  });
});

describe('runCharged', () => {
  it('cobra, ejecuta y no reembolsa si todo sale bien', async () => {
    const refund = vi.fn(async () => {});
    const out = await runCharged({ spend: async () => 'u1', refund, run: async () => 'ok' });
    expect(out).toBe('ok');
    expect(refund).not.toHaveBeenCalled();
  });

  it('reembolsa si la ejecución falla y relanza el error original', async () => {
    const refund = vi.fn(async () => {});
    await expect(runCharged({ spend: async () => 'u1', refund, run: async () => { throw new Error('AI_TIMEOUT'); } }))
      .rejects.toThrow('AI_TIMEOUT');
    expect(refund).toHaveBeenCalledWith('u1');
  });

  it('no ejecuta ni reembolsa si el cobro falla', async () => {
    const refund = vi.fn(async () => {});
    const run = vi.fn(async () => 'ok');
    await expect(runCharged({ spend: async () => { throw new Error('INSUFFICIENT_TOKENS'); }, refund, run }))
      .rejects.toThrow('INSUFFICIENT_TOKENS');
    expect(run).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
  });

  it('si el reembolso falla, relanza el error original de la ejecución', async () => {
    await expect(runCharged({
      spend: async () => 'u1',
      refund: async () => { throw new Error('db caída'); },
      run: async () => { throw new Error('AI_ERROR'); },
    })).rejects.toThrow('AI_ERROR');
  });
});
```

- [ ] **Step 2: correr y ver que falla**

Run: `npm test`
Expected: FAIL — no se resuelve `replicate.ts`.

- [ ] **Step 3: implementar `supabase/functions/_shared/replicate.ts`**

```ts
const REPLICATE_API_BASE = 'https://api.replicate.com/v1';
const MAX_RETRY_WAIT_MS = 30_000;
const DEFAULT_RETRY_WAIT_S = 10;

export interface Prediction {
  id: string;
  status: string;
  output?: string | string[] | null;
  error?: string | null;
  logs?: string | null;
}

export interface ReplicateDeps {
  fetchFn: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);

export async function createPrediction(
  deps: ReplicateDeps,
  apiKey: string,
  body: Record<string, unknown>,
  maxRetries = 3,
): Promise<Prediction> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await deps.fetchFn(`${REPLICATE_API_BASE}/predictions`, {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      if (attempt === maxRetries) break;
      const err = await res.json().catch(() => ({}));
      const seconds = typeof err.retry_after === 'number' ? err.retry_after : DEFAULT_RETRY_WAIT_S;
      await deps.sleep(Math.min(seconds * 1000, MAX_RETRY_WAIT_MS));
      continue;
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(`Replicate API (${res.status}): ${json.detail ?? res.statusText}`);
    }

    return (await res.json()) as Prediction;
  }
  throw new Error('AI_BUSY');
}

export async function waitForPrediction(
  deps: ReplicateDeps,
  apiKey: string,
  initial: Prediction,
  opts: { timeoutMs: number; intervalMs: number } = { timeoutMs: 120_000, intervalMs: 3000 },
): Promise<Prediction> {
  const startedAt = deps.now();
  let prediction = initial;

  while (!TERMINAL.has(prediction.status)) {
    if (deps.now() - startedAt >= opts.timeoutMs) {
      // Cancelar para que Replicate deje de facturar la predicción abandonada.
      await deps.fetchFn(`${REPLICATE_API_BASE}/predictions/${prediction.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Token ${apiKey}` },
      }).catch(() => undefined);
      throw new Error('AI_TIMEOUT');
    }
    await deps.sleep(opts.intervalMs);
    const res = await deps.fetchFn(`${REPLICATE_API_BASE}/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Replicate poll (${res.status})`);
    prediction = (await res.json()) as Prediction;
  }

  return prediction;
}

export function firstOutput(p: Prediction): string {
  const out = Array.isArray(p.output) ? p.output[0] : p.output;
  if (typeof out !== 'string' || out.length === 0) throw new Error('AI_EMPTY_OUTPUT');
  return out;
}

/**
 * Cobra antes de ejecutar y reembolsa si la ejecución falla. Si el reembolso también
 * falla se registra y se relanza el error original (el cobro queda para revisión manual).
 */
export async function runCharged<T>(ops: {
  spend: () => Promise<string>;
  refund: (usageId: string) => Promise<void>;
  run: () => Promise<T>;
}): Promise<T> {
  const usageId = await ops.spend();
  try {
    return await ops.run();
  } catch (runError) {
    try {
      await ops.refund(usageId);
    } catch (refundError) {
      console.error('runCharged: no se pudo reembolsar el uso', usageId, refundError);
    }
    throw runError;
  }
}
```

- [ ] **Step 4: correr, cobertura y commit**

Run: `npm run test:coverage && npm run lint`
Expected: tests en verde y cobertura ≥ 80 % en `supabase/functions/_shared/**`. (Los archivos `src/…` del umbral aún no existen; Vitest ignora los `include` sin coincidencias.)

```bash
git add supabase/functions/_shared/replicate.ts tests/functions/replicate.test.ts
git commit -m "feat: add bounded Replicate client and charge-with-refund helper"
```

### Task 9: Reescribir `create-payment-preference` (H4, H7, M1, M4, M5, M8)

**Files:**
- Modify: `supabase/functions/create-payment-preference/index.ts` (archivo completo)

**Interfaces:**
- Consumes: `parsePreferenceRequest`, `selectPromotion`, `computePromotionBonus`, `PromotionRow`, `PreferenceMetadata`, `buildCorsHeaders`, `parseAllowedOrigins`, `resolveAppUrl`, `resolveCheckoutMode`, `pickInitPoint`.
- Produces: respuesta `200 { success: true, init_point: string, payment_id: string }`; errores `{ error: 'NOT_LOGGED_IN' | 'INVALID_REQUEST' | 'INVALID_PACK' | 'INVALID_AMOUNT' | 'CONFIG_ERROR' | 'MP_ERROR' | 'NETWORK_ERROR', message: string }` sin campo `details`. Metadata de la preferencia con `promotion_id` y `promotion_type`.
- Secrets nuevos: `ALLOWED_ORIGINS` (lista separada por comas), `MP_USE_SANDBOX_CHECKOUT` (`true` solo en dev). Deja de usarse `MP_USE_PRODUCTION_CHECKOUT`.

Los handlers no tienen test unitario (dependen de `Deno.serve`); su lógica vive en los módulos ya probados y se verifican con las pruebas manuales del Task 15.

- [ ] **Step 1: reemplazar el archivo completo**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import { pickInitPoint, resolveAppUrl, resolveCheckoutMode } from '../_shared/checkout.ts';
import type { PreferenceMetadata } from '../_shared/credit.ts';
import { computePromotionBonus, selectPromotion, type PromotionRow } from '../_shared/promotions.ts';
import { parsePreferenceRequest } from '../_shared/validation.ts';

const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';
const DEFAULT_APP_URL = 'https://chorroybuenas.com.mx';
const DEFAULT_PRICE_PER_TOKEN_CENTS = 200;

Deno.serve(async (req) => {
  const allowedOrigins = parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
  const headers = buildCorsHeaders(req.headers.get('Origin'), allowedOrigins);
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'INVALID_REQUEST', message: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!serviceRoleKey || !mpAccessToken) {
    console.error('create-payment-preference: falta SERVICE_ROLE_KEY o MERCADOPAGO_ACCESS_TOKEN');
    return reply(500, { error: 'CONFIG_ERROR', message: 'Error de configuración del servidor.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Inicia sesión para comprar tokens.' });
  }
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) {
    console.error('create-payment-preference: sesión inválida', userError?.message);
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada. Inicia sesión nuevamente.' });
  }

  const parsed = parsePreferenceRequest(await req.json().catch(() => null));
  if (!parsed.ok) return reply(400, { error: 'INVALID_REQUEST', message: parsed.message });
  const { packId, customTokens, promoCode, appUrl: requestedAppUrl } = parsed.value;

  // Service role: las lecturas no dependen de RLS (promotions ya no es pública y
  // token_purchases solo es visible para su dueño).
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let baseTokens: number;
  let bonusTokens = 0;
  let amountCents: number;

  if (packId) {
    const { data: pack, error: packError } = await admin
      .from('token_packs')
      .select('id, base_tokens, bonus_tokens, price_cents')
      .eq('id', packId)
      .eq('is_active', true)
      .maybeSingle();
    if (packError || !pack) {
      if (packError) console.error('create-payment-preference: error token_packs', packError.message);
      return reply(400, { error: 'INVALID_PACK', message: 'Pack no encontrado o inactivo.' });
    }
    baseTokens = pack.base_tokens;
    bonusTokens = pack.bonus_tokens;
    amountCents = pack.price_cents;
  } else {
    const { data: pricing, error: pricingError } = await admin
      .from('token_pricing')
      .select('price_per_token_cents')
      .eq('currency', 'MXN')
      .maybeSingle();
    if (pricingError) console.error('create-payment-preference: error token_pricing', pricingError.message);
    baseTokens = customTokens as number;
    amountCents = baseTokens * (pricing?.price_per_token_cents ?? DEFAULT_PRICE_PER_TOKEN_CENTS);
  }

  if (!Number.isInteger(amountCents) || amountCents < 1) {
    console.error('create-payment-preference: monto inválido', amountCents);
    return reply(400, { error: 'INVALID_AMOUNT', message: 'El monto de la compra debe ser mayor a cero.' });
  }

  const { data: purchases, error: purchasesError } = await admin
    .from('token_purchases')
    .select('promotion_ids')
    .eq('user_id', user.id);
  if (purchasesError) {
    console.error('create-payment-preference: error token_purchases', purchasesError.message);
    return reply(500, { error: 'CONFIG_ERROR', message: 'No se pudo preparar la compra. Intenta de nuevo.' });
  }
  const { data: promos, error: promosError } = await admin
    .from('promotions')
    .select('id, code, type, config, valid_from, valid_until, is_active');
  if (promosError) console.error('create-payment-preference: error promotions', promosError.message);

  const promotion = selectPromotion({
    promos: (promos ?? []) as PromotionRow[],
    promoCode,
    isFirstPurchase: (purchases ?? []).length === 0,
    usedPromotionIds: (purchases ?? []).flatMap((p) => (p.promotion_ids ?? []) as string[]),
    now: new Date(),
  });
  const promotionBonus = promotion ? computePromotionBonus(baseTokens, promotion.percent) : 0;
  const totalTokens = baseTokens + bonusTokens + promotionBonus;

  const appUrl = resolveAppUrl(requestedAppUrl, allowedOrigins, Deno.env.get('APP_URL') || DEFAULT_APP_URL);
  const mode = resolveCheckoutMode(Deno.env.get('MP_USE_SANDBOX_CHECKOUT'));

  const metadata: PreferenceMetadata = {
    user_id: user.id,
    pack_id: packId,
    base_tokens: baseTokens,
    bonus_tokens: bonusTokens,
    promotion_bonus: promotionBonus,
    total_tokens: totalTokens,
    amount_cents: amountCents,
    promotion_id: promotion?.id ?? null,
    promotion_type: promotion?.type ?? null,
  };

  const preferenceData = {
    items: [
      {
        title: `Tokens de IA - ${totalTokens} tokens`,
        description:
          `Pack de ${baseTokens} tokens` +
          (bonusTokens > 0 ? ` + ${bonusTokens} de regalo` : '') +
          (promotionBonus > 0 ? ` + ${promotionBonus} de promoción` : ''),
        quantity: 1,
        unit_price: amountCents / 100, // MP espera pesos, no centavos
        currency_id: 'MXN',
      },
    ],
    // En sandbox MP rechaza pagos si el payer es una cuenta real; solo se envía en producción.
    payer: mode === 'production' && user.email ? { email: user.email } : undefined,
    back_urls: {
      success: `${appUrl}/comprar-tokens?success=1&payment_id={payment_id}`,
      failure: `${appUrl}/comprar-tokens?cancel=1`,
      pending: `${appUrl}/comprar-tokens?pending=1&payment_id={payment_id}`,
    },
    auto_return: 'approved',
    external_reference: user.id,
    notification_url: `${supabaseUrl}/functions/v1/webhook-mercadopago`,
    metadata,
  };

  try {
    const mpResponse = await fetch(`${MERCADOPAGO_API_BASE}/checkout/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mpAccessToken}` },
      body: JSON.stringify(preferenceData),
    });
    const responseText = await mpResponse.text();

    if (!mpResponse.ok) {
      console.error('create-payment-preference: error MP', mpResponse.status, responseText.slice(0, 500));
      return reply(502, { error: 'MP_ERROR', message: 'Mercado Pago rechazó la solicitud. Intenta de nuevo.' });
    }

    let mpData: { id?: string; init_point?: string; sandbox_init_point?: string };
    try {
      mpData = JSON.parse(responseText);
    } catch (e) {
      console.error('create-payment-preference: respuesta MP no es JSON', e);
      return reply(502, { error: 'MP_ERROR', message: 'Respuesta inválida de Mercado Pago.' });
    }

    const initPoint = pickInitPoint(mode, mpData);
    if (!initPoint) {
      console.error('create-payment-preference: MP no devolvió init_point');
      return reply(502, { error: 'MP_ERROR', message: 'No se recibió URL de pago.' });
    }

    return reply(200, { success: true, init_point: initPoint, payment_id: mpData.id ?? '' });
  } catch (error) {
    console.error('create-payment-preference: error de red con MP', error);
    return reply(502, { error: 'NETWORK_ERROR', message: 'Error de conexión con Mercado Pago.' });
  }
});
```

- [ ] **Step 2: verificar que no quedó nada del comportamiento viejo**

Run: `grep -n "isTestMode\|MP_USE_PRODUCTION_CHECKOUT\|details:\|'\*'" supabase/functions/create-payment-preference/index.ts`
Expected: sin salida.

- [ ] **Step 3: commit**

```bash
git add supabase/functions/create-payment-preference/index.ts
git commit -m "fix: validate preference requests, honor promo codes and stop leaking MP errors"
```

### Task 10: Reescribir `webhook-mercadopago` y `credit-payment-on-return` (C3, H4, M3, M5, M8)

**Files:**
- Modify: `supabase/functions/webhook-mercadopago/index.ts` (completo), `supabase/functions/credit-payment-on-return/index.ts` (completo)

**Interfaces:**
- Consumes: `buildCreditParams`, `PreferenceMetadata`, `verifyMpSignature`, `buildCorsHeaders`, `parseAllowedOrigins`, RPC `add_tokens_after_purchase` (12 parámetros, Task 3).
- Produces:
  - webhook: `200 { received: true }` cuando no hay nada que acreditar o ya se acreditó; `401` si la firma es inválida; `500` ante error inesperado (para que Mercado Pago reintente).
  - credit-on-return: `200 { credited: boolean, reason?: string, new_balance?: number }`; `403` si el pago es de otro usuario; errores sin detalle interno.
- Secret nuevo: `MERCADOPAGO_WEBHOOK_SECRET` (el "Secret signature" de Webhooks en el panel de MP).

Nota de alcance sobre la firma: si la notificación trae `x-signature`, se exige que sea válida. Las notificaciones IPN legacy (`?topic=…&id=…`) no vienen firmadas, así que se aceptan sin firma; no es un hueco porque el handler nunca confía en el cuerpo: siempre vuelve a consultar el pago en la API de MP con el access token.

- [ ] **Step 1: reemplazar `supabase/functions/webhook-mercadopago/index.ts`**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCreditParams, type PreferenceMetadata } from '../_shared/credit.ts';
import { verifyMpSignature } from '../_shared/mpSignature.ts';

const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const ORDER_RETRY_DELAY_MS = 3000;

interface MerchantOrder {
  payments?: Array<{ id: number; status?: string; transaction_amount?: number }>;
  external_reference?: string;
  preference_id?: string;
}

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const ack = () => reply(200, { received: true });

async function readNotification(req: Request, url: URL) {
  let body: Record<string, unknown> = {};
  if (req.method === 'POST') {
    const contentType = req.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => ({}));
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries(new URLSearchParams(await req.text()));
    }
  }
  const topic = ((body.topic ?? body.type) as string | undefined) ?? url.searchParams.get('topic') ?? url.searchParams.get('type');
  const bodyId = (body.data as { id?: string | number } | undefined)?.id ?? (body.id as string | number | undefined);
  let id = bodyId != null ? String(bodyId) : url.searchParams.get('data.id') ?? url.searchParams.get('id');
  if (!id && typeof body.resource === 'string') {
    id = body.resource.match(/\/(\d+)$/)?.[1] ?? null;
  }
  return { topic, id, signedDataId: url.searchParams.get('data.id') ?? (bodyId != null ? String(bodyId) : null) };
}

async function mpGet<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${MERCADOPAGO_API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`MP ${path} respondió ${res.status}`);
  return (await res.json()) as T;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return reply(405, { error: 'Method not allowed' });
  }

  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!mpToken || !serviceRoleKey) {
    console.error('webhook-mercadopago: falta MERCADOPAGO_ACCESS_TOKEN o SERVICE_ROLE_KEY');
    return reply(500, { error: 'config' });
  }

  try {
    const url = new URL(req.url);
    const { topic, id, signedDataId } = await readNotification(req, url);

    const signatureHeader = req.headers.get('x-signature');
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    if (signatureHeader && webhookSecret) {
      const valid = await verifyMpSignature({
        signatureHeader,
        requestId: req.headers.get('x-request-id'),
        dataId: signedDataId,
        secret: webhookSecret,
      });
      if (!valid) {
        console.error('webhook-mercadopago: firma inválida');
        return reply(401, { error: 'invalid_signature' });
      }
    }

    if (!id || (topic !== 'payment' && topic !== 'merchant_order')) return ack();

    let paymentId: string;
    let payment: Record<string, unknown>;
    let externalReference: string | undefined;
    let preferenceId: string | undefined;

    if (topic === 'merchant_order') {
      let order = await mpGet<MerchantOrder>(`/merchant_orders/${id}`, mpToken);
      if (order && (order.payments ?? []).length === 0) {
        await new Promise((r) => setTimeout(r, ORDER_RETRY_DELAY_MS));
        order = await mpGet<MerchantOrder>(`/merchant_orders/${id}`, mpToken);
      }
      const approved = order?.payments?.find((p) => p.status === 'approved');
      if (!order || !approved) return ack();
      paymentId = String(approved.id);
      payment = approved as unknown as Record<string, unknown>;
      externalReference = order.external_reference;
      preferenceId = order.preference_id;
    } else {
      const found = await mpGet<Record<string, unknown>>(`/v1/payments/${id}`, mpToken);
      if (!found || found.status !== 'approved') return ack();
      paymentId = String(id);
      payment = found;
      externalReference = found.external_reference as string | undefined;
      preferenceId =
        (found.metadata as { preference_id?: string } | undefined)?.preference_id ??
        (found.preference_id as string | undefined);
    }

    if (!externalReference || !preferenceId) {
      console.error('webhook-mercadopago: pago sin external_reference o preference_id', paymentId);
      return ack();
    }

    const preference = await mpGet<{ metadata?: PreferenceMetadata }>(`/checkout/preferences/${preferenceId}`, mpToken);
    if (!preference?.metadata) {
      console.error('webhook-mercadopago: preferencia sin metadata', preferenceId);
      return ack();
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { count, error: countError } = await supabase
      .from('token_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', externalReference);
    if (countError) throw new Error(`token_purchases: ${countError.message}`);

    const params = buildCreditParams({
      userId: externalReference,
      paymentId,
      status: 'approved',
      payment,
      metadata: preference.metadata,
      isFirstPurchase: (count ?? 0) === 0,
    });
    if (!params) {
      console.error('webhook-mercadopago: metadata o monto inválido para el pago', paymentId);
      return ack();
    }

    // Idempotente: si el pago ya fue acreditado, la RPC no vuelve a sumar.
    const { error: rpcError } = await supabase.rpc('add_tokens_after_purchase', params);
    if (rpcError) throw new Error(`add_tokens_after_purchase: ${rpcError.message}`);

    return ack();
  } catch (err) {
    // 500 para que Mercado Pago reintente; la acreditación es idempotente.
    console.error('webhook-mercadopago:', err);
    return reply(500, { error: 'internal' });
  }
});
```

- [ ] **Step 2: reemplazar `supabase/functions/credit-payment-on-return/index.ts`**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import { buildCreditParams, type PreferenceMetadata } from '../_shared/credit.ts';

const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';

Deno.serve(async (req) => {
  const headers = buildCorsHeaders(req.headers.get('Origin'), parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')));
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'INVALID_REQUEST', message: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!serviceRoleKey || !mpToken) {
    console.error('credit-payment-on-return: falta SERVICE_ROLE_KEY o MERCADOPAGO_ACCESS_TOKEN');
    return reply(500, { error: 'CONFIG', message: 'Error de configuración.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión requerida.' });
  }
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada.' });
  }

  const body = (await req.json().catch(() => null)) as { payment_id?: unknown } | null;
  const paymentId = typeof body?.payment_id === 'string' ? body.payment_id.trim() : '';
  if (!/^\d{1,20}$/.test(paymentId)) {
    return reply(400, { error: 'INVALID_REQUEST', message: 'payment_id inválido.' });
  }

  try {
    const mpHeaders = { Authorization: `Bearer ${mpToken}` };
    const paymentRes = await fetch(`${MERCADOPAGO_API_BASE}/v1/payments/${paymentId}`, { headers: mpHeaders });
    if (!paymentRes.ok) return reply(200, { credited: false, reason: 'payment_not_found' });

    const payment = (await paymentRes.json()) as Record<string, unknown>;
    if (payment.status !== 'approved') {
      return reply(200, { credited: false, reason: 'not_approved', status: payment.status });
    }
    if (payment.external_reference !== user.id) {
      return reply(403, { error: 'FORBIDDEN', message: 'Este pago no corresponde a tu cuenta.' });
    }

    const preferenceId =
      (payment.metadata as { preference_id?: string } | undefined)?.preference_id ??
      (payment.preference_id as string | undefined);
    if (!preferenceId) return reply(200, { credited: false, reason: 'invalid_metadata' });

    const prefRes = await fetch(`${MERCADOPAGO_API_BASE}/checkout/preferences/${preferenceId}`, { headers: mpHeaders });
    const metadata = prefRes.ok ? ((await prefRes.json()) as { metadata?: PreferenceMetadata }).metadata : undefined;
    if (!metadata) return reply(200, { credited: false, reason: 'invalid_metadata' });

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { count, error: countError } = await admin
      .from('token_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) throw new Error(`token_purchases: ${countError.message}`);

    const params = buildCreditParams({
      userId: user.id,
      paymentId,
      status: 'approved',
      payment,
      metadata,
      isFirstPurchase: (count ?? 0) === 0,
    });
    if (!params) return reply(200, { credited: false, reason: 'invalid_metadata' });

    // Idempotente: si el webhook ya acreditó este pago, devuelve el saldo actual sin sumar.
    const { data: newBalance, error: rpcError } = await admin.rpc('add_tokens_after_purchase', params);
    if (rpcError) throw new Error(`add_tokens_after_purchase: ${rpcError.message}`);

    return reply(200, { credited: true, new_balance: newBalance });
  } catch (err) {
    console.error('credit-payment-on-return:', err);
    return reply(500, { error: 'INTERNAL', message: 'No se pudo acreditar el pago. Intenta de nuevo en unos minutos.' });
  }
});
```

- [ ] **Step 3: confirmar que el cliente no depende de campos eliminados**

Run: `grep -rn "already_processed\|error === 'RPC'\|payment_not_found" src`
Expected: sin salida. Si aparece `already_processed`, cambiar esa condición por `credited === true` (la respuesta ya no distingue el caso). Si aparece `error: 'payment_not_found'`, leer ahora `reason`.

- [ ] **Step 4: commit**

```bash
git add supabase/functions/webhook-mercadopago/index.ts supabase/functions/credit-payment-on-return/index.ts
git commit -m "fix: credit payments idempotently, verify MP signature and let MP retry on errors"
```

### Task 11: Reescribir `transform-loteria` con cobro en servidor (C2, H8, M5, M8)

**Files:**
- Modify: `supabase/functions/transform-loteria/index.ts` (completo)

**Interfaces:**
- Consumes: `validateImageDataUri`, `isUuid`, `createPrediction`, `waitForPrediction`, `firstOutput`, `runCharged`, `ReplicateDeps`, `buildCorsHeaders`, `parseAllowedOrigins`; RPCs `spend_tokens_for_user`, `refund_token_usage` (Task 4).
- Produces: request `{ image: string; model?: 'gpt-image' | 'flux'; prompt_variant?: 0 | 1 | 2; prompt_strength?: number; set_id?: string }`. Respuestas: `200 { output: string }`; `401 NOT_LOGGED_IN`; `400 INVALID_REQUEST`; `402 INSUFFICIENT_TOKENS`; `429 RATE_LIMITED`; `422 NSFW_FILTER | SENSITIVE_CONTENT_FILTER`; `504 AI_TIMEOUT`; `502 AI_ERROR`; `500 CONFIG_ERROR`. El Task 12 depende de estos códigos.

- [ ] **Step 1: reemplazar el archivo completo**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import {
  createPrediction, firstOutput, runCharged, waitForPrediction, type Prediction, type ReplicateDeps,
} from '../_shared/replicate.ts';
import { isUuid, validateImageDataUri } from '../_shared/validation.ts';

const GPT_IMAGE_VERSION = '118f53498ea7319519229b2d5bd0d4a69e3d77eb60d6292d5db38125534dc1ca';
const FLUX_VERSION = '0ce45202d83c6bd379dfe58f4c0c41e6cadf93ebbd9d938cc63cc0f2fcb729a5';
const TOKENS_PER_IMAGE = 1;
const DEFAULT_PROMPT_STRENGTH = 0.5;
const DEFAULT_FLUX_DENOISING = 0.65;

const LOTERIA_PROMPT_TAIL = `
Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. 
Visual details:
- Bold, thick black ink outlines. Naive folk art drawing style.
- Vibrant primary colors (Mexican pink, deep teal, sunflower yellow).
- Flat, solid colors with visible ink texture and aged paper grain.
- NO 3D, NO photorealism, NO modern digital gradients.
- NO text, NO borders inside the image.
The output should look like a hand-painted card from a vintage Loteria set.`;

const PROMPTS: Record<number, string> = {
  0: `Authentic Mexican Loteria card illustration. Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. Visual details: - Subject MUST keep the exact features, pose, and silhouette from the input image. - Bold, thick black ink outlines. Naive folk art drawing style. - Vibrant primary colors (Mexican pink, deep teal, sunflower yellow). - Flat, solid colors with visible ink texture and aged paper grain. - NO 3D, NO photorealism, NO modern digital gradients. - NO text, NO borders inside the image. The output should look like a hand-painted card from a vintage Loteria set.`,
  1: `Create an original 2D folk art illustration inspired by the input image.
Do NOT preserve exact facial features, body proportions, or identity.
The result must be an original character.${LOTERIA_PROMPT_TAIL}`,
  2: `Create a symbolic illustration inspired by the theme and colors of the image.${LOTERIA_PROMPT_TAIL}`,
};

const FLUX_PROMPT = `Same subject, same pose and composition as the input image. Mexican Loteria card, Don Clemente Gallo vintage 1940s style, lithograph print. Bold thick black outlines, naive folk art, flat colors. Mexican pink, teal, sunflower yellow, solid flat fills. Visible ink texture, aged paper grain. Illustration only, no photorealism, no 3D, no text.`;

/** Código público → status HTTP. Cualquier otro error se reporta como AI_ERROR (502). */
const ERROR_STATUS: Record<string, number> = {
  INSUFFICIENT_TOKENS: 402,
  RATE_LIMITED: 429,
  NSFW_FILTER: 422,
  SENSITIVE_CONTENT_FILTER: 422,
  AI_TIMEOUT: 504,
};
const ERROR_MESSAGE: Record<string, string> = {
  INSUFFICIENT_TOKENS: 'No tienes tokens suficientes.',
  RATE_LIMITED: 'Demasiadas solicitudes. Espera un minuto e intenta de nuevo.',
  NSFW_FILTER: 'La imagen fue bloqueada por el filtro de contenido.',
  SENSITIVE_CONTENT_FILTER: 'La imagen fue marcada como contenido sensible.',
  AI_TIMEOUT: 'La IA tardó demasiado. Intenta de nuevo.',
};

const deps: ReplicateDeps = {
  fetchFn: fetch,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
};

function assertSucceeded(p: Prediction): void {
  if (p.status === 'succeeded') return;
  const msg = `${p.error ?? ''}${p.logs ?? ''}`.toLowerCase();
  if (/nsfw|blocked|safety|content policy/.test(msg)) throw new Error('NSFW_FILTER');
  if (/sensitive|e005/.test(msg)) throw new Error('SENSITIVE_CONTENT_FILTER');
  throw new Error(`Predicción ${p.status}: ${p.error ?? 'sin detalle'}`);
}

async function runModel(
  apiKey: string,
  image: string,
  model: 'gpt-image' | 'flux',
  strength: number,
  promptVariant: 0 | 1 | 2,
): Promise<string> {
  const body = model === 'flux'
    ? {
        version: FLUX_VERSION,
        input: {
          image,
          positive_prompt: FLUX_PROMPT,
          denoising: Math.min(0.72, Math.max(0.45, strength || DEFAULT_FLUX_DENOISING)),
          steps: 28,
          scheduler: 'simple',
          sampler_name: 'euler',
          seed: 0,
        },
      }
    : {
        version: GPT_IMAGE_VERSION,
        input: {
          input_images: [image],
          prompt: PROMPTS[promptVariant],
          input_fidelity: strength > 0.4 ? 'high' : 'low',
          quality: 'low',
          aspect_ratio: '2:3',
          output_format: 'webp',
        },
      };
  const prediction = await waitForPrediction(deps, apiKey, await createPrediction(deps, apiKey, body));
  assertSucceeded(prediction);
  return firstOutput(prediction);
}

Deno.serve(async (req) => {
  const headers = buildCorsHeaders(req.headers.get('Origin'), parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')));
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'INVALID_REQUEST', message: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!serviceRoleKey || !replicateToken) {
    console.error('transform-loteria: falta SERVICE_ROLE_KEY o REPLICATE_API_TOKEN');
    return reply(500, { error: 'CONFIG_ERROR', message: 'Servicio de IA no configurado.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Se requiere autenticación.' });
  }
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada.' });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const image = validateImageDataUri(body?.image);
  if (!image.ok) return reply(400, { error: 'INVALID_REQUEST', message: image.message });

  const model = body?.model === 'flux' ? 'flux' : 'gpt-image';
  const variant = body?.prompt_variant;
  const promptVariant: 0 | 1 | 2 = variant === 1 || variant === 2 ? variant : 0;
  const rawStrength = body?.prompt_strength;
  const strength = typeof rawStrength === 'number' && rawStrength >= 0 && rawStrength <= 1
    ? rawStrength
    : DEFAULT_PROMPT_STRENGTH;
  const setId = isUuid(body?.set_id) ? body.set_id : null;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const output = await runCharged({
      spend: async () => {
        const { data, error } = await admin.rpc('spend_tokens_for_user', {
          p_user_id: user.id,
          p_amount: TOKENS_PER_IMAGE,
          p_set_id: setId,
        });
        if (error) {
          if (error.message.includes('INSUFFICIENT_TOKENS')) throw new Error('INSUFFICIENT_TOKENS');
          if (error.message.includes('RATE_LIMITED')) throw new Error('RATE_LIMITED');
          throw new Error(`spend_tokens_for_user: ${error.message}`);
        }
        return data as string;
      },
      refund: async (usageId) => {
        const { error } = await admin.rpc('refund_token_usage', { p_usage_id: usageId });
        if (error) throw new Error(`refund_token_usage: ${error.message}`);
      },
      run: () => runModel(replicateToken, image.value, model, strength, promptVariant),
    });
    return reply(200, { output });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const status = ERROR_STATUS[raw];
    if (status) return reply(status, { error: raw, message: ERROR_MESSAGE[raw] });
    console.error('transform-loteria:', raw);
    return reply(502, { error: 'AI_ERROR', message: 'No se pudo transformar la imagen. Intenta de nuevo.' });
  }
});
```

- [ ] **Step 2: verificar que no quedan bucles sin tope ni CORS abierto**

Run: `grep -n "while (\|callReplicate\|'\*'" supabase/functions/transform-loteria/index.ts`
Expected: sin salida.

- [ ] **Step 3: commit**

```bash
git add supabase/functions/transform-loteria/index.ts
git commit -m "fix: charge AI tokens server-side with refund on failure and bounded Replicate calls"
```

---

# Fase 4 — Cliente y resto de MEDIUM

### Task 12: `AIService` sin cobro ni falso éxito, y errores claros en la UI (C2, M5, M6, L3)

**Files:**
- Create: `src/services/aiFallback.ts`, `tests/src/aiFallback.test.ts`
- Modify: `src/services/AIService.ts`, `src/services/PurchaseService.ts:120-127`, `src/components/CardEditor/CardEditor.tsx:246-251`, `src/locales/es/translation.json`, `src/locales/en/translation.json`

**Interfaces:**
- Consumes: códigos de error de `transform-loteria` (Task 11); `TokenRepository.invalidateBalance` (Task 5).
- Produces:
  - `type EdgeCall = (params: { model: 'gpt-image' | 'flux'; prompt_variant?: 0 | 1 | 2 }) => Promise<string>`
  - `transformWithFallback(call: EdgeCall, opts: { useFluxFirst: boolean; onSensitiveRetry?: (attempt: number, messageKey: string) => void; delay?: (ms: number) => Promise<void> }): Promise<string>`
  - `aiErrorToI18nKey(message: string): string`
  - `AIService.transformToLoteria(request, userId?, callbacks?, setId?)` conserva la firma; ahora lanza `NOT_LOGGED_IN`, `AI_NOT_CONFIGURED`, `INSUFFICIENT_TOKENS`, `RATE_LIMITED`, `AI_TIMEOUT`, `SENSITIVE_PHOTO_NOT_SUPPORTED` o `NSFW_FILTER` en lugar de devolver la imagen original.

- [ ] **Step 1: test que falla — `tests/src/aiFallback.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { aiErrorToI18nKey, transformWithFallback, type EdgeCall } from '../../src/services/aiFallback';

const delay = async () => {};
const failing = (...messages: string[]): EdgeCall => {
  const queue = [...messages];
  return vi.fn(async () => {
    const next = queue.shift();
    if (next === undefined || next === 'OK') return 'https://out';
    throw new Error(next);
  });
};

describe('transformWithFallback', () => {
  it('devuelve el resultado al primer intento', async () => {
    const call = failing('OK');
    expect(await transformWithFallback(call, { useFluxFirst: false, delay })).toBe('https://out');
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('en contenido sensible avanza por las variantes 0 → 1 → 2 y avisa', async () => {
    const call = failing('SENSITIVE_CONTENT_FILTER', 'SENSITIVE_CONTENT_FILTER', 'OK');
    const onSensitiveRetry = vi.fn();
    await transformWithFallback(call, { useFluxFirst: false, onSensitiveRetry, delay });
    expect(vi.mocked(call).mock.calls.map((c) => c[0].prompt_variant)).toEqual([0, 1, 2]);
    expect(onSensitiveRetry).toHaveBeenCalledTimes(2);
  });

  it('si las tres variantes son sensibles prueba FLUX', async () => {
    const call = failing('SENSITIVE_CONTENT_FILTER', 'SENSITIVE_CONTENT_FILTER', 'SENSITIVE_CONTENT_FILTER', 'OK');
    await transformWithFallback(call, { useFluxFirst: false, delay });
    expect(vi.mocked(call).mock.calls.at(-1)?.[0].model).toBe('flux');
  });

  it('si FLUX también falla lanza SENSITIVE_PHOTO_NOT_SUPPORTED', async () => {
    const call = failing('SENSITIVE_CONTENT_FILTER', 'SENSITIVE_CONTENT_FILTER', 'SENSITIVE_CONTENT_FILTER', 'AI_ERROR');
    await expect(transformWithFallback(call, { useFluxFirst: false, delay })).rejects.toThrow('SENSITIVE_PHOTO_NOT_SUPPORTED');
  });

  it('NSFW se reintenta como máximo 2 veces y luego se rinde', async () => {
    const call = failing('NSFW_FILTER', 'NSFW_FILTER', 'NSFW_FILTER', 'NSFW_FILTER');
    await expect(transformWithFallback(call, { useFluxFirst: false, delay })).rejects.toThrow('NSFW_FILTER');
    expect(call).toHaveBeenCalledTimes(3);
  });

  it.each(['INSUFFICIENT_TOKENS', 'RATE_LIMITED', 'NOT_LOGGED_IN', 'AI_TIMEOUT'])(
    '%s corta de inmediato sin reintentar', async (message) => {
      const call = failing(message, 'OK');
      await expect(transformWithFallback(call, { useFluxFirst: false, delay })).rejects.toThrow(message);
      expect(call).toHaveBeenCalledTimes(1);
    });

  it('con useFluxFirst prueba FLUX y cae a GPT-Image si falla', async () => {
    const call = failing('AI_ERROR', 'OK');
    await transformWithFallback(call, { useFluxFirst: true, delay });
    expect(vi.mocked(call).mock.calls.map((c) => c[0].model)).toEqual(['flux', 'gpt-image']);
  });

  it('con useFluxFirst no cae a GPT-Image si el error es de saldo', async () => {
    const call = failing('INSUFFICIENT_TOKENS', 'OK');
    await expect(transformWithFallback(call, { useFluxFirst: true, delay })).rejects.toThrow('INSUFFICIENT_TOKENS');
    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe('aiErrorToI18nKey', () => {
  it('mapea los códigos conocidos y usa el genérico para el resto', () => {
    expect(aiErrorToI18nKey('INSUFFICIENT_TOKENS')).toBe('cardEditor.errors.aiInsufficientTokens');
    expect(aiErrorToI18nKey('NOT_LOGGED_IN')).toBe('cardEditor.errors.aiNotLoggedIn');
    expect(aiErrorToI18nKey('RATE_LIMITED')).toBe('cardEditor.errors.aiRateLimited');
    expect(aiErrorToI18nKey('AI_TIMEOUT')).toBe('cardEditor.errors.aiTimeout');
    expect(aiErrorToI18nKey('cualquier otra cosa')).toBe('cardEditor.errors.genericContactAdmin');
  });
});
```

- [ ] **Step 2: correr y ver que falla**

Run: `npm test`
Expected: FAIL — no se resuelve `src/services/aiFallback`.

- [ ] **Step 3: implementar `src/services/aiFallback.ts`**

```ts
export type EdgeCall = (params: { model: 'gpt-image' | 'flux'; prompt_variant?: 0 | 1 | 2 }) => Promise<string>;

export interface FallbackOptions {
  useFluxFirst: boolean;
  /** Llamado al reintentar con un prompt más permisivo (intento 2 o 3). */
  onSensitiveRetry?: (attempt: number, messageKey: string) => void;
  delay?: (ms: number) => Promise<void>;
}

const RETRY_DELAY_MS = 500;
const MAX_NSFW_RETRIES = 2;
const LAST_VARIANT = 2;
/** Errores que ningún reintento arregla. */
const FATAL = new Set(['INSUFFICIENT_TOKENS', 'RATE_LIMITED', 'NOT_LOGGED_IN', 'AI_NOT_CONFIGURED', 'AI_TIMEOUT']);

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const defaultDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Estrategia de reintentos de la transformación:
 * GPT-Image con prompt 0 → 1 → 2 ante contenido sensible, y FLUX como último recurso.
 */
export async function transformWithFallback(call: EdgeCall, opts: FallbackOptions): Promise<string> {
  const delay = opts.delay ?? defaultDelay;

  if (opts.useFluxFirst) {
    try {
      return await call({ model: 'flux' });
    } catch (error) {
      if (FATAL.has(messageOf(error))) throw error;
    }
  }

  let variant: 0 | 1 | 2 = 0;
  let nsfwRetries = 0;

  for (;;) {
    try {
      return await call({ model: 'gpt-image', prompt_variant: variant });
    } catch (error) {
      const message = messageOf(error);
      if (message === 'NSFW_FILTER' && nsfwRetries < MAX_NSFW_RETRIES) {
        nsfwRetries++;
        await delay(RETRY_DELAY_MS);
        continue;
      }
      if (message !== 'SENSITIVE_CONTENT_FILTER') throw error;
      if (variant === LAST_VARIANT) break;
      variant = (variant + 1) as 1 | 2;
      opts.onSensitiveRetry?.(variant, 'cardEditor.errors.aiSensitiveRetrying');
      await delay(RETRY_DELAY_MS);
    }
  }

  try {
    return await call({ model: 'flux' });
  } catch (error) {
    if (FATAL.has(messageOf(error))) throw error;
    throw new Error('SENSITIVE_PHOTO_NOT_SUPPORTED');
  }
}

const I18N_KEYS: Record<string, string> = {
  INSUFFICIENT_TOKENS: 'cardEditor.errors.aiInsufficientTokens',
  NOT_LOGGED_IN: 'cardEditor.errors.aiNotLoggedIn',
  RATE_LIMITED: 'cardEditor.errors.aiRateLimited',
  AI_TIMEOUT: 'cardEditor.errors.aiTimeout',
};

export function aiErrorToI18nKey(message: string): string {
  return I18N_KEYS[message] ?? 'cardEditor.errors.genericContactAdmin';
}
```

- [ ] **Step 4: correr y ver que pasa**

Run: `npm test`
Expected: `aiFallback.test.ts` en verde.

- [ ] **Step 5: adelgazar `src/services/AIService.ts`**

Reemplazar los métodos `callEdgeFunction` y `transformToLoteria` (y borrar el campo `MOCK_DELAY`) por lo siguiente. `urlToDataUri`, `getEstimation`, `STYLES`, `COST_PER_IMAGE`, `SENSITIVE_PHOTO_NOT_SUPPORTED` y `urlToBase64` quedan igual. Agregar el import `import { transformWithFallback } from './aiFallback';`.

```ts
    /**
     * Llama a la Edge Function transform-loteria. El servidor cobra el token
     * y lo devuelve si la transformación falla.
     */
    private static async callEdgeFunction(
        accessToken: string,
        imageBase64: string,
        params: { model: 'gpt-image' | 'flux'; prompt_variant?: 0 | 1 | 2; prompt_strength: number; set_id?: string }
    ): Promise<string> {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/transform-loteria`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ image: imageBase64, prompt_variant: 0, ...params }),
        });

        const body = await res.json().catch(() => ({}));
        if (res.ok && typeof body.output === 'string') return body.output;
        if (res.status === 401) throw new Error('NOT_LOGGED_IN');
        if (body.error === 'CONFIG_ERROR') throw new Error('AI_NOT_CONFIGURED');
        throw new Error(typeof body.error === 'string' ? body.error : 'AI_ERROR');
    }

    /**
     * Transforma una imagen al estilo Lotería. Lanza un Error cuyo message es un código
     * (NOT_LOGGED_IN, INSUFFICIENT_TOKENS, RATE_LIMITED, AI_TIMEOUT, AI_NOT_CONFIGURED,
     * NSFW_FILTER, SENSITIVE_PHOTO_NOT_SUPPORTED, AI_ERROR); nunca devuelve la imagen original.
     */
    static async transformToLoteria(
        request: TransformationRequest,
        userId?: string,
        callbacks?: TransformationCallbacks,
        setId?: string
    ): Promise<string> {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (!session?.access_token) throw new Error('NOT_LOGGED_IN');

        const imageBase64 = await this.urlToBase64(request.image, 768);
        const strength = request.prompt_strength ?? 0.5;

        try {
            return await transformWithFallback(
                (params) => this.callEdgeFunction(session.access_token, imageBase64, {
                    ...params,
                    prompt_strength: strength,
                    set_id: setId,
                }),
                {
                    useFluxFirst: import.meta.env.VITE_REPLICATE_USE_FLUX === 'true',
                    onSensitiveRetry: callbacks?.onSensitiveRetry,
                }
            );
        } finally {
            // El saldo pudo cambiar (cobro o reembolso): que la UI lo vuelva a pedir.
            if (userId) TokenRepository.invalidateBalance(userId);
        }
    }
```

- [ ] **Step 6: mostrar el motivo real en `CardEditor.tsx`**

En `handleSingleAI`, reemplazar el `catch` (líneas 246-251) por:

```tsx
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error ?? '');
      console.error('[CardEditor] fallo transformación individual:', errMsg);
      setAiErrorMessage(t(aiErrorToI18nKey(errMsg)));
      await updateCard(card.id, { isProcessing: false });
      refreshBalance();
    } finally {
```

Agregar el import `import { aiErrorToI18nKey } from '../../services/aiFallback';`.

En `runAIBatchTransformation`, dentro del `catch` y después del bloque `if (isSensitiveContent) { … }`, el código existente trata los demás errores como fallo del lote; localizar ahí la llamada `setAiBatchError(...)` y cambiar su argumento por `t(aiErrorToI18nKey(errMsg))`. Tras el `for`, asegurarse de que se llama `refreshBalance()` (agregarla si no está).

- [ ] **Step 7: textos nuevos**

En `src/locales/es/translation.json`, dentro del objeto `cardEditor.errors` (el que ya contiene `genericContactAdmin`):

```json
"aiInsufficientTokens": "No tienes tokens suficientes. Compra más para seguir usando la IA.",
"aiNotLoggedIn": "Inicia sesión para transformar imágenes con IA.",
"aiRateLimited": "Vas muy rápido. Espera un minuto e intenta de nuevo.",
"aiTimeout": "La IA tardó demasiado. No se te cobró el token; intenta de nuevo.",
```

En `src/locales/en/translation.json`, mismo objeto:

```json
"aiInsufficientTokens": "You don't have enough tokens. Buy more to keep using AI.",
"aiNotLoggedIn": "Sign in to transform images with AI.",
"aiRateLimited": "You're going too fast. Wait a minute and try again.",
"aiTimeout": "The AI took too long. Your token was not charged; please try again.",
```

- [ ] **Step 8: quitar los detalles internos en `PurchaseService.ts`**

Reemplazar las líneas 120-127 por:

```ts
      return {
        success: false,
        error: errorType,
        message: body?.message ?? 'Error al iniciar la compra. Intenta de nuevo.',
      };
```

y borrar `details: body?.details,` del `console.error` de la línea 118.

- [ ] **Step 9: verificar y commit**

Run: `npm run typecheck && npm run lint && npm run test:coverage`
Expected: todo en verde. `wc -l src/services/AIService.ts` debe dar menos de 200 líneas y `grep -n "spendTokens\|MOCK_DELAY\|return request.image" src/services/AIService.ts` no debe devolver nada.

```bash
git add src/services src/components/CardEditor/CardEditor.tsx src/locales tests/src
git commit -m "fix: remove client-side AI charging and fake success, surface real AI errors"
```

### Task 13: Códigos promocionales privados (M2)

**Files:**
- Create: `supabase/migrations/025_promotions_privacy.sql`, `supabase/tests/025_promotions.test.sql`
- Modify: `src/repositories/TokenPricingRepository.ts:105-141`, `src/components/BuyTokens/BuyTokensPage.tsx` (líneas 34, 73-83, 174-179, 296, 310-312)

**Interfaces:**
- Produces:
  - SQL `public.get_public_promo_summary() returns table (first_purchase_percent integer, has_code_promos boolean)` — ejecutable por `anon` y `authenticated`.
  - SQL `public.check_promo_code(p_code text) returns integer` — porcentaje (0 si no existe, no está vigente o el usuario ya lo usó); solo `authenticated`.
  - TS `TokenPricingRepository.getPromoSummary(): Promise<{ firstPurchasePercent: number; hasCodePromos: boolean }>`
  - TS `TokenPricingRepository.checkPromoCode(code: string): Promise<number>`
  - Se eliminan `TokenPricingRepository.getActivePromotions` y el tipo `ActivePromotion`.

- [ ] **Step 1: test que falla — `supabase/tests/025_promotions.test.sql`**

```sql
begin;
select plan(7);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000005', 'promo@test.dev');
insert into public.promotions (id, code, type, config, is_active)
values ('00000000-0000-0000-0000-0000000000aa', 'VERANO', 'code', '{"percent": 15}', true);
insert into public.promotions (code, type, config, is_active, valid_until)
values ('VENCIDO', 'code', '{"percent": 50}', true, now() - interval '1 day');

set local role anon;
select is((select count(*)::int from public.promotions), 0, 'anon no puede listar promociones');
select is((select first_purchase_percent from public.get_public_promo_summary()), 20, 'anon ve el % de primera compra');
select is((select has_code_promos from public.get_public_promo_summary()), true, 'anon sabe que hay códigos, sin verlos');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}';
select is(public.check_promo_code(' verano '), 15, 'código válido devuelve su porcentaje (sin importar mayúsculas/espacios)');
select is(public.check_promo_code('NOPE'), 0, 'código inexistente devuelve 0');
select is(public.check_promo_code('VENCIDO'), 0, 'código vencido devuelve 0');
reset role;

insert into public.token_purchases (user_id, base_tokens, bonus_tokens, total_tokens, amount_cents, payment_provider, payment_id, promotion_ids)
values ('00000000-0000-0000-0000-000000000005', 10, 1, 11, 2000, 'mercadopago', 'PAY-PROMO',
        array['00000000-0000-0000-0000-0000000000aa']::uuid[]);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}';
select is(public.check_promo_code('VERANO'), 0, 'un código ya usado por el usuario devuelve 0');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2: correr y ver que falla**

Run: `npm run test:db`
Expected: FAIL — `anon no puede listar promociones` recibe 3 y las funciones no existen.

- [ ] **Step 3: escribir `supabase/migrations/025_promotions_privacy.sql`**

```sql
-- Los códigos promocionales dejan de ser legibles con la anon key.

drop policy if exists "Anyone can read active promotions" on public.promotions;
drop policy if exists "Admins can read promotions" on public.promotions;
create policy "Admins can read promotions" on public.promotions
  for select using (public.is_admin());

create or replace function public.promo_percent(p_config jsonb)
returns integer
language sql
immutable
as $$
  select case
    when jsonb_typeof(p_config->'percent') = 'number'
     and (p_config->>'percent')::numeric between 1 and 100
    then round((p_config->>'percent')::numeric)::integer
    else 0
  end;
$$;

create or replace function public.get_public_promo_summary()
returns table (first_purchase_percent integer, has_code_promos boolean)
language sql
stable
security definer
set search_path = public
as $$
  with vigentes as (
    select type, public.promo_percent(config) as percent
    from public.promotions
    where is_active
      and (valid_from is null or valid_from <= now())
      and (valid_until is null or valid_until >= now())
  )
  select
    coalesce((select max(percent) from vigentes where type = 'first_purchase'), 0),
    exists (select 1 from vigentes where type = 'code' and percent > 0);
$$;

create or replace function public.check_promo_code(p_code text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.promo_percent(p.config)
    from public.promotions p
    where p.type = 'code'
      and upper(trim(p.code)) = upper(trim(p_code))
      and p.is_active
      and (p.valid_from is null or p.valid_from <= now())
      and (p.valid_until is null or p.valid_until >= now())
      and not exists (
        select 1 from public.token_purchases tp
        where tp.user_id = auth.uid() and p.id = any (tp.promotion_ids)
      )
    limit 1
  ), 0);
$$;

revoke all on function public.get_public_promo_summary() from public;
grant execute on function public.get_public_promo_summary() to anon, authenticated;
revoke all on function public.check_promo_code(text) from public, anon;
grant execute on function public.check_promo_code(text) to authenticated;
```

- [ ] **Step 4: aplicar y correr**

Run: `npx supabase db reset && npm run test:db`
Expected: los cuatro archivos de test en verde.

- [ ] **Step 5: `TokenPricingRepository.ts` — reemplazar `getActivePromotions` (líneas 105-141)**

Borrar el método `getActivePromotions` y la interfaz/tipo `ActivePromotion` del archivo, y agregar:

```ts
  /** Resumen público de promociones: nunca expone los códigos. */
  static async getPromoSummary(): Promise<{ firstPurchasePercent: number; hasCodePromos: boolean }> {
    const { data, error } = await supabase.rpc('get_public_promo_summary').maybeSingle();
    const row = data as { first_purchase_percent: number; has_code_promos: boolean } | null;
    if (error || !row) return { firstPurchasePercent: 0, hasCodePromos: false };
    return { firstPurchasePercent: row.first_purchase_percent, hasCodePromos: row.has_code_promos };
  }

  /** Porcentaje de bono de un código para el usuario actual; 0 si no aplica. */
  static async checkPromoCode(code: string): Promise<number> {
    const trimmed = code.trim();
    if (!trimmed) return 0;
    const { data, error } = await supabase.rpc('check_promo_code', { p_code: trimmed });
    if (error || typeof data !== 'number') return 0;
    return data;
  }
```

- [ ] **Step 6: `BuyTokensPage.tsx` — usar el resumen y validar el código en el servidor**

Línea 7: quitar `, type ActivePromotion` del import.

Línea 34: reemplazar `const [promotions, setPromotions] = useState<ActivePromotion[]>([]);` por:

```tsx
  const [promoSummary, setPromoSummary] = useState({ firstPurchasePercent: 0, hasCodePromos: false });
  const [codePromoPercent, setCodePromoPercent] = useState(0);
```

Líneas 73-83: en el `Promise.all`, cambiar `TokenPricingRepository.getActivePromotions()` por `TokenPricingRepository.getPromoSummary()` y `setPromotions(promos)` por `setPromoSummary(promos)`.

Líneas 174-179: reemplazar por:

```tsx
  const promoCodeTrimmed = promoCode.trim().toUpperCase();
  const firstPurchasePercent = isFirstPurchase ? promoSummary.firstPurchasePercent : 0;
  const appliedPromoPercent = codePromoPercent > 0 ? codePromoPercent : firstPurchasePercent;
```

Justo antes de ese bloque, agregar el efecto que valida el código con debounce:

```tsx
  useEffect(() => {
    const code = promoCode.trim();
    if (!code || !isLoggedIn) {
      setCodePromoPercent(0);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const percent = await TokenPricingRepository.checkPromoCode(code);
      if (!cancelled) setCodePromoPercent(percent);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [promoCode, isLoggedIn]);
```

Sustituciones en el JSX:
- Línea 248: `isLoggedIn && isFirstPurchase && firstPurchasePromo &&` → `isLoggedIn && firstPurchasePercent > 0 &&`; línea 251: `firstPurchasePromo.percent` → `firstPurchasePercent`.
- Línea 296: `codePromos.length > 0 && isLoggedIn` → `promoSummary.hasCodePromos && isLoggedIn`.
- Líneas 310-312: `codePromoApplied &&` → `codePromoPercent > 0 &&` y `codePromoApplied.percent` → `codePromoPercent`.
- Líneas 381-382: `codePromoApplied ? t('buyTokens.promoCodeBonus', { percent: codePromoApplied.percent })` → `codePromoPercent > 0 ? t('buyTokens.promoCodeBonus', { percent: codePromoPercent })`.

- [ ] **Step 7: verificar y commit**

Run: `npm run typecheck && npm run lint`
Expected: sin errores. `grep -rn "getActivePromotions\|ActivePromotion\|from('promotions')" src --include=*.ts --include=*.tsx | grep -v AdminRepository` → sin salida.

```bash
git add supabase/migrations/025_promotions_privacy.sql supabase/tests/025_promotions.test.sql src/repositories/TokenPricingRepository.ts src/components/BuyTokens/BuyTokensPage.tsx
git commit -m "fix: stop exposing promo codes to anonymous clients"
```

### Task 14: Avatar por ruta en vez de URL firmada de un año (M7)

**Files:**
- Create: `src/utils/avatar.ts`, `tests/src/avatar.test.ts`, `src/hooks/useAvatarUrl.ts`
- Modify: `src/contexts/AuthContext.tsx` (líneas 21-24, 35, 133-159), `src/components/Dashboard/Dashboard.tsx` (156-157, 211-216), `src/components/Navbar/Navbar.tsx` (109-110)

**Interfaces:**
- Produces:
  - `type AvatarSource = { kind: 'path'; path: string } | { kind: 'url'; url: string } | null`
  - `resolveAvatarSource(metadata: Record<string, unknown> | undefined): AvatarSource`
  - `useAvatarUrl(user: User | null): string | null`
  - `AuthContext.uploadAvatar(file: File): Promise<string>` ahora devuelve la **ruta** en el bucket.
  - `AuthContext.updateProfile(updates: { fullName?: string; avatarPath?: string }): Promise<void>` (`avatarUrl` se renombra a `avatarPath`).

- [ ] **Step 1: test que falla — `tests/src/avatar.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { resolveAvatarSource } from '../../src/utils/avatar';

describe('resolveAvatarSource', () => {
  it('prefiere avatar_path', () => {
    expect(resolveAvatarSource({ avatar_path: 'u1/avatar.png', avatar_url: 'https://lh3.googleusercontent.com/a' }))
      .toEqual({ kind: 'path', path: 'u1/avatar.png' });
  });

  it('extrae la ruta de una URL firmada antigua del bucket card-images', () => {
    const legacy = 'https://x.supabase.co/storage/v1/object/sign/card-images/u1/avatar.webp?token=abc';
    expect(resolveAvatarSource({ avatar_url: legacy })).toEqual({ kind: 'path', path: 'u1/avatar.webp' });
  });

  it('usa tal cual una URL externa (p. ej. foto de Google)', () => {
    expect(resolveAvatarSource({ avatar_url: 'https://lh3.googleusercontent.com/a' }))
      .toEqual({ kind: 'url', url: 'https://lh3.googleusercontent.com/a' });
  });

  it.each([
    ['sin metadata', undefined],
    ['metadata vacía', {}],
    ['valores no string', { avatar_path: 42, avatar_url: null }],
    ['strings vacíos', { avatar_path: '', avatar_url: '' }],
  ])('devuelve null: %s', (_name, metadata) => {
    expect(resolveAvatarSource(metadata as Record<string, unknown> | undefined)).toBe(null);
  });
});
```

- [ ] **Step 2: correr y ver que falla**

Run: `npm test`
Expected: FAIL — no se resuelve `src/utils/avatar`.

- [ ] **Step 3: implementar `src/utils/avatar.ts`**

```ts
export const AVATAR_BUCKET = 'card-images';

export type AvatarSource = { kind: 'path'; path: string } | { kind: 'url'; url: string } | null;

const LEGACY_SIGNED_URL_RE = new RegExp(`/storage/v1/object/sign/${AVATAR_BUCKET}/([^?]+)`);

/**
 * De dónde sale el avatar de un usuario:
 * - avatar_path: ruta en el bucket privado (se firma al mostrar)
 * - avatar_url firmada antigua de este bucket: se extrae su ruta para volver a firmarla
 * - avatar_url externa (Google OAuth): se usa directamente
 */
export function resolveAvatarSource(metadata: Record<string, unknown> | undefined): AvatarSource {
  const path = metadata?.avatar_path;
  if (typeof path === 'string' && path.length > 0) return { kind: 'path', path };

  const url = metadata?.avatar_url;
  if (typeof url !== 'string' || url.length === 0) return null;

  const legacy = url.match(LEGACY_SIGNED_URL_RE);
  if (legacy) return { kind: 'path', path: decodeURIComponent(legacy[1]) };

  return { kind: 'url', url };
}
```

- [ ] **Step 4: correr y ver que pasa**

Run: `npm test`
Expected: `avatar.test.ts` en verde.

- [ ] **Step 5: crear `src/hooks/useAvatarUrl.ts`**

```ts
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { AVATAR_BUCKET, resolveAvatarSource } from '../utils/avatar';

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora; se renueva en cada montaje

/** URL lista para <img> del avatar del usuario, o null si no tiene. */
export function useAvatarUrl(user: User | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const source = resolveAvatarSource(user?.user_metadata);
  const sourceKey = source ? `${source.kind}:${source.kind === 'path' ? source.path : source.url}` : '';
  const version = user?.updated_at ?? '';

  useEffect(() => {
    if (!source) {
      setUrl(null);
      return;
    }
    if (source.kind === 'url') {
      setUrl(source.url);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(source.path, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('No se pudo firmar la URL del avatar:', error.message);
        setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
    // sourceKey resume `source`; version cambia cuando el usuario sube un avatar nuevo con la misma ruta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, version]);

  return url;
}
```

(Único `eslint-disable` del plan: `source` es un objeto nuevo en cada render y `sourceKey` es su identidad estable.)

- [ ] **Step 6: `AuthContext.tsx`**

Líneas 21-24, en la interfaz del contexto:

```ts
    /** Actualiza full_name y/o avatar_path en user_metadata. */
    updateProfile: (updates: { fullName?: string; avatarPath?: string }) => Promise<void>;
    /** Sube el avatar y devuelve su ruta en el bucket. */
    uploadAvatar: (file: File) => Promise<string>;
```

Borrar la constante `ONE_YEAR_IN_SECONDS` (línea 35). Reemplazar `updateProfile` y `uploadAvatar` (líneas 133-159) por:

```ts
    const updateProfile = async (updates: { fullName?: string; avatarPath?: string }): Promise<void> => {
        if (updates.fullName === undefined && updates.avatarPath === undefined) return;
        const data: Record<string, string> = {};
        if (updates.fullName !== undefined) data.full_name = updates.fullName;
        if (updates.avatarPath !== undefined) data.avatar_path = updates.avatarPath;
        const { data: result, error } = await supabase.auth.updateUser({ data });
        if (error) throw error;
        if (result.user) setUser(result.user);
    };

    const uploadAvatar = async (file: File): Promise<string> => {
        if (!user) throw new Error('NOT_LOGGED_IN');
        const ext = ALLOWED_AVATAR_TYPES[file.type];
        if (!ext) throw new Error('INVALID_FILE_TYPE');
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;
        return path;
    };
```

Agregar `import { AVATAR_BUCKET } from '../utils/avatar';`.

- [ ] **Step 7: consumidores**

`Dashboard.tsx`: agregar `import { useAvatarUrl } from '../../hooks/useAvatarUrl';` y, junto a los demás hooks del componente, `const avatarUrl = useAvatarUrl(user);`. Líneas 156-157:

```tsx
      const avatarPath = await uploadAvatar(file);
      await updateProfile({ avatarPath });
```

Líneas 211-216: `user.user_metadata?.avatar_url ?` → `avatarUrl ?` y `src={user.user_metadata.avatar_url}` → `src={avatarUrl}`.

`Navbar.tsx`: mismo import (`'../../hooks/useAvatarUrl'`) y `const avatarUrl = useAvatarUrl(user);`. Líneas 109-110: `user.user_metadata?.avatar_url ?` → `avatarUrl ?` y `src={user.user_metadata.avatar_url}` → `src={avatarUrl}`.

- [ ] **Step 8: verificar y commit**

Run: `npm run typecheck && npm run lint && npm run test:coverage`
Expected: verde. `grep -rn "user_metadata.avatar_url\|avatarUrl:" src` → sin salida.

```bash
git add src/utils/avatar.ts src/hooks/useAvatarUrl.ts src/contexts/AuthContext.tsx src/components/Dashboard/Dashboard.tsx src/components/Navbar/Navbar.tsx tests/src/avatar.test.ts
git commit -m "fix: store avatar path and sign URLs on demand instead of year-long signed URLs"
```

### Task 15: Configuración, despliegue y verificación de punta a punta

**Files:**
- Modify: `.env.example`, `docs/ENTORNOS_DEV_PROD.md`, `supabase/config.toml`, `package.json` (script `deploy:functions:all`)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: entornos dev y prod con las migraciones 022–025, secrets nuevos y las 4 funciones desplegadas.

- [ ] **Step 1: documentar los secrets nuevos en `.env.example`**

Reemplazar el bloque final ("SECRETS EN SUPABASE …") por:

```
# -----------------------------------------------------------------------------
# SECRETS EN SUPABASE (NO en .env del frontend)
# Configurar en cada proyecto: npx supabase secrets set NOMBRE=valor
#
# MERCADOPAGO_ACCESS_TOKEN     DEV: credenciales de prueba · PROD: credenciales de producción
# MERCADOPAGO_WEBHOOK_SECRET   "Secret signature" de Webhooks en el panel de Mercado Pago
# MP_USE_SANDBOX_CHECKOUT      DEV: true · PROD: no definir (producción es el default)
# ALLOWED_ORIGINS              Orígenes del frontend separados por coma, sin diagonal final
#                              DEV:  http://localhost:5173,https://tu-ngrok.ngrok-free.dev
#                              PROD: https://chorroybuenas.com.mx,https://www.chorroybuenas.com.mx
# APP_URL                      URL de retorno por default (PROD: https://chorroybuenas.com.mx)
# SERVICE_ROLE_KEY             service_role key del proyecto
# REPLICATE_API_TOKEN          token de Replicate
#
# Ya no se usa: MP_USE_PRODUCTION_CHECKOUT
# -----------------------------------------------------------------------------
```

Copiar la misma tabla de secrets a la sección de secrets de `docs/ENTORNOS_DEV_PROD.md`, reemplazando cualquier mención de `MP_USE_PRODUCTION_CHECKOUT`.

- [ ] **Step 2: `verify_jwt` y script de deploy**

`transform-loteria` y `create-payment-preference` validan el JWT a mano con `auth.getUser`, así que `verify_jwt = false` se queda como está. Agregar a `supabase/config.toml` las dos funciones que faltan para que la configuración sea explícita:

```toml
[functions.create-payment-preference]
verify_jwt = false

[functions.credit-payment-on-return]
verify_jwt = false
```

En `package.json`, reemplazar el script `deploy:functions:all` por:

```json
"deploy:functions:all": "npx supabase functions deploy create-payment-preference && npx supabase functions deploy webhook-mercadopago && npx supabase functions deploy credit-payment-on-return && npx supabase functions deploy transform-loteria",
```

- [ ] **Step 3: commit**

```bash
git add .env.example docs/ENTORNOS_DEV_PROD.md supabase/config.toml package.json
git commit -m "docs: document new function secrets and explicit function config"
```

- [ ] **Step 4 (manual): desplegar en DEV, en este orden**

Requiere confirmación de Carlos antes de ejecutar; cada comando modifica un entorno real.

```bash
# 1. Consultas previas del Task 3 Step 5 y Task 4 Step 5 en el SQL Editor de DEV
# 2. Migraciones
npx supabase link --project-ref <REF-DEV>
npx supabase db push
# 3. Secrets
npx supabase secrets set MP_USE_SANDBOX_CHECKOUT=true \
  ALLOWED_ORIGINS=http://localhost:5173,https://<tu-ngrok>.ngrok-free.dev \
  MERCADOPAGO_WEBHOOK_SECRET=<secret del panel de MP, app de prueba>
npx supabase secrets unset MP_USE_PRODUCTION_CHECKOUT
# 4. Funciones
npm run deploy:functions:all
# 5. Frontend local
npm run dev
```

El orden importa: con las migraciones y funciones nuevas pero el frontend viejo todavía en caché de algún navegador, ese cliente llama a `spend_tokens` (ya eliminada), su error se ignora y no hay doble cobro porque la función ya cobró.

- [ ] **Step 5 (manual): pruebas de punta a punta en DEV**

Marcar cada una solo si el resultado coincide:

1. **Usuario nuevo** → registrarse; el saldo mostrado es el de `app_config.initial_tokens`.
2. **IA con saldo** → transformar una carta; el saldo baja en 1 y hay una fila nueva en `token_usage`.
3. **IA sin saldo** → con saldo 0, transformar; aparece "No tienes tokens suficientes" y no se llama a Replicate (sin fila nueva en `token_usage`).
4. **Llamada directa sin saldo** → con el JWT de un usuario en 0:
   `curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/transform-loteria" -H "Authorization: Bearer $JWT" -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"image":"data:image/png;base64,iVBORw0KGgo="}'`
   Expected: HTTP 402 `{"error":"INSUFFICIENT_TOKENS",…}`.
5. **Imagen inválida** → mismo curl con `"image":"https://example.com/a.jpg"`. Expected: HTTP 400 y el saldo no cambia.
6. **RPC eliminada** → desde la consola del navegador con sesión: `await supabase.rpc('spend_tokens', { p_amount: 1 })`. Expected: error "Could not find the function".
7. **Compra con pack** → pagar con tarjeta de prueba; al volver, el saldo sube exactamente `base + bonus (+ promo)` y hay **una** fila en `token_purchases` para ese `payment_id`, aunque lleguen webhook y retorno.
8. **Reenvío de webhook** → en el panel de MP, reenviar la notificación de ese pago. Expected: el saldo no cambia.
9. **Código promocional en segunda compra** → crear un código de 15 % en Admin, comprar con él desde un usuario que ya compró; se acredita el bono. Intentar usar el mismo código otra vez: la página ya no muestra "aplicado" y no se acredita bono.
10. **`custom_tokens` inválido** → curl a `create-payment-preference` con `{"custom_tokens":1.5}`. Expected: HTTP 400.
11. **CORS** → curl con `-H "Origin: https://evil.test"` a cualquier función; el header `Access-Control-Allow-Origin` de la respuesta no es `https://evil.test` ni `*`.
12. **Códigos ocultos** → `curl "$VITE_SUPABASE_URL/rest/v1/promotions?select=*" -H "apikey: $VITE_SUPABASE_ANON_KEY"`. Expected: `[]`.
13. **Avatar** → subir un avatar; se ve en Dashboard y Navbar, y `user_metadata` tiene `avatar_path` (no una URL firmada nueva). Un usuario de Google sigue viendo su foto.

- [ ] **Step 6 (manual): desplegar en PROD**

Mismos pasos que el Step 4 con `<REF-PROD>`, sin `MP_USE_SANDBOX_CHECKOUT`, con `ALLOWED_ORIGINS=https://chorroybuenas.com.mx,https://www.chorroybuenas.com.mx` y el `MERCADOPAGO_WEBHOOK_SECRET` de la app productiva. El frontend se despliega al hacer merge del PR a `main`. Repetir las pruebas 1, 2, 4, 6, 11 y 12 en producción, y la 7 con una compra real mínima.

---

# Fase 5 — LOW

### Task 16: Logger en lugar de `console.*` (L1)

**Files:**
- Create: `src/utils/logger.ts`
- Modify: los 24 archivos de `src/` con `console.*`, `.eslintrc.cjs`

**Interfaces:**
- Produces: `logger.warn(...args: unknown[]): void` (silencioso en producción), `logger.error(...args: unknown[]): void`.

- [ ] **Step 1: crear `src/utils/logger.ts`**

```ts
/* eslint-disable no-console -- único punto del frontend autorizado a escribir en consola */
const isProduction = import.meta.env.PROD;

/** Registro del frontend: los avisos solo aparecen en desarrollo; los errores siempre. */
export const logger = {
  warn: (...args: unknown[]): void => {
    if (!isProduction) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
```

- [ ] **Step 2: activar la regla** — en `.eslintrc.cjs`, cambiar `'no-console': 'off'` por `'no-console': 'error'` y agregar al arreglo `overrides`:

```js
    { files: ['supabase/functions/**/*.ts', 'vite.config.ts'], rules: { 'no-console': 'off' } },
```

(En las edge functions `console.error` es el log del servidor, que es lo correcto.)

- [ ] **Step 3: reemplazo mecánico**

```bash
grep -rlE 'console\.(warn|error|log|info|debug)\(' src --include=*.ts --include=*.tsx \
  | grep -v 'src/utils/logger.ts' \
  | xargs sed -i -E 's/console\.(warn|info|log|debug)\(/logger.warn(/g; s/console\.error\(/logger.error(/g'
```

- [ ] **Step 4: agregar los imports que falten**

Run: `npm run typecheck`
Expected: un error `Cannot find name 'logger'` por archivo modificado. En cada uno agregar el import con su ruta relativa a `src/utils/logger`: `'../utils/logger'` desde `src/services`, `src/hooks`, `src/repositories`, `src/contexts`; `'./logger'` desde `src/utils`; `'./utils/logger'` desde `src/AppRouter.tsx`; `'../../utils/logger'` desde `src/components/*/`.

```ts
import { logger } from '../utils/logger';
```

Repetir hasta que `npm run typecheck` y `npm run lint` pasen.

- [ ] **Step 5: commit**

```bash
git add src .eslintrc.cjs
git commit -m "refactor: route frontend logging through a logger and forbid console usage"
```

### Task 17: Eliminar `any` (L2)

**Files:**
- Create: `src/utils/errors.ts`
- Modify: `.eslintrc.cjs`, `src/repositories/BoardRepository.ts:71-79`, `src/components/Auth/SetNewPasswordModal.tsx:36`, `src/components/Auth/EmailAuthModal.tsx:55,83`, `src/components/BoardGenerator/GridModeSelector.tsx:9`, `src/services/PDFService.ts:237,298,436,438,464`, `src/components/CardEditor/CardUpload.tsx:160`

**Interfaces:**
- Produces: `getErrorMessage(error: unknown): string`.

- [ ] **Step 1: crear `src/utils/errors.ts`**

```ts
/** Mensaje legible de un valor capturado en un catch. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error ?? '');
}
```

- [ ] **Step 2: activar la regla** — en `.eslintrc.cjs`, cambiar `'@typescript-eslint/no-explicit-any': 'off'` por `'error'`. `npm run lint` lista los usos restantes (los de `AIService.ts` y `CardEditor.tsx:246` ya desaparecieron en el Task 12).

- [ ] **Step 3: corregir cada sitio**

- **`catch (err: any)`** en `SetNewPasswordModal.tsx:36` y `EmailAuthModal.tsx:55,83`: cambiar a `catch (err: unknown)` y, dentro del bloque, sustituir cada `err.message` / `err?.message` por `getErrorMessage(err)` (importando `getErrorMessage` desde `'../../utils/errors'`).
- **`GridModeSelector.tsx:9`**: `t?: any;` → `t?: TFunction;` con `import type { TFunction } from 'i18next';`.
- **`PDFService.ts`**: agregar `PDFImage` y `PDFPage` al import existente de `pdf-lib`. Líneas 237, 436 y 438: `image: any` → `image: PDFImage`. Líneas 298 y 464: `page: any` → `page: PDFPage`.
- **`CardUpload.tsx:160`**: `handleSubmit(e as any)` — cambiar la firma de `handleSubmit` para aceptar `React.FormEvent | React.KeyboardEvent` (solo usa `e.preventDefault()`), y llamar `handleSubmit(e)`.
- **`BoardRepository.ts:71-79`**: declarar el tipo de la fila encima de la clase y usarlo en lugar de `any`:

```ts
interface BoardCardRow {
    position: number;
    cards: {
        id: string;
        title: string;
        image_path: string | null;
        original_image_path: string | null;
        is_ai_generated: boolean;
    } | null;
}
```

Línea 71: `(board.board_cards as unknown as BoardCardRow[]).map((bc) => bc.cards?.image_path).filter(Boolean)`. Líneas 78-79: tomar `const rows = board.board_cards as unknown as BoardCardRow[];`, ordenar con `[...rows].sort((a, b) => a.position - b.position)` y filtrar las filas sin carta antes del `map`: `.filter((bc): bc is BoardCardRow & { cards: NonNullable<BoardCardRow['cards']> } => bc.cards !== null)`.

- [ ] **Step 4: verificar y commit**

Run: `npm run typecheck && npm run lint && npm test`
Expected: verde. `grep -rn ': any\|as any' src` → sin salida.

```bash
git add src .eslintrc.cjs
git commit -m "refactor: replace any with concrete types"
```

### Task 18: Partir los archivos al borde del límite (L3)

Son movimientos de código sin cambio de comportamiento. No hay tests de UI, así que la verificación es `typecheck` + `lint` + `build` + una prueba manual por archivo. Un commit por archivo, para poder revertirlos por separado.

**Files:**
- Create: `src/services/pdf/constants.ts`, `src/services/pdf/images.ts`, `src/services/pdf/draw.ts`, `src/components/CardEditor/useCardAI.ts`, `src/components/Dashboard/useProfileEditing.ts`
- Modify: `src/services/PDFService.ts`, `src/components/CardEditor/CardEditor.tsx`, `src/components/Dashboard/Dashboard.tsx`

**Interfaces:**
- Produces: la API pública de `PDFService.ts` no cambia (`generatePDF`, `downloadPDF`, `generateCardPDF`, `GeneratePDFOptions`); `CardEditor` y `Dashboard` conservan sus props.

- [ ] **Step 1: `PDFService.ts` (791 líneas) → 4 archivos**

Mover, anteponiendo `export` a cada declaración movida y agregando en cada archivo nuevo los imports de `pdf-lib` y `../../types` que use:

| Destino | Líneas actuales de `PDFService.ts` | Contenido |
|---|---|---|
| `src/services/pdf/constants.ts` | 19-52 | `cmToPoints` y todas las constantes `*_PT` / `*_CM` |
| `src/services/pdf/images.ts` | 54-58 y 115-295 | `ImageData`, `urlToBase64`, `blobURLToBase64`, `dataURLToPngBytes`, `loadImageAsUint8Array`, `EmbedResult`, `embedImageInPDF` |
| `src/services/pdf/draw.ts` | 60-113 y 297-566 | `getTitleFont`, `normalizeTitle`, `fitTextToWidth`, `drawCardOnPage`, caché y `getLogoImage`, `drawBoardOnPage` |

`PDFService.ts` conserva las líneas 568-791 (`GeneratePDFOptions`, `generatePDF`, `downloadPDF`, `generateCardPDF`) e importa lo que necesite de los tres módulos. Si `draw.ts` importa el logo con ruta relativa (`../img/logo.png`), ajustarla a `../../img/logo.png`.

Run: `npm run typecheck && npm run lint && npm run build && wc -l src/services/PDFService.ts src/services/pdf/*.ts`
Expected: sin errores; ningún archivo supera 400 líneas.
Prueba manual: generar un PDF de tableros y uno de carta individual; compararlos visualmente con uno generado desde `main`.

```bash
git add src/services
git commit -m "refactor: split PDFService into constants, image and drawing modules"
```

- [ ] **Step 2: `CardEditor.tsx` (790 líneas) → extraer `useCardAI`**

Crear `src/components/CardEditor/useCardAI.ts` con un hook que contenga, movidos tal cual desde `CardEditor.tsx`: los `useState` de IA (`transformingCardId`, `aiErrorMessage`, `aiBatchStatus`, `aiBatchTotalCount`, `aiBatchSkippedCount`, `aiBatchError`, `aiBatchCurrentIndex`, `aiBatchCurrentTitle`) y las funciones `handleSingleAI` (217-255), `runAIBatchTransformation` (257-319), `handleAIStart` (321-343) y `handleAIBulkClick` (385 en adelante). Firma:

```ts
export function useCardAI(deps: {
  cards: Card[];
  updateCard: (id: string, changes: Partial<Card>) => Promise<void>;
  userId: string | undefined;
  currentSetId: string | null;
  refreshBalance: () => Promise<void>;
  t: TFunction;
})
```

El hook devuelve un objeto con todos los estados y funciones movidos. Si alguna función movida usa otro estado o setter de `CardEditor` que no está en `deps` (lo reporta `npm run typecheck` como `Cannot find name`), agregarlo a `deps` con su tipo real; no duplicar estado. En `CardEditor.tsx`, sustituir lo movido por `const ai = useCardAI({ … });` y cambiar las referencias del JSX a `ai.<nombre>`.

Run: `npm run typecheck && npm run lint && npm run build && wc -l src/components/CardEditor/CardEditor.tsx`
Expected: sin errores; `CardEditor.tsx` por debajo de 600 líneas.
Prueba manual: transformar una carta, y un lote de 3 con una imagen que dispare el filtro de contenido.

```bash
git add src/components/CardEditor
git commit -m "refactor: extract AI transformation logic from CardEditor into useCardAI"
```

- [ ] **Step 3: `Dashboard.tsx` (731 líneas) → extraer `useProfileEditing`**

Crear `src/components/Dashboard/useProfileEditing.ts` con, movidos tal cual: `avatarInputRef`, los estados `isUploadingAvatar`, `isSavingName`, `nameValue` y el estado de "editando nombre", y las funciones `handleAvatarClick` (149), `handleAvatarChange` (151-165), `handleNameSave` (167-180) y `handleNameEditStart` (182 en adelante, hasta el final de los handlers de nombre). Firma:

```ts
export function useProfileEditing(deps: {
  user: User | null;
  updateProfile: (updates: { fullName?: string; avatarPath?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  t: TFunction;
})
```

Devuelve los refs, estados y handlers movidos. En `Dashboard.tsx`: `const profile = useProfileEditing({ user, updateProfile, uploadAvatar, t });` y referencias del JSX a `profile.<nombre>`.

Run: `npm run typecheck && npm run lint && npm run build && wc -l src/components/Dashboard/Dashboard.tsx`
Expected: sin errores; `Dashboard.tsx` por debajo de 680 líneas.
Prueba manual: cambiar nombre y avatar desde el Dashboard.

```bash
git add src/components/Dashboard
git commit -m "refactor: extract profile editing logic from Dashboard into useProfileEditing"
```

---

## Cierre

- [ ] Correr todo: `npm run typecheck && npm run lint && npm run test:coverage && npm run test:db && npm run build` — todo en verde.
- [ ] Abrir PR de `fix/code-review-remediation` a `main` con la tabla de Findings como descripción y la lista de pruebas del Task 15 Step 5 como test plan.
- [ ] Desplegar PROD (Task 15 Step 6) al hacer merge.
