/**
 * Lectura de un video elegido en el navegador (FEAT-49, US A4): cuánto dura y su primer cuadro, que es
 * la imagen fija del banner en celular si no se sube otra (decisión 10).
 */

/** Carga el video sin mostrarlo y espera a que el navegador sepa su duración. */
function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error('No se pudo leer el video.'));
    video.src = url;
  });
}

export interface VideoInfo {
  duration: number;
  /** Primer cuadro en JPG; null si el navegador no pudo dibujarlo. */
  firstFrame: Blob | null;
}

/** Duración y primer cuadro del video en `url` (un `blob:` del archivo elegido). */
export async function readVideoInfo(url: string): Promise<VideoInfo> {
  const video = await loadVideo(url);
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context || canvas.width === 0) return { duration: video.duration, firstFrame: null };
  context.drawImage(video, 0, 0);
  const firstFrame = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return { duration: video.duration, firstFrame };
}
