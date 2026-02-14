# Tasklist: Fases meta cloud + tokens + IA

Meta de etapa: usuarios pueden comprar tokens y usar la IA para convertir imágenes al estilo lotería tradicional.

---

## Fase 1 — Base: Cloud, PDF y modelo de sets

| # | Tarea | Estado |
|---|--------|--------|
| 1.1 | `getBoards` devuelve URLs de imágenes (signed URLs) | Hecho |
| 1.2 | PDF usa URLs cuando no hay blob en IndexedDB (logueados) | Hecho |
| 1.2b | Bucket privado + signed URLs; CardRepository.getImageUrl → createSignedUrl | Hecho |
| 1.3 | Documentación bucket privado `card-images`, políticas Storage, signed URLs | Hecho |
| 1.4 | Tabla `loteria_sets` (id, user_id, name, created_at) y RLS | Hecho |
| 1.5 | Campo `set_id` en `cards` y `boards`; RLS por set | Hecho |
| 1.6 | Repos filtran por set; SetRepository (CRUD sets) | Hecho |
| 1.7 | Migración: set por defecto y asignar cards/boards al set | Hecho |

**Fase 1:** 8/8

---

## Fase 2 — Navbar y flujo usuario logueado (con sets)

| # | Tarea | Estado |
|---|--------|--------|
| 2.1 | Mostrar nombre del usuario en el Navbar | Hecho |
| 2.2 | Menú "Mis loterías" (lista de sets) y entrar a un set | Hecho |
| 2.3 | Vista de un set: cartas y tableros | Hecho |
| 2.4 | Crear nueva lotería (nuevo set) y seleccionar set activo | Hecho |

**Fase 2:** 4/4

---

## Fase 3 — IA lista para el usuario

**Criterio de errores:** El usuario **nunca** ve causas internas (ej. "tokens insuficientes" o INSUFFICIENT_TOKENS). En el modal de error solo se muestra el mensaje genérico: "Ops, algo salió mal. Contacta al administrador." y el botón "Cerrar". **No** debe aparecer ningún CTA "Comprar tokens" en ese modal; la causa real es solo para el admin (logs / panel). Traducción: `cardEditor.errors.genericContactAdmin`.

| # | Tarea | Estado |
|---|--------|--------|
| 3.1 | Restringir botón "Convertir con IA" a logueados; si no, mensaje "Inicia sesión…" | Hecho |
| 3.2 | AIBatchModal: comprobar balance antes de "Iniciar" y bloquear si no hay tokens suficientes | Hecho |
| 3.3 | AIBatchModal: ante fallo (ej. INSUFFICIENT_TOKENS) mostrar al usuario solo mensaje genérico; registrar causa real para admin | Hecho |
| 3.4 | Transformación individual: ante fallo mostrar solo mensaje genérico "Ops, algo salió mal. Contacta al administrador"; registrar causa interna para admin | Hecho |

**Fase 3:** 4/4

---

## Fase 4 — Comprar tokens

| # | Tarea | Estado |
|---|--------|--------|
| 4.1 | UI para comprar tokens (página /comprar-tokens: packs, precios, primera compra +20%) | Pendiente |
| 4.2 | Integración de pago (Mercado Pago + PayPal; opcional Stripe) y registro en token_purchases | Pendiente |
| 4.3 | Tras compra: addTokens desde backend y refrescar balance en Navbar y CardEditor | Pendiente |
| 4.4 | Wiring: "Comprar tokens" en menú usuario (Navbar), en toolbar Cards; quitar CTA del modal CardEditor; sidebar Cards con tokens estilo Navbar (FaCoins) | Pendiente |

**Fase 4:** 0/4

---

## Fase 5 — Panel de administración

Panel de control para el admin: ver configuraciones, estadísticas y eventos de la app; no exponer causas internas al usuario final.

| # | Tarea | Estado |
|---|--------|--------|
| 5.1 | Ruta/área solo admin (auth por rol o usuario admin): panel de control | Pendiente |
| 5.2 | Ver todas las configuraciones de la app (precios, paquetes, promociones, etc.) | Pendiente |
| 5.3 | Stats de la app (usuarios, sets, uso de IA, etc.) | Pendiente |
| 5.4 | Alertas y mensajes internos: fondos bajos o agotados (tokens), errores como INSUFFICIENT_TOKENS | Pendiente |
| 5.5 | Ver transacciones realizadas (token_purchases: quién, cuánto, cuándo, referencia de pago) | Pendiente |
| 5.6 | Todo lo que un admin deba ver y gestionar en un solo lugar | Pendiente |
| 5.7 | Verificación E2E: flujo completo usuario (login → set → comprar tokens → IA → tableros → PDF) | Pendiente |

**Fase 5:** 0/7

---

## Resumen

| Fase | Hecho | Pendiente | Total |
|------|-------|-----------|--------|
| 1 | 8 | 0 | 8 |
| 2 | 4 | 0 | 4 |
| 3 | 4 | 0 | 4 |
| 4 | 0 | 4 | 4 |
| 5 | 0 | 7 | 7 |
| **Total** | **16** | **11** | **27** |

Detalle Fase 4 (precios, tablas, Mercado Pago, PayPal, 4.4 wiring): plan `requisitos_fase_4_comprar_tokens_8b26201c.plan.md`.
