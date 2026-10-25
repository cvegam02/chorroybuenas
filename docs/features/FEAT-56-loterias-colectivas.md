# FEAT-56 — Loterías colectivas: invitar a subir fotos

**Estado:** definida con Carlos el 2026-10-23 y el 2026-10-24. B1 a B3 hechas el 2026-10-24; faltan B4 y B5. Se trabaja en la rama `feature/loterias-colectivas` (creada el 2026-10-24 desde `dev`). Cambios a la base de conocimiento aprobados por Carlos y aplicados el 2026-10-24 (ver el final).

**Contexto.** Juntar 24 fotos o más es el paso donde más gente se atora. En una posada o un cumpleaños las fotos están repartidas en los celulares de toda la familia. Con esta feature el organizador manda un enlace por WhatsApp y cada invitado sube sus fotos directo a la lotería. De paso, cada invitado crea su cuenta y conoce el sitio.

**Cambia reglas de negocio.** Hoy una lotería y sus imágenes solo las ve y modifica su dueño (§3, §5, §12). Esta feature agrega un rol nuevo, el **invitado de una lotería**, que puede leer las cartas de esa lotería y agregar las suyas. Es un cambio de permisos: va con **pruebas primero** en la base (`supabase/tests/`).

**Contenido permitido.** Claude señaló que, con varias personas subiendo y las fotos entrando directo (decisión 2), crece el riesgo de fotos que van contra la regla de contenido (§6, FEAT-22): una foto subida sin IA no pasa por ningún filtro. Lo mitiga que los invitados tienen cuenta (decisión 1) y que el organizador puede borrar cualquier carta (US B4).

## Decisiones tomadas con el usuario

Decisiones de Carlos con Claude (de la 1 a la 4, el 2026-10-23; de la 5 a la 9, el 2026-10-24; de la 10 a la 13, el mismo día al empezar B2; la 14, al probar B3):

1. **Los invitados necesitan cuenta** para subir fotos. _(Descartado: subir solo con su nombre, sin cuenta, que Claude había recomendado por tener menos fricción.)_
2. **Las fotos de los invitados entran directo** a la lotería, sin aprobación. El organizador puede borrarlas después. _(Descartado: que queden pendientes hasta que el organizador las apruebe, que Claude había recomendado.)_
3. **El invitado puede:** ponerle título a su foto (el organizador puede cambiarlo después) y ver todas las cartas de la lotería. _(Descartados: que el invitado borre o cambie sus propias fotos; que las transforme con IA con sus tokens.)_
4. **El enlace queda abierto hasta que el organizador lo cierra**, y puede generar uno nuevo (el anterior deja de servir). _(Descartados: fecha límite; fecha opcional más botón para cerrarlo.)_
5. **Sin límite de fotos por invitado**, igual que §4 no limita las cartas por lotería. Si alguien abusa, el organizador cierra el enlace o borra fotos. _(Descartados: un tope que elige el organizador; un tope fijo para todos.)_
6. **Al quitar a un invitado, sus fotos se quedan** en la lotería con su nombre. Solo pierde el acceso. _(Descartados: que se borren con él; que el organizador elija al quitarlo.)_
7. **Cualquier lotería guardada en la cuenta se puede abrir a invitados** desde U2, y se vuelve «Colectiva» al generar su primer enlace. El flujo de Crear no cambia. _(Descartado: que solo se puedan abrir las creadas como colectivas desde el principio.)_
8. **Aviso al organizador:** un contador «N fotos nuevas» en U1 y U2, que se borra cuando abre la lotería. No se manda correo y §13 no cambia. _(Descartados: contador más un correo agrupado; sin avisos.)_
9. **El invitado solo ve las cartas.** Tableros, PDF, IA y cantador (FEAT-55) son solo del organizador. _(Descartados: que el invitado vea los tableros; que descargue el PDF.)_
10. **Un invitado quitado no vuelve a entrar** con el enlace, aunque siga abierto: la página le dice que ya no puede unirse. _(Descartado: que vuelva a entrar y, para dejarlo fuera, generar un enlace nuevo.)_
11. **La página del enlace muestra el nombre de quien organiza** tal como está en su cuenta; si no tiene nombre, ese renglón no sale. El correo nunca se muestra. _(Descartados: solo el primer nombre; no mostrar organizador.)_
12. **B2 y B3 se construyen juntas** y no pasan a dev una sin la otra, porque al unirse el invitado llega a U5, que es de B3. La dirección de U5 es `/participo/:id`. _(Descartados: una confirmación de paso en P9; llevarlo a Mi cuenta.)_
13. **Quien crea su cuenta con correo desde el enlace regresa al enlace** al confirmar su correo, y ahí pulsa «Entrar». Solo desde P9; las demás ventanas de cuenta no cambian. _(Descartado: dejar que llegue al Inicio y tenga que volver a abrir el enlace.)_
14. **El organizador ve en vivo las fotos de sus invitados** en U2, al instante, con los avisos de la base (Realtime); se agregó a B3 a pedido de Carlos al probarla. _(Descartados: revisar cada 15 segundos; dejarlo al recargar.)_

