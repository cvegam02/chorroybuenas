import { useState, type ChangeEvent, type ReactNode } from 'react';
import type { BannerDraft, BannerFormErrors, BannerTarget } from '../../utils/offerBanner';
import type { BannerMedia } from './useBannerMedia';

type TextField = 'titleEs' | 'textEs' | 'buttonEs' | 'titleEn' | 'textEn' | 'buttonEn';

interface AdminOfferBannerProps {
  draft: BannerDraft;
  errors: BannerFormErrors;
  video: BannerMedia | null;
  image: BannerMedia | null;
  fileErrors: { video?: string; image?: string };
  readingVideo: boolean;
  readOnly: boolean;
  onChange: (patch: Partial<BannerDraft>) => void;
  onVideo: (file: File) => void;
  onImage: (file: File) => void;
}

const TARGETS: { value: BannerTarget; label: string }[] = [
  { value: 'buy_tokens', label: 'Comprar tokens' },
  { value: 'create', label: 'Crear lotería' },
  { value: 'themed', label: 'Temáticas' },
];

const pickFile = (handler: (file: File) => void) => (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file) handler(file);
};

const FieldError = ({ id, text }: { id: string; text?: string }) =>
  text ? <span id={id} className="admin-pricing__error">{text}</span> : null;

interface FileRowProps {
  label: string;
  item: BannerMedia | null;
  empty: { title: string; detail: string };
  accept: string;
  button: string;
  error?: string;
  disabled: boolean;
  thumb: ReactNode;
  onFile: (file: File) => void;
}

/** Un archivo del banner: miniatura, nombre, detalle y el botón para elegir otro. */
const FileRow = ({ label, item, empty, accept, button, error, disabled, thumb, onFile }: FileRowProps) => (
  <div className="admin-offer__field">
    {label}
    <div className="admin-offer__file">
      {thumb}
      <span className="admin-offer__file-text">
        <span className="admin-offer__file-name">{item?.label ?? empty.title}</span>
        <span className="admin-pricing__muted">{item?.detail ?? empty.detail}</span>
      </span>
      <label className={`admin-pricing__btn admin-offer__file-btn${disabled ? ' admin-offer__file-btn--off' : ''}`}>
        {button}
        <input type="file" accept={accept} className="admin-pricing__sr-only" disabled={disabled} onChange={pickFile(onFile)} />
      </label>
    </div>
    {error && <span className="admin-pricing__error" role="alert">{error}</span>}
  </div>
);

/** Parte «2 · El banner» de la oferta (FEAT-49, US A4, decisiones 10 y 17). */
export const AdminOfferBanner = ({
  draft, errors, video, image, fileErrors, readingVideo, readOnly, onChange, onVideo, onImage,
}: AdminOfferBannerProps) => {
  // Abierta al entrar solo si ya hay textos en inglés; después la abre y cierra quien la usa.
  const [englishOpen] = useState(() => Boolean(draft.titleEn || draft.textEn || draft.buttonEn));
  const text = (field: TextField, label: string, maxLength: number) => (
    <label className="admin-offer__field">
      {label}
      <input
        className="admin-offer__input"
        type="text"
        value={draft[field]}
        maxLength={maxLength}
        disabled={readOnly}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? `admin-offer-${field}-error` : undefined}
        onChange={(e) => onChange({ [field]: e.target.value })}
      />
      <FieldError id={`admin-offer-${field}-error`} text={errors[field]} />
    </label>
  );

  const check = (field: 'onHome' | 'onDashboard' | 'countdown', label: string) => (
    <label className="admin-offer__check">
      <input type="checkbox" checked={draft[field]} disabled={readOnly} onChange={(e) => onChange({ [field]: e.target.checked })} />
      {label}
    </label>
  );

  return (
    <section className="admin-pricing__card admin-offer__part" aria-labelledby="admin-offer-banner">
      <div className="admin-offer__part-head">
        <h3 id="admin-offer-banner" className="admin-offer__part-title">2 · El banner</h3>
        <label className="admin-offer__check admin-offer__check--strong">
          <input type="checkbox" checked={draft.enabled} disabled={readOnly} onChange={(e) => onChange({ enabled: e.target.checked })} />
          Mostrar banner
        </label>
      </div>

      <div className="admin-offer__fields admin-offer__fields--wide">
        <FileRow
          label="Video (MP4, máx. 15 s y 8 MB)"
          item={video}
          empty={{ title: 'Sin video', detail: readingVideo ? 'Leyendo el video…' : 'Elige un MP4' }}
          accept="video/mp4"
          button={video ? 'Cambiar' : 'Subir'}
          error={fileErrors.video ?? errors.video}
          disabled={readOnly || readingVideo}
          thumb={<span className="admin-offer__thumb admin-offers__thumb" aria-hidden="true" />}
          onFile={onVideo}
        />
        <FileRow
          label="Imagen para celular"
          item={image}
          empty={{ title: 'Se toma del primer cuadro', detail: 'o sube otra' }}
          accept="image/jpeg,image/png,image/webp"
          button="Subir"
          error={fileErrors.image ?? errors.image}
          disabled={readOnly}
          thumb={image
            ? <img className="admin-offer__thumb admin-offer__thumb--image" src={image.url} alt="" />
            : <span className="admin-offer__thumb admin-offer__thumb--square" aria-hidden="true" />}
          onFile={onImage}
        />
      </div>

      {text('titleEs', 'Título', 80)}
      {text('textEs', 'Texto corto', 200)}
      <div className="admin-offer__fields admin-offer__fields--wide">
        {text('buttonEs', 'Texto del botón', 40)}
        <label className="admin-offer__field">
          Lleva a
          <select
            className="admin-offer__input"
            value={draft.target}
            disabled={readOnly}
            onChange={(e) => onChange({ target: e.target.value as BannerTarget })}
          >
            {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="admin-offer__group" aria-describedby={errors.screens ? 'admin-offer-screens-error' : undefined}>
        <legend className="admin-offer__legend">Dónde aparece</legend>
        <div className="admin-offer__checks">
          {check('onHome', 'Inicio')}
          {check('onDashboard', 'Mi cuenta')}
        </div>
        <FieldError id="admin-offer-screens-error" text={errors.screens} />
      </fieldset>
      {check('countdown', 'Mostrar cuenta regresiva («Termina en 2 días 5 h»)')}

      <details className="admin-offer__english" open={englishOpen || undefined}>
        <summary>Textos en inglés (opcional)</summary>
        <p className="admin-pricing__muted">Con el sitio en inglés se muestran estos; lo que quede vacío sale en español.</p>
        {text('titleEn', 'Title', 80)}
        {text('textEn', 'Short text', 200)}
        {text('buttonEn', 'Button text', 40)}
      </details>
    </section>
  );
};
