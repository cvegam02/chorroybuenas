import { useRef } from 'react';
import './CardUploadThumb.css';

interface CardUploadThumbProps {
  onSingleClick: () => void;
  onBatchSelect: (files: File[]) => void;
}

export const CardUploadThumb = ({ onSingleClick, onBatchSelect }: CardUploadThumbProps) => {
  const batchInputRef = useRef<HTMLInputElement>(null);

  const handleSingleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSingleClick();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onBatchSelect(files);
    }
    // Reset input so same files can be selected again
    if (batchInputRef.current) {
      batchInputRef.current.value = '';
    }
  };

  const handleBatchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    batchInputRef.current?.click();
  };

  return (
    <>
      <div className="card-upload-thumb">
        <div className="card-upload-thumb__image-container">
          <div className="card-upload-thumb__placeholder">
            <span className="card-upload-thumb__icon">➕</span>
          </div>
        </div>
        <button 
          className="card-upload-thumb__button" 
          type="button"
          onClick={handleSingleClick}
        >
          Agregar Carta
        </button>
        <button 
          className="card-upload-thumb__batch-button" 
          type="button"
          onClick={handleBatchClick}
          title="Subir múltiples imágenes a la vez"
        >
          📁 Subir varias
        </button>
      </div>
      <input
        ref={batchInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </>
  );
};

