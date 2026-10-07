# FEAT-17 — Loterías de temporada (catálogo de pago)

**Estado: 📝 definida con Carlos el 2026-10-06; sin construir. Carlos revisó este documento y confirmó los cambios a la base de conocimiento ese mismo día («todo bien»). A1 hecha. A2 hecha. A3 hecha. A4 hecha. B1 hecha. B2 hecha. C1 hecha. C2 hecha. Siguiente historia: C3. De A4 a C1 está en commits en la rama `feature/loterias-de-temporada`, sin subir; la C2 está sin commit. Las migraciones 027 a 032 están en dev y ninguna en producción.**

**Contexto.** Hoy el sitio solo cobra por la transformación de fotos con IA. Carlos quiere una segunda cosa que vender: loterías ya hechas por él, por temporada (Halloween, Día de Muertos, Thanksgiving, Navidad…), en una sección nueva tipo catálogo. Cualquiera las ve; para descargarlas hay que pagar. Carlos las prepara fuera del sitio y las administra desde el panel: las sube, les pone precio y las publica.

**Fuera de esta feature.**

- Quitar el acceso ante un reembolso o contracargo: la regla queda definida (decisión 7), pero se construye junto con el descuento de tokens por reembolso, que está apartado sin fecha (`plan-fases.md`, «Apartado»).
- Descuentos, precios de oferta y códigos para loterías de temporada.
- Correo de aviso cuando un pago pendiente se confirma: lo cubrirá la fase 3 (avisos por correo).
- Buscador o filtros en el catálogo.
- Que el comprador edite la lotería, elija cuántos tableros o la mezcle con sus fotos.
- Un bloque de temporada en la página de Inicio.
- El menú de usuario de la barra (FEAT-16) no cambia, salvo el renglón «De Temporada» (decisión 28).

**Clasificación:** toca dinero, permisos y almacenamiento. Base de datos (tablas nuevas, reglas de acceso, dos espacios de archivos; migración 027 en adelante), edge functions de pago (crear el cobro, acreditar, volver del pago), tres pantallas nuevas (P5, P6, A1.7) y cambios en cuatro existentes (barra de navegación, U1, M11, A1.1). **Pruebas primero** en todo lo que sea cobro, entrega y permisos. Estimado: 7 a 9 sesiones.

## Decisiones tomadas con el usuario (2026-10-06)

1. **Se vende el PDF ya terminado.** Carlos sube el archivo y todos los compradores reciben el mismo. _(Descartadas: desbloquear la lotería para que el comprador elija cuántos tableros; darle una copia editable en su cuenta.)_
2. **Se paga en pesos con Mercado Pago,** un precio por lotería. Los tokens siguen sirviendo solo para la IA. _(Descartadas: pagar con tokens, porque los de bienvenida y los regalados servirían para llevárselas gratis y el precio real se vuelve confuso; aceptar las dos formas.)_
3. **Comprar requiere cuenta; ver el catálogo no.** Lo comprado queda en Mi cuenta para volver a descargarlo. _(Descartada: comprar sin cuenta y recibir un enlace por correo.)_
4. **Vista previa protegida:** Carlos sube una portada y las cartas de muestra que quiera (pocas o todas); el sitio las reduce y les pone marca de agua. El PDF nunca llega a quien no pagó. _(Descartadas: que Carlos suba las muestras ya protegidas por su cuenta; mostrar solo portada y descripción.)_
5. **Visibilidad:** cada lotería tiene «publicada sí/no» y fechas opcionales de inicio y fin, como las promociones. **Lo comprado se conserva siempre,** aunque la lotería salga del catálogo. _(Descartadas: solo interruptor manual; todo visible todo el año. Carlos consideró el 2026-10-06 que una lotería no disponible dejara de aparecerle también a quien la compró, y lo retiró.)_
6. **Ubicación:** enlace «De Temporada» en la barra de arriba, visible para todos (zona Pública); lo comprado, en Mi cuenta; la administración, en una séptima pestaña del panel. _(Descartadas: llegar solo desde un bloque en Inicio; enlace más bloque en Inicio.)_
7. **Reembolso o contracargo:** se quita el acceso a la descarga y la compra queda marcada como devuelta. Se construye después, junto con el descuento de tokens por reembolso. _(Descartada: nada automático.)_
8. **Las temporadas las crea Carlos desde el panel;** cada lotería pertenece a una. _(Descartadas: lista fija de temporadas; sin temporadas, solo una lista.)_
9. **Sin descuentos en la primera versión:** un solo precio por lotería. _(Descartadas: precio de oferta por lotería; códigos de descuento.)_
10. **Idioma:** nombre y descripción en español obligatorios, en inglés opcionales; si no hay inglés se muestra el español. El precio se cobra en pesos y en la versión en inglés se muestra además en dólares como referencia. _(Descartadas: solo español; los dos obligatorios.)_

**Consecuencias propuestas y confirmadas por Carlos (2026-10-06):**

11. Una lotería se compra **una sola vez por cuenta**: quien ya la tiene ve «Descargar» en lugar de «Comprar».
12. **Mismas garantías de cobro que los tokens:** el precio lo pone el servidor, un pago aprobado entrega la lotería una sola vez, y no se entrega si el monto pagado es menor al precio.
13. **Pagos en efectivo o transferencia:** la lotería aparece en la cuenta cuando Mercado Pago confirma; mientras, se ve como «pago en proceso».
14. **Sin correo de aviso por ahora.**
15. **Precio mínimo: $10.00 MXN.**
16. **Una lotería con ventas no se borra, solo se despublica.**
17. **Ficha:** temporada, nombre, descripción, modo (Clásico o Kids), número de cartas, número de tableros, precio, PDF, portada y muestras.
18. **Las ventas se ven en la pestaña Compras** que ya existe, distinguiendo tokens de lotería de temporada.

**Confirmado al revisar las pantallas (2026-10-06):**

19. El orden de las temporadas en el catálogo lo define Carlos con un número de orden.
20. Bajo el botón de comprar, una línea que aclara que es una descarga digital y no se envía nada físico.
21. Sin compras, la sección «Mis loterías de temporada» de Mi cuenta se muestra con un enlace al catálogo (no se esconde).
22. Sin límite de descargas para quien compró.
23. Se puede reemplazar el PDF de una lotería ya vendida, con aviso de que los compradores descargarán la versión nueva.
24. Cambiar el precio no afecta compras ya hechas: cada compra guarda lo que se pagó.
25. El interruptor «Publicada» vive en la tabla del panel, no en el formulario; no se puede publicar una lotería incompleta.
26. Una temporada solo se borra si no tiene loterías.

**Confirmado al probar A4 (2026-10-06):**

27. Para publicar hacen falta también el número de cartas y el de tableros, porque el catálogo los muestra en cada tarjeta. Amplía la decisión 25. _(Descartada: dejarlos opcionales y que el catálogo omita lo que falte.)_

28. Con sesión, el enlace «De Temporada» va dentro del menú de usuario, porque la barra solo muestra enlaces a quien no ha entrado. Ajusta la decisión 6 y lo dicho en «Fuera de esta feature» sobre el menú. _(Descartadas: mostrarlo como enlace en la barra junto al menú de usuario; las dos cosas.)_

**Decidido al diseñar, por confirmar con Carlos al probarlo** (límites técnicos, no reglas de negocio):

- PDF de hasta 50 MB. Comprobado el 2026-10-06: el tope de archivo de Supabase es de 50 MB en dev y en producción, así que no se puede subir más sin cambiar la configuración.
- Imágenes de portada y muestras: PNG, JPEG o WebP de hasta 5 MB al subir (lo mismo que las cartas, `contexto-negocio.md` §5).
- La versión que se guarda de cada imagen mide como máximo 600 px por lado y lleva la marca de agua «chorroybuenas.com.mx» repetida en diagonal.
- El enlace de descarga del PDF dura 60 segundos.
- Textos: nombre hasta 80 caracteres, descripción hasta 600.

