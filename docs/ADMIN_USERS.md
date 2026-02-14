# Administradores (admin_users)

El panel de administración (`/admin`) está disponible solo para usuarios registrados en la tabla `admin_users`.

## Agregar el primer administrador

Como la tabla está protegida por RLS (solo los admins pueden gestionarla), el **primer admin** debe insertarse manualmente en Supabase:

1. Entra al [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto
2. Ve a **SQL Editor**
3. Ejecuta (reemplaza con tu email):

```sql
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'tu@email.com' LIMIT 1;
```

4. Si el usuario no existe aún, regístrate primero en la app y luego ejecuta la query.

## Agregar más administradores

Una vez que tengas al menos un admin:

1. Inicia sesión con una cuenta admin
2. Ve a `/admin` (Panel de administración)
3. En futuras iteraciones habrá una sección para gestionar admins. Por ahora, agrega nuevos admins ejecutando en SQL Editor:

```sql
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'nuevo-admin@ejemplo.com' LIMIT 1;
```

## Quitar un administrador

```sql
DELETE FROM public.admin_users
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'email@a-quitar.com' LIMIT 1);
```
