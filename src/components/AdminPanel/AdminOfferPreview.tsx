import { useState } from 'react';
import { BANNER_TARGET_PATHS, timeLeft, type BannerDraft } from '../../utils/offerBanner';
import { OfferBanner } from '../OfferBanner/OfferBanner';

interface AdminOfferPreviewProps {
  draft: BannerDraft;
  videoUrl: string | null;
  imageUrl: string | null;
  /** Fechas de la oferta ya revisadas; sin ellas no hay cuenta regresiva. */
  startsAt: string | null;
  endsAt: string | null;
}

/** Vista previa del aviso flotante, en computadora y en celular, antes de guardar (FEAT-49, decisión 14 y US A6). */
export const AdminOfferPreview = ({ draft, videoUrl, imageUrl, startsAt, endsAt }: AdminOfferPreviewProps) => {
  const [layout, setLayout] = useState<'desktop' | 'mobile'>('desktop');
  const countdown = draft.countdown && startsAt && endsAt ? timeLeft(endsAt, startsAt, new Date()) : null;
  const ready = videoUrl && imageUrl;

  return (
    <aside className="admin-offer__preview" aria-label="Vista previa">
      <div className="admin-offer__preview-head">
        <strong>Vista previa</strong>
        <div role="group" aria-label="Dispositivo" className="admin-offer__seg">
          {(['desktop', 'mobile'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`admin-offer__seg-btn${layout === value ? ' admin-offer__seg-btn--on' : ''}`}
              aria-pressed={layout === value}
              onClick={() => setLayout(value)}
            >
              {value === 'desktop' ? 'Computadora' : 'Celular'}
            </button>
          ))}
        </div>
      </div>

      <div className={`admin-offer__device admin-offer__device--${layout}`}>
        <div className="admin-offer__device-content" aria-hidden="true" />
        <div className="admin-offer__device-content admin-offer__device-content--short" aria-hidden="true" />
        {ready ? (
          <OfferBanner
            title={draft.titleEs || 'Título del banner'}
            text={draft.textEs}
            button={draft.buttonEs || 'Texto del botón'}
            videoUrl={videoUrl}
            imageUrl={imageUrl}
            countdown={countdown}
            targetPath={BANNER_TARGET_PATHS[draft.target]}
            layout={layout}
            preview
            onClose={() => undefined}
          />
        ) : (
          <p className="admin-offer__preview-empty">Sube el video para ver el banner.</p>
        )}
      </div>

      <p className="admin-pricing__muted">
        {draft.enabled
          ? 'El banner aparece solo durante las fechas de la oferta. Quien lo cierre con ✕ no lo vuelve a ver en esa oferta.'
          : 'El banner está apagado: no se mostrará aunque la oferta esté vigente.'}
      </p>
    </aside>
  );
};
