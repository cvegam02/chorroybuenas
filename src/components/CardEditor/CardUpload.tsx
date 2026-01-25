import { useState, useRef, useEffect, useMemo } from 'react';
import { convertFileToBase64, validateImageFile, compressImage } from '../../utils/imageUtils';
import { ImageEditor } from './ImageEditor';
import './CardUpload.css';

/**
 * Adjusts a base64 image to match card aspect ratio (5:7.5) using "cover" mode
 * This ensures images fill the card area exactly as shown in preview
 */
const adjustImageToCardAspectRatio = (
  imageSrc: string,
  targetWidth: number = 800,
  targetHeight: number = 1200,
  quality: number = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Card aspect ratio is 5:7.5 = 2/3 = 0.666...
      const cardAspectRatio = targetWidth / targetHeight;
      const imgAspectRatio = img.width / img.height;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.width;
      let sourceHeight = img.height;

      // Use "cover" mode: crop the image to match card aspect ratio
      // This matches how object-fit: cover works in CSS
      if (imgAspectRatio > cardAspectRatio) {
        // Image is wider than card - crop sides (center crop)
        sourceHeight = img.height;
        sourceWidth = img.height * cardAspectRatio;
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        // Image is taller than card - crop top/bottom (center crop)
        sourceWidth = img.width;
        sourceHeight = img.width / cardAspectRatio;
        sourceY = (img.height - sourceHeight) / 2;
      }

      // Set canvas to target dimensions (high resolution)
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Fill with white background first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw the cropped portion scaled to fill the canvas
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, targetWidth, targetHeight
      );

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      reject(new Error('Error loading image'));
    };

    img.src = imageSrc;
  });
};

interface CardUploadProps {
  onCardAdd: (image: string, title: string) => Promise<boolean>;
  existingTitles: string[];
  initialTitle?: string;
  initialImage?: string;
  submitLabel?: string;
}