## User Stories

### US B1 — Abrir la lotería a invitados   ·   Estado: hecha — construida y revisada por Carlos el 2026-10-24

- **Historia:** Como organizador, quiero generar un enlace para que mi familia suba fotos a mi lotería, para no tener que juntarlas yo.
- **Entrega demostrable:** En U2, «Invitar a subir fotos» abre la ventana M18 con el enlace, «Copiar» y «Compartir por WhatsApp» (con un mensaje ya escrito). La misma ventana muestra si el enlace está abierto, «Cerrar enlace» y «Generar enlace nuevo», que invalida el anterior. Una lotería abierta lleva una etiqueta «Colectiva» en U1 y U2 (decisión 7).
- **Depende de:** — (migración nueva: invitación por lotería con su código y si está abierta).
- **Cómo se prueba (guion de demo):** Abrir una lotería en U2 → «Invitar a subir fotos» → copiar el enlace → la lotería sale como «Colectiva». «Generar enlace nuevo» → abrir el enlace viejo: dice que ya no sirve. «Cerrar enlace» → el nuevo tampoco sirve.
- **Escenarios cubiertos:** enlace abierto, cerrado y reemplazado; compartir en celular y copiar en computadora; un código inventado no abre nada; solo el dueño puede generar o cerrar el enlace.
- **Construido:** 2026-10-24. Migración `062_loteria_invites.sql`: la tabla `loteria_invites` (un enlace por lotería, con un código de 16 caracteres al azar y si está abierto), que solo su dueño lee, y las funciones `open_loteria_invite`, `regenerate_loteria_invite` y `close_loteria_invite`, las únicas que la escriben. Pruebas primero en `supabase/tests/062_loteria_invites.test.sql` (21). En U2, el botón «Invitar a subir fotos», la ventana M18 (`InviteDialog`, sobre el cascarón `AuthDialog`: caja centrada en computadora y hoja desde abajo en celular, rehecha así el mismo día a pedido de Carlos) y la etiqueta «Colectiva»; en U1, la misma etiqueta en cada tarjeta. El enlace apunta a `/unirse/:codigo`, la página P9 de B2: hasta construirla, que el enlace viejo o cerrado «ya no sirve» se comprueba con las pruebas de la base y se ve en pantalla con B2. La migración 062 se aplicó en el Supabase de dev el 2026-10-24; falta en producción, con permiso de Carlos, antes de fusionar a `main`.

### US B2 — Unirse con el enlace   ·   Estado: hecha — construida y revisada por Carlos el 2026-10-24

