import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCamera, FaCropAlt, FaPlus } from 'react-icons/fa';
import { convertFileToBase64, validateImageFile, compressImage, adjustImageToCardAspectRatio } from '../../utils/imageUtils';
import { ImageEditor } from './ImageEditor';
import { CardLivePreview } from './CardLivePreview';
import './CardForm.css';
import './CardUpload.css';
import { logger } from '../../utils/logger';
import { isPrintableCardTitle } from '../../utils/cardTitle';


interface CardUploadProps {
  onCardAdd: (image: string, title: string) => Promise<boolean>;
  existingTitles: string[];
  /** Número que se dibuja en «Así se verá». */
  previewNumber?: number;
}

export const CardUpload = ({
  onCardAdd,
  existingTitles,
  previewNumber
}: CardUploadProps) => {
  const { t } = useTranslation();
  const normalizeTitle = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  const existingTitleSet = useMemo(
    () => new Set(existingTitles.map(normalizeTitle)),
    [existingTitles]
  );
  const [title, setTitle] = useState('');
  /* imageFile removed */
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [wasEdited, setWasEdited] = useState(false); // Track if image was edited/cropped
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateImageFile(file)) {
      alert(t('cardUpload.errorInvalidFormat'));
      return;
    }

    // setImageFile(file); removed
    const base64 = await convertFileToBase64(file);
    setImagePreview(base64);
    setShowEditor(false); // Don't show editor by default
    setWasEdited(false); // Reset edit flag when new image is loaded
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle) {
      alert(t('cardUpload.errorNoTitle'));
      return;
    }

    if (existingTitleSet.has(normalizedTitle)) {
      alert(t('cardUpload.errorDuplicate'));
      return;
    }

    // El aviso ya está a la vista bajo el campo.
    if (!isPrintableCardTitle(title)) return;

    if (!imagePreview) {
      alert(t('cardUpload.errorNoImage'));
      return;
    }

    setIsUploading(true);
    try {
      // First adjust image to card aspect ratio (5:7.5) if not edited
      // This ensures the image looks the same in PDF as in preview
      let processedImage = imagePreview;
      if (!wasEdited) {
        // Image was not edited, so it needs to be adjusted to match preview (object-fit: cover)
        processedImage = await adjustImageToCardAspectRatio(imagePreview);
      }

      // Compress image before saving to reduce storage size
      const compressedImage = await compressImage(processedImage);

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
      logger.error('Error adding card:', error);
      alert(t('cardEditor.errors.generalAddError'));
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
      alert(t('cardUpload.errorInvalidFormat'));
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
      logger.error('Error compressing cropped image:', error);
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
      handleSubmit(e);
    }
  };

  const isDuplicateTitle = Boolean(title.trim()) && existingTitleSet.has(normalizeTitle(title));
  const isInvalidTitle = !isPrintableCardTitle(title);



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
      <div className="card-upload__layout">
        <div className="card-upload__media">
          {imagePreview ? (
            <>
              <div className="card-form__photo">
                <img src={imagePreview} alt="" />
              </div>
              <div className="card-upload__media-actions">
                <button
                  type="button"
                  onClick={() => setShowEditor(true)}
                  className="card-form__button card-form__button--secondary card-form__button--small"
                  disabled={isUploading}
                >
                  <FaCropAlt aria-hidden="true" />
                  {t('cardUpload.actions.adjustImage')}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="card-form__button card-form__button--ghost card-form__button--small"
                  disabled={isUploading}
                >
                  {t('cardUpload.actions.changePhoto')}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="card-upload__dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCamera className="card-upload__dropzone-icon" aria-hidden="true" />
              <span className="card-upload__dropzone-main">{t('cardUpload.placeholder.main')}</span>
              <span className="card-upload__dropzone-sub">{t('cardUpload.placeholder.sub')}</span>
            </button>
          )}
        </div>

        <div className="card-upload__form">
          <div className="card-form__field">
            <label htmlFor="card-upload-title" className="card-form__label">
              {t('cardUpload.label')}
            </label>
            <input
              id="card-upload-title"
              ref={titleInputRef}
              type="text"
              placeholder={t('cardUpload.inputPlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="card-form__input"
              maxLength={100}
              disabled={!imagePreview}
            />
            {isDuplicateTitle && <p className="card-form__error">{t('cardUpload.errorDuplicate')}</p>}
            {isInvalidTitle && (
              <p className="card-form__error" role="alert">
                {t('cardUpload.errorInvalidTitle')}
              </p>
            )}
            <p className="card-form__help">{t('cardUpload.helpText')}</p>
          </div>

          <CardLivePreview photo={imagePreview} title={title} number={previewNumber} />

          <button
            type="submit"
            disabled={!title.trim() || isInvalidTitle || !imagePreview || isUploading}
            className="card-form__button card-form__button--primary card-upload__submit"
          >
            {!isUploading && <FaPlus aria-hidden="true" />}
            {isUploading ? t('cardUpload.status.processing') : t('cardUpload.actions.addCard')}
          </button>
        </div>
      </div>
    </form>
  );
};
