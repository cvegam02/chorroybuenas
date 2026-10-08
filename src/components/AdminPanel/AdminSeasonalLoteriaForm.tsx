import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaFilePdf, FaTimes } from 'react-icons/fa';
import {
  SeasonalRepository,
  type AdminSeasonalLoteria,
  type Season,
} from '../../repositories/SeasonalRepository';
import {
  SEASONAL_DESCRIPTION_MAX_LENGTH,
  SEASONAL_FORM_TABS,
  SEASONAL_NAME_MAX_LENGTH,
  SEASONAL_PDF_MIME_TYPE,
  formatFileSize,
  parsePriceToCents,
  tabsWithErrors,
  validatePdfFile,
  validateSeasonalLoteriaForm,
  type SeasonalFormErrors,
  type SeasonalFormTab,
  type SeasonalGridSize,
  type SeasonalLoteriaForm,
} from '../../utils/seasonalLoteria';
import { isoToLocalInput, missingToPublish } from '../../utils/seasonalPublishing';
import { AdminSeasonalPreviews } from './AdminSeasonalPreviews';
import { storedPreviewItem, uploadPendingPreviews, type PreviewItem } from './seasonalPreviewItems';
import './AdminTokenPacks.css';
import './AdminSeasonal.css';

interface AdminSeasonalLoteriaFormProps {
  seasons: readonly Season[];
  /** La lotería que se edita, o null para crear una nueva. */
  loteria: AdminSeasonalLoteria | null;
  /** Con ventas, reemplazar el PDF cambia lo que descargan quienes ya compraron. */
  hasSales: boolean;
  /** Pestaña con la que abre la ventana; por omisión, Datos. */
  initialTab?: SeasonalFormTab;
  /** `changed` avisa si se guardó algo, para que la tabla se vuelva a cargar. */
  onClose: (changed: boolean) => void;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}

