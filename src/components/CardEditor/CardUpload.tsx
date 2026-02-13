import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { convertFileToBase64, validateImageFile, compressImage, adjustImageToCardAspectRatio } from '../../utils/imageUtils';
import { ImageEditor } from './ImageEditor';
import './CardUpload.css';


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
  submitLabel
}: CardUploadProps) => {
  const { t } = useTranslation();
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
      alert(t('cardUpload.errorInvalidFormat'));
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
      alert(t('cardUpload.errorNoTitle'));
      return;
    }

    const isTitleChanged = normalizedTitle !== normalizeTitle(initialTitle);

    if (isTitleChanged && existingTitleSet.has(normalizedTitle)) {
      alert(t('cardUpload.errorDuplicate'));
      return;
    }

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
      console.error('Error adding card:', error);
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
      <div className="card-upload__layout">
        <div className="card-upload__media">
          {imagePreview ? (
            <div className="card-upload__preview-container">
              <img src={imagePreview} alt="Preview" className="card-upload__preview" />
              <div className="card-upload__edit-overlay">
                <span role="img" aria-label="edit">✏️</span>
                <p>{t('cardUpload.status.clickToAdjust')}</p>
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
                <span className="card-upload__placeholder-icon">📷</span>
                <p className="card-upload__placeholder-main">{t('cardUpload.placeholder.main')}</p>
                <p className="card-upload__placeholder-sub">{t('cardUpload.placeholder.sub')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="card-upload__form">
          <div className="card-upload__title-group">
            <label className="card-upload__label">
              {t('cardUpload.label')}
            </label>
            <input
              ref={titleInputRef}
              type="text"
              placeholder={t('cardUpload.inputPlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="card-upload__title-input"
              maxLength={100}
              disabled={!imagePreview}
            />
            {isDuplicateTitle && (
              <p className="card-upload__error-text">
                {t('cardUpload.errorDuplicate')}
              </p>
            )}
            <p className="card-upload__help-text">
              {t('cardUpload.helpText')}
            </p>
          </div>

          <div className="card-upload__actions">
            {imagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="card-upload__change-button"
                disabled={isUploading}
              >
                {t('cardUpload.actions.changePhoto')}
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
                <span>{t('cardUpload.actions.adjustImage')}</span>
              </button>
            )}
            <button
              type="submit"
              disabled={!title.trim() || !imagePreview || isUploading}
              className="card-upload__submit"
            >
              {isUploading ? t('cardUpload.status.processing') : (submitLabel || t('cardUpload.actions.addCard'))}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