export const CardUpload = ({
  onCardAdd,
  existingTitles,
  initialTitle = '',
  initialImage,
  submitLabel = 'Agregar Carta'
}: CardUploadProps) => {
  const normalizeTitle = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  const existingTitleSet = useMemo(
    () => new Set(existingTitles.map(normalizeTitle)),
    [existingTitles]
  );
  const [title, setTitle] = useState(initialTitle);
  /* imageFile removed */
  const [imagePreview, setImagePreview] = useState<string | null>(initialImage ?? null);
  const [showEditor, setShowEditor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [wasEdited, setWasEdited] = useState(false); // Track if image was edited/cropped
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateImageFile(file)) {
      alert('Por favor, selecciona una imagen válida (JPG, PNG o WEBP)');
      return;
    }

    // setImageFile(file); removed
    const base64 = await convertFileToBase64(file);
    setImagePreview(base64);
    setShowEditor(false); // Don't show editor by default
    setWasEdited(false); // Reset edit flag when new image is loaded
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle) {
      alert('Por favor, ingresa un título para la carta');
      return;
    }

    if (normalizedTitle !== normalizeTitle(initialTitle) && existingTitleSet.has(normalizedTitle)) {
      alert('Ya existe una carta con ese nombre. Por favor usa un título diferente.');
      return;
    }

    if (!imagePreview) {
      alert('Por favor, selecciona una imagen');
      return;
    }

    setIsUploading(true);
    try {
      // First adjust image to card aspect ratio (5:7.5) if not edited
      // This ensures the image looks the same in PDF as in preview
      let processedImage = imagePreview;
      if (!wasEdited) {
        // Image was not edited, so it needs to be adjusted to match preview (object-fit: cover)
        console.log('Adjusting image to card aspect ratio (5:7.5)...');
        processedImage = await adjustImageToCardAspectRatio(imagePreview);
      }

      // Compress image before saving to reduce storage size
      console.log('Compressing image before save...');
      const compressedImage = await compressImage(processedImage);
      console.log(`Image compressed: ${(processedImage.length / 1024).toFixed(2)} KB -> ${(compressedImage.length / 1024).toFixed(2)} KB`);

      const wasAdded = await onCardAdd(compressedImage, title.trim());
      if (!wasAdded) {
        return;
      }
      // Reset form
      setTitle('');
      // setImageFile(null); removed
      setImagePreview(null);
      setWasEdited(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error adding card:', error);
      alert('Error al agregar la carta. Por favor, intenta nuevamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!validateImageFile(file)) {
      alert('Por favor, selecciona una imagen válida (JPG, PNG o WEBP)');
      return;
    }

    // setImageFile(file); removed
    const base64 = await convertFileToBase64(file);
    setImagePreview(base64);
    setShowEditor(false); // Don't show editor by default
    setWasEdited(false); // Reset edit flag when new image is loaded
  };

  const handleImageCrop = async (croppedImage: string) => {
    // Compress the cropped image
    try {
      const compressed = await compressImage(croppedImage);
      setImagePreview(compressed);
    } catch (error) {
      console.error('Error compressing cropped image:', error);
      // Fallback to uncompressed if compression fails
      setImagePreview(croppedImage);
    }
    setShowEditor(false);
    setWasEdited(true); // Mark as edited when crop is done
  };

  // Auto-focus title input when image is loaded
  useEffect(() => {
    if (imagePreview && !showEditor && titleInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [imagePreview, showEditor]);

  // Handle Enter key in title input
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && title.trim() && imagePreview && !isUploading) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const isDuplicateTitle = Boolean(title.trim()) &&
    normalizeTitle(title) !== normalizeTitle(initialTitle) &&
    existingTitleSet.has(normalizeTitle(title));



  if (showEditor && imagePreview) {
    return (
      <div className="card-upload">
        <ImageEditor
          imageSrc={imagePreview}
          onCrop={handleImageCrop}
          onCancel={() => setShowEditor(false)}
        />
      </div>
    );
  }

  return (
    <form className="card-upload" onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="card-upload__input"
        style={{ display: 'none' }}
      />
      {imagePreview ? (
        <div className="card-upload__preview-container">
          <img src={imagePreview} alt="Preview" className="card-upload__preview" />
          <div className="card-upload__edit-overlay">
            <span role="img" aria-label="edit">✏️</span>
            <p>Haz clic en "Ajustar imagen"</p>
          </div>
        </div>
      ) : (
        <div
          className="card-upload__dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="card-upload__placeholder">
            <span>📷</span>
            <p className="card-upload__placeholder-main">Haz clic o arrastra una imagen aquí</p>
            <p className="card-upload__placeholder-sub">Formatos: JPG, PNG o WEBP</p>
          </div>
        </div>
      )}

      <div className="card-upload__title-group">
        <label className="card-upload__label">
          Título de la carta
        </label>
        <input
          ref={titleInputRef}
          type="text"
          placeholder="Ej: El gato, La playa, Mi familia..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          className="card-upload__title-input"
          maxLength={100}
          disabled={!imagePreview}
        />
        {isDuplicateTitle && (
          <p className="card-upload__error-text">
            Ya existe una carta con ese nombre. Usa un título diferente.
          </p>
        )}
        <p className="card-upload__help-text">
          Elige un título claro y corto que sea fácil de cantar durante el juego
        </p>
      </div>

      <div className="card-upload__actions">
        {imagePreview && (
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="card-upload__change-button"
            disabled={isUploading}
          >
            Cambiar foto
          </button>
        )}

        {imagePreview && (
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="card-upload__edit-button"
            disabled={isUploading}
          >
            <span role="img" aria-label="edit">✏️</span>
            <span>Ajustar imagen</span>
          </button>
        )}

        <button
          type="submit"
          disabled={!title.trim() || !imagePreview || isUploading}
          className="card-upload__submit"
        >
          {isUploading ? 'Procesando...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