- **Historia:** Como invitado, quiero abrir el enlace y entrar a la lotería, para subir mis fotos.
- **Entrega demostrable:** Página pública nueva P9, `/unirse/:codigo`: muestra el nombre de la lotería, quién la organiza y cuántas cartas lleva, con «Entrar para subir fotos». Sin sesión abre M1 (crear cuenta da los tokens de bienvenida, §7); al entrar queda como invitado y llega a la lotería (U5). Si el enlace está cerrado o no existe, lo dice con un botón a Inicio. El organizador que abre su propio enlace llega a U2.
- **Depende de:** B1.
- **Cómo se prueba (guion de demo):** En otro navegador, abrir el enlace → ver nombre y organizador → «Entrar» → crear cuenta → llega a la lotería como invitado. Repetir con una cuenta que ya existe: entra directo. Abrir un enlace cerrado: sale el aviso.
- **Escenarios cubiertos:** sin cuenta, con cuenta, ya invitado (no se duplica), organizador, enlace cerrado o inventado, invitado quitado que vuelve a abrir el enlace (decisión 10), cuenta nueva con correo que confirma y regresa al enlace (decisión 13).
- **Construido:** 2026-10-24. Migración `063_loteria_invitees.sql`: la tabla `loteria_invitees` (quién se unió, cuándo y si lo quitaron), que leen el dueño y el propio invitado; `get_loteria_invite` (lo que muestra P9, también sin sesión: abierto, ya no sirve o quitado) y `join_loteria` (unirse; el dueño llega a su lotería y el invitado que ya estaba entra aunque el enlace esté cerrado). Pruebas primero en `supabase/tests/063_loteria_invitees.test.sql` (24). Página P9 (`JoinLoteriaPage`) en `/unirse/:codigo`: sin sesión abre M1 en «Crear cuenta», y con Google o al confirmar el correo se regresa al enlace (decisión 13, un dato opcional nuevo del registro). Al unirse lleva a `/participo/:id` (U5, de B3). La migración 063 se aplicó en el Supabase de dev el 2026-10-24.

### US B3 — El invitado sube sus fotos   ·   Estado: hecha — construida y revisada por Carlos el 2026-10-24

- **Historia:** Como invitado, quiero subir mis fotos con su título y ver las de los demás, para participar en la lotería.
- **Entrega demostrable:** La vista de invitado de la lotería (U5), con la cuadrícula de todas las cartas (con quién subió cada una) y «Subir fotos», que usa M4 y M6 con el aviso de contenido permitido (FEAT-22, FEAT-52). Las fotos entran al final de la baraja con su número (§4) y respetan las reglas del título (único en la lotería, sin emojis). Sin límite por invitado (decisión 5). El invitado no ve botones de editar, borrar, IA, tableros, PDF ni cantador (decisión 9). Con U2 abierta, el organizador ve aparecer solas las fotos que suben sus invitados, sin recargar (decisión 14).
- **Depende de:** B2. Migración: permisos de lectura de cartas e imágenes para los invitados de esa lotería, y de alta de cartas nuevas. **Pruebas primero** de esos permisos.
- **Cómo se prueba (guion de demo):** Como invitado, subir 3 fotos → aparecen al final con números 25, 26 y 27 → el organizador, que tenía U2 abierta, las ve aparecer solas en uno o dos segundos. Subir una con un título que ya existe: se rechaza con el mensaje de siempre. Intentar borrar una carta desde la consola del navegador: la base lo impide.
- **Escenarios cubiertos:** subida sola y en lote; título repetido; dos invitados subiendo a la vez (números sin huecos ni repetidos); enlace cerrado mientras sube (lo ya subido se queda; no se aceptan más); un invitado no ve ni modifica otras loterías del organizador; un invitado no lee tableros.
- **Construido:** 2026-10-24. Migración `064_loteria_guest_cards.sql`, con pruebas primero en `supabase/tests/064_loteria_guest_cards.test.sql` (32). La carta de un invitado queda a nombre del dueño (así la edita, borra y transforma como las suyas, B4) y guarda quién la subió en la columna nueva `cards.uploaded_by`; su imagen va en `<dueño>/guests/<invitado>/…`. Reglas nuevas: el invitado vigente lee la lotería, sus cartas y sus imágenes; sube imágenes solo a su carpeta y solo con el enlace abierto; agrega cartas solo con `add_guest_card` (al final, título único sin importar mayúsculas ni espacios, con la lotería bloqueada mientras se agrega para que dos invitados a la vez no repitan título); `loteria_members` da los nombres de quienes participan. No cambia ni borra cartas ni imágenes. Vista U5 (`GuestLoteriaPage`) en `/participo/:setId`: encabezado como U2 con «Colectiva», organizador y cartas; «Subir fotos» (M6) y «Agregar una foto» (M4) con el aviso de contenido; con el enlace cerrado, el aviso y sin botones; cada carta dice «Subida por …» («Del organizador» o «De un invitado» si la cuenta no tiene nombre). Pendiente conocido: si la base rechaza la carta después de subir la imagen (título repetido), la imagen queda guardada sin carta; el invitado no la puede borrar. La migración 064 se aplicó en el Supabase de dev el 2026-10-24, tras respaldar sus reglas de cartas, loterías e imágenes. En vivo (decisión 14): migración `065_cards_realtime.sql` (las cartas mandan avisos de Realtime, que respetan sus reglas de acceso; aplicada en dev el mismo día) y, en U2, `useGuestCardsLive` vuelve a pedir las cartas cuando un invitado agrega una, solo en loterías colectivas. La base de pruebas local no tiene Realtime: esto se prueba en dev.

