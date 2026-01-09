import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ImageEditor } from './ImageEditor';
import { convertFileToBase64, validateImageFile, compressImage } from '../../utils/imageUtils';
import './BatchUploadModal.css';

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

interface PendingImage {
  file: File;
  id: string;
  preview: string;
}

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardsAdd: (cards: Array<{ image: string; title: string }>) => void;
  files: File[];
}

export const BatchUploadModal = ({ isOpen, onClose, onCardsAdd, files }: BatchUploadModalProps) => {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [wasEdited, setWasEdited] = useState(false); // Track if current image was edited/cropped
  // Use ref to track completed cards to avoid state update issues
  const completedCardsRef = useRef<Array<{ image: string; title: string }>>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && files.length > 0) {
      // Initialize pending images from files
      const loadImages = async () => {
        const validFiles = files.filter(validateImageFile);
        const loadedImages: PendingImage[] = [];
        
        for (const file of validFiles) {
          const preview = await convertFileToBase64(file);
          loadedImages.push({
            file,
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            preview,
          });
        }
        
        setPendingImages(loadedImages);
        setCurrentIndex(0);
        completedCardsRef.current = [];
        if (loadedImages.length > 0) {
          const firstPreview = loadedImages[0].preview;
          setCurrentImage(firstPreview);
          setCurrentTitle('');
          setShowEditor(false); // Don't show editor by default
          setWasEdited(false); // Reset edit flag for new image
        }
      };
      
      loadImages();
    } else if (!isOpen) {
      // Reset when modal closes
      setPendingImages([]);
      setCurrentIndex(0);
      setCurrentImage('');
      setCurrentTitle('');
      completedCardsRef.current = [];
      setShowEditor(false);
    }
  }, [isOpen, files]);

  const handleImageCrop = async (croppedImage: string) => {
    // Compress the cropped image
    try {
      const compressed = await compressImage(croppedImage);
      setCurrentImage(compressed);
    } catch (error) {
      console.error('Error compressing cropped image:', error);
      // Fallback to uncompressed if compression fails
      setCurrentImage(croppedImage);
    }
    setShowEditor(false);
    setWasEdited(true); // Mark as edited when crop is done
  };

  // Auto-focus title input when image changes or editor closes
  useEffect(() => {
    if (!showEditor && currentImage && titleInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [currentImage, currentIndex, showEditor]);

  // Handle Enter key in title input
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentTitle.trim() && currentImage) {
      e.preventDefault();
      handleNext();
    }
  };

  const handleNext = async () => {
    if (!currentTitle.trim()) {
      alert('Por favor, ingresa un título para esta carta');
      return;
    }

    if (!currentImage) {
      alert('Por favor, ajusta la imagen antes de continuar');
      return;
    }

    // Capture current values before state updates
    let imageToSave = currentImage;
    const titleToSave = currentTitle.trim();
    
    // First adjust image to card aspect ratio (5:7.5) if not edited
    // This ensures the image looks the same in PDF as in preview
    if (!wasEdited) {
      // Image was not edited, so it needs to be adjusted to match preview (object-fit: cover)
      try {
        console.log(`Adjusting image ${currentIndex + 1} to card aspect ratio (5:7.5)...`);
        imageToSave = await adjustImageToCardAspectRatio(currentImage);
      } catch (error) {
        console.error('Error adjusting image aspect ratio:', error);
        // Continue with original if adjustment fails
      }
    }
    
    // Compress image before saving
    try {
      console.log(`Compressing image ${currentIndex + 1} before save...`);
      imageToSave = await compressImage(imageToSave);
      const originalSize = (currentImage.length / 1024).toFixed(2);
      const compressedSize = (imageToSave.length / 1024).toFixed(2);
      console.log(`Image ${currentIndex + 1} compressed: ${originalSize} KB -> ${compressedSize} KB`);
    } catch (error) {
      console.error('Error compressing image:', error);
      // Continue with uncompressed if compression fails
    }
    
    // Add current card to completed list using ref
    completedCardsRef.current = [
      ...completedCardsRef.current, 
      { image: imageToSave, title: titleToSave }
    ];

    // Move to next image
    const nextIndex = currentIndex + 1;
    if (nextIndex < pendingImages.length) {
      // Reset to use preview for next image, user can edit if needed
      setCurrentIndex(nextIndex);
      setCurrentImage(pendingImages[nextIndex].preview);
      setCurrentTitle('');
      setShowEditor(false); // Don't show editor by default
      setWasEdited(false); // Reset edit flag for new image
    } else {
      // All images processed, save all cards (including the one we just added)
      const allCards = [...completedCardsRef.current];
      console.log('Saving batch cards:', allCards.length); // Debug log
      onCardsAdd(allCards);
      // Reset state
      completedCardsRef.current = [];
      setCurrentIndex(0);
      setCurrentImage('');
      setCurrentTitle('');
      onClose();
    }
  };

  const handleSkip = () => {
    // Skip current image and move to next
    const nextIndex = currentIndex + 1;
    if (nextIndex < pendingImages.length) {
      setCurrentIndex(nextIndex);
      setCurrentImage(pendingImages[nextIndex].preview);
      setCurrentTitle('');
      setShowEditor(false); // Don't show editor by default
      setWasEdited(false); // Reset edit flag for new image
    } else {
      // If there are completed cards, save them
      const allCards = [...completedCardsRef.current];
      if (allCards.length > 0) {
        onCardsAdd(allCards);
      }
      completedCardsRef.current = [];
      onClose();
    }
  };

  if (!isOpen || pendingImages.length === 0) return null;

  const currentFile = pendingImages[currentIndex];
  const progress = ((currentIndex + 1) / pendingImages.length) * 100;
  const remaining = pendingImages.length - currentIndex - 1;

  const modalContent = (
    <div 
      className="batch-upload-modal__overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Allow closing only if user wants to cancel
          if (confirm('¿Estás seguro de que quieres cancelar? Se perderán las imágenes no procesadas.')) {
            const allCards = [...completedCardsRef.current];
            if (allCards.length > 0) {
              onCardsAdd(allCards);
            }
            completedCardsRef.current = [];
            onClose();
          }
        }
      }}
    >
      <div className="batch-upload-modal__content">
        <div className="batch-upload-modal__header">
          <h2 className="batch-upload-modal__title">
            Procesando Imágenes ({currentIndex + 1} de {pendingImages.length})
          </h2>
          <button 
            className="batch-upload-modal__close"
            onClick={() => {
              if (confirm('¿Estás seguro de que quieres cancelar? Se perderán las imágenes no procesadas.')) {
                const allCards = [...completedCardsRef.current];
                if (allCards.length > 0) {
                  onCardsAdd(allCards);
                }
                completedCardsRef.current = [];
                onClose();
              }
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="batch-upload-modal__progress">
          <div className="batch-upload-modal__progress-bar">
            <div 
              className="batch-upload-modal__progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="batch-upload-modal__progress-text">
            {remaining > 0 ? `${remaining} imagen${remaining > 1 ? 'es' : ''} restante${remaining > 1 ? 's' : ''}` : 'Última imagen'}
          </p>
        </div>

        <div className="batch-upload-modal__current-file">
          <p className="batch-upload-modal__file-name">{currentFile.file.name}</p>
        </div>

        {showEditor && currentImage ? (
          <div className="batch-upload-modal__editor-container">
            <ImageEditor
              imageSrc={currentImage}
              onCrop={handleImageCrop}
              onCancel={() => setShowEditor(false)}
            />
          </div>
        ) : (
          <div className="batch-upload-modal__form">
            <div className="batch-upload-modal__preview">
              <img src={currentImage} alt="Preview" className="batch-upload-modal__preview-img" />
            </div>
            
            <div className="batch-upload-modal__title-input-group">
              <label className="batch-upload-modal__label">
                Título de la carta
              </label>
              <input
                ref={titleInputRef}
                type="text"
                placeholder="Ej: El gato, La playa, Mi familia..."
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                className="batch-upload-modal__title-input"
                maxLength={100}
              />
              <p className="batch-upload-modal__help-text">
                💡 Elige un título claro y corto que sea fácil de cantar durante el juego
              </p>
            </div>

            <div className="batch-upload-modal__actions">
              <button
                type="button"
                onClick={handleSkip}
                className="batch-upload-modal__skip-button"
              >
                Omitir esta imagen
              </button>
              <button
                type="button"
                onClick={() => setShowEditor(true)}
                className="batch-upload-modal__edit-button"
              >
                ✏️ Ajustar imagen
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!currentTitle.trim()}
                className="batch-upload-modal__next-button"
              >
                {remaining > 0 ? `Siguiente (${remaining} restantes) →` : 'Finalizar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

