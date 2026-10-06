# Features — Remediación del code review

Backlog en formato de historias de usuario, derivado del code review del 2026-10-06. Cada archivo es una feature (épica) y contiene sus historias.

El detalle técnico de implementación (código, migraciones, tests) está en [`docs/superpowers/plans/2026-10-06-code-review-remediation.md`](../superpowers/plans/2026-10-06-code-review-remediation.md). Cada historia indica el task del plan que la implementa.

## Índice

| Feature | Archivo | Prioridad | Historias | Findings |
|---|---|---|---|---|
| FEAT-01 Gestión de secretos | [FEAT-01-gestion-de-secretos.md](FEAT-01-gestion-de-secretos.md) | Crítica | CYB-101 a CYB-103 | C1 |
| FEAT-02 Calidad y CI | [FEAT-02-calidad-y-ci.md](FEAT-02-calidad-y-ci.md) | Alta | CYB-201 a CYB-204 | H9, L4 |
| FEAT-03 Acreditación de pagos | [FEAT-03-acreditacion-de-pagos.md](FEAT-03-acreditacion-de-pagos.md) | Crítica | CYB-301 a CYB-305 | C3, M3 |
| FEAT-04 Cobro de tokens de IA | [FEAT-04-cobro-de-tokens-ia.md](FEAT-04-cobro-de-tokens-ia.md) | Crítica | CYB-401 a CYB-405 | C2, H5, H8 |
| FEAT-05 Tokens iniciales | [FEAT-05-tokens-iniciales.md](FEAT-05-tokens-iniciales.md) | Alta | CYB-501 a CYB-503 | H6 |
| FEAT-06 Compra de tokens | [FEAT-06-compra-de-tokens.md](FEAT-06-compra-de-tokens.md) | Alta | CYB-601 a CYB-604 | H7, M1, M4 |
| FEAT-07 Promociones | [FEAT-07-promociones.md](FEAT-07-promociones.md) | Alta | CYB-701 a CYB-704 | H4, M2 |
| FEAT-08 Transformación con IA | [FEAT-08-transformacion-ia.md](FEAT-08-transformacion-ia.md) | Alta | CYB-801 a CYB-805 | H8, M6 |
| FEAT-09 Endurecimiento de la API | [FEAT-09-endurecimiento-api.md](FEAT-09-endurecimiento-api.md) | Media | CYB-901 a CYB-902 | M5, M8 |
| FEAT-10 Avatar de perfil | [FEAT-10-avatar-de-perfil.md](FEAT-10-avatar-de-perfil.md) | Media | CYB-1001 a CYB-1002 | M7 |
| FEAT-11 Mantenibilidad | [FEAT-11-mantenibilidad.md](FEAT-11-mantenibilidad.md) | Baja | CYB-1101 a CYB-1105 | L1, L2, L3 |
| FEAT-12 Despliegue y verificación | [FEAT-12-despliegue-y-verificacion.md](FEAT-12-despliegue-y-verificacion.md) | Alta | CYB-1201 a CYB-1203 | — |

## Orden sugerido

1. FEAT-01 (hoy mismo, no depende de nada).
2. FEAT-02 (da los tests y el lint que usan las demás).
3. FEAT-03, FEAT-04, FEAT-05 (base de datos; lo que toca dinero).
4. FEAT-06, FEAT-07, FEAT-08, FEAT-09 (edge functions y cliente).
5. FEAT-10.
6. FEAT-12 (despliegue de todo lo anterior).
7. FEAT-11.

## Formato de cada historia

- **ID y título**
- **Tipo** (Historia, Bug, Tarea técnica), **Prioridad**, **Finding** del review, **Plan** (task que la implementa), **Depende de**
- **Descripción** — como / quiero / para, más el contexto del problema actual
- **Criterios de aceptación** — lista verificable
- **Escenarios** — casos a cubrir en formato Dado / Cuando / Entonces

## Estados

Cada historia lleva un campo **Estado**: `Por hacer`, `En curso`, `En revisión`, `Hecho`. Todas empiezan en `Por hacer`.