## Diseño

### Reglas

**Qué ve cada quien.**

| Dato | Quién lo lee | Quién lo escribe |
|---|---|---|
| Temporadas | Cualquiera | Los administradores |
| Ficha, portada y muestras de una lotería visible (publicada y dentro de sus fechas) | Cualquiera | Los administradores |
| Ficha de una lotería no visible (borrador, despublicada o fuera de fechas) | Los administradores; quien la compró | Los administradores |
| PDF de una lotería | Quien tiene una compra aprobada de esa lotería; los administradores | Los administradores |
| Compras de loterías de temporada | Su dueño; los administradores | Solo el servidor |

**Cuándo es «visible» una lotería:** está publicada, ya llegó su fecha de inicio (o no tiene) y no ha pasado su fecha de fin (o no tiene). El catálogo solo muestra las visibles, y solo las temporadas que tienen al menos una.

**Cobro.**

- Al pulsar «Comprar», el servidor comprueba que haya sesión, que la lotería sea visible, y que esa cuenta no la tenga ya ni tenga un pago en proceso por ella. El precio sale de la base, nunca del navegador.
- Se respeta el precio del momento en que se inició el pago, aunque Carlos lo cambie o despublique la lotería antes de que el pago se confirme: quien pagó, recibe.
- Un pago aprobado entrega la lotería una sola vez, sin importar cuántas veces lo notifique Mercado Pago. Si el monto pagado es menor al precio, no se entrega.
- **Limitación conocida:** si alguien abre dos pagos por la misma lotería antes de que el primero se registre y paga los dos, el segundo queda guardado como compra repetida para que Carlos lo devuelva a mano. Es el mismo tipo de hueco que ya existe con los códigos promocionales (`contexto-negocio.md` §9).

**Entrega.** El PDF vive en un espacio privado. Quien tiene una compra aprobada pide un enlace temporal y lo descarga; el enlace deja de servir al minuto. No hay límite de descargas.

**Vista previa.** La portada y las muestras se reducen y se marcan **en el navegador del administrador**, antes de subirse: la imagen limpia nunca sale de la máquina de Carlos ni se guarda en el sitio. Lo que se guarda es público (cualquiera lo ve en el catálogo), pero no sirve para imprimir.

**Si se borra una cuenta.** Sus compras de temporada se conservan en el historial de ventas, sin dueño.

### Qué se guarda (propuesta técnica)

- **Temporadas** (`seasons`): nombre en español, nombre en inglés (opcional), orden.
- **Loterías de temporada** (`seasonal_loterias`): temporada, nombre y descripción (español; inglés opcional), modo, número de cartas, número de tableros, precio en centavos, publicada, fecha de inicio, fecha de fin, portada, lista ordenada de muestras, y la ubicación del PDF. La ubicación del PDF no se entrega al público: las lecturas públicas pasan por una vista o función que la omite.
- **Compras de temporada** (`seasonal_purchases`): usuario, lotería, monto pagado, pago de Mercado Pago, estado (`pendiente`, `aprobada`; `devuelta` queda reservado para el reembolso) y fecha. Tabla aparte de `token_purchases`, porque esa exige cantidades de tokens. Un mismo pago no puede repetirse; una misma cuenta no puede tener dos compras aprobadas de la misma lotería.
- **Archivos:** un espacio privado para los PDF y uno público para portada y muestras ya protegidas. Solo los administradores escriben en ambos.
- **Pago:** se reutiliza lo que ya existe para tokens (`supabase/functions/_shared/`: consulta del pago, firma, modo de checkout). La preferencia de Mercado Pago lleva una marca de tipo «lotería de temporada»; al acreditar, el servidor mira esa marca y entrega la lotería en lugar de sumar tokens. Las preferencias sin marca se siguen tratando como compra de tokens, para no romper pagos en curso.

### Pantallas

**Barra de navegación.** Enlace nuevo «De Temporada» para todos, junto a «Crear lotería». En teléfono va en el menú desplegable, con los demás enlaces.

**P5 — Catálogo «De Temporada»** (zona Pública, `/temporada`).

- Encabezado: «Loterías de temporada» y una línea que explica que son loterías ya hechas, listas para descargar e imprimir.
- Un bloque por temporada, en el orden que definió Carlos, con sus loterías en tarjetas: portada con marca de agua, nombre, renglón «Clásico · 54 cartas · 10 tableros», y el precio (en inglés, también en dólares como referencia). Varias por fila en computadora; una por fila en teléfono.
- Tocar una tarjeta abre el detalle (P6). Desde el catálogo no se compra.
- Si la cuenta ya la compró, la tarjeta dice «Ya es tuya» en lugar del precio.
- Vacío: «Pronto habrá loterías de temporada» y un botón para crear la propia lotería. Cargando: tarjetas grises. Error: aviso con «Reintentar». Sin sesión: igual que con sesión.

**P6 — Detalle de una lotería de temporada** (zona Pública, `/temporada/:id`).

- Enlace «← De Temporada», nombre y temporada.
- Portada en grande, con marca de agua.
- Cuadrícula de cartas de muestra; al tocar una se ve más grande (reutiliza la ventana M10). Si las muestras son menos que las cartas, la nota «Estas son algunas de las N cartas».
- «Qué incluye»: modo, número de cartas y de tableros, y que es un PDF tamaño carta listo para imprimir y recortar.
- Descripción.
- Recuadro de compra: precio y botón «Comprar»; debajo, la línea de que es una descarga digital. Fijo a un lado en computadora; pegado abajo en teléfono.
- «Comprar» sin sesión abre M1 y, al entrar, se vuelve a esta pantalla. Con sesión, lleva a Mercado Pago.
- Ya comprada: «Ya es tuya» y botón «Descargar PDF». Pago en proceso: «Tu pago está en proceso; aparecerá en tu cuenta cuando se confirme», sin botón de comprar.
- Al volver de Mercado Pago, un aviso arriba: aprobado («¡Listo! Ya es tuya», con «Descargar PDF» y la nota de que también está en Mi cuenta), pendiente («Tu pago está en proceso…») o cancelado («No se completó el pago», con «Comprar» disponible).
- No visible o inexistente: «Esta lotería ya no está disponible» y un botón al catálogo; quien la compró ve la pantalla con su botón de descarga. Cargando y error, como en P5.

**U1 — Mi cuenta: sección «Mis loterías de temporada»**, debajo de las loterías guardadas.

- Un renglón por compra: portada en chico, nombre, temporada, fecha de compra y «Descargar PDF».
- Las de pago en proceso llevan la etiqueta «Pago en proceso» y no tienen botón.
- Vacío: «Aún no tienes loterías de temporada» y el enlace «Ver el catálogo».
- Si la descarga falla: aviso con «Reintentar».

**M11 — Historial de compras y regalos.** Las compras de temporada entran en la misma lista por fecha, con el nombre de la lotería donde las de tokens dicen el plan, y su monto.

**A1.7 — Pestaña «De Temporada»** (zona Administración).

- **Temporadas:** lista con nombre (español e inglés), orden, número de loterías, «Editar» y «Borrar»; botón «Nueva temporada». Borrar una temporada con loterías no se permite y lo explica.
- **Loterías:** tabla con portada, nombre, temporada, precio, estado (Borrador, Publicada, Programada, Fuera de fechas), fechas, ventas y acciones (Editar, interruptor Publicar/Despublicar, Borrar). Botón «Nueva lotería» y filtro por temporada.
  - Publicar exige nombre, descripción, número de cartas, número de tableros, precio, PDF y portada; si falta algo, el interruptor no se activa y dice qué falta.
  - Borrar solo si no tiene ventas; si las tiene, el botón está apagado con «Tiene ventas: solo se puede despublicar».
