# Crecimiento de datos en el panel de administración

## Estado actual: paginación

Las tablas del admin ya usan **paginación** para no cargar todo de golpe:

- **Compras** (`token_purchases`): 20 registros por página, con filtros (email, estado, proveedor, fechas).
- **Uso de IA** (`token_usage`): 20 registros por página, con filtros (email, lotería, fechas).
- **Balances** (`user_tokens`): hasta 200 usuarios (los más recientes).

Las consultas usan `LIMIT` y `OFFSET` en las RPCs. Los resúmenes y gráficas usan agregaciones (SUM, COUNT, GROUP BY), no cargan filas completas.

## Tablas que crecen con el tiempo

| Tabla           | Crecimiento                        | Índices actuales                                   |
|-----------------|------------------------------------|-----------------------------------------------------|
| `token_usage`   | 1 fila por imagen transformada     | `user_id`, `created_at`, `set_id`                  |
| `token_purchases` | 1 fila por compra                | `user_id`, `created_at`                            |
| `user_tokens`   | 1 fila por usuario con balance     | `user_id`, `updated_at`                            |
| `profiles`      | 1 fila por usuario                 | `id`                                               |

## Estrategias recomendadas

### 1. A corto plazo (actual)

- **Paginación**: Ya implementada. Para tablas muy grandes, OFFSET puede volverse lento.
- **Filtros**: Reducen datos mostrados (por fecha, email, etc.).
- **Índices**: Ya existen en las columnas usadas en filtros y orden.

### 2. A medio plazo (miles de filas)

- **Paginación por cursor**: Sustituir OFFSET por `WHERE created_at < last_seen ORDER BY created_at DESC LIMIT 20` para evitar degradación con OFFSET alto.
- **Límite de fechas por defecto**: Por ejemplo, últimos 90 días en Compras y Uso de IA, salvo que se apliquen filtros distintos.

### 3. A largo plazo (cientos de miles de filas)

- **Política de retención**: Archivar o eliminar datos antiguos (ej. > 2 años).
- **Tabla de agregados**: Guardar totales diarios/semanales en una tabla tipo `usage_daily_summary` y purgar o archivar el detalle antiguo.
- **Particionamiento**: Partitioning por `created_at` en PostgreSQL para tablas muy grandes.

## Móvil

- Las tablas se convierten en tarjetas (layout por filas) en pantallas pequeñas.
- La paginación y los filtros funcionan igual en móvil.
- Las gráficas se ajustan con scroll horizontal o menos puntos en móvil (ver implementación en AdminTokenUsage).
