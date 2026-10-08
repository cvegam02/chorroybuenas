/** Abre un enlace marcado como descarga: el navegador baja el archivo sin salir de la página. */
export function openDownloadLink(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