- Sin temporadas: «Primero crea una temporada», y «Nueva lotería» apagado. Cargando y error, como las otras pestañas.
- **Formulario de lotería** (ventana):
  1. Datos: temporada, nombre (es / en), descripción (es / en), modo, número de cartas, número de tableros.
  2. Precio y visibilidad: precio en pesos (mínimo $10.00), fecha de inicio y de fin opcionales.
  3. Archivos: PDF (nombre, peso y «Reemplazar»; si ya tiene ventas, avisa que los compradores descargarán la versión nueva), portada (se ve cómo queda protegida) y cartas de muestra (varias a la vez, miniaturas ya protegidas, quitar y reordenar).
  4. «Guardar» y «Cancelar». Se puede guardar incompleta; lo que falta para publicar se lista arriba.
  - Subida en curso: barra de avance y «Guardar» apagado. Archivo que no cumple: aviso junto al campo, sin perder lo demás. Error al guardar: aviso arriba, formulario intacto.

**A1.1 — Compras.** Columna «Tipo» (Tokens o Lotería de temporada) y filtro por tipo. En las de temporada, el nombre de la lotería donde iría la cantidad de tokens.

**Lo que se reutiliza.** Tarjetas, botones, tablas y ventanas de las pantallas vecinas de cada zona; M1 para pedir sesión; M10 para ver una imagen en grande; M12 para confirmar borrados; el cálculo de dólares de referencia de U3. Solo colores de la paleta (`sistema-diseno.md`). Todos los textos fijos en español e inglés.

## Cambios en la base de conocimiento

**Aplicados el 2026-10-06,** con la confirmación de Carlos, tras presentarle qué cambiaba, dónde y con qué impacto. Las pantallas nuevas quedaron en el índice marcadas «por construir».

- `contexto-negocio.md`: §1 (el negocio cobra por dos cosas), §2 (aclarar que el principio central no cubre las loterías de temporada), §3 (qué puede hacer cada actor), §5 (las imágenes de muestra del catálogo son públicas), §8 (el cobro de tokens deja de ser el único), §18 nueva con las reglas de las loterías de temporada, §10, §11, §12, §13, §14 (vigencia de las loterías), §15 (las decisiones, agrupadas en doce renglones) y §17 (quitar el acceso ante un reembolso, sin construir).
- `casos-de-uso.md`: bloque 6 nuevo, casos 24 a 28 (ver el catálogo, comprar, descargar, gestionar temporadas, gestionar loterías); ajuste al caso 22 (consultar compras).
- `diseno-mockups.md`: barra de navegación, P5, P6, U1, M11, A1 (siete pestañas), A1.1 y A1.7.

## Grupo A — Administrar el catálogo

### US A1 — Crear y ordenar temporadas   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como administrador, quiero dar de alta las temporadas y decidir su orden, para organizar el catálogo sin depender de un cambio en el sitio.
- **Entrega demostrable** — En Administración hay una pestaña «De Temporada» donde creo, edito, reordeno y borro temporadas.
- **Construcción (propuesta)** — Prueba primero en `supabase/tests/027_seasonal_catalog.test.sql` (quién lee y quién escribe temporadas y loterías). Migración `supabase/migrations/027_seasonal_catalog.sql`: tablas de temporadas y de loterías de temporada con sus reglas de acceso. Repositorio nuevo `src/repositories/SeasonalRepository.ts`. Pestaña nueva `src/components/AdminPanel/AdminSeasonal.tsx`, registrada en `AdminPanel.tsx`. Textos en los dos idiomas. Aplicar la migración en dev antes de la demo.
- **Construido** — 2026-10-06, en la rama `feature/loterias-de-temporada`, sin commit todavía. Se empezó por la prueba de base `supabase/tests/027_seasonal_catalog.test.sql`: falló (las tablas no existían) y pasa con la migración `027_seasonal_catalog.sql` (34 comprobaciones nuevas; 154 en total). La migración crea las temporadas y la ficha de las loterías de temporada (sin PDF ni compras, que llegan en A2 y C1), con sus reglas: cualquiera lee las temporadas y las loterías visibles; solo un administrador escribe. Pestaña nueva «De Temporada» en el panel, con la lista de temporadas, alta, edición, orden y borrado con confirmación; reutiliza los estilos de la pestaña de packs. `src/repositories/SeasonalRepository.ts` nuevo. Los textos del panel van en español dentro del componente, como en las demás pestañas de administración. Revisión de tipos, lint y pruebas en verde (305). La migración 027 se aplicó en la base de **dev** el 2026-10-06, tras revisar su estado real (las tablas no existían; no había nada que respaldar). Comprobado después: las dos tablas existen con sus reglas de acceso activas (9 reglas), un visitante puede leer pero no escribir, y están vacías. 
  - **Demo confirmada (2026-10-06).** Carlos probó la pestaña en su máquina, que usa la base de dev, y confirmó que se ve bien («se ven bien»). No se probó en `dev.chorroybuenas.com.mx`: el código sigue sin commit. No dijo si revisó la vista en teléfono ni la entrada con una cuenta que no es administradora.
  - Decidido al construir, por confirmar con Carlos: el nombre de una temporada admite hasta 60 caracteres; al crear una temporada el orden propuesto es el siguiente al más alto; a igual orden, se ordenan por nombre. El botón de borrar de una temporada con loterías aparece apagado y explica por qué al pasar el cursor.
- **Depende de** — nada.
- **Cómo se prueba (guion de demo)** — En dev, con la cuenta de administrador → Administración → pestaña «De Temporada». Debería decir «Primero crea una temporada». Pulsa «Nueva temporada» → «Día de Muertos», orden 1 → Guardar: aparece en la lista. Crea «Navidad» con orden 2 y nombre en inglés «Christmas». Edita «Navidad» y ponle orden 0: debería subir al primer lugar. Borra una: desaparece.
- **Escenarios cubiertos**:
  - [x] Un administrador crea, edita y borra temporadas. (Prueba de base.)
  - [x] Un usuario normal o un visitante puede leer las temporadas pero no crear, editar ni borrar. (Prueba de base.)
  - [x] Nombre en español vacío: se rechaza. (Prueba de base.)
  - [x] Una temporada con loterías no se puede borrar. (Prueba de base.)
  - [ ] La pestaña solo aparece para administradores. (Demo.)
  - [ ] Se ve bien en teléfono. (Demo.)

