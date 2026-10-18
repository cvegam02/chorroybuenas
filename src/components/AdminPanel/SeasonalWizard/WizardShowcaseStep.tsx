import { useRef } from 'react';
import { PREVIEW_ACCEPTED_MIME_TYPES } from '../../../utils/seasonalPreview';
import { AdminSeasonalPreviews } from '../AdminSeasonalPreviews';
import type { WizardCardsState } from './useWizardCards';
import { buildsOnSite, type CardsMode } from './WizardCardsStep';
import type { WizardShowcaseState } from './useWizardShowcase';
import { BusyLabel } from './WizardBusy';

interface WizardShowcaseStepProps {
  mode: CardsMode;
  cards: WizardCardsState;
  showcase: WizardShowcaseState;
}

/** Con «Subir mis cartas»: portada y muestras se eligen de las cartas, o la portada se sube aparte. */
const CardsShowcase = ({ cards, showcase }: Omit<WizardShowcaseStepProps, 'mode'>) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = showcase.isSaving || showcase.isPreparing;
  const hasCover = showcase.cover !== null || showcase.ownCover !== null;

  if (cards.cards.length === 0) {
    return <p className="seasonal-wizard__muted">Primero sube tus cartas en el paso 2.</p>;
  }

  return (
    <>
      <div className="seasonal-wizard__legend">
        <span>
          <span className="seasonal-wizard__pick seasonal-wizard__pick--cover" aria-hidden="true">
            ★
          </span>
          Portada ({hasCover ? 1 : 0})
        </span>
        <span>
          <span className="seasonal-wizard__pick seasonal-wizard__pick--sample" aria-hidden="true">
            ✓
          </span>
          Muestra ({showcase.samples.length} {showcase.samples.length === 1 ? 'elegida' : 'elegidas'})
        </span>
      </div>

      <ul className="seasonal-wizard__showcase">
        {cards.cards.map((card, index) => {
          const isCover = showcase.cover === index;
          const isSample = showcase.samples.includes(index);
          const state = isCover ? 'cover' : isSample ? 'sample' : 'none';
          return (
            <li key={card.id} className="seasonal-wizard__showcase-item">
              <div className="seasonal-wizard__card">
                <img src={card.url} alt="" />
                <span className="seasonal-wizard__card-number">{index + 1}</span>
                <button
                  type="button"
                  className={`seasonal-wizard__pick seasonal-wizard__pick--${state} seasonal-wizard__pick--on-card`}
                  aria-label={isCover ? `Carta ${index + 1}: portada` : isSample ? `Quitar la carta ${index + 1} de las muestras` : `Marcar la carta ${index + 1} como muestra`}
                  aria-pressed={isCover ? undefined : isSample}
                  onClick={() => showcase.toggle(index)}
                  disabled={busy || isCover}
                >
                  {isCover ? '★' : isSample ? '✓' : ''}
                </button>
              </div>
              {!isCover && (
                <button
                  type="button"
                  className="seasonal-wizard__link-btn"
                  onClick={() => showcase.chooseCover(index)}
                  disabled={busy}
                  aria-label={`Usar la carta ${index + 1} de portada`}
                >
                  Usar de portada
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="seasonal-wizard__own-cover">
        {showcase.ownCover && (
          <img className="seasonal-wizard__own-cover-img" src={showcase.ownCover.url} alt="Portada subida aparte, ya protegida" />
        )}
        <button type="button" className="seasonal-wizard__btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          <BusyLabel busy={showcase.isPreparing} text={showcase.isPreparing ? 'Preparando la portada…' : 'Subir otra portada'} />
        </button>
        <span className="seasonal-wizard__muted">
          {showcase.ownCover ? 'Esta es la portada. Para usar una carta, toca «Usar de portada».' : 'O usa la carta marcada con ★.'} A todas
          se les pone marca de agua al guardar.
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={PREVIEW_ACCEPTED_MIME_TYPES.join(',')}
          hidden
          aria-label="Imagen de la portada"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void showcase.uploadOwnCover(file);
          }}
        />
      </div>
    </>
  );
};

/** Paso 4 del asistente (FEAT-48, decisiones 13 y 19): lo que ve la gente en el catálogo antes de comprar. */
export const WizardShowcaseStep = ({ mode, cards, showcase }: WizardShowcaseStepProps) => (
  <section className="seasonal-wizard__panel" aria-labelledby="wizard-step-title">
    <div>
      <h1 id="wizard-step-title" className="seasonal-wizard__step-title">
        Vitrina
      </h1>
      <p className="seasonal-wizard__muted">
        Lo que ve la gente en el catálogo antes de comprar.{buildsOnSite(mode) ? ' Toca una carta para marcarla.' : ''}
      </p>
    </div>
    {buildsOnSite(mode) ? (
      <CardsShowcase cards={cards} showcase={showcase} />
    ) : (
      <AdminSeasonalPreviews
        cover={showcase.pdfCover}
        samples={showcase.pdfSamples}
        onCoverChange={showcase.setPdfCover}
        onSamplesChange={showcase.setPdfSamples}
      />
    )}
    {showcase.isSaving && (
      <p className="seasonal-wizard__muted" role="status">
        Poniendo la marca de agua y guardando…
      </p>
    )}
    {showcase.error && (
      <p className="seasonal-wizard__field-error" role="alert">
        {showcase.error}
      </p>
    )}
  </section>
);
