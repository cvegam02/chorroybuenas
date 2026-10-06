# Pendientes

Lista de trabajo abierta después de la remediación del code review y del paso a Vercel (2026-10-06). Pensada para retomar en una sesión nueva sin contexto previo.

## Cómo está todo hoy

- **Producción:** `chorroybuenas.com.mx` lo sirve Vercel (rama `main`) contra el proyecto de Supabase PROD (`bdruzgjboxalpywljemk`). Backend desplegado el 2026-10-06: migraciones 022–025 y las 4 edge functions.
- **Dev:** `dev.chorroybuenas.com.mx` lo sirve Vercel (rama `dev`, entorno Preview) contra Supabase DEV (`vjglrfofyzvyvaetakpu`). Mismo backend.
- **Validado con servicios reales:** en PROD, una transformación de IA (1 token cobrado) y una compra real de $10.00 MXN (5 tokens, una sola acreditación con 4 notificaciones). En DEV, lo mismo con credenciales de prueba.
- **Documentos de referencia:**
  - Plan y decisiones tomadas: `docs/superpowers/plans/2026-10-06-code-review-remediation.md` (sección "Rulings").
  - Backlog por historias: `docs/features/` (13 features; cada historia lleva su estado).
  - Despliegue del frontend: `docs/VERCEL_DEPLOY.md`.
  - Secrets y orden de despliegue del backend: `docs/ENTORNOS_DEV_PROD.md` (secciones 4 y 10).

## Flujo de trabajo

La regla completa está en [`CLAUDE.md`](../CLAUDE.md), sección «Ramas: feature → dev → main». En corto:

1. Rama `feature/<nombre>` desde `dev`. Nunca se trabaja directo en `dev` ni en `main`.
2. Cuando está funcional, PR hacia `dev` → Vercel publica en `dev.chorroybuenas.com.mx`. Probar ahí.
3. Si el cambio toca migraciones o edge functions, desplegarlas primero en DEV y, tras probar, en PROD **antes** de fusionar a `main`.
4. Con lo probado y confirmado por Carlos, PR de `dev` a `main` → Vercel publica en producción.

Antes de cualquier PR, en local: `npm run verify && npm run test:db`.

## Pendientes de Carlos (manuales)

- [ ] **Desactivar GitHub Pages.** Sigue activo y con el dominio personalizado configurado. GitHub → Settings → Pages: quitar el dominio y desactivar.
- [ ] **Borrar los secrets `VITE_*` de GitHub Actions** (Settings → Secrets and variables → Actions). Ya no se usan: el CI no despliega.
- [ ] **Revisar los logs de Supabase** (Auth y Postgres, proyecto DEV) por el tiempo en que el access token anterior estuvo expuesto en el repo público: del commit `186f6fb` hasta su revocación el 2026-10-06. GitHub lo había alertado el 2026-04-21. Si aparece actividad desconocida, rotar `SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` y `REPLICATE_API_TOKEN` de ese proyecto.
- [ ] **Confirmar la regla de negocio de los códigos promocionales:** hoy cada usuario puede usar un código una sola vez, y el código aplica en cualquier compra (no solo la primera). La decidió el asistente; falta el visto bueno.
- [ ] **Decidir si se borran los respaldos** de `../respaldo-supabase-2026-10-06/` (fuera del repo). Contienen identificadores de usuario y saldos previos al despliegue.
- [ ] **Probar en el navegador** lo que solo se verificó con typecheck y build: subir un avatar (y que se actualice sin recargar), login con Google en `www.chorroybuenas.com.mx`, un PDF de tableros y uno de carta comparados con los de antes, y la transformación por lote con una foto que dispare el filtro de contenido.

## Pendientes de código

> Desde el 2026-10-06 el trabajo de código se sigue en [`plan-fases.md`](plan-fases.md) y [`fases/`](fases/). Los puntos 1 y 2 de esta lista son ahora la fase 1; el punto 3 es parte de la fase 2. Las reglas de negocio de cada uno están en [`contexto-negocio.md`](contexto-negocio.md).