### US A2 — Dar de alta una lotería con sus datos, precio y PDF   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como administrador, quiero crear una lotería de temporada con su ficha, su precio y su PDF, y guardarla como borrador, para prepararla con calma antes de publicarla.
- **Entrega demostrable** — Desde la pestaña creo una lotería, lleno su ficha, subo el PDF y la veo en la tabla como «Borrador»; puedo volver a editarla y reemplazar el PDF.
- **Construcción (propuesta)** — Antes de empezar, comprobar el tope de tamaño de archivo del plan de Supabase en dev y en producción. Prueba primero en `supabase/tests/028_seasonal_storage.test.sql`: el PDF no lo puede leer un visitante ni un usuario sin compra. Migración `supabase/migrations/028_seasonal_storage.sql`: espacio privado de PDF y espacio público de vistas previas, con sus reglas. Validación del formulario (precio mínimo, largos, tipo y peso de archivo) en `src/utils/` con su prueba en `tests/src/`. Formulario en `src/components/AdminPanel/` (archivo propio, no dentro de `AdminSeasonal.tsx`).
- **Construido** — 2026-10-06, en la rama `feature/loterias-de-temporada`, sin commit todavía. Tope de archivo de Supabase comprobado: 50 MB en dev y en producción. Se empezó por la prueba de base `supabase/tests/028_seasonal_storage.test.sql`: falló (no existían los espacios de archivos) y pasa con la migración `028_seasonal_storage.sql` (29 comprobaciones nuevas; 183 en total). La migración crea el espacio privado de PDF (`seasonal-pdfs`, solo PDF, 50 MB), el espacio público de vistas previas (`seasonal-previews`, imágenes, 5 MB) y el registro del PDF de cada lotería (`seasonal_loteria_files`), que vive fuera de la ficha pública para que la ubicación del PDF no llegue a nadie que no sea administrador. Solo un administrador lee o escribe en los tres; la lectura del PDF por quien lo compró llega en C2. Validación del formulario en `src/utils/seasonalLoteria.ts`, con su prueba `tests/src/seasonalLoteria.test.ts` escrita antes (17 pruebas). En la pestaña «De Temporada» hay una sección «Loterías» con la tabla (nombre, temporada, precio, estado, PDF, ventas, editar) y la ventana del formulario (`AdminSeasonalLoterias.tsx` y `AdminSeasonalLoteriaForm.tsx`). Revisión de tipos, lint y pruebas en verde (322). La migración 028 se aplicó en la base de **dev** el 2026-10-06, tras revisar su estado real (no existían ni los espacios ni la tabla; nada que respaldar). Comprobado después: los dos espacios existen con sus límites, la tabla tiene sus 4 reglas de acceso activas y un visitante no puede consultarla. **No se ha aplicado en producción.**
  - **Demo confirmada (2026-10-06).** Carlos guardó una lotería con su PDF en su máquina, que usa la base de dev, y confirmó que funciona («funcionó»). El primer intento falló por una versión a medio recargar del sitio en su navegador; se resolvió recargando la página, sin cambiar código. No se probó en `dev.chorroybuenas.com.mx`: el código sigue sin commit. No dijo si probó el precio menor a $10.00, el archivo que no es PDF ni la vista en teléfono.
  - Decidido al construir, por confirmar con Carlos: las fechas de inicio y fin se agregan al formulario en A4, junto con publicar; la tabla todavía no tiene las columnas de portada (A3) ni de fechas (A4), y «Ventas» muestra 0 hasta que existan las compras (C1); el aviso «los compradores descargarán la versión nueva» al reemplazar el PDF llega en C1, cuando se pueda saber si hay ventas; mientras se sube el PDF la barra de avance se mueve pero no indica porcentaje; cada PDF que se sube se guarda con un nombre nuevo y el anterior se borra; los textos del panel siguen en español dentro del componente.
  - Visto al revisar dev (no es de esta feature): en dev falta la regla «Users can update own card images» de las imágenes de cartas, que sí está en las migraciones del repo.
- **Depende de** — A1.
- **Cómo se prueba (guion de demo)** — En la pestaña «De Temporada» → «Nueva lotería». Elige la temporada, escribe nombre y descripción, modo Clásico, 54 cartas, 10 tableros, precio 49. Sube un PDF: debería verse su nombre y su peso. Guardar: aparece en la tabla como «Borrador», con ventas en 0. Ábrela con «Editar»: los datos siguen ahí. Prueba con precio 5: debería avisar que el mínimo es $10.00. Prueba subiendo una imagen donde va el PDF: debería rechazarla sin borrar lo demás.
- **Escenarios cubiertos**:
  - [x] Guardar una lotería incompleta la deja como borrador. (Demo.)
  - [x] Precio menor a $10.00: se rechaza. (Prueba automática y prueba de base.)
  - [x] Archivo que no es PDF, o de más de 50 MB: se rechaza con aviso junto al campo. (Prueba automática.)
  - [x] Un visitante o un usuario sin compra no puede leer el PDF, ni conociendo su ubicación. (Prueba de base.)
  - [x] Solo un administrador puede subir o reemplazar el PDF. (Prueba de base.)
  - [x] La ubicación del PDF no aparece en lo que recibe el público. (Prueba de base.)
  - [x] Un borrador no aparece para el público. (Prueba de base.)

### US A3 — Portada y cartas de muestra con marca de agua   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como administrador, quiero subir la portada y las cartas de muestra y que el sitio las proteja solo, para enseñar qué vendo sin regalar las imágenes.
- **Entrega demostrable** — En el formulario subo una portada y varias cartas; las veo ya reducidas y con marca de agua, las reordeno y quito alguna; al guardar, eso es lo único que queda en el sitio.
- **Construcción (propuesta)** — Prueba primero, en `tests/src/`, del cálculo de tamaño (ningún lado pasa de 600 px, se conserva la proporción) y del orden de las muestras. Utilidad nueva en `src/utils/` que reduce la imagen y dibuja la marca de agua antes de subirla. Bloque de archivos del formulario de A2.
- **Construido** — 2026-10-06, en la rama `feature/loterias-de-temporada`, sin commit todavía. Se empezó por la prueba `tests/src/seasonalPreview.test.ts` (13 pruebas: tamaño, orden de las muestras y validación de la imagen): falló y pasa con `src/utils/seasonalPreview.ts`, que además reduce la imagen y dibuja la marca de agua en el navegador. En el formulario, el bloque «Archivos» ahora tiene portada y cartas de muestra (`AdminSeasonalPreviews.tsx`): cada imagen se protege al elegirla y se ve ya protegida; se suben al guardar, y las que se quitaron se borran del sitio. La tabla de loterías muestra la portada en chico. No hizo falta migración: las columnas de portada y muestras venían de la 027 y el espacio público de la 028. Revisión de tipos, lint y pruebas en verde (335).
  - **Demo confirmada (2026-10-06).** Carlos probó portada y cartas de muestra en su máquina, que usa la base de dev, y confirmó que funciona («funciona bien»). No se probó en `dev.chorroybuenas.com.mx`: el código sigue sin commit. No detalló qué pasos del guion siguió ni comentó la apariencia de la marca de agua ni la vista en teléfono.
  - Decidido al construir, por confirmar con Carlos: la vista previa se guarda como JPEG (sobre fondo blanco si la original era transparente); la marca va en blanco semitransparente con borde oscuro, inclinada y repetida en toda la imagen; las muestras se reordenan arrastrando o con flechas (las flechas son las que sirven en teléfono y con teclado); no hay tope de cuántas muestras se suben; la portada también se puede quitar.
- **Depende de** — A2.
- **Cómo se prueba (guion de demo)** — Edita la lotería de A2 → sube una portada: al lado debería verse más chica y con «chorroybuenas.com.mx» cruzada. Sube seis cartas de una vez: aparecen seis miniaturas ya marcadas. Arrastra la última al primer lugar y quita una. Guardar, y vuelve a abrir: quedan cinco, en el orden que dejaste. Abre una de esas imágenes en una pestaña aparte: debería verse chica y con marca, nunca la original.
- **Escenarios cubiertos**:
  - [x] Toda imagen guardada mide como máximo 600 px por lado y lleva marca de agua. (Prueba automática del tamaño; demo de la marca.)
  - [x] La imagen original no se sube ni se guarda. (Demo.)
  - [x] Reordenar y quitar muestras se conserva al guardar. (Prueba automática del orden; demo.)
  - [x] Imagen de otro formato o de más de 5 MB: aviso junto al campo. (Prueba automática.)
  - [x] Solo un administrador puede subir o borrar portadas y muestras. (Prueba de base, en la de A2.)

