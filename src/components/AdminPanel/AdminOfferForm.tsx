import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AdminTokenPack } from '../../repositories/AdminRepository';
import { OfferRepository, type OfferSave } from '../../repositories/OfferRepository';
import { offerMinimumError } from '../../utils/purchaseRules';
import {
  datetimeInputFromIso,
  endsAtIso,
  offerCardSummary,
  offerHeaderStatus,
  offerPath,
  offerStatus,
  overlappingOffer,
  startsAtIso,
  validateOfferForm,
  type AdminOffer,
  type OfferForm,
  type OfferFormErrors,
} from '../../utils/adminOffers';
import {
  bannerDraftFromOffer,
  bannerFieldsFromDraft,
  validateBannerForm,
  type BannerDraft,
  type BannerFormErrors,
} from '../../utils/offerBanner';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { AdminOfferBanner } from './AdminOfferBanner';
import { AdminOfferDiscount } from './AdminOfferDiscount';
import { AdminOfferPreview } from './AdminOfferPreview';
import { useBannerMedia } from './useBannerMedia';

export interface OfferEditorData {
  offers: AdminOffer[];
  packs: AdminTokenPack[];
  priceCents: number | null;
  aiCostNote: string | null;
}

type Notice = { ok: boolean; text: string } | null;

const EMPTY_FORM: OfferForm = { name: '', percent: '', startsAt: '', endsAt: '' };

const formFromOffer = (offer: AdminOffer | null): OfferForm =>
  offer
    ? {
        name: offer.name,
        percent: String(offer.discount_percent),
        startsAt: datetimeInputFromIso(offer.starts_at),
        endsAt: datetimeInputFromIso(offer.ends_at),
      }
    : EMPTY_FORM;

const overlapMessage = (clash: AdminOffer, priceCents: number | null) =>
  `Se cruza con «${clash.name}» (${offerCardSummary(clash, priceCents).split(' · ')[0]}). Solo puede haber una oferta a la vez.`;

const SAVE_FAILED = 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.';

interface AdminOfferFormProps {
  data: OfferEditorData;
  offer: AdminOffer | null;
  initialNotice: Notice;
}