Cada uno entra por `dev`, con tests primero.

### 1. Mínimo de compra de tokens

- **Problema:** la página deja comprar desde 1 token ($2.00 MXN). Mercado Pago no acepta ese monto: el checkout abre con el botón de pagar deshabilitado. Comprobado el 2026-10-06: $2.00 no se pudo pagar; $10.00 sí.
- **Propuesta:** mínimo de 5 tokens ($10.00), validado en la página y en el servidor, con un mensaje claro. El valor exacto lo decide Carlos.
- **Dónde:** `MIN_CUSTOM_TOKENS` en `supabase/functions/_shared/validation.ts` (y su test `tests/functions/preferenceRequest.test.ts`), `CUSTOM_MIN` en `src/components/BuyTokens/BuyTokensPage.tsx`, y los textos en `src/locales/{es,en}/translation.json`.
- **Despliegue:** función `create-payment-preference` en DEV y PROD, además del frontend.

### 2. Acreditar al volver del pago

- **Problema:** al regresar de Mercado Pago, la página solo refresca el saldo. Quien acredita es el webhook, así que el usuario puede ver "pago exitoso" con el saldo viejo durante unos segundos, o indefinidamente si el webhook falla.
- **Propuesta:** que `BuyTokensPage`, al volver con `?success=1&payment_id=…`, llame a la edge function `credit-payment-on-return` (ya desplegada y probada con sesión) y luego refresque el saldo. Es seguro: la acreditación es idempotente.
- **Dónde:** efecto de retorno en `src/components/BuyTokens/BuyTokensPage.tsx` (parámetros `success` y `payment_id`) y una función nueva en `src/services/PurchaseService.ts`. La función responde `{ credited, reason?, new_balance? }`.
- **Ojo:** la función valida el JWT ella misma; hay que enviar `Authorization: Bearer <access_token>` y `apikey`.

### 3. Reembolsos y contracargos

- **Problema:** si se devuelve un pago en Mercado Pago, o el banco lo revierte, los tokens no se descuentan. Hoy hay que hacerlo a mano.
- **Propuesta:** que el webhook atienda los pagos en estado `refunded` y `charged_back`: registrar la reversa y descontar los tokens (sin dejar el saldo negativo). Requiere decidir qué pasa si el usuario ya los gastó.
- **Dónde:** `supabase/functions/_shared/paymentFlow.ts`, una RPC nueva en una migración `026`, y sus tests.

### 4. Bajar el tamaño de dos componentes (opcional)

- `src/components/CardEditor/CardEditor.tsx` quedó en 667 líneas (meta: menos de 600) y `src/components/Dashboard/Dashboard.tsx` en 709 (meta: menos de 680). Ambos bajo el límite de 800. Para bajar más hay que extraer JSX: los modales de `CardEditor` y la lista de loterías de `Dashboard`.

### 5. Limitación conocida de los códigos promocionales

- Si un usuario abre dos checkouts con el mismo código antes de pagar y paga los dos, ambos reciben el bono: el uso se registra al acreditar, no al crear la preferencia. Arreglarlo implica reservar el código al crear la preferencia.

## Limpieza de configuración

- [ ] **Borrar el secret `MP_USE_PRODUCTION_CHECKOUT`** en DEV y PROD. Ya ningún código lo lee.
  `npx supabase secrets unset --project-ref <REF> MP_USE_PRODUCTION_CHECKOUT`
