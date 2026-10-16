import { SeasonalRepository } from '../../repositories/SeasonalRepository';

/**
 * Portada o carta de muestra dentro del formulario. Ya está protegida (reducida y con marca de agua):
 * o bien ya vive en el sitio (`path`), o bien espera a subirse al guardar (`blob`).
 */
export interface PreviewItem {
  key: string;
  path: string | null;
  blob: Blob | null;
  /** Lo que se muestra: la dirección pública, o una dirección local mientras no se sube. */
  url: string;
}

export function storedPreviewItem(path: string): PreviewItem {
  return { key: path, path, blob: null, url: SeasonalRepository.previewUrl(path) };
}

export function pendingPreviewItem(blob: Blob): PreviewItem {
  return { key: crypto.randomUUID(), path: null, blob, url: URL.createObjectURL(blob) };
}

/**
 * Sube las imágenes que faltan y devuelve la lista con sus rutas. Las que fallan se quedan pendientes,
 * para que un reintento no vuelva a subir las que ya llegaron.
 */
export async function uploadPendingPreviews(
  loteriaId: string,
  items: readonly PreviewItem[],
): Promise<PreviewItem[]> {
  const uploaded: PreviewItem[] = [];
  for (const item of items) {
    if (item.path !== null || item.blob === null) {
      uploaded.push(item);
      continue;
    }
    const path = await SeasonalRepository.uploadPreview(loteriaId, item.blob);
    uploaded.push(path === null ? item : { ...item, path, blob: null });
  }
  return uploaded;
}

export interface SavedPreviews {
  cover: PreviewItem | null;
  samples: PreviewItem[];
}

/**
 * Sube las imágenes nuevas, guarda la portada y el orden de las muestras y borra las que ya no se usan
 * (`previousPaths`). Devuelve lo que quedó, con rutas; `ok` es falso si algo no se pudo subir o guardar.
 */
export async function savePreviewSelection(
  loteriaId: string,
  cover: PreviewItem | null,
  samples: readonly PreviewItem[],
  previousPaths: readonly (string | null)[],
): Promise<SavedPreviews & { ok: boolean }> {
  const [uploadedCover = null] = cover ? await uploadPendingPreviews(loteriaId, [cover]) : [];
  const uploadedSamples = await uploadPendingPreviews(loteriaId, samples);
  const result = { cover: uploadedCover, samples: uploadedSamples };
  if ([uploadedCover, ...uploadedSamples].some((item) => item !== null && item.path === null)) return { ...result, ok: false };

  const coverPath = uploadedCover?.path ?? null;
  const samplePaths = uploadedSamples.flatMap((item) => (item.path ? [item.path] : []));
  if (!(await SeasonalRepository.savePreviews(loteriaId, coverPath, samplePaths))) return { ...result, ok: false };

  const kept = new Set([coverPath, ...samplePaths]);
  await SeasonalRepository.removePreviews(previousPaths.filter((path): path is string => path !== null && !kept.has(path)));
  return { ...result, ok: true };
}
