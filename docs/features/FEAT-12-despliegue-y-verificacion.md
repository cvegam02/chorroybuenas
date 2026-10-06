# FEAT-12 — Despliegue y verificación

**Prioridad:** Alta · **Findings:** — (habilita la entrega de FEAT-03 a FEAT-10) · **Plan:** Task 15

**Objetivo:** llevar los cambios a dev y a producción en un orden que no rompa compras ni cobros, y comprobar de punta a punta que funcionan.

**Contexto:** el frontend se publica con Vercel (FEAT-13): `dev.chorroybuenas.com.mx` contra Supabase DEV y `chorroybuenas.com.mx` contra Supabase PROD. Los cambios tocan base de datos, secrets, edge functions y frontend. El orden importa: si el frontend nuevo llega antes que las funciones, o las funciones antes que las migraciones, hay errores visibles para el usuario. Todos los pasos de esta feature modifican entornos reales y requieren confirmación de Carlos.

---

## CYB-1201 — Configuración y documentación de secrets

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** Hecho — secrets y orden de despliegue documentados en `.env.example` y `docs/ENTORNOS_DEV_PROD.md` (secciones 4, 8 y 10); `config.toml` declara las cuatro funciones
- **Plan:** Task 15, Steps 1–3
- **Depende de:** CYB-602, CYB-603, CYB-303, CYB-901

### Descripción

Como desarrollador, quiero que los secrets nuevos estén documentados y que la configuración de las funciones sea explícita, para poder montar un entorno sin adivinar qué falta.

### Criterios de aceptación

- [x] `.env.example` y `docs/ENTORNOS_DEV_PROD.md` documentan: `MERCADOPAGO_WEBHOOK_SECRET`, `MP_USE_SANDBOX_CHECKOUT`, `ALLOWED_ORIGINS`, `APP_URL`, con sus valores esperados en dev y prod.
- [x] La documentación indica que `MP_USE_PRODUCTION_CHECKOUT` ya no se usa.
- [x] `supabase/config.toml` declara las cuatro funciones con su `verify_jwt`.
- [x] El script `deploy:functions:all` despliega las cuatro funciones.
- [x] Ningún valor real de secret aparece en el repo.

### Escenarios

**Escenario 1: montar un entorno desde cero**
- Dado un proyecto de Supabase nuevo
- Cuando un desarrollador sigue `docs/ENTORNOS_DEV_PROD.md`
- Entonces termina con todos los secrets necesarios y las funciones responden

**Escenario 2: falta `ALLOWED_ORIGINS`**
- Dado un entorno sin ese secret
- Cuando el frontend llama a una función
- Entonces el navegador bloquea la respuesta y la documentación explica la causa

**Escenario 3: deploy de todas las funciones**
- Cuando se ejecuta `npm run deploy:functions:all`
- Entonces se despliegan las cuatro funciones sin errores

---

## CYB-1202 — Despliegue y pruebas de punta a punta en DEV

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** Hecho — backend desplegado en DEV el 2026-10-06 y validado de punta a punta: transformación de IA (1 token cobrado) y pago de prueba aprobado de $20.00 MXN (una sola compra de 12 tokens pese a 4 notificaciones y 2 reenvíos)
- **Plan:** Task 15, Steps 4–5
- **Depende de:** CYB-1201, CYB-305, CYB-403, CYB-1302, CYB-1303 y todas las historias de FEAT-03 a FEAT-10
- **Responsable:** Carlos confirma cada paso

### Descripción

Como dueño del proyecto, quiero validar todo el cambio en dev con pagos de prueba antes de tocar producción.

### Criterios de aceptación

- [ ] Se corrieron en dev las consultas previas de pagos duplicados y saldos negativos.
- [ ] El orden fue: migraciones → secrets → edge functions → frontend.
- [ ] Las migraciones 022 a 025 se aplicaron sin errores.
- [ ] Los secrets de dev están configurados y `MP_USE_PRODUCTION_CHECKOUT` fue eliminado.
- [ ] Las 13 pruebas de punta a punta del plan (Task 15, Step 5) pasaron.
- [ ] Cualquier prueba fallida tiene su corrección antes de pasar a producción.

### Escenarios

**Escenario 1: usuario nuevo**
- Cuando alguien se registra en dev
- Entonces su saldo es el de `initial_tokens`

**Escenario 2: transformación con y sin saldo**
- Cuando un usuario con saldo transforma una carta, y luego otro sin saldo lo intenta
- Entonces al primero se le descuenta 1 token y el segundo ve el mensaje de saldo insuficiente

