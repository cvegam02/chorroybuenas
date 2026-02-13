# Mejoras (chat – UI/UX)

Mejoras detectadas en pruebas de UI/UX del chat. Se irán añadiendo ítems de forma incremental.

## Lista de mejoras

1. **Hero – móvil:** Centrar el botón "Crear Loteria" en el hero para la versión móvil.
2. **Modal de registro – contraseña:**
   - Añadir icono de mostrar/ocultar contraseña para que el usuario pueda ver lo que escribió.
   - Opcional: mostrar cada carácter por un momento al escribirlo y luego ocultarlo (comportamiento tipo "reveal temporal" que usan algunas apps).
3. **Post-registro:** Después de registrarse, informar al usuario que se envió un correo para confirmar su cuenta y que debe confirmarlo para poder acceder.
4. **Subida de imágenes:** Mostrar un modal mientras se suben imágenes con el mensaje "Subiendo imágenes" y una barra de progreso (progress bar) que indique el avance.
5. **Móvil – paso de cartas:** En la versión móvil, el botón "Siguiente: generar tableros" aparece arriba de las cartas; debería mostrarse en la parte inferior.
6. **Convertir todas con IA:**
   - Validar qué imágenes ya fueron generadas con IA y descartarlas (no incluirlas en la conversión).
   - En el modal de confirmación que muestra el costo real de la transformación, mostrar también los tokens que se van a consumir.
7. **Modal de transformación batch con IA:** Al transformar un batch de imágenes con IA, el modal tarda bastante. Dar la opción de cerrar el modal y que el proceso siga ejecutándose en segundo plano. Las cartas que se están transformando deben mostrar el mismo comportamiento que en la opción individual "Regenerar con IA" (indicator de carga por carta).
8. **Conversión batch – subida incremental:** Actualmente tras terminar de convertir todas las imágenes con IA hay que subirlas después, y es muy tardado. Cambiar el flujo para que cada imagen se suba en cuanto se termine de convertir (conversión + subida por imagen), en lugar de convertir todo primero y luego subir todo.
9. **Persistir modo de cuadrícula (3x3 / 4x4):** La lotería no guarda si el set es 3x3 o 4x4. Al entrar a la página del set (/loterias/:set_id) no se puede generar tableros porque exige mínimo 20 cartas aunque el usuario haya elegido 3x3 (que requiere menos). Guardar y respetar el modo de cuadrícula elegido al crear/editar el set.
10. **Creación de tableros – duplicación:** La lógica de crear tableros distribuida entre diferentes páginas provoca que se creen muchos tableros (duplicados o innecesarios). Revisar y consolidar el flujo de creación para evitar multiplicación de tableros.
