import { useState, useRef, useEffect } from 'react';
import { convertFileToBase64, validateImageFile, compressImage } from '../../utils/imageUtils';
import { ImageEditor } from './ImageEditor';
import './CardUpload.css';

interface CardUploadProps {
  onCardAdd: (image: string, title: string) => void;
}

export const CardUpload = ({ onCardAdd }: CardUploadProps) => {
  const [title, setTitle] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateImageFile(file)) {
      alert('Por favor, selecciona una imagen válida (JPG, PNG o WEBP)');
      return;
    }

    setImageFile(file);
    const base64 = await convertFileToBase64(file);
    setImagePreview(base64);
    setShowEditor(false); // Don't show editor by default
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Por favor, ingresa un título para la carta');
      return;
    }

    if (!imageFile || !imagePreview) {
      alert('Por favor, selecciona una imagen');
      return;
    }

    setIsUploading(true);
    try {
      // Compress image before saving to reduce storage size
      console.log('Compressing image before save...');
      const compressedImage = await compressImage(imagePreview);
      console.log(`Image compressed: ${(imagePreview.length / 1024).toFixed(2)} KB -> ${(compressedImage.length / 1024).toFixed(2)} KB`);
      
      onCardAdd(compressedImage, title.trim());
      // Reset form
      setTitle('');
      setImageFile(null);
      setImagePreview(null);
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

    setImageFile(file);
    const base64 = await convertFileToBase64(file);
    setImagePreview(base64);
    setShowEditor(false); // Don't show editor by default
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
      <div
        className="card-upload__dropzone"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="card-upload__input"
        />
        {imagePreview ? (
          <div className="card-upload__preview-container">
            <img src={imagePreview} alt="Preview" className="card-upload__preview" />
            <div className="card-upload__edit-overlay">
              <span>🖼️</span>
              <p>Haz clic para cambiar la imagen</p>
            </div>
          </div>
        ) : (
          <div className="card-upload__placeholder">
            <span>📷</span>
            <p className="card-upload__placeholder-main">Haz clic o arrastra una imagen aquí</p>
            <p className="card-upload__placeholder-sub">Formatos: JPG, PNG o WEBP</p>
          </div>
        )}
      </div>
      {imagePreview && (
        <button
          type="button"
          onClick={() => setShowEditor(true)}
          className="card-upload__edit-button"
        >
          ✏️ Ajustar imagen
        </button>
      )}
      <div className="card-upload__title-group">
        <input
          ref={titleInputRef}
          type="text"
          placeholder="Título de la carta (ej: El gato, La playa, Mi familia...)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          className="card-upload__title-input"
          maxLength={100}
          disabled={!imagePreview}
        />
        <p className="card-upload__help-text">
          💡 Elige un título claro y corto que sea fácil de cantar durante el juego
        </p>
      </div>
      <button
        type="submit"
        disabled={!title.trim() || !imagePreview || isUploading}
        className="card-upload__submit"
      >
        {isUploading ? 'Agregando...' : 'Agregar Carta'}
      </button>
    </form>
  );
};