### US A4 — Publicar, programar, despublicar y borrar   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como administrador, quiero decidir cuándo se ve cada lotería y que el sitio no me deje publicar una a medias ni borrar una vendida, para no cometer errores con el catálogo.
- **Entrega demostrable** — En la tabla cambio el interruptor «Publicada», pongo fechas, y veo el estado correcto (Borrador, Publicada, Programada, Fuera de fechas); el sitio me dice qué falta para publicar y no me deja borrar una lotería con ventas.
- **Construcción (propuesta)** — Prueba primero, en `tests/src/`, de la función que decide el estado a partir de publicada, fechas y la fecha de hoy, y de la que lista qué falta para publicar. Prueba de base (en `027_seasonal_catalog.test.sql`) de que no se puede publicar incompleta ni borrar con ventas. Interruptor, estados y filtro por temporada en `AdminSeasonal.tsx`.
- **Construido** — 2026-10-06, en la rama `feature/loterias-de-temporada`, sin commit todavía. Se empezó por las pruebas: `tests/src/seasonalPublishing.test.ts` (estado según publicada y fechas, qué falta para publicar, fechas del formulario), cinco pruebas más en `tests/src/seasonalLoteria.test.ts` (fechas de la ficha) y la prueba de base `supabase/tests/029_seasonal_publish_rules.test.sql` (18 comprobaciones); fallaron y pasan con `src/utils/seasonalPublishing.ts` y la migración `029_seasonal_publish_rules.sql`. La migración agrega dos reglas a la base: no se puede publicar (ni dejar publicada) una lotería sin descripción, precio, PDF o portada, y no se le puede quitar el PDF a una publicada. En la tabla de loterías hay ahora interruptor «Publicada» (apagado y con «Falta: …» si está incompleta), los cuatro estados, columna de fechas, filtro por temporada y botón de borrar con confirmación, que borra también el PDF y las imágenes. El formulario tiene «Visible desde» y «Visible hasta» y lista arriba lo que falta para publicar. Las pruebas de base 027 y 028 se ajustaron porque publicaban loterías incompletas. Revisión de tipos, lint y pruebas en verde (354; 201 comprobaciones de base). La migración 029 se aplicó en la base de **dev** el 2026-10-06, tras revisar su estado real (una sola lotería, en borrador; ningún disparador; nada que respaldar). Comprobado después: los dos disparadores existen y publicar la lotería incompleta se rechaza. **No se ha aplicado en producción** (tampoco la 027 ni la 028).
  - **Demo confirmada (2026-10-06).** Carlos probó la tabla y el formulario en su máquina, que usa la base de dev, y confirmó que funciona («todo se ve bien»). No se probó en `dev.chorroybuenas.com.mx`: el código sigue sin commit. No detalló qué pasos del guion siguió ni comentó la vista en teléfono; tampoco respondió si el número de cartas y de tableros deben ser obligatorios para publicar.
  - **Ampliación tras la demo (2026-10-06, decisión 27).** Carlos pidió que el número de cartas y el de tableros sean obligatorios para publicar, y confirmó el cambio en la base de conocimiento. Pruebas primero (`supabase/tests/030_seasonal_publish_counts.test.sql`, 7 comprobaciones, y las de `seasonalPublishing.test.ts`); migración `030_seasonal_publish_counts.sql`. El aviso «Falta: …» de la tabla y del formulario ya los incluye. Verificación en verde (354; 208 comprobaciones de base). Carlos lo probó en su máquina, contra la base de dev, y confirmó («todo bien»); no detalló qué pasos siguió. La migración 030 se aplicó en la base de **dev** el 2026-10-06 (solo reemplaza la regla de publicar; no toca datos) y se comprobó que la regla quedó ampliada. **No se ha aplicado en producción** (tampoco la 027, 028 ni 029). En dev, «Haloween» estaba publicada sin esos dos datos: sigue publicada, pero no admite cambios hasta llenarlos.
  - Cambio respecto a la propuesta: la regla necesitó migraciones propias, la 029 y la 030; por eso la de compras (C1) pasa a ser la 031. La prueba de base quedó en su propio archivo en lugar de dentro del de la 027.
  - Decidido al construir, por confirmar con Carlos: las fechas llevan también hora (como las promociones) y se escriben en la hora del navegador; a una lotería publicada no se le puede quitar descripción, precio, portada ni PDF desde el formulario: avisa que primero hay que despublicarla; la tabla conserva la columna «PDF»; el botón de borrar está siempre encendido hasta que existan las ventas (C1).
- **Depende de** — A2 y A3. El escenario de «no se borra con ventas» se completa en la demo de C1.
- **Cómo se prueba (guion de demo)** — Con una lotería sin portada, intenta publicarla: el interruptor no se mueve y dice «Falta: portada». Con la lotería completa de A3, publícala: el estado pasa a «Publicada». Ponle fecha de inicio mañana: pasa a «Programada». Ponle fecha de fin ayer: «Fuera de fechas». Quita las fechas y despublica: «Borrador». Borra una lotería sin ventas: pide confirmación y desaparece.
- **Escenarios cubiertos**:
  - [x] Estado correcto según publicada y fechas, incluidos los días límite. (Prueba automática.)
  - [x] No se puede publicar sin nombre, descripción, número de cartas, número de tableros, precio, PDF o portada. (Prueba automática y prueba de base.)
  - [x] Fecha de fin anterior a la de inicio: se rechaza. (Prueba automática y prueba de base.)
  - [x] Una lotería con ventas no se puede borrar. (Prueba de base, en la de C1.)
  - [x] Una lotería sin ventas se borra, con confirmación, junto con sus archivos. (Demo; la prueba de base cubre el registro del PDF.)

## Grupo B — Catálogo público

### US B1 — Ver el catálogo «De Temporada»   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como visitante, quiero ver las loterías de temporada disponibles, agrupadas por temporada y con su precio, para saber qué puedo comprar.
- **Entrega demostrable** — En la barra de arriba hay un enlace «De Temporada» que abre el catálogo con las loterías visibles, sin necesidad de iniciar sesión.
- **Construcción (propuesta)** — Prueba primero, en `tests/src/`, de la función que agrupa por temporada, ordena y descarta temporadas vacías. Pantalla nueva en `src/components/Seasonal/`, ruta `/temporada` en `AppRouter.tsx`, enlace en `Navbar.tsx`. Lectura pública en `SeasonalRepository.ts`. Textos en los dos idiomas; dólares de referencia como en `BuyTokensPage.tsx`.
- **Construido** — 2026-10-06, en la rama `feature/loterias-de-temporada`, sin commit todavía. Prueba `tests/src/seasonalCatalog.test.ts` (11 pruebas: agrupar por temporada, orden, descartar temporadas vacías y loterías no visibles, texto en inglés con respaldo en español) y `src/utils/seasonalCatalog.ts`; esta vez la prueba y el código se escribieron juntos, sin ver fallar la prueba antes. Pantalla nueva `src/components/Seasonal/SeasonalCatalog.tsx` en la ruta `/temporada`, con sus estados de cargando (tarjetas grises), error con «Reintentar» y vacío con botón para crear la propia lotería. Lectura pública en `SeasonalRepository.getCatalog`. El cálculo de dólares de referencia se sacó de la pantalla de comprar tokens a `src/utils/usdReference.ts` para compartirlo. Textos en español e inglés. Enlace «De Temporada» en la barra, junto a «Crear Lotería», **solo para visitantes**. Sin migración. Revisión de tipos, lint y pruebas en verde (365).
  - **Demo confirmada (2026-10-06).** Carlos probó el catálogo y el enlace del menú en su máquina, que usa la base de dev, y confirmó («me gusta así»). No se probó en `dev.chorroybuenas.com.mx`: el código sigue sin commit. No detalló qué pasos siguió ni si revisó la vista en teléfono, el inglés o el catálogo vacío. `diseno-mockups.md` se actualizó el mismo día con su confirmación: el enlace va en la barra sin sesión y en el menú de usuario con sesión, y P5 ya no dice «por construir».
  - **Decidido con Carlos (2026-10-06, decisión 28):** la barra solo muestra enlaces a quien no tiene sesión, así que con sesión «De Temporada» va como un renglón del menú de usuario: en computadora después de «Mi cuenta», en teléfono después de «Comprar tokens». Construido el mismo día.
  - Decidido al construir, por confirmar con Carlos: dentro de cada temporada las loterías van por nombre; las tarjetas ya enlazan al detalle (`/temporada/:id`), que no existe hasta B2; la nota de que el cobro es en pesos reutiliza el texto de la pantalla de comprar tokens; el catálogo se ve igual para un administrador que para cualquiera (no muestra borradores). «Ya es tuya» en la tarjeta llega con las compras (C1).
