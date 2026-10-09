/** «Día de Muertos» → «dia-de-muertos»: minúsculas, sin acentos y con guiones. Vacío si no queda nada. */
export function fileNameSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
