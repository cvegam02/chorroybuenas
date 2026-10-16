import { useEffect, useRef, useState } from 'react';
import { OfferRepository } from '../../repositories/OfferRepository';
import { bannerFilePath, checkBannerImage, checkBannerVideo } from '../../utils/offerBanner';
import { readVideoInfo } from '../../utils/videoFile';

const MB = 1024 * 1024;

/** Un archivo del banner: el ya guardado (con su ubicación) o uno recién elegido (con el archivo). */
export interface BannerMedia {
  url: string;
  path: string | null;
  file: Blob | null;
  contentType: string;
  label: string;
  detail: string;
}

interface MediaState {
  video: BannerMedia | null;
  image: BannerMedia | null;
  /** La imagen es el primer cuadro del video (decisión 10): cambia si se cambia el video. */
  imageFromVideo: boolean;
}

const sizeLabel = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;

const saved = (path: string | null, label: string, contentType: string): BannerMedia | null =>
  path ? { url: OfferRepository.bannerFileUrl(path), path, file: null, contentType, label, detail: 'Guardado' } : null;

/** Archivos del banner en la pantalla de la oferta (FEAT-49, US A4). Se suben al guardar. */
export function useBannerMedia(videoPath: string | null, imagePath: string | null) {
  const [media, setMedia] = useState<MediaState>(() => ({
    video: saved(videoPath, 'Video guardado', 'video/mp4'),
    image: saved(imagePath, 'Imagen guardada', 'image/jpeg'),
    imageFromVideo: false,
  }));
  const [error, setError] = useState<{ video?: string; image?: string }>({});
  const [reading, setReading] = useState(false);
  // Direcciones `blob:` creadas aquí: se liberan al salir.
  const objectUrls = useRef<string[]>([]);
  // Lo guardado en la base: lo que se borra cuando se reemplaza.
  const savedPaths = useRef({ video: videoPath, image: imagePath });

  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const localUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    objectUrls.current.push(url);
    return url;
  };

  const chooseVideo = async (file: File) => {
    setReading(true);
    const url = localUrl(file);
    const info = await readVideoInfo(url).catch(() => ({ duration: Number.NaN, firstFrame: null }));
    setReading(false);
    const problem = checkBannerVideo({ type: file.type, size: file.size, duration: info.duration });
    if (problem) {
      setError((prev) => ({ ...prev, video: problem }));
      return;
    }
    setError({});
    setMedia((prev) => {
      const replaceImage = (prev.image === null || prev.imageFromVideo) && info.firstFrame !== null;
      return {
        video: { url, path: null, file, contentType: 'video/mp4', label: file.name, detail: `${Math.round(info.duration)} s · ${sizeLabel(file.size)}` },
        image: replaceImage && info.firstFrame
          ? { url: localUrl(info.firstFrame), path: null, file: info.firstFrame, contentType: 'image/jpeg', label: 'Se toma del primer cuadro', detail: 'o sube otra' }
          : prev.image,
        imageFromVideo: replaceImage || prev.imageFromVideo,
      };
    });
  };

  const chooseImage = (file: File) => {
    const problem = checkBannerImage({ type: file.type, size: file.size });
    if (problem) {
      setError((prev) => ({ ...prev, image: problem }));
      return;
    }
    setError((prev) => ({ ...prev, image: undefined }));
    setMedia((prev) => ({
      ...prev,
      image: { url: localUrl(file), path: null, file, contentType: file.type, label: file.name, detail: sizeLabel(file.size) },
      imageFromVideo: false,
    }));
  };

  /**
   * Sube lo recién elegido a `<id de la oferta>/…` y devuelve las ubicaciones, o null si algo falla.
   * `replaced` son los archivos guardados que dejan de usarse, para borrarlos después de guardar.
   */
  const upload = async (offerId: string): Promise<{ video: string | null; image: string | null; replaced: string[] } | null> => {
    const at = Date.now();
    const result = { video: media.video?.path ?? null, image: media.image?.path ?? null, replaced: [] as string[] };
    for (const kind of ['video', 'image'] as const) {
      const item = media[kind];
      if (!item?.file) continue;
      const path = await OfferRepository.uploadBannerFile(bannerFilePath(offerId, kind, item.contentType, at), item.file, item.contentType);
      if (!path) return null;
      const previous = savedPaths.current[kind];
      if (previous) result.replaced.push(previous);
      result[kind] = path;
    }
    return result;
  };

  /** Después de guardar, lo subido ya es lo guardado. */
  const markSaved = (paths: { video: string | null; image: string | null }) => {
    savedPaths.current = paths;
    setMedia((prev) => ({
      ...prev,
      video: prev.video && { ...prev.video, path: paths.video, file: null, detail: prev.video.file ? prev.video.detail : 'Guardado' },
      image: prev.image && { ...prev.image, path: paths.image, file: null },
    }));
  };

  return { media, error, reading, chooseVideo, chooseImage, upload, markSaved };
}