- **Depende de** — A4 (para tener loterías publicadas).
- **Cómo se prueba (guion de demo)** — Sin iniciar sesión, abre `dev.chorroybuenas.com.mx` → en la barra de arriba pulsa «De Temporada». Deberían verse las temporadas en el orden que definiste, cada una con sus loterías: portada con marca de agua, nombre, «Clásico · 54 cartas · 10 tableros» y precio. La lotería que dejaste en borrador no debe estar. Cambia el idioma a inglés: el precio muestra también dólares, y la temporada «Navidad» dice «Christmas». Despublica todas desde el panel y recarga: «Pronto habrá loterías de temporada» y un botón para crear tu lotería. Ábrelo desde el celular: una tarjeta por fila, y el enlace dentro del menú.
- **Escenarios cubiertos**:
  - [x] Solo aparecen loterías publicadas y dentro de sus fechas. (Prueba de base de A1/A4 y prueba automática.)
  - [x] Una temporada sin loterías visibles no se muestra. (Prueba automática.)
  - [x] Las temporadas salen en el orden definido. (Prueba automática.)
  - [x] En inglés se usa el texto en inglés si existe; si no, el español. (Prueba automática.)
  - [ ] Catálogo vacío, cargando y error. (Demo del vacío.)
  - [ ] Se ve igual con y sin sesión. (Demo.)
  - [ ] Se ve bien en teléfono. (Demo.)

### US B2 — Ver el detalle de una lotería   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como visitante, quiero ver la portada, las cartas de muestra y qué incluye una lotería antes de pagarla, para decidir si la compro.
- **Entrega demostrable** — Al tocar una tarjeta del catálogo se abre el detalle con portada, muestras ampliables, qué incluye, descripción y el recuadro con precio y botón «Comprar»; sin sesión, el botón pide iniciar sesión y me regresa a la misma pantalla.
- **Construcción (propuesta)** — Pantalla nueva en `src/components/Seasonal/`, ruta `/temporada/:id`. Reutiliza `CardPreviewModal` (M10) y `EmailAuthModal` (M1). En esta historia, «Comprar» con sesión todavía no cobra: muestra un aviso de «disponible pronto», que se sustituye en C1.
- **Construido** — 2026-10-06, en la rama `feature/loterias-de-temporada`, sin commit todavía. Se empezó por la prueba: cuatro casos nuevos en `tests/src/seasonalCatalog.test.ts` para la nota «Estas son algunas de las N cartas»; fallaron y pasan con `showsSampleNote` en `src/utils/seasonalCatalog.ts`. Pantalla nueva `src/components/Seasonal/SeasonalDetail.tsx` en la ruta `/temporada/:id`, con sus estados de cargando, error con «Reintentar» y «ya no está disponible» con botón al catálogo. Lectura en `SeasonalRepository.getLoteriaDetail`. Las muestras se amplían con la ventana M10 y «Comprar» sin sesión abre M1; ninguna de las dos se modificó. Textos en español e inglés. Sin migración. Revisión de tipos, lint y pruebas en verde (369).
  - **Demo confirmada (2026-10-06).** Carlos probó el detalle en su máquina, que usa la base de dev, y confirmó que funciona («todo funciona»). No se probó en `dev.chorroybuenas.com.mx`: el código sigue sin commit. No detalló qué pasos del guion siguió ni comentó la vista en teléfono, el inglés ni las decisiones de abajo. `diseno-mockups.md` se actualizó el mismo día con su confirmación: P6 y la mención de M10 ya no dicen «por construir».
  - Decidido al construir, por confirmar con Carlos: con sesión, «Comprar» muestra «La compra estará disponible pronto» dentro del recuadro, hasta C1; un administrador que abre la dirección de un borrador ve «ya no está disponible», igual que cualquiera; una dirección mal escrita se trata como lotería inexistente; en la ventana ampliada cada muestra se titula «Carta de muestra 1», «2»…; el recuadro de compra pasa a ir pegado abajo cuando la pantalla mide menos de 800 px de ancho; en inglés el recuadro repite la nota de que el cobro es en pesos; si la lotería no tiene muestras, esa sección no aparece. La ventana de iniciar sesión solo ofrece correo y contraseña, y por eso al entrar se sigue en la misma lotería.
- **Depende de** — B1.
- **Cómo se prueba (guion de demo)** — En el catálogo, toca una lotería. Debería verse la portada grande, las muestras, la nota «Estas son algunas de las 54 cartas», «Qué incluye», la descripción y el recuadro con el precio, «Comprar» y la línea de descarga digital. Toca una muestra: se ve más grande, con marca de agua; ciérrala con Escape. Sin sesión, pulsa «Comprar»: se abre la ventana de iniciar sesión; al entrar, sigues en la misma lotería. Abre la dirección de una lotería en borrador: «Esta lotería ya no está disponible» y un botón al catálogo. En el celular, el recuadro de compra queda pegado abajo.
- **Escenarios cubiertos**:
  - [ ] Detalle completo de una lotería visible, con y sin sesión. (Demo.)
  - [x] La nota de «algunas de las N cartas» solo sale si las muestras son menos que las cartas. (Prueba automática.)
  - [ ] Lotería no visible o inexistente: mensaje de no disponible. (Demo.)
  - [ ] «Comprar» sin sesión abre el inicio de sesión y regresa a la misma pantalla. (Demo.)
  - [ ] Teclado, Escape y textos alternativos. (Demo.)
  - [ ] Se ve bien en teléfono. (Demo.)

## Grupo C — Compra y entrega