- [ ] **Configurar `MERCADOPAGO_WEBHOOK_SECRET`** en DEV y PROD (la "clave secreta" de Webhooks del panel de Mercado Pago de cada aplicación). Sin él todo funciona, pero no se verifica la firma `x-signature` de las notificaciones. Tras configurarlo, hacer un pago de prueba en DEV: si la firma no coincide, el webhook responde 401.
- [ ] **Registrar el historial de migraciones en DEV.** Esa base se creó a mano y no tiene la tabla `supabase_migrations.schema_migrations`, así que `supabase db push` intentaría correr las 26 migraciones. PROD sí la tiene, con las 26 registradas. Opción: `supabase migration repair --status applied 000 … 025` contra DEV (pide la contraseña de la base).
- [ ] **Cerrar la alerta #1 de secret scanning en GitHub** ("Supabase Personal Access Token" en `.env.example`) como revocada. El token ya no autentica.
- [ ] **Protección de rama en `main`:** exigir el check `verify` de GitHub Actions para poder fusionar. Hoy Vercel solo corre typecheck, lint y tests unitarios; los tests de base de datos solo corren en Actions.
- [ ] **`www`:** hoy `www.chorroybuenas.com.mx` sirve el sitio directamente. En Vercel → Domains se puede configurar para que redirija al dominio sin `www`, como hacía antes.
- [ ] **Protección de despliegues en Vercel:** `dev.chorroybuenas.com.mx` pide iniciar sesión en Vercel. Si alguien sin cuenta de Vercel debe probar ahí, cambiarlo en Settings → Deployment Protection.
- [ ] **Notificaciones viejas de Mercado Pago en DEV:** las de los intentos hechos con las credenciales anteriores (órdenes `45032485839` y `45063391400`) siguen llegando y el webhook responde 500 con "Caller id must be the same as collector id". No tienen efecto y dejan de llegar solas.

## Cosas que conviene saber antes de tocar algo

- **Tokens de acceso de Supabase:** están en `.env` (ignorado por git) como `SUPABASE_ACCESS_TOKEN` (cuenta de DEV) y `SUPABASE_ACCESS_TOKEN_PROD` (cuenta de PROD). Son cuentas distintas: cada token solo ve su proyecto. No van en Vercel.
- **Aplicar migraciones:** no usar `supabase db push` contra DEV (ver arriba). El 2026-10-06 se aplicaron una por una por la Management API (`POST /v1/projects/<ref>/database/query`), cada una dentro de `begin; … commit;`, y en PROD se registraron después en el historial.
- **Desplegar funciones:** con `--use-api`, que no necesita Docker:
  `SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy <nombre> --project-ref <REF> --use-api`
- **Disco:** la partición raíz de la máquina de desarrollo tiene poco espacio (unos 5.8 GB libres). `supabase start` la llena; por eso los tests de base de datos usan el arnés ligero (`npm run test:db`, sobre `postgres:16-alpine` en memoria).
- **Las bases reales pueden no coincidir con las migraciones.** DEV tenía policies con otros nombres y una que dejaba a cualquiera modificar saldos. Antes de migrar un entorno, inspeccionar su estado real (policies, permisos de funciones, columnas) y no asumir que es igual al repo.
- **Logs de las edge functions:** `GET /v1/projects/<ref>/analytics/endpoints/logs?sql=…` con la tabla unificada `logs` (columnas `timestamp`, `event_message`). Los nombres antiguos (`function_logs`, `function_edge_logs`) ya no existen. Las funciones de pago registran el motivo que da Mercado Pago cuando algo falla.
- **Mercado Pago en DEV:** el pago de prueba solo funciona iniciando sesión en el checkout con un usuario **comprador de prueba**, con tarjeta de prueba y titular `APRO`. Como invitado se rechaza. El checkout es el normal (`init_point`); forzar el de sandbox lo hace fallar.
- **Variables de Vercel:** las `VITE_*` se incrustan al construir. Cambiar una variable no afecta al deployment ya publicado: hay que volver a desplegar.
- **Hook de git en esta máquina:** bloquea cualquier comando de terminal que junte `git commit` con una opción corta de una letra "n" (la confunde con la de saltarse los hooks), y también si el texto del comando la menciona. Usar opciones largas, como `grep --line-number`, o separar los comandos.
