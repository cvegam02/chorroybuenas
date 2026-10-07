import { useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaTimes } from 'react-icons/fa';
import { logger } from '../../utils/logger';
import {
  PREVIEW_ACCEPTED_MIME_TYPES,
  createProtectedPreview,
  moveItem,
  removeAt,
  validatePreviewImage,
} from '../../utils/seasonalPreview';
import { pendingPreviewItem, type PreviewItem } from './seasonalPreviewItems';
import './AdminTokenPacks.css';
import './AdminSeasonal.css';

interface AdminSeasonalPreviewsProps {
  cover: PreviewItem | null;
  samples: readonly PreviewItem[];
  onCoverChange: (cover: PreviewItem | null) => void;
  onSamplesChange: (samples: PreviewItem[]) => void;
}

interface ProtectResult {
  items: PreviewItem[];
  /** Un renglón por archivo que no se pudo usar. */
  problems: string[];
}

const ACCEPT = PREVIEW_ACCEPTED_MIME_TYPES.join(',');

/** Valida, reduce y marca cada imagen. La original no se guarda en ningún lado. */
async function protectFiles(files: readonly File[]): Promise<ProtectResult> {
  const items: PreviewItem[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const rejection = validatePreviewImage(file);
    if (rejection) {
      problems.push(`«${file.name}»: ${rejection}`);
      continue;
    }
    try {
      items.push(pendingPreviewItem(await createProtectedPreview(file)));
    } catch (error: unknown) {
      logger.error('AdminSeasonalPreviews: no se pudo preparar la imagen', file.name, error);
      problems.push(`«${file.name}»: no se pudo preparar la imagen.`);
    }
  }
  return { items, problems };
}

export const AdminSeasonalPreviews = ({ cover, samples, onCoverChange, onSamplesChange }: AdminSeasonalPreviewsProps) => {
  const [isPreparing, setIsPreparing] = useState(false);
  const [coverProblems, setCoverProblems] = useState<string[]>([]);
  const [sampleProblems, setSampleProblems] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const samplesInputRef = useRef<HTMLInputElement>(null);
  const localUrls = useRef<string[]>([]);

  // Las direcciones locales de las imágenes sin subir se liberan al cerrar el formulario.
  useEffect(() => {
    const urls = localUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const takeFiles = (e: React.ChangeEvent<HTMLInputElement>): File[] => {
    const files = Array.from(e.target.files ?? []);
    // Se limpia para poder volver a elegir el mismo archivo después de un rechazo.
    e.target.value = '';
    return files;
  };

  const protect = async (files: File[]): Promise<ProtectResult> => {
    setIsPreparing(true);
    const result = await protectFiles(files);
    localUrls.current.push(...result.items.map((item) => item.url));
    setIsPreparing(false);
    return result;
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = takeFiles(e);
    if (files.length === 0) return;
    const { items, problems } = await protect(files.slice(0, 1));
    setCoverProblems(problems);
    if (items.length > 0) onCoverChange(items[0]);
  };

  const handleSamplesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = takeFiles(e);
    if (files.length === 0) return;
    const { items, problems } = await protect(files);
    setSampleProblems(problems);
    if (items.length > 0) onSamplesChange([...samples, ...items]);
  };

  const moveSample = (from: number, to: number) => onSamplesChange(moveItem(samples, from, to));

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null) moveSample(dragIndex, index);
    setDragIndex(null);
  };

  const renderProblems = (problems: string[], id: string) =>
    problems.length > 0 && (
      <ul className="admin-packs__error admin-seasonal-previews__problems" id={id} role="alert">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    );

  return (
    <div className="admin-seasonal-previews">
      <p className="admin-seasonal__meta">
        Cada imagen se reduce y se marca con «chorroybuenas.com.mx» aquí mismo, antes de subirse. Lo que ves es lo
        que verá el público; la imagen original no se guarda.
      </p>

      <div className="admin-seasonal-previews__block">
        <span className="admin-seasonal-previews__label" id="seasonal-cover-label">
          Portada
        </span>
        <div className="admin-seasonal-previews__cover-row">
          {cover ? (
            <img className="admin-seasonal-previews__cover" src={cover.url} alt="Portada ya protegida" />
          ) : (
            <span className="admin-seasonal__meta">Todavía no tiene portada.</span>
          )}
          <div className="admin-seasonal-previews__buttons">
            <button
              type="button"
              className="admin-packs__btn admin-packs__btn--secondary"
              onClick={() => coverInputRef.current?.click()}
              disabled={isPreparing}
              aria-describedby={coverProblems.length > 0 ? 'seasonal-cover-problems' : undefined}
            >
              {cover ? 'Reemplazar portada' : 'Elegir portada'}
            </button>
            {cover && (
              <button
                type="button"
                className="admin-packs__btn admin-packs__btn--secondary"
                onClick={() => onCoverChange(null)}
                disabled={isPreparing}
              >
                Quitar portada
              </button>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleCoverChange}
            aria-labelledby="seasonal-cover-label"
            hidden
          />
        </div>
        {renderProblems(coverProblems, 'seasonal-cover-problems')}
      </div>

      <div className="admin-seasonal-previews__block">
        <span className="admin-seasonal-previews__label" id="seasonal-samples-label">
          Cartas de muestra ({samples.length})
        </span>
        <div className="admin-seasonal-previews__buttons">
          <button
            type="button"
            className="admin-packs__btn admin-packs__btn--secondary"
            onClick={() => samplesInputRef.current?.click()}
            disabled={isPreparing}
            aria-describedby={sampleProblems.length > 0 ? 'seasonal-samples-problems' : undefined}
          >
            Agregar cartas
          </button>
          {isPreparing && (
            <span className="admin-seasonal__meta" role="status">
              Preparando imágenes…
            </span>
          )}
        </div>
        <input
          ref={samplesInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleSamplesChange}
          aria-labelledby="seasonal-samples-label"
          hidden
        />
        {renderProblems(sampleProblems, 'seasonal-samples-problems')}

        {samples.length > 0 && (
          <ol className="admin-seasonal-previews__grid">
            {samples.map((sample, index) => (
              <li
                key={sample.key}
                className={`admin-seasonal-previews__item${dragIndex === index ? ' admin-seasonal-previews__item--dragging' : ''}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, index)}
              >
                <img src={sample.url} alt={`Carta de muestra ${index + 1}`} draggable={false} />
                <div className="admin-seasonal-previews__item-actions">
                  <button
                    type="button"
                    className="admin-packs__action-btn"
                    onClick={() => moveSample(index, index - 1)}
                    disabled={index === 0}
                    title="Mover antes"
                    aria-label={`Mover la carta ${index + 1} un lugar antes`}
                  >
                    <FaArrowLeft />
                  </button>
                  <button
                    type="button"
                    className="admin-packs__action-btn"
                    onClick={() => moveSample(index, index + 1)}
                    disabled={index === samples.length - 1}
                    title="Mover después"
                    aria-label={`Mover la carta ${index + 1} un lugar después`}
                  >
                    <FaArrowRight />
                  </button>
                  <button
                    type="button"
                    className="admin-packs__action-btn"
                    onClick={() => onSamplesChange(removeAt(samples, index))}
                    title="Quitar"
                    aria-label={`Quitar la carta ${index + 1}`}
                  >
                    <FaTimes />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