### US B4 — El organizador administra lo que subieron   ·   Estado: por construir

- **Historia:** Como organizador, quiero saber quién subió cada carta y poder corregirla o quitarla, para que la lotería quede como yo quiero.
- **Entrega demostrable:** En U2, cada carta subida por un invitado muestra su nombre. El organizador hace con ellas lo mismo que con las suyas: cambiar título, borrar, transformar con IA (con sus tokens). La ventana «Invitados» (M19), con cuántas fotos subió cada uno y «Quitar»; al quitarlo, sus fotos se quedan (decisión 6). En U1 y U2, la lotería muestra «N fotos nuevas» hasta que el organizador la abre (decisión 8).
- **Depende de:** B3.
- **Cómo se prueba (guion de demo):** Un invitado sube 2 fotos → en Mi cuenta la lotería dice «2 fotos nuevas» → abrirla: el contador desaparece. En U2, ver «Subida por Ana» en una carta → cambiarle el título → borrarla → los números se recorren (§4). Abrir «Invitados» → quitar a Ana → sus otras cartas siguen ahí → Ana ya no puede abrir la lotería.
- **Escenarios cubiertos:** editar y borrar cartas de invitados; IA cobrada al organizador; contador de fotos nuevas que aparece y se borra; quitar a un invitado sin perder sus fotos; invitado que borra su cuenta.
- **Construido:** —

### US B5 — «Loterías donde participo»   ·   Estado: por construir

- **Historia:** Como invitado, quiero encontrar en mi cuenta las loterías a las que me invitaron, para volver a subir más fotos.
- **Entrega demostrable:** En U1, una sección «Loterías donde participo», aparte de «Mis loterías», con nombre, organizador y número de cartas; abre la vista de invitado de B3. Si el organizador cerró el enlace, la lotería sigue visible para el invitado pero sin «Subir fotos».
- **Depende de:** B3.
- **Cómo se prueba (guion de demo):** Como invitado, ir a Mi cuenta → la lotería sale en «Loterías donde participo» → abrirla. El organizador cierra el enlace → el invitado la sigue viendo sin «Subir fotos».
- **Escenarios cubiertos:** sin invitaciones (la sección no sale); varias loterías; enlace cerrado; invitado quitado (la lotería desaparece de su lista).
- **Construido:** —

## Base de conocimiento (aplicada el 2026-10-24)

Aprobada por Carlos el 2026-10-24 y aplicada en `feature/loterias-colectivas`:

- `docs/contexto-negocio.md`: §3 el actor «Invitado de una lotería»; §4 la lotería colectiva y sin límite por invitado; §5 y §12 los permisos de los invitados; §11 las entidades de invitación e invitado; §15 la fila del 2026-10-24; §17 el renglón «Loterías colectivas»; §21 nueva, con las reglas.
- `docs/casos-de-uso.md`: bloque 9, casos 31 a 33.
- `docs/diseno-mockups.md`: P9 (unirse), U5 (vista de invitado de U2), M18 (invitar), M19 (invitados) y los cambios de U1 y U2, todo «por construir (FEAT-56)». Al construir cada historia se quita su marca.
- Decisiones 10, 11 y 13 (2026-10-24, al empezar B2), aprobadas por Carlos y aplicadas el mismo día: §21 y una fila en §15 de `contexto-negocio.md`, el caso 32 de `casos-de-uso.md`, y P9 y la dirección de U5 en `diseno-mockups.md`.
- Decisión 14 (2026-10-24, al probar B3), aprobada por Carlos y aplicada el mismo día: el renglón de U2 en `diseno-mockups.md` dice que las fotos de los invitados aparecen solas.
- **Impacto en lo ya construido:** las reglas de acceso de `cards`, `loteria_sets` y del bucket de imágenes (migraciones 022 a 025) se amplían; U2 y U1 cambian; el número de carta (§4) debe seguir sin huecos con dos personas subiendo a la vez.