/** El formulario de la oferta: el descuento, el banner y su vista previa (FEAT-49, US A2 y A4). */
export const AdminOfferForm = ({ data, offer: initialOffer, initialNotice }: AdminOfferFormProps) => {
  const navigate = useNavigate();
  const [offer, setOffer] = useState(initialOffer);
  const [form, setForm] = useState<OfferForm>(() => formFromOffer(initialOffer));
  const [errors, setErrors] = useState<OfferFormErrors>({});
  const [banner, setBanner] = useState<BannerDraft>(() => bannerDraftFromOffer(initialOffer));
  const [bannerErrors, setBannerErrors] = useState<BannerFormErrors>({});
  const [message, setMessage] = useState<Notice>(initialNotice);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const files = useBannerMedia(initialOffer?.banner_video_path ?? null, initialOffer?.banner_image_path ?? null);

  const status = offer ? offerStatus(offer) : null;
  const readOnly = status === 'ended' || status === 'cancelled';
  const others = data.offers.filter((o) => o.id !== offer?.id);

  const changeForm = (field: keyof OfferForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setMessage(null);
  };

  const changeBanner = (patch: Partial<BannerDraft>) => {
    setBanner((prev) => ({ ...prev, ...patch }));
    setBannerErrors({});
    setMessage(null);
  };

  /** Revisa todo; devuelve lo que se guarda de la parte 1, o null con los errores a la vista. */
  const check = () => {
    const part1 = validateOfferForm(form);
    const part2 = validateBannerForm({ ...banner, hasVideo: files.media.video !== null, hasImage: files.media.image !== null });
    setErrors(part1.ok ? {} : part1.errors);
    setBannerErrors(part2);
    if (!part1.ok || Object.keys(part2).length > 0) {
      setMessage({ ok: false, text: 'Revisa los campos marcados.' });
      return null;
    }
    // Ningún pack activo puede quedar por debajo del mínimo de compra (FEAT-58, decisión 2)
    const belowMinimum = offerMinimumError(data.packs, part1.value.discount_percent);
    if (belowMinimum) {
      setErrors({ percent: belowMinimum });
      setMessage({ ok: false, text: belowMinimum });
      return null;
    }
    const clash = overlappingOffer(others, part1.value.starts_at, part1.value.ends_at, null);
    if (clash) {
      setMessage({ ok: false, text: overlapMessage(clash, data.priceCents) });
      return null;
    }
    return part1.value;
  };

  const save = async () => {
    const part1 = check();
    if (!part1) return;
    setBusy(true);
    const result = await saveOffer(offer, part1, banner, files);
    setBusy(false);
    if (!result.offer) {
      setMessage({ ok: false, text: result.error ?? SAVE_FAILED });
      return;
    }
    if (!offer) {
      // Ya existe: se pasa a su dirección, donde el formulario se vuelve a abrir con lo guardado.
      navigate(offerPath(result.offer.id), {
        replace: true,
        state: { tab: 'precios', notice: result.error ? { ok: false, text: result.error } : { ok: true, text: 'Guardado.' } },
      });
      return;
    }
    setOffer(result.offer);
    setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: 'Guardado.' });
  };

  const cancelOffer = async () => {
    if (!offer) return;
    setConfirmCancel(false);
    setBusy(true);
    const cancelled = await OfferRepository.cancelOffer(offer.id);
    setBusy(false);
    if (cancelled) setOffer(cancelled);
    setMessage(cancelled
      ? { ok: true, text: 'Oferta cancelada: los precios ya son los normales.' }
      : { ok: false, text: 'No se pudo cancelar. Revisa tu conexión e intenta de nuevo.' });
  };

  return (
    <div className="admin-offer">
      <header className="admin-offer__header">
        <Link to="/admin" state={{ tab: 'precios' }} className="admin-offer__back">← Precios y promos</Link>
        <div className="admin-offer__title-row">
          <h2 className="admin-offer__title">{offer ? `Oferta: ${offer.name}` : 'Nueva oferta'}</h2>
          {offer && status && (
            <span className={`admin-offers__status admin-offers__status--${status}`}>{offerHeaderStatus(offer)}</span>
          )}
        </div>
        <p className="admin-pricing__muted">Un descuento con fechas en todos los tokens, con su banner en Inicio y en Mi cuenta.</p>
      </header>

      <div className="admin-offer__layout">
        <div className="admin-offer__main">
          <AdminOfferDiscount
            form={form}
            errors={errors}
            readOnly={readOnly}
            priceCents={data.priceCents}
            packs={data.packs}
            aiCostNote={data.aiCostNote}
            onChange={changeForm}
          />
          <AdminOfferBanner
            draft={banner}
            errors={bannerErrors}
            video={files.media.video}
            image={files.media.image}
            fileErrors={files.error}
            readingVideo={files.reading}
            readOnly={readOnly}
            onChange={changeBanner}
            onVideo={files.chooseVideo}
            onImage={files.chooseImage}
          />
          {readOnly && (
            <p className="admin-pricing__muted">
              {status === 'cancelled' ? 'Esta oferta se canceló' : 'Esta oferta ya terminó'}: ya no se puede cambiar.
            </p>
          )}
          <p className={message?.ok ? 'admin-pricing__ok' : 'admin-pricing__error'} role="status">{message?.text ?? ''}</p>
          {!readOnly && (
            <div className="admin-offer__actions">
              {offer && (
                <button type="button" className="admin-pricing__btn admin-offer__cancel" disabled={busy} onClick={() => setConfirmCancel(true)}>
                  Cancelar oferta
                </button>
              )}
              <button type="button" className="admin-pricing__btn admin-pricing__btn--primary" disabled={busy || files.reading} onClick={save}>
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        <AdminOfferPreview
          draft={banner}
          videoUrl={files.media.video?.url ?? null}
          imageUrl={files.media.image?.url ?? null}
          startsAt={startsAtIso(form.startsAt)}
          endsAt={endsAtIso(form.endsAt)}
        />
      </div>

      <WarningModal
        isOpen={confirmCancel}
        title="¿Cancelar la oferta?"
        message={offer
          ? `«${offer.name}» deja de aplicar desde ahora y los precios vuelven a los normales. Los pagos ya iniciados con oferta conservan su precio. No se puede deshacer.`
          : ''}
        confirmText="Cancelar oferta"
        cancelText="No, dejarla"
        type="danger"
        onConfirm={cancelOffer}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
};

type BannerFiles = ReturnType<typeof useBannerMedia>;

/**
 * Guarda la oferta con su banner. Una oferta nueva se crea primero con el banner apagado, para tener su id
 * y subir los archivos a su carpeta. Devuelve la oferta guardada (si llegó a existir) y un error si algo
 * no se completó.
 */
async function saveOffer(
  offer: AdminOffer | null,
  part1: OfferSave,
  banner: BannerDraft,
  files: BannerFiles,
): Promise<{ offer: AdminOffer | null; error: string | null }> {
  let current = offer;
  if (!current) {
    const created = await OfferRepository.createOffer({
      ...part1,
      ...bannerFieldsFromDraft({ ...banner, enabled: false }, { video: null, image: null }),
    });
    if (!created.ok) {
      return { offer: null, error: created.overlap ? 'Se cruza con otra oferta. Solo puede haber una oferta a la vez.' : SAVE_FAILED };
    }
    current = created.offer;
  }

  const paths = await files.upload(current.id);
  if (!paths) {
    return { offer: current, error: 'No se pudieron subir los archivos del banner. Vuelve a elegirlos y guarda.' };
  }
  const saved = await OfferRepository.updateOffer(current.id, { ...part1, ...bannerFieldsFromDraft(banner, paths) });
  if (!saved.ok) {
    return { offer: current, error: saved.overlap ? 'Se cruza con otra oferta. Solo puede haber una oferta a la vez.' : SAVE_FAILED };
  }
  files.markSaved({ video: paths.video, image: paths.image });
  await OfferRepository.removeBannerFiles(paths.replaced);
  return { offer: saved.offer, error: null };
}
