import { useState, useEffect, useRef, useMemo, type FC } from 'react';
import { createPortal } from 'react-dom';
import { FaArrowRight, FaCropAlt, FaForward, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ImageEditor } from './ImageEditor';
import { CardLivePreview } from './CardLivePreview';
import { convertFileToBase64, validateImageFile, compressImage, adjustImageToCardAspectRatio } from '../../utils/imageUtils';
import './CardUploadModal.css';
import './CardForm.css';
import './BatchUploadModal.css';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { useVisualViewportFit } from '../../hooks/useVisualViewportFit';
import { nextCardNumber, queueItemState, queuePercent } from '../../utils/uploadQueue';
import { logger } from '../../utils/logger';
import { isPrintableCardTitle } from '../../utils/cardTitle';


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
  const overlayRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  const isPhone = useMediaQuery('(max-width: 640px)');

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
      logger.error('Error compressing cropped image:', error);
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

    // El aviso ya está a la vista bajo el campo.
    if (!isPrintableCardTitle(currentTitle)) return;

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
        logger.error('Error adjusting image aspect ratio:', error);
        // Continue with original if adjustment fails
      }
    }

    // Compress image before saving
    try {
      imageToSave = await compressImage(imageToSave);
    } catch (error) {
      logger.error('Error compressing image:', error);
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

  /** Cerrar a medias: se confirma, y las cartas ya nombradas se guardan. */
  const requestClose = () => {
    if (!confirm(t('modals.batchCancel.message'))) return;
    const allCards = [...completedCardsRef.current];
    if (allCards.length > 0) {
      onCardsAdd(allCards);
    }
    completedCardsRef.current = [];
    onClose();
  };
  const isShown = isOpen && pendingImages.length > 0;
  useEscapeKey(requestClose, isShown);
  usePageScrollLock(isShown);
  useVisualViewportFit(overlayRef, isShown);

  // La miniatura en turno se trae a la vista solo al cambiar de foto y solo de lado. Con scrollIntoView
  // se pedía en cada tecla y movía la ventana con el teclado abierto (FEAT-39).
  useEffect(() => {
    const queue = queueRef.current;
    const thumb = queue?.querySelector<HTMLElement>('.batch-upload__thumb--current');
    if (!queue || !thumb) return;
    queue.scrollLeft = thumb.offsetLeft - (queue.clientWidth - thumb.offsetWidth) / 2;
  }, [currentIndex, isShown]);

  if (!isShown) return null;

  const currentFile = pendingImages[currentIndex];
  const isLastPhoto = currentIndex === pendingImages.length - 1;
  const isDuplicateTitle =
    Boolean(currentTitle.trim()) &&
    (existingTitleSet.has(normalizeTitle(currentTitle)) ||
      completedCardsRef.current.some(card => normalizeTitle(card.title) === normalizeTitle(currentTitle)));
  const isInvalidTitle = !isPrintableCardTitle(currentTitle);

  const previewNumber = nextCardNumber(existingTitles.length, completedCardsRef.current.length);

  const adjustButton = (
    <button
      type="button"
      onClick={() => setShowEditor(true)}
      className="card-form__button card-form__button--secondary card-form__button--small batch-upload__adjust"
    >
      <FaCropAlt aria-hidden="true" />
      {t('cardUpload.actions.adjustImage')}
    </button>
  );

  // En teléfono los botones van en el pie de la hoja, fuera de lo que se desliza (FEAT-39).
  const actionButtons = (
    <>
      <button type="button" onClick={handleSkip} className="card-form__button card-form__button--ghost">
        <FaForward aria-hidden="true" />
        {t('batchUpload.actions.skip')}
      </button>
      <button
        type="button"
        onClick={handleNext}
        disabled={!currentTitle.trim() || isInvalidTitle}
        className="card-form__button card-form__button--primary batch-upload__next"
      >
        {isLastPhoto ? t('batchUpload.actions.finish') : t('batchUpload.actions.next')}
        {!isLastPhoto && <FaArrowRight aria-hidden="true" />}
      </button>
    </>
  );

  const modalContent = (
    <div
      ref={overlayRef}
      className="card-modal__overlay card-modal__overlay--sheet"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        className="card-modal__content card-modal__content--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-upload-modal-title"
      >
        <div className="card-modal__header">
          <div>
            <h2 id="batch-upload-modal-title" className="card-modal__title">{t('batchUpload.title')}</h2>
            <span className="card-modal__subtitle">{t('batchUpload.subtitle')}</span>
          </div>
          <button type="button" className="card-modal__close" onClick={requestClose} aria-label={t('common.close')}>
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="batch-upload__progress">
          <div className="batch-upload__progress-main">
            <div className="batch-upload__bar" aria-hidden="true">
              <span style={{ width: `${queuePercent(currentIndex, pendingImages.length)}%` }} />
            </div>
            <p className="batch-upload__progress-text" aria-live="polite">
              {t('batchUpload.progress', {
                current: currentIndex + 1,
                total: pendingImages.length,
                name: currentFile.file.name,
              })}
            </p>
          </div>
          <div ref={queueRef} className="batch-upload__queue" aria-hidden="true">
            {pendingImages.map((image, index) => {
              const state = queueItemState(index, currentIndex);
              return (
                <img
                  key={image.id}
                  src={image.preview}
                  alt=""
                  className={`batch-upload__thumb batch-upload__thumb--${state}`}
                />
              );
            })}
          </div>
        </div>

        <div className="card-modal__body">
          {showEditor && currentImage ? (
            <ImageEditor
              imageSrc={currentImage}
              onCrop={handleImageCrop}
              onCancel={() => setShowEditor(false)}
            />
          ) : (
            <div className="batch-upload__layout">
              <div className="batch-upload__media">
                {isPhone ? (
                  <CardLivePreview photo={currentImage || null} title={currentTitle} number={previewNumber} compact />
                ) : (
                  <>
                    <div className="card-form__photo">
                      <img src={currentImage} alt="" />
                    </div>
                    {adjustButton}
                  </>
                )}
              </div>

              <div className="batch-upload__form">
                <div className="card-form__field">
                  <label htmlFor="batch-upload-title" className="card-form__label">
                    {t('cardUpload.label')}
                  </label>
                  <input
                    id="batch-upload-title"
                    ref={titleInputRef}
                    type="text"
                    placeholder={t('cardUpload.inputPlaceholder')}
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    className="card-form__input"
                    maxLength={100}
                  />
                  {isDuplicateTitle && <p className="card-form__error">{t('cardUpload.errorDuplicate')}</p>}
                  {isInvalidTitle && (
                    <p className="card-form__error" role="alert">
                      {t('cardUpload.errorInvalidTitle')}
                    </p>
                  )}
                  <p className="card-form__help">{t('cardUpload.helpText')}</p>
                </div>

                {isPhone && adjustButton}
                {!isPhone && <CardLivePreview photo={currentImage || null} title={currentTitle} number={previewNumber} />}

                {!isPhone && <div className="batch-upload__actions">{actionButtons}</div>}
              </div>
            </div>
          )}
        </div>

        {isPhone && !showEditor && (
          // Tocar un botón no le quita el cursor al nombre: así el teclado no se cierra y se vuelve a abrir entre fotos.
          <div className="card-modal__footer" onMouseDown={(e) => e.preventDefault()}>
            {actionButtons}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
