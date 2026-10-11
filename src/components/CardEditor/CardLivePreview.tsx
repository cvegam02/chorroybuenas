import { useTranslation } from 'react-i18next';
import { useCardPreview } from '../../hooks/useCardPreview';
import './CardForm.css';

interface CardLivePreviewProps {
  photo: string | null;
  title: string;
  number?: number;
  framed?: boolean;
}

/** «Así se verá» (FEAT-34, US A6): la carta con su número y su nombre, que cambia mientras se escribe. */
export const CardLivePreview = ({ photo, title, number, framed }: CardLivePreviewProps) => {
  const { t } = useTranslation();
  const composedUrl = useCardPreview({ photo, name: title, number, framed });
  const imageUrl = composedUrl ?? photo;

  return (
    <div className="card-form__preview">
      {imageUrl ? (
        <img src={imageUrl} alt={t('cardUpload.preview.alt')} className="card-form__preview-card" />
      ) : (
        <span className="card-form__preview-card" aria-hidden="true" />
      )}
      <div className="card-form__preview-text">
        <strong>{t('cardUpload.preview.title')}</strong>
        <span>{t('cardUpload.preview.text')}</span>
      </div>
    </div>
  );
};
