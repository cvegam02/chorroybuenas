import { useTranslation } from 'react-i18next';
import { useCardPreview } from '../../hooks/useCardPreview';
import './CardForm.css';

interface CardLivePreviewProps {
  photo: string | null;
  title: string;
  number?: number;
  framed?: boolean;
  /** Solo la carta y su leyenda, para teléfono (FEAT-39). */
  compact?: boolean;
}

/** «Así se verá» (FEAT-34, US A6): la carta con su número y su nombre, que cambia mientras se escribe. */
export const CardLivePreview = ({ photo, title, number, framed, compact }: CardLivePreviewProps) => {
  const { t } = useTranslation();
  const composedUrl = useCardPreview({ photo, name: title, number, framed });
  const imageUrl = composedUrl ?? photo;

  const card = imageUrl ? (
    <img src={imageUrl} alt={t('cardUpload.preview.alt')} className="card-form__preview-card" />
  ) : (
    <span className="card-form__preview-card" aria-hidden="true" />
  );

  if (compact) {
    return (
      <figure className="card-form__preview card-form__preview--compact">
        {card}
        <figcaption className="card-form__preview-caption">{t('cardUpload.preview.title')}</figcaption>
      </figure>
    );
  }

  return (
    <div className="card-form__preview">
      {card}
      <div className="card-form__preview-text">
        <strong>{t('cardUpload.preview.title')}</strong>
        <span>{t('cardUpload.preview.text')}</span>
      </div>
    </div>
  );
};
