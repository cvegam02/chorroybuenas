# FEAT-10 — Avatar de perfil

**Prioridad:** Media · **Findings:** M7 · **Plan:** Task 14

**Objetivo:** que el avatar del usuario no deje de verse con el tiempo y que no dependa de una URL de larga duración guardada en su perfil.

**Contexto:** al subir un avatar se genera una URL firmada con vigencia de un año y se guarda en los metadatos del usuario. Cuando esa URL expire, el avatar dejará de cargar sin que nadie lo note. Además, una URL firmada de un año es un enlace de acceso de larga vida a un archivo de un bucket privado.

---

## CYB-1001 — Guardar la ruta del avatar y firmar al mostrar

- **Tipo:** Bug
- **Prioridad:** Media
- **Estado:** En revisión — implementado (`useAvatarUrl`, `AuthContext`); no se ha probado en el navegador
- **Finding:** M7
- **Plan:** Task 14
- **Depende de:** CYB-201

### Descripción

Como usuario, quiero que mi foto de perfil se vea siempre, para no perderla un año después de haberla subido.

### Criterios de aceptación

- [x] Al subir un avatar se guarda su ruta en el bucket (`avatar_path`) en los metadatos, no una URL firmada.
- [x] Dashboard y Navbar obtienen una URL firmada de 1 hora cada vez que se montan.
- [ ] Al subir un avatar nuevo, la imagen se actualiza en Dashboard y Navbar sin recargar la página.
- [x] Solo se aceptan los tipos de archivo ya permitidos (PNG, JPEG, WebP).
- [x] El archivo se sigue guardando en la carpeta del propio usuario dentro del bucket.
- [x] Si no se puede firmar la URL, se muestra el ícono de usuario por defecto.

### Escenarios

**Escenario 1: subir un avatar**
- Dado un usuario en el Dashboard
- Cuando sube una imagen PNG
- Entonces la ve como su avatar en el Dashboard y en la barra de navegación, y sus metadatos tienen `avatar_path`

**Escenario 2: volver un día después**
- Dado un usuario que subió su avatar ayer
- Cuando abre la app
- Entonces el avatar carga con una URL firmada nueva

**Escenario 3: reemplazar el avatar**
- Dado un usuario con avatar
- Cuando sube otro del mismo tipo de archivo
- Entonces se muestra el nuevo, no el anterior en caché

**Escenario 4: archivo no permitido**
- Cuando el usuario elige un PDF
- Entonces ve el mensaje de error de subida y su avatar no cambia

**Escenario 5: falla al firmar**
- Dado que Storage devuelve error al firmar la URL
- Cuando se monta el Dashboard
- Entonces se muestra el ícono por defecto y el error queda registrado

**Escenario 6: sesión cerrada**
- Dado que el usuario cierra sesión
- Cuando se muestra la barra de navegación
- Entonces no se intenta firmar ninguna URL

---

## CYB-1002 — Compatibilidad con avatares existentes y de Google

- **Tipo:** Historia
- **Prioridad:** Media
- **Estado:** En revisión — implementado y probado (`resolveAvatarSource`, 10 tests); falta verlo con un usuario real de Google y uno con URL firmada antigua
- **Finding:** M7
- **Plan:** Task 14 (`resolveAvatarSource`)
- **Depende de:** CYB-1001

### Descripción

Como usuario que ya tenía avatar, o que entra con Google, quiero seguir viendo mi foto después del cambio, sin tener que volver a subirla.

### Criterios de aceptación

- [x] Si existe `avatar_path`, tiene prioridad sobre `avatar_url`.
- [x] Una `avatar_url` firmada antigua del bucket `card-images` se reconoce, se extrae su ruta y se vuelve a firmar.
- [x] Una `avatar_url` externa (foto de Google) se usa tal cual.
- [x] Sin `avatar_path` ni `avatar_url` se muestra el ícono por defecto.
- [x] No se requiere ninguna migración de datos de usuarios.
- [x] La lógica de resolución tiene tests con cobertura ≥ 80 %.

### Escenarios

**Escenario 1: usuario con URL firmada antigua**
- Dado un usuario cuyo `avatar_url` es una URL firmada de `card-images`
- Cuando abre la app después del deploy
- Entonces su avatar se muestra, usando una URL firmada nueva sobre la misma ruta

**Escenario 2: URL firmada antigua ya expirada**
- Dado un usuario cuya URL firmada de un año ya venció
- Cuando abre la app
- Entonces su avatar se muestra igualmente, porque se vuelve a firmar la ruta

**Escenario 3: usuario de Google**
- Dado un usuario que entra con Google y nunca subió avatar
- Cuando abre la app
- Entonces ve su foto de Google

**Escenario 4: usuario de Google que sube avatar propio**
- Dado un usuario de Google con foto de Google
- Cuando sube un avatar
- Entonces se muestra el avatar subido, no el de Google

**Escenario 5: usuario sin avatar**
- Dado un usuario de correo sin avatar
- Cuando abre la app
- Entonces ve el ícono por defecto
