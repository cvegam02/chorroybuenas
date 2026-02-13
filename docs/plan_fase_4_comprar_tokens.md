# Plan de trabajo: Fase 4 — Comprar tokens

Plan ejecutable para implementar la Fase 4 a partir del plan general actualizado (gaps_código_meta_cloud) y del detalle en requisitos_fase_4_comprar_tokens_8b26201c.plan.md.

---

## Objetivo de la Fase 4

- El usuario puede comprar packs de tokens (Mercado Pago para LATAM, PayPal para no-LATAM).
- Precios y promociones viven en tablas (token_pricing, token_packs, promotions, token_purchases).
- Cada cobro queda registrado con referencia del pago (payment_provider, payment_id, etc.) para el admin.
- CTAs "Comprar tokens" en menú usuario (Navbar) y en toolbar de Cards. En el modal de error de IA (CardEditor) el usuario solo ve el mensaje genérico "Ops, algo salió mal. Contacta al administrador" y "Cerrar" — sin CTA y sin exponer causas internas (INSUFFICIENT_TOKENS es solo para el admin). Sidebar de Cards: tokens con el mismo estilo que el Navbar (FaCoins).

---

## Orden sugerido de implementación

### Paso 1 — Tablas en Supabase (4.1)

- Crear migración(es) SQL que definan:
  - **token_pricing:** id, price_per_token_cents, currency, updated_at.
  - **token_packs:** id, base_tokens, bonus_tokens, price_cents, sort_order, is_active, created_at.
  - **promotions:** id, code, type, config (jsonb), valid_from, valid_until, is_active, created_at.
  - **token_purchases:** id, user_id, pack_id, base_tokens, bonus_tokens, total_tokens, amount_cents, promotion_ids (opcional), **payment_provider**, **payment_id**, **payment_status**, **payment_metadata** (jsonb opcional), created_at.
- Definir RLS: token_pricing y token_packs lectura (autenticados o público); token_purchases el usuario solo puede leer sus filas; escritura de compras solo vía service role (backend).
- Poblar datos iniciales: precio base (ej. 200 centavos MXN), tres packs (10+2, 20+5, 50+20) con price_cents correspondientes, y una promoción "primera compra" type first_purchase con config {"percent": 20}.

**Archivos:** `supabase_migrations/004_token_pricing_and_purchases.sql` (o varios 004, 005 si se prefiere separar).

---

### Paso 2 — Wiring frontend 4.4 (antes de la página de compra)

Así el botón "Comprar tokens" lleva a una ruta que luego implementarás; se puede dejar la ruta vacía o con un placeholder.

- **Navbar:** En el menú desplegable del usuario, añadir ítem "Comprar tokens" que ejecute `navigate('/comprar-tokens')` y cierre el menú. Traducción: `navbar.buyTokens` o `cardEditor.buyTokens` en es/en.
- **CardEditor (modal de error):** El usuario **nunca** debe ver causas internas (ej. "tokens insuficientes" o INSUFFICIENT_TOKENS). Esas son solo para el admin. En el modal de error de IA se debe mostrar **únicamente** el mensaje genérico: "Ops, algo salió mal. Contacta al administrador." y el botón "Cerrar". **No** debe aparecer ningún CTA "Comprar tokens" ni texto que mencione tokens o fondos. Quitar estado `showBuyTokensCTA`, el botón de comprar y el párrafo que lo envuelve. Usar la clave `cardEditor.errors.genericContactAdmin` para ese mensaje genérico en todos los fallos (batch e individual).
- **CardEditor (toolbar):** En `card-editor__cards-toolbar`, añadir botón "Comprar tokens" (solo si hay usuario), que llame a `navigate('/comprar-tokens')`. Clase ej. `card-editor__buy-tokens-button`; estilo secundario. Mantener el botón "Convertir todo con IA".
- **CardEditor (sidebar tokens):** En `card-editor__stat--tokens`, usar icono FaCoins y el mismo estilo visual que `navbar__tokens-badge` (badge redondeado, colores primarios). Sustituir el emoji de refresh por un icono (ej. FaSyncAlt). Ajustar [CardEditor.css](src/components/CardEditor/CardEditor.css) para alinear el bloque al estilo del Navbar.

**Archivos:** [Navbar.tsx](src/components/Navbar/Navbar.tsx), [CardEditor.tsx](src/components/CardEditor/CardEditor.tsx), [CardEditor.css](src/components/CardEditor/CardEditor.css), [src/locales/es/translation.json](src/locales/es/translation.json), [src/locales/en/translation.json](src/locales/en/translation.json).

---

### Paso 3 — Página /comprar-tokens (4.2)

