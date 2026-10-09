import { DEFAULT_PDF_FILE_NAME } from './fileName';

/**
 * Tiempo que vive el enlace temporal de la descarga. Liberarlo justo después del clic puede cortar la
 * descarga en navegadores que tardan en empezarla (iPhone, navegadores internos de otras apps).
 */
export const DOWNLOAD_URL_LIFETIME_MS = 60_000;

export const downloadPDF = (blob: Blob, filename: string = DEFAULT_PDF_FILE_NAME) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
};
