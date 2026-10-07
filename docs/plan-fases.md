# Plan por fases

Roadmap del producto. Las fases se ordenan por **dependencia real**: qué es lo mínimo sin lo cual lo siguiente no puede construirse. Solo la fase activa está desglosada a detalle; las siguientes se definen con Carlos al cerrar la anterior.

El seguimiento tarea por tarea de cada fase está en [`docs/fases/`](fases/). El trabajo suelto que no es una fase va en [`docs/features/`](features/).

Creado el 2026-10-06.

---

## Lo que ya existe

Construido y publicado antes de este plan; no se reconstruye en fases:

- El producto completo: crear cartas y tableros, PDF, cuentas, loterías en la nube, IA, compra de tokens con Mercado Pago, promociones y panel de administración (`docs/TASKLIST_FASES.md`, fases 1 a 5, como histórico).
- La remediación de seguridad y calidad del 2026-10-06 y el paso a Vercel (`docs/features/FEAT-01` a `FEAT-13`, como histórico).

Lo que sigue abierto de esa etapa (limpieza de configuración y tareas manuales) está en [`docs/PENDIENTES.md`](PENDIENTES.md).

## De dónde sale este plan

De las seis reglas que Carlos definió el 2026-10-06 y que el sitio todavía no cumple (`contexto-negocio.md` §17), más una mejora ya detectada: acreditar al volver del pago.

---

## Fase 1 — Reglas que el sitio contradice hoy

**Estado: ✅ completa y en producción (2026-10-06)** · Seguimiento: [`fases/fase-1.md`](fases/fase-1.md)

- **Por qué es la siguiente raíz:** son reglas ya decididas que el sitio incumple a la vista del usuario, y ninguna necesita construir nada nuevo por debajo: solo cambian límites y un paso del flujo de pago. No dependen de ninguna otra fase.
- **Alcance:** que el sitio respete los mínimos de cartas de los dos modos y el mínimo de compra, y que el saldo aparezca en cuanto el usuario vuelve de pagar.
- **Piezas por construir:**
  1. Mínimo de 24 cartas en Clásico y de 15 en Kids, en la pantalla de cartas (C1) y en la de tableros (C2).
  2. Mínimo de compra de 5 tokens, en la página (U3) y en el servidor.
  3. Acreditar el pago al volver de Mercado Pago, sin esperar al aviso.
- **Qué queda fuera:** reembolsos, registro de regalos y correos (fases 2 y 3).
- **Definición de «hecho»:** con 23 cartas en Clásico, o 14 en Kids, no se pueden generar tableros; no se puede iniciar una compra de menos de 5 tokens; y al volver de un pago aprobado el saldo ya incluye los tokens comprados.

## Fase 2 — Registro de regalos de tokens

**Estado: 🔨 en construcción (abierta el 2026-10-06)** · Seguimiento: [`fases/fase-2.md`](fases/fase-2.md)

- **Por qué va después de la fase 1:** necesita algo que no existía por debajo: guardar cada regalo. La fase 3 depende de esto, porque no se puede avisar de un regalo que no queda registrado.
- **Alcance:** registrar cada regalo de tokens (quién, a quién, cuánto, cuándo y un motivo opcional), mostrar la lista general en el panel de administración y mostrarle al usuario sus regalos dentro de su historial de compras.
- **Qué queda fuera:** los correos (fase 3) y los reembolsos (apartados, ver abajo).
- **Definición de «hecho»:** al regalar tokens, el regalo aparece en la lista del panel con su motivo, y el usuario lo ve en su historial como una fila "Regalo".

## Fase 3 — Avisos por correo

**Estado: 🔲 por definir al cerrar la fase 2**

- **Por qué va después:** necesita los eventos de la fase 2 (el regalo registrado) y una pieza nueva: el envío de correos propios del sitio, que hoy no existe (solo salen los correos de cuenta, que manda el servicio de inicio de sesión).
- **Alcance previsto:** correo al usuario cuando un pago pendiente (efectivo o transferencia) se acredita, y cuando un administrador le regala tokens.
- **Por decidir al abrirla:** con qué servicio se envían los correos, y el texto de cada uno.
- **Definición de «hecho»:** al regalar tokens a una cuenta de prueba, llega el correo; al confirmarse un pago pendiente de prueba, llega el correo.

## Apartado — Descuento de tokens por reembolso

**Estado: ⏸ apartado por Carlos el 2026-10-06, sin fecha**

Formaba parte de la fase 2. La regla sigue definida (`contexto-negocio.md` §8): al devolverse o revertirse un pago, se descuentan los tokens de esa compra, dejando el saldo en 0 como mínimo y la compra marcada como devuelta. Hoy el sitio no descuenta nada. Se define y se construye cuando Carlos lo pida.

---

## Trabajo suelto (features, no fases)

No bloquean ninguna fase y pueden hacerse en cualquier momento. Cada uno se abre como archivo en `docs/features/` cuando Carlos lo pida.

| Feature | De dónde sale |
|---|---|
| Ordenar el diseño: colores sueltos, colores de estado, componentes compartidos | `sistema-diseno.md`, «Deuda conocida» |
| Reservar el código promocional al iniciar el pago | `contexto-negocio.md` §9, limitación conocida |
| Reducir el tamaño de `CardEditor` y `Dashboard` | `PENDIENTES.md`, punto 4 |
| Limpieza de configuración (secrets, historial de migraciones, protección de rama) | `PENDIENTES.md` |