- Añadir ruta `/comprar-tokens` en [AppRouter.tsx](src/AppRouter.tsx). Si el usuario no está logueado, redirigir a login o mostrar mensaje + CTA para iniciar sesión.
- Crear componente de página que:
  - Lea token_pricing y token_packs desde Supabase (solo is_active); si falla o no hay datos, usar fallback con valores por defecto (precio base 2 MXN, packs 10+2, 20+5, 50+20).
  - Muestre los packs con precio en MXN. En español: solo pesos (ej. $24 MXN). En inglés: pesos y entre paréntesis el equivalente en USD (ej. $24 MXN ($1.50 USD)), usando una API de tipo de cambio (ej. ExchangeRate-API) cacheada 24 h, con redondeo al alza a valor amigable (0.43 → 0.50). Mostrar disclaimer: el cargo es en MXN y el USD es referencia; el monto final puede variar según el banco.
  - Muestre badge "Primera compra: +20% gratis" cuando aplique (por ejemplo cuando el backend o una consulta a token_purchases indique que es primera compra; o mostrarlo siempre y que el backend aplique la promoción solo si corresponde).
  - Por cada pack, botón "Comprar" que dispare el flujo de pago (paso 4 o 5).
- Tras compra exitosa (redirect de vuelta o respuesta del backend): llamar a `refreshBalance()` y redirigir a `/cards` o mostrar mensaje de gracias en la misma página.

**Archivos:** Nuevo componente (ej. `src/components/BuyTokens/BuyTokensPage.tsx` o `src/pages/BuyTokensPage.tsx`), AppRouter, posible hook o servicio para tipo de cambio y redondeo USD.

---

### Paso 4 — Backend: Mercado Pago (4.3)

- Edge Function (o backend) que reciba userId (del JWT) y pack_id (o cantidad), calcule monto en MXN y tokens a entregar (incluyendo bono de pack y promoción primera compra si aplica), cree una preferencia de pago en Mercado Pago con `external_reference` = userId (o id de orden que permita resolver userId). Devolver al frontend el link (init_point) para redirigir al usuario.
- Webhook de Mercado Pago: al recibir notificación de pago aprobado, validar firma/datos, leer external_reference para obtener userId, verificar monto y estado, llamar a `addTokens(userId, totalTokens)` e insertar en `token_purchases` con payment_provider = 'mercadopago', payment_id, payment_status, payment_metadata (jsonb). Registrar así cada cobro para el admin.

**Archivos:** Supabase Edge Functions (ej. `create-mercadopago-preference`, `webhook-mercadopago`) o equivalente en tu backend.

---

### Paso 5 — Backend: PayPal (4.3)

- Edge Function que reciba userId y pack_id, cree orden/checkout en PayPal con custom_id o invoice_id = userId (o id de orden). Devolver al frontend el link para redirigir al usuario.
- Webhook o return URL de PayPal: al confirmar pago aprobado, validar datos, obtener userId, llamar a addTokens e insertar en token_purchases con payment_provider = 'paypal', payment_id, payment_status, payment_metadata.

**Archivos:** Edge Functions (ej. `create-paypal-order`, `webhook-paypal` o return URL handler).

---

### Paso 6 — Conectar página de compra con el backend

- En la página /comprar-tokens, al pulsar "Comprar" en un pack: llamar a la Edge Function que crea la preferencia/orden (Mercado Pago o PayPal según elección del usuario o según detección de región); redirigir al usuario al link devuelto. Configurar success/cancel URLs para que al volver se llame a refreshBalance() y se muestre mensaje de gracias o error.

---

## Resumen de tareas por archivo

| Qué | Dónde |
|-----|--------|
| Tablas y datos iniciales | supabase_migrations/004_*.sql |
| Ítem "Comprar tokens" en menú usuario | Navbar.tsx |
| Quitar CTA del modal de error; botón Comprar en toolbar; sidebar tokens estilo Navbar | CardEditor.tsx, CardEditor.css |
| Ruta /comprar-tokens | AppRouter.tsx |
| Página de compra (packs, precios, MXN/USD, disclaimer) | Nuevo componente + hook/servicio tipo de cambio |
| Crear preferencia MP + webhook MP | Edge Functions |
| Crear orden PayPal + webhook/return PayPal | Edge Functions |
| Traducciones (buyTokens, genericContactAdmin, disclaimer) | src/locales es/en |

---

## Criterios de éxito Fase 4

- Usuario logueado puede abrir /comprar-tokens desde el menú de usuario o desde la toolbar de Cards.
- Ve packs con precios en MXN (y en inglés con USD de referencia y disclaimer).
- Puede iniciar una compra con Mercado Pago o PayPal según lo implementado.
- Tras pago aprobado, su balance de tokens se actualiza (refreshBalance) y queda registrada una fila en token_purchases con la referencia del cobro.
- En el modal de error de IA (CardEditor) el usuario solo ve el mensaje genérico "Ops, algo salió mal. Contacta al administrador" y "Cerrar"; no aparece CTA "Comprar tokens" ni ningún mensaje interno (tokens insuficientes, INSUFFICIENT_TOKENS). Esas causas son solo para el admin. El sidebar de Cards muestra los tokens con el mismo estilo que el Navbar (FaCoins + badge).

Referencias: [requisitos_fase_4_comprar_tokens_8b26201c.plan.md](.cursor/plans/requisitos_fase_4_comprar_tokens_8b26201c.plan.md), [TASKLIST_FASES.md](TASKLIST_FASES.md), plan general gaps_código_meta_cloud_7ca2f464.plan.md.