const Field = ({ id, label, error, wide = false, children }: FieldProps) => (
  <div className={`admin-packs__field${wide ? ' admin-seasonal__field--wide' : ''}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    {error && (
      <p className="admin-packs__error admin-seasonal-form__field-error" id={`${id}-error`}>
        {error}
      </p>
    )}
  </div>
);

/** 4900 → «49»; 4950 → «49.50». */
function centsToPriceText(cents: number | null): string {
  if (cents === null) return '';
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

function toFormState(loteria: AdminSeasonalLoteria | null, seasons: readonly Season[]): SeasonalLoteriaForm {
  if (!loteria) {
    return {
      seasonId: seasons.length === 1 ? seasons[0].id : '',
      nameEs: '',
      nameEn: '',
      descriptionEs: '',
      descriptionEn: '',
      gridSize: 16,
      cardCount: '',
      boardCount: '',
      price: '',
      validFrom: '',
      validUntil: '',
    };
  }
  return {
    seasonId: loteria.season_id,
    nameEs: loteria.name_es,
    nameEn: loteria.name_en ?? '',
    descriptionEs: loteria.description_es ?? '',
    descriptionEn: loteria.description_en ?? '',
    gridSize: loteria.grid_size,
    cardCount: loteria.card_count?.toString() ?? '',
    boardCount: loteria.board_count?.toString() ?? '',
    price: centsToPriceText(loteria.price_cents),
    validFrom: isoToLocalInput(loteria.valid_from),
    validUntil: isoToLocalInput(loteria.valid_until),
  };
}

export const AdminSeasonalLoteriaForm = ({
  seasons,
  loteria,
  hasSales,
  initialTab = 'datos',
  onClose,
}: AdminSeasonalLoteriaFormProps) => {
  const [activeTab, setActiveTab] = useState<SeasonalFormTab>(initialTab);
  const [form, setForm] = useState<SeasonalLoteriaForm>(() => toFormState(loteria, seasons));
  const [errors, setErrors] = useState<SeasonalFormErrors>({});
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Si la ficha se guardó pero el PDF falló, el reintento actualiza esa ficha en vez de crear otra.
  const [savedId, setSavedId] = useState<string | null>(loteria?.id ?? null);
  // Algo se guardó ya, aunque después fallara un archivo: al cerrar hay que recargar la tabla.
  const [hasChanges, setHasChanges] = useState(false);
  const [cover, setCover] = useState<PreviewItem | null>(() =>
    loteria?.cover_path ? storedPreviewItem(loteria.cover_path) : null,
  );
  const [samples, setSamples] = useState<PreviewItem[]>(() => (loteria?.sample_paths ?? []).map(storedPreviewItem));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const hasPendingFiles = pdfFile !== null || [cover, ...samples].some((item) => item?.blob);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose(hasChanges);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isSaving, hasChanges, onClose]);

  const setField = <K extends keyof SeasonalLoteriaForm>(field: K, value: SeasonalLoteriaForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Se limpia para poder volver a elegir el mismo archivo después de un rechazo.
    e.target.value = '';
    if (!file) return;
    const rejection = validatePdfFile(file);
    setPdfError(rejection);
    if (!rejection) setPdfFile(file);
  };

  const shownPdf = pdfFile
    ? { name: pdfFile.name, sizeBytes: pdfFile.size, note: 'Se subirá al guardar.' }
    : loteria?.pdf
      ? { name: loteria.pdf.name, sizeBytes: loteria.pdf.sizeBytes, note: null }
      : null;
  const missing = missingToPublish({
    name_es: form.nameEs,
    description_es: form.descriptionEs,
    // Un número mal escrito cuenta como presente: de eso ya avisa la validación del campo.
    card_count: form.cardCount.trim() === '' ? null : Number(form.cardCount),
    board_count: form.boardCount.trim() === '' ? null : Number(form.boardCount),
    price_cents: parsePriceToCents(form.price),
    hasPdf: shownPdf !== null,
    hasCover: cover !== null,
  });
  const describedBy = (id: string, error?: string) => (error ? `${id}-error` : undefined);

  /** Sube las imágenes nuevas, guarda portada y orden de muestras, y borra las que ya no se usan. */
  const persistPreviews = async (id: string): Promise<boolean> => {
    const [uploadedCover = null] = cover ? await uploadPendingPreviews(id, [cover]) : [];
    const uploadedSamples = await uploadPendingPreviews(id, samples);
    setCover(uploadedCover);
    setSamples(uploadedSamples);
    if ([uploadedCover, ...uploadedSamples].some((item) => item !== null && item.path === null)) return false;

    const coverPath = uploadedCover?.path ?? null;
    const samplePaths = uploadedSamples.flatMap((item) => (item.path ? [item.path] : []));
    if (!(await SeasonalRepository.savePreviews(id, coverPath, samplePaths))) return false;

    const kept = new Set([coverPath, ...samplePaths]);
    const previous = [loteria?.cover_path ?? null, ...(loteria?.sample_paths ?? [])];
    await SeasonalRepository.removePreviews(previous.filter((path): path is string => path !== null && !kept.has(path)));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateSeasonalLoteriaForm(form);
    setErrors(result.errors);
    if (!result.input) {
      // El error puede estar en una pestaña que no se ve: se abre la primera que tenga uno.
      const [firstTab] = tabsWithErrors(result.errors);
      if (firstTab) setActiveTab(firstTab);
      return;
    }
    if (loteria?.is_published && missing.length > 0) {
      setSaveError(`Esta lotería está publicada y no puede quedarse sin ${missing.join(', ')}. Despublícala primero.`);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const id = await SeasonalRepository.saveLoteria(savedId, result.input);
    if (!id) {
      setSaveError('No se pudo guardar la lotería. Intenta de nuevo.');
      setIsSaving(false);
      return;
    }
    setSavedId(id);
    setHasChanges(true);

    if (pdfFile) {
      const uploaded = await SeasonalRepository.uploadPdf(id, pdfFile, loteria?.pdf?.path ?? null);
      if (!uploaded) {
        setSaveError('Los datos se guardaron, pero el PDF no se pudo subir. Intenta de nuevo.');
        setIsSaving(false);
        return;
      }
    }
    if (!(await persistPreviews(id))) {
      setSaveError('Los datos se guardaron, pero no todas las imágenes se pudieron subir. Intenta de nuevo.');
      setIsSaving(false);
      return;
    }
    onClose(true);
  };


  const errorTabs = tabsWithErrors(errors);

  /** Flechas izquierda y derecha cambian de pestaña, como en cualquier grupo de pestañas. */
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const ids = SEASONAL_FORM_TABS.map((tab) => tab.id);
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = ids[(ids.indexOf(activeTab) + step + ids.length) % ids.length];
    setActiveTab(next);
    document.getElementById(`seasonal-tab-${next}`)?.focus();
  };

  const panelProps = (tab: SeasonalFormTab) => ({
    className: 'admin-seasonal-form__group',
    disabled: isSaving,
    hidden: activeTab !== tab,
    id: `seasonal-panel-${tab}`,
    role: 'tabpanel',
    'aria-labelledby': `seasonal-tab-${tab}`,
  });

  const content = (
    <div
      className="admin-seasonal-form"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seasonal-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose(hasChanges);
      }}
    >
      <form className="admin-seasonal-form__content" onSubmit={handleSubmit} noValidate>
        <div className="admin-seasonal-form__header">
          <h2 id="seasonal-form-title" className="admin-seasonal-form__title">
            {loteria ? 'Editar lotería' : 'Nueva lotería'}
          </h2>

          {saveError && (
            <p className="admin-packs__error" role="alert">
              {saveError}
            </p>
          )}
          {missing.length > 0 && (
            <p className="admin-seasonal__meta">Para poder publicarla falta: {missing.join(', ')}.</p>
          )}

          <div className="admin-seasonal-form__tabs" role="tablist" aria-label="Secciones de la ficha" onKeyDown={handleTabKeyDown}>
            {SEASONAL_FORM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`seasonal-tab-${tab.id}`}
                className={`admin-seasonal-form__tab${activeTab === tab.id ? ' admin-seasonal-form__tab--active' : ''}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`seasonal-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {errorTabs.includes(tab.id) && (
                  <span className="admin-seasonal-form__tab-error" aria-label="tiene errores">
                    !
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-seasonal-form__body">
        <fieldset {...panelProps('datos')}>
          <div className="admin-packs__new-row">
            <Field id="seasonal-season" label="Temporada" error={errors.seasonId} wide>
              <select
                id="seasonal-season"
                value={form.seasonId}
                onChange={(e) => setField('seasonId', e.target.value)}
                aria-describedby={describedBy('seasonal-season', errors.seasonId)}
                autoFocus
              >
                <option value="">Elige una temporada</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name_es}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="seasonal-mode" label="Modo">
              <select
                id="seasonal-mode"
                value={form.gridSize}
                onChange={(e) => setField('gridSize', Number(e.target.value) as SeasonalGridSize)}
              >
                <option value={16}>Clásico (4×4)</option>
                <option value={9}>Kids (3×3)</option>
              </select>
            </Field>
          </div>
          <div className="admin-packs__new-row">
            <Field id="seasonal-name-es" label="Nombre en español" error={errors.nameEs} wide>
              <input
                id="seasonal-name-es"
                type="text"
                maxLength={SEASONAL_NAME_MAX_LENGTH}
                value={form.nameEs}
                onChange={(e) => setField('nameEs', e.target.value)}
                aria-describedby={describedBy('seasonal-name-es', errors.nameEs)}
              />
            </Field>
            <Field id="seasonal-name-en" label="Nombre en inglés (opcional)" error={errors.nameEn} wide>
              <input
                id="seasonal-name-en"
                type="text"
                maxLength={SEASONAL_NAME_MAX_LENGTH}
                value={form.nameEn}
                onChange={(e) => setField('nameEn', e.target.value)}
                aria-describedby={describedBy('seasonal-name-en', errors.nameEn)}
              />
            </Field>
          </div>
          <div className="admin-packs__new-row">
            <Field id="seasonal-description-es" label="Descripción en español" error={errors.descriptionEs} wide>
              <textarea
                id="seasonal-description-es"
                rows={3}
                maxLength={SEASONAL_DESCRIPTION_MAX_LENGTH}
                value={form.descriptionEs}
                onChange={(e) => setField('descriptionEs', e.target.value)}
                aria-describedby={describedBy('seasonal-description-es', errors.descriptionEs)}
              />
            </Field>
            <Field
              id="seasonal-description-en"
              label="Descripción en inglés (opcional)"
              error={errors.descriptionEn}
              wide
            >
              <textarea
                id="seasonal-description-en"
                rows={3}
                maxLength={SEASONAL_DESCRIPTION_MAX_LENGTH}
                value={form.descriptionEn}
                onChange={(e) => setField('descriptionEn', e.target.value)}
                aria-describedby={describedBy('seasonal-description-en', errors.descriptionEn)}
              />
            </Field>
          </div>
          <div className="admin-packs__new-row">
            <Field id="seasonal-card-count" label="Número de cartas" error={errors.cardCount}>
              <input
                id="seasonal-card-count"
                type="text"
                inputMode="numeric"
                value={form.cardCount}
                onChange={(e) => setField('cardCount', e.target.value)}
                placeholder="54"
                aria-describedby={describedBy('seasonal-card-count', errors.cardCount)}
              />
            </Field>
            <Field id="seasonal-board-count" label="Número de tableros" error={errors.boardCount}>
              <input
                id="seasonal-board-count"
                type="text"
                inputMode="numeric"
                value={form.boardCount}
                onChange={(e) => setField('boardCount', e.target.value)}
                placeholder="10"
                aria-describedby={describedBy('seasonal-board-count', errors.boardCount)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset {...panelProps('precio')}>
          <div className="admin-packs__new-row">
            <Field id="seasonal-price" label="Precio en pesos (mínimo $10.00)" error={errors.price}>
              <input
                id="seasonal-price"
                type="text"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="49"
                aria-describedby={describedBy('seasonal-price', errors.price)}
              />
            </Field>
            <Field id="seasonal-valid-from" label="Visible desde (opcional)" error={errors.validFrom}>
              <input
                id="seasonal-valid-from"
                type="datetime-local"
                value={form.validFrom}
                onChange={(e) => setField('validFrom', e.target.value)}
                aria-describedby={describedBy('seasonal-valid-from', errors.validFrom)}
              />
            </Field>
            <Field id="seasonal-valid-until" label="Visible hasta (opcional)" error={errors.validUntil}>
              <input
                id="seasonal-valid-until"
                type="datetime-local"
                value={form.validUntil}
                onChange={(e) => setField('validUntil', e.target.value)}
                aria-describedby={describedBy('seasonal-valid-until', errors.validUntil)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset {...panelProps('archivos')}>
          <div className="admin-seasonal-form__file">
            <FaFilePdf className="admin-seasonal-form__file-icon" aria-hidden="true" />
            <div className="admin-seasonal-form__file-info">
              {shownPdf ? (
                <>
                  <span className="admin-seasonal-form__file-name">{shownPdf.name}</span>
                  <span className="admin-seasonal__meta">
                    {formatFileSize(shownPdf.sizeBytes)}
                    {shownPdf.note ? ` · ${shownPdf.note}` : ''}
                  </span>
                </>
              ) : (
                <span className="admin-seasonal__meta">Todavía no tiene PDF (hasta 50 MB).</span>
              )}
              {hasSales && shownPdf && (
                <span className="admin-seasonal__meta">
                  Ya tiene ventas: si reemplazas el PDF, quienes la compraron descargarán la versión nueva.
                </span>
              )}
            </div>
            <button
              type="button"
              className="admin-packs__btn admin-packs__btn--secondary"
              onClick={() => fileInputRef.current?.click()}
              aria-describedby={pdfError ? 'seasonal-pdf-error' : undefined}
            >
              {shownPdf ? 'Reemplazar' : 'Elegir PDF'}
            </button>
            <button
              type="button"
              className="admin-packs__btn admin-packs__btn--secondary"
              onClick={() => navigate(`/admin/temporada/${savedId}/crear`)}
              disabled={!savedId}
              aria-describedby="seasonal-builder-hint"
            >
              Crear el PDF con mis cartas
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={SEASONAL_PDF_MIME_TYPE}
              onChange={handlePdfChange}
              aria-label="PDF de la lotería"
              hidden
            />
          </div>
          <p className="admin-seasonal__meta" id="seasonal-builder-hint">
            {savedId
              ? '«Crear el PDF con mis cartas» abre otra pantalla: guarda antes los cambios de esta ficha.'
              : 'Guarda la ficha para poder crear el PDF con tus cartas.'}
          </p>
          {pdfError && (
            <p className="admin-packs__error admin-seasonal-form__field-error" id="seasonal-pdf-error" role="alert">
              {pdfError}
            </p>
          )}
          <AdminSeasonalPreviews cover={cover} samples={samples} onCoverChange={setCover} onSamplesChange={setSamples} />
        </fieldset>

        </div>

        {isSaving && hasPendingFiles && (
          <div className="admin-seasonal-form__progress" role="progressbar" aria-label="Subiendo los archivos">
            <div className="admin-seasonal-form__progress-bar" />
          </div>
        )}

        <div className="admin-seasonal-form__actions">
          <button
            type="button"
            className="admin-packs__btn admin-packs__btn--secondary"
            onClick={() => onClose(hasChanges)}
            disabled={isSaving}
          >
            <FaTimes /> Cancelar
          </button>
          <button type="submit" className="admin-packs__btn admin-packs__btn--primary" disabled={isSaving}>
            <FaCheck /> {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(content, document.body);
};