### US C1 — Comprar una lotería y que quede en mi cuenta   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como usuario registrado, quiero pagar una lotería de temporada con Mercado Pago y que quede registrada como mía, para poder descargarla.
- **Entrega demostrable** — Con sesión, «Comprar» me lleva a Mercado Pago; al pagar con una tarjeta de prueba vuelvo al detalle con el aviso «¡Listo! Ya es tuya», y la lotería deja de ofrecer «Comprar».
- **Construcción (propuesta)** — **Pruebas primero.** Base: `supabase/tests/031_seasonal_purchases.test.sql` (un pago se registra una sola vez; quién lee las compras; nadie escribe desde el navegador; la función de entrega solo la ejecuta el servidor). Funciones: pruebas en `tests/functions/` de la preferencia de temporada, de la decisión tokens / temporada al acreditar y del rechazo por monto menor. Migración `supabase/migrations/031_seasonal_purchases.sql` (tabla de compras y función de entrega idempotente). Edge function nueva `create-seasonal-preference`; `_shared/paymentFlow.ts` y `_shared/credit.ts` aprenden a distinguir el tipo de compra; `webhook-mercadopago` y `credit-payment-on-return` entregan la lotería cuando corresponde. Aviso de retorno en la pantalla de detalle. Desplegar migración y funciones en dev antes de la demo.
- **Construido** — 2026-10-06, en la rama `feature/loterias-de-temporada`, sin commit todavía. Se empezó por las pruebas, y se vieron fallar antes de escribir el código: la de base `supabase/tests/031_seasonal_purchases.test.sql` (28 comprobaciones; 236 en total) y las de funciones `tests/functions/seasonal.test.ts` más seis casos nuevos en `tests/functions/paymentFlow.test.ts`. Migración `031_seasonal_purchases.sql`: tabla de compras de temporada (la lee su dueño y los administradores; desde el navegador no escribe nadie, ni un administrador) y la función de entrega `deliver_seasonal_purchase`, que solo ejecuta el servidor y registra cada pago una sola vez. Lógica nueva en `supabase/functions/_shared/seasonal.ts`; función nueva `create-seasonal-preference`; `_shared/paymentFlow.ts` mira la marca de la preferencia y entrega la lotería o suma tokens, y `webhook-mercadopago` y `credit-payment-on-return` ya entregan loterías. En el detalle, «Comprar» lleva a Mercado Pago y al volver se muestra el aviso (aprobado, en proceso o no completado); la lotería comprada dice «Ya es tuya» en el detalle y en su tarjeta del catálogo. En el panel, la columna «Ventas» ya cuenta, borrar queda apagado con «Tiene ventas: solo se puede despublicar», y al reemplazar el PDF de una lotería vendida se avisa que los compradores descargarán la versión nueva (pendiente que venía de A2). Textos en español e inglés. Revisión de tipos, lint y pruebas en verde (417).
  - **En dev (2026-10-06):** tras revisar su estado real (no existían ni la tabla ni la función; nada que respaldar) se aplicó la migración 031 y se desplegaron `create-seasonal-preference`, `credit-payment-on-return` y `webhook-mercadopago`. Comprobado después: la tabla tiene sus 2 reglas de acceso activas, un visitante no la lee, un usuario no puede insertar ni ejecutar la función de entrega, y el cobro responde «inicia sesión» a quien no trae sesión. **Nada de esto está en producción** (tampoco las migraciones 027 a 030).
  - **Demo confirmada (2026-10-06).** Carlos compró una lotería en su máquina, que usa la base de dev, y confirmó que funcionó («ya la pude comprar»). Comprobado después en la base de dev: una sola compra, de «Haloween», aprobada, por $80.00, igual a su precio. No se probó en `dev.chorroybuenas.com.mx`: el código sigue sin commit. No dijo si probó cancelar un pago, el botón de borrar apagado en el panel, comprar tokens, el inglés ni la vista en teléfono, ni comentó las decisiones de abajo.
  - Cambio a una prueba existente: en `paymentFlow.test.ts`, la acreditación de tokens devuelve ahora «tokens, saldo 12» donde antes devolvía solo «12»; lo que se acredita no cambió. `hardening.test.ts` incluye la función nueva en su lista.
  - Decidido al construir, por confirmar con Carlos: el pago repetido se guarda con un estado propio, «repetida», además de pendiente, aprobada y devuelta; una lotería con cualquier pago registrado (también uno repetido) no se puede borrar, aunque «Ventas» cuenta solo las aprobadas; si Mercado Pago no informa el monto pagado, no se entrega (con los tokens ese caso sí se acredita); todavía no hay botón «Descargar PDF» y el aviso de pago aprobado dice solo «¡Listo! Ya es tuya», sin la nota de Mi cuenta: las dos cosas llegan en C2; «pago en proceso» es por ahora solo el aviso al volver, y no impide iniciar otro cobro hasta C3; quien compró una lotería que después se despublica sigue viendo «ya no está disponible» hasta C2; si no se puede consultar qué compró la cuenta, se muestra el precio y «Comprar» (el servidor no cobra dos veces).
- **Depende de** — B2.
- **Cómo se prueba (guion de demo)** — En dev, con una cuenta normal → «De Temporada» → una lotería → «Comprar». Deberías llegar a Mercado Pago con el nombre de la lotería y su precio. Paga con la tarjeta de prueba aprobada. Vuelves al detalle con «¡Listo! Ya es tuya». Recarga: el recuadro dice «Ya es tuya» y no ofrece comprar. En el catálogo, su tarjeta dice «Ya es tuya». Repite con otra lotería y cancela el pago: vuelves con «No se completó el pago» y «Comprar» sigue ahí. En el panel, intenta borrar la lotería vendida: el botón está apagado con «Tiene ventas: solo se puede despublicar».
- **Escenarios cubiertos**:
  - [x] Pago aprobado: la compra queda registrada a nombre de quien pagó, con el monto. (Prueba de base.)
  - [x] La misma notificación repetida no registra dos compras. (Prueba de base.)
  - [x] Monto pagado menor al precio: no se entrega. (Prueba automática.)
  - [x] Sin sesión no se puede iniciar el cobro. (Comprobado con una llamada real a la función en dev; las pruebas automáticas no ejecutan esa parte.)
  - [x] El precio sale de la base; lo que mande el navegador se ignora. (Prueba automática.)
  - [x] No se puede iniciar el cobro de una lotería que la cuenta ya tiene. (Prueba automática.)
  - [x] No se puede iniciar el cobro de una lotería no visible. (Prueba automática.)
  - [x] Si el precio cambia o la lotería se despublica con el pago en curso, quien pagó la recibe al precio con que inició. (Prueba automática.)
  - [x] Un segundo pago aprobado por la misma lotería y cuenta queda guardado como repetido, sin romper nada. (Prueba de base.)
  - [ ] Una compra de tokens se sigue acreditando igual que antes. (Pruebas existentes en verde; falta la demo comprando tokens.)
  - [x] Un usuario no ve compras de otros ni puede inventarse una. (Prueba de base.)

### US C2 — Descargar lo que compré   ·   Estado: ✅ hecha (2026-10-06)

- **Historia** — Como comprador, quiero descargar mi lotería desde el detalle y desde Mi cuenta las veces que quiera, para imprimirla cuando la necesite.
- **Entrega demostrable** — En el detalle de una lotería comprada y en la sección «Mis loterías de temporada» de Mi cuenta hay un botón «Descargar PDF» que baja el archivo; quien no la compró no puede obtenerlo.
- **Construcción (propuesta)** — **Prueba primero**, ampliando `028_seasonal_storage.test.sql`: con compra aprobada se puede leer el PDF; con compra pendiente, sin compra, con la compra de otra lotería o sin sesión, no. Regla de acceso del espacio de PDF ligada a las compras aprobadas. Pedido del enlace temporal en `SeasonalRepository.ts`. Sección nueva en `Dashboard.tsx` como componente aparte (ese archivo ya es grande). Botón en el detalle.
- **Construido** — 2026-10-06, en la rama `feature/loterias-de-temporada`, sin commit todavía. Se empezó por la prueba de base `supabase/tests/032_seasonal_download.test.sql` (17 comprobaciones; 253 en total): falló y pasa con la migración `032_seasonal_download.sql`. La migración agrega tres reglas de solo lectura para quien tiene una compra aprobada: lee el PDF vigente de esa lotería, conoce su ubicación y sigue viendo su ficha aunque ya no esté en el catálogo. Una compra pendiente o devuelta no da acceso, y la compra de una lotería no abre el PDF de otra. Botón «Descargar PDF» (`SeasonalDownloadButton.tsx`), que pide un enlace de 60 segundos y baja el archivo; está en el detalle de una lotería comprada y en la sección nueva «Mis loterías de temporada» de Mi cuenta (`MySeasonalLoterias.tsx`, componente aparte), debajo de las loterías guardadas: portada en chico, nombre, temporada, fecha de compra y el botón; vacía, muestra «Aún no tienes loterías de temporada» y «Ver el catálogo». Si la descarga falla, aviso con «Reintentar». Quien compró una lotería que después se despublica ya ve su detalle con el botón. Textos en español e inglés. Revisión de tipos, lint y pruebas en verde (417).
  - **En dev (2026-10-06):** tras revisar las reglas de lectura que había (solo las de administradores y la pública), se aplicó la migración 032 y se comprobó que las tres reglas nuevas existen. No hubo funciones que desplegar. **No está en producción.**
  - **Demo confirmada (2026-10-06).** Carlos lo probó en su máquina, que usa la base de dev, y confirmó («funciona perfectamente»). No se probó en `dev.chorroybuenas.com.mx`: el código sigue sin commit. No detalló qué pasos del guion siguió (despublicar y volver a descargar, la cuenta sin compras, reemplazar el PDF, el fallo de descarga, el inglés, la vista en teléfono) ni comentó las decisiones de abajo.
  - Cambio respecto a la propuesta: la prueba de base quedó en su propio archivo (032) en lugar de ampliar la de la 028. No hay prueba automática de la interfaz.
  - Decidido al construir, por confirmar con Carlos: el archivo se baja con el nombre con que Carlos lo subió; una lotería comprada ya no muestra su precio en el detalle; el aviso de pago aprobado dice «¡Listo! Ya es tuya. Descárgala aquí o desde Mi cuenta.» y el botón está en el recuadro, no dentro del aviso; en Mi cuenta el nombre de cada lotería enlaza a su detalle; las compras salen de la más reciente a la más antigua; solo se puede leer el PDF vigente (una versión anterior que quedara guardada no); la etiqueta «Pago en proceso» de la sección llega en C3.
