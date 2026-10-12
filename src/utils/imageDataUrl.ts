/**
 * La imagen como data URL, venga como venga (data URL, imagen en memoria del navegador o dirección web).
 * Sirve para conservar una imagen que está por sobrescribirse y para guardarla: con sesión, una carta
 * solo se guarda bien si su imagen llega como data URL o dirección web.
 */
export async function imageToDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;

  const response = await fetch(src);
  if (!response.ok) throw new Error(`No se pudo leer la imagen (${response.status})`);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(blob);
  });
}