**Escenario 3: llamada directa a la función de IA**
- Cuando se llama `transform-loteria` por `curl` con el JWT de un usuario sin saldo
- Entonces responde 402

**Escenario 4: compra con tarjeta de prueba**
- Cuando se paga un pack en sandbox y se vuelve al sitio
- Entonces el saldo sube lo esperado y hay una sola fila de compra, aunque lleguen webhook y retorno

**Escenario 5: reenvío de la notificación**
- Cuando se reenvía la notificación del pago desde el panel de Mercado Pago
- Entonces el saldo no cambia

**Escenario 6: código promocional**
- Cuando un usuario con compras previas compra con un código válido, y luego intenta reutilizarlo
- Entonces recibe el bono la primera vez y no la segunda

**Escenario 7: solicitudes inválidas**
- Cuando se envían `custom_tokens: 1.5` y una imagen que es una URL
- Entonces ambas responden 400

**Escenario 8: CORS y códigos**
- Cuando se llama una función con `Origin: https://evil.test` y se consulta `promotions` con la anon key
- Entonces la cabecera CORS no es ese origen ni `*`, y la consulta devuelve `[]`

**Escenario 9: avatar**
- Cuando un usuario sube un avatar y otro entra con Google
- Entonces ambos ven su foto

**Escenario 10: RPC eliminada**
- Cuando se llama `spend_tokens` desde la consola del navegador
- Entonces la función no existe

---

## CYB-1203 — Despliegue a producción

- **Tipo:** Tarea técnica
- **Prioridad:** Alta
- **Estado:** Hecho — backend desplegado en PROD el 2026-10-06 21:46 UTC y validado con dinero real: una transformación de IA (1 token cobrado) y una compra de $10.00 MXN (5 tokens, una sola acreditación con 4 notificaciones). Lo que queda (desactivar GitHub Pages, borrar secrets de Actions) está en `docs/PENDIENTES.md`
- **Plan:** Task 15, Step 6 y sección "Cierre"
- **Depende de:** CYB-1202, CYB-1304
- **Responsable:** Carlos confirma cada paso

### Descripción

Como dueño del proyecto, quiero publicar los cambios en producción sin interrumpir compras en curso y con una forma clara de comprobar que todo quedó bien.

### Criterios de aceptación

- [ ] Se corrieron en prod las consultas previas de pagos duplicados y saldos negativos, y se corrigieron los casos encontrados.
- [ ] Se anotó cuántos usuarios recibirán tokens iniciales por el backfill.
- [ ] El orden fue: migraciones → secrets → edge functions → merge a `main` (Vercel publica el frontend).
- [ ] En prod no existe `MP_USE_SANDBOX_CHECKOUT` y `ALLOWED_ORIGINS` contiene el dominio con y sin `www`.
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` corresponde a la aplicación productiva de Mercado Pago.
- [ ] El PR pasó typecheck, lint, tests y build en GitHub Actions antes del merge, y el deployment de Vercel quedó en Ready.
- [ ] Se repitieron en prod las pruebas de registro, transformación, llamada directa sin saldo, RPC eliminada, CORS y códigos ocultos.
- [ ] Se hizo una compra real mínima y se verificó una sola acreditación.
- [ ] Los logs de las cuatro funciones se revisaron durante la primera hora.

### Escenarios

**Escenario 1: pago iniciado antes del deploy**
- Dado un usuario que abrió el checkout antes del deploy
- Cuando paga después
- Entonces el pago se acredita una vez con las reglas anteriores de promoción

**Escenario 2: navegador con el frontend viejo**
- Dado un usuario con el bundle anterior en caché
- Cuando transforma una imagen después del deploy de las funciones
- Entonces se le cobra 1 token, no 2

**Escenario 3: la migración se detiene por datos**
- Dado que en prod existen pagos duplicados sin corregir
- Cuando se ejecuta `supabase db push`
- Entonces la migración 022 falla con mensaje claro, no se aplica nada más y el sitio sigue funcionando como antes

**Escenario 4: compra real**
- Cuando Carlos compra el pack más barato con una tarjeta real
- Entonces es redirigido al checkout de producción, el saldo sube lo esperado y hay una sola fila de compra

**Escenario 5: fallo tras el deploy**
- Dado que una función nueva falla en producción
- Cuando se detecta en los logs
- Entonces se redespliega la versión anterior de esa función desde `main` mientras se corrige; las migraciones no se revierten porque son compatibles con el código anterior salvo `spend_tokens`, cuyo fallo el frontend viejo ignora