- **Depende de** — C1.
- **Cómo se prueba (guion de demo)** — Con la cuenta que compró en C1 → Mi cuenta. Bajo tus loterías guardadas debería estar «Mis loterías de temporada» con la que compraste: portada, nombre, temporada, fecha y «Descargar PDF». Púlsalo: se descarga el PDF que subiste. Descárgala otra vez desde el detalle de la lotería. Despublícala desde el panel y recarga Mi cuenta: sigue ahí y se sigue descargando. Entra con otra cuenta que no compró nada: la sección dice «Aún no tienes loterías de temporada» con el enlace «Ver el catálogo».
- **Escenarios cubiertos**:
  - [x] Con compra aprobada se descarga el PDF, sin límite de veces. (Prueba de base del permiso; falta la demo de la descarga.)
  - [x] Sin compra, con compra pendiente o sin sesión, no se puede obtener el PDF. (Prueba de base.)
  - [x] La compra de una lotería no da acceso al PDF de otra. (Prueba de base.)
  - [x] Una lotería despublicada o fuera de fechas sigue disponible para quien la compró. (Prueba de base; falta la demo.)
  - [ ] Si Carlos reemplaza el PDF, el comprador descarga la versión nueva. (Demo.)
  - [ ] Sección vacía con enlace al catálogo. (Demo.)
  - [ ] Fallo al descargar: aviso con «Reintentar». (Demo.)

### US C3 — Pago en efectivo o transferencia   ·   Estado: ⬜ por hacer

- **Historia** — Como comprador que paga en efectivo o por transferencia, quiero ver que mi compra quedó registrada mientras se confirma, y recibir la lotería cuando Mercado Pago lo confirme, para no pagar dos veces ni quedarme con la duda.
- **Entrega demostrable** — Tras elegir un pago pendiente vuelvo al detalle con «Tu pago está en proceso»; en Mi cuenta la lotería aparece con la etiqueta «Pago en proceso» y sin descarga; cuando el pago se aprueba, pasa a descargable.
- **Construcción (propuesta)** — **Prueba primero**: en `tests/functions/`, que un pago pendiente se registra como pendiente y que al aprobarse pasa a aprobado sin duplicarse; en `031_seasonal_purchases.test.sql`, el paso de pendiente a aprobada. Hoy el flujo de pago descarta todo lo que no esté aprobado (`_shared/paymentFlow.ts`): hay que agregar el registro del pendiente solo para compras de temporada, sin cambiar lo que pasa con los tokens. Estados en el detalle y en la sección de Mi cuenta.
- **Construido** —
- **Depende de** — C2.
- **Cómo se prueba (guion de demo)** — En dev, compra una lotería eligiendo pago en efectivo (o la tarjeta de prueba que deja el pago pendiente). Vuelves al detalle con «Tu pago está en proceso…» y sin botón de comprar. En Mi cuenta aparece con «Pago en proceso», sin «Descargar PDF». Cuando el pago se apruebe (lo simulamos juntos en dev), recarga: ya tiene «Descargar PDF».
- **Escenarios cubiertos**:
  - [ ] Un pago pendiente queda registrado como pendiente. (Prueba automática.)
  - [ ] Con un pago pendiente no se puede iniciar otro cobro por la misma lotería. (Prueba automática.)
  - [ ] Al aprobarse, la compra pasa a aprobada y no se duplica. (Prueba de base.)
  - [ ] Un pago pendiente no da acceso al PDF. (Prueba de base de C2.)
  - [ ] Un pago pendiente que se rechaza o caduca deja de bloquear una nueva compra. (Prueba automática.)
  - [ ] Los pagos pendientes de tokens se comportan igual que antes. (Pruebas existentes en verde.)

### US C4 — Las compras de temporada en los historiales   ·   Estado: ⬜ por hacer

- **Historia** — Como usuario quiero ver mis compras de loterías de temporada en mi historial, y como administrador quiero verlas en la pestaña Compras distinguidas de las de tokens, para llevar la cuenta de lo que se vendió.
- **Entrega demostrable** — El historial de Mi cuenta muestra las compras de temporada mezcladas por fecha con las de tokens y los regalos; la pestaña Compras del panel tiene columna y filtro «Tipo», y la tabla de loterías muestra cuántas ventas lleva cada una.
- **Construcción (propuesta)** — Prueba primero ampliando `tests/src/tokenHistory.test.ts` (mezcla de tres tipos de fila). Prueba de base de la lista de compras del panel con los dos tipos y de que solo la ve un administrador. `src/utils/tokenHistory.ts`, `PurchaseHistoryModal.tsx`, `AdminPurchases.tsx`, y la función de base que alimenta esa pestaña.
- **Construido** —
- **Depende de** — C1.
- **Cómo se prueba (guion de demo)** — Con la cuenta que compró → Mi cuenta → historial: debería verse una fila con el nombre de la lotería, su monto y la fecha, entre tus compras de tokens. Con la cuenta de administrador → Administración → Compras: la compra aparece con Tipo «Lotería de temporada» y el nombre de la lotería; filtra por tipo y solo quedan esas. En la pestaña «De Temporada», la columna Ventas de esa lotería dice 1.
- **Escenarios cubiertos**:
  - [ ] Compras de tokens, de temporada y regalos se mezclan por fecha en el historial del usuario. (Prueba automática.)
  - [ ] Las compras pendientes de temporada no aparecen como compras hechas. (Prueba automática.)
  - [ ] El panel distingue y filtra por tipo. (Prueba de base; demo.)
  - [ ] Solo un administrador ve las compras de todos. (Prueba de base.)
  - [ ] El número de ventas de cada lotería cuenta solo compras aprobadas. (Prueba de base.)

## Apartado — Quitar el acceso ante un reembolso

Regla definida (decisión 7), sin construir. Se hace junto con el descuento de tokens por reembolso (`plan-fases.md`, «Apartado»), porque es el mismo mecanismo: recibir el aviso de pago devuelto de Mercado Pago. Para una lotería de temporada: la compra pasa a «devuelta», deja de aparecer en Mi cuenta y ya no se puede descargar; si el archivo ya se bajó, eso no se puede deshacer.
