import { useState, useEffect, useRef, useMemo, type FC } from 'react';
import { createPortal } from 'react-dom';
import { FaEdit, FaForward } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ImageEditor } from './ImageEditor';
import { convertFileToBase64, validateImageFile, compressImage, adjustImageToCardAspectRatio } from '../../utils/imageUtils';
import './BatchUploadModal.css';


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
  existingTitles: string[];
}

export const BatchUploadModal: FC<BatchUploadModalProps> = ({ isOpen, onClose, onCardsAdd, files, existingTitles }) => {
  const { t } = useTranslation();
  const normalizeTitle = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  const existingTitleSet = useMemo(
    () => new Set(existingTitles.map(normalizeTitle)),
    [existingTitles]
  );
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
      alert(t('cardUpload.errorNoTitle'));
      return;
    }

    const normalizedTitle = normalizeTitle(currentTitle);
    const isDuplicate =
      existingTitleSet.has(normalizedTitle) ||
      completedCardsRef.current.some(card => normalizeTitle(card.title) === normalizedTitle);

    if (isDuplicate) {
      alert(t('cardUpload.errorDuplicate'));
      return;
    }

    if (!currentImage) {
      alert(t('cardUpload.errorNoImage'));
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
        imageToSave = await adjustImageToCardAspectRatio(currentImage);
      } catch (error) {
        console.error('Error adjusting image aspect ratio:', error);
        // Continue with original if adjustment fails
      }
    }

    // Compress image before saving
    try {
      imageToSave = await compressImage(imageToSave);
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
  const isDuplicateTitle =
    Boolean(currentTitle.trim()) &&
    (existingTitleSet.has(normalizeTitle(currentTitle)) ||
      completedCardsRef.current.some(card => normalizeTitle(card.title) === normalizeTitle(currentTitle)));

  const modalContent = (
    <div
      className="batch-upload-modal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Allow closing only if user wants to cancel
          if (confirm(t('modals.batchCancel.message'))) {
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
            {t('batchUpload.title', { current: currentIndex + 1, total: pendingImages.length })}
          </h2>
          <button
            className="batch-upload-modal__close"
            onClick={() => {
              if (confirm(t('modals.batchCancel.message'))) {
                const allCards = [...completedCardsRef.current];
                if (allCards.length > 0) {
                  onCardsAdd(allCards);
                }
                completedCardsRef.current = [];
                onClose();
              }
            }}
            aria-label={t('common.close')}
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
            {remaining > 0 ? t('batchUpload.remaining.other', { count: remaining }) : t('batchUpload.remaining.last')}
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
            <div className="batch-upload-modal__layout">
              <div className="batch-upload-modal__preview-wrap">
                <img src={currentImage} alt="Preview" className="batch-upload-modal__preview-img" />
              </div>
              <div className="batch-upload-modal__form-side">
                <div className="batch-upload-modal__title-input-group">
                  <label className="batch-upload-modal__label">
                    {t('cardUpload.label')}
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    placeholder={t('cardUpload.inputPlaceholder')}
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    className="batch-upload-modal__title-input"
                    maxLength={100}
                  />
                  {isDuplicateTitle && (
                    <p className="batch-upload-modal__error-text">
                      {t('cardUpload.errorDuplicate')}
                    </p>
                  )}
                  <p className="batch-upload-modal__help-text">
                    {t('cardUpload.helpText')}
                  </p>
                </div>

                <div className="batch-upload-modal__actions">
              <button
                type="button"
                onClick={handleSkip}
                className="batch-upload-modal__skip-button"
              >
                <FaForward />
                {t('batchUpload.actions.skip')}
              </button>
              <button
                type="button"
                onClick={() => setShowEditor(true)}
                className="batch-upload-modal__edit-button"
              >
                <FaEdit />
                <span>{t('batchUpload.actions.adjust')}</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!currentTitle.trim()}
                className="batch-upload-modal__next-button"
                  >
                    {remaining > 0 ? t('batchUpload.actions.next', { count: remaining }) : t('batchUpload.actions.finish')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

