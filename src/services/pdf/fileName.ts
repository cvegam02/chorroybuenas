import { fileNameSlug } from '../../utils/fileNameSlug';

/** El nombre de siempre: lo lleva la lotería del visitante sin sesión, que no tiene nombre. */
export const DEFAULT_PDF_FILE_NAME = 'loteria-tableros.pdf';

const FILE_NAME_PREFIX = 'loteria';

/** «Cumple de Ana» → «loteria-cumple-de-ana.pdf». Si el nombre ya empieza con «Lotería», no se repite. */
export function pdfFileName(setName?: string | null): string {
  const slug = fileNameSlug(setName ?? '');
  if (!slug) return DEFAULT_PDF_FILE_NAME;
  return `${slug.startsWith(FILE_NAME_PREFIX) ? slug : `${FILE_NAME_PREFIX}-${slug}`}.pdf`;
}
