import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaCropAlt, FaImage, FaMagic, FaTimes } from 'react-icons/fa';
import { Card } from '../../types';
import { ImageEditor } from './ImageEditor';
import { CardActionConfirm } from './CardActionConfirm';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useCardPreview } from '../../hooks/useCardPreview';
import { adjustImageToCardAspectRatio, compressImage, convertFileToBase64, validateImageFile } from '../../utils/imageUtils';
import { imageToDataUrl } from '../../utils/imageDataUrl';
import { logger } from '../../utils/logger';
import {
  afterNewVersion,
  choiceStatus,
  draftImage,
  initialDraft,
  saveUpdates,
  selectChoice,
  titleProblem,
  withCrop,
  withNewPhoto,
  type CardImageChoice,
} from '../../utils/cardEditDraft';
import './CardUploadModal.css';
import './CardForm.css';
import './CardEditModal.css';

interface CardEditModalProps {
  /** La carta como está guardada en este momento. */
  card: Card;
  totalCards: number;
  /** Nombres de las demás cartas, para no repetir. */
  otherTitles: string[];
  onClose: () => void;
  /** Guarda cambios en la carta; devuelve si se pudo. */
  onSave: (updates: Partial<Card>) => Promise<boolean>;
  /**
   * Hace una versión con IA a partir de la carta que recibe y la guarda en la carta al momento.
   * Devuelve la imagen nueva, o `null` si falló (el token se devuelve). Sin sesión no se pasa: no hay IA.
   */
  onGenerate?: (source: Card) => Promise<string | null>;
  tokenBalance: number | null;
  /** Por qué no se puede usar la IA ahora mismo (la carta se está sincronizando). */
  aiBlockedNote?: string;
}

const TITLE_ERROR_KEYS = {
  empty: 'cardUpload.errorNoTitle',
  invalid: 'cardUpload.errorInvalidTitle',
  duplicate: 'cardUpload.errorDuplicate',
};

/** «Editar carta» (FEAT-34, US A8): una sola vista previa, que ya es la carta final, y la imagen como elección. */
export const CardEditModal = ({
  card,
  totalCards,
  otherTitles,
  onClose,
  onSave,
  onGenerate,
  tokenBalance,
  aiBlockedNote,
}: CardEditModalProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => initialDraft(card));
  const [showEditor, setShowEditor] = useState(false);
  const [busy, setBusy] = useState<'saving' | 'generating' | null>(null);
  const [confirmLosesAi, setConfirmLosesAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEscapeKey(onClose, !confirmLosesAi);

  const shownImage = draftImage(draft) ?? null;
  const previewUrl = useCardPreview({
    photo: shownImage,
    name: draft.title,
    number: card.number,
    framed: draft.selected === 'original',
  });
  const problem = titleProblem(draft.title, otherTitles);
  const hasTokens = tokenBalance !== null && tokenBalance >= 1;
  const isBusy = busy !== null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!validateImageFile(file)) {
      alert(t('cardUpload.errorInvalidFormat'));
      return;
    }
    try {
      // Igual que al agregar una carta: la foto se ajusta a la forma de la carta y se comprime.
      const photo = await compressImage(await adjustImageToCardAspectRatio(await convertFileToBase64(file)));
      setDraft((current) => withNewPhoto(current, photo));
    } catch (error) {
      logger.error('Error preparing the new photo:', error);
      alert(t('cardEditor.errors.generalAddError'));
    }
  };

  const handleCrop = async (croppedImage: string) => {
    let image = croppedImage;
    try {
      image = await compressImage(croppedImage);
    } catch (error) {
      logger.error('Error compressing cropped image:', error);
    }
    setDraft((current) => withCrop(current, image));
    setShowEditor(false);
  };

  const save = async (confirmed: boolean) => {
    if (problem || isBusy) return;
    const { updates, losesAi } = saveUpdates(card, draft);
    if (losesAi && !confirmed) {
      setConfirmLosesAi(true);
      return;
    }
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setBusy('saving');
    try {
      const toSave = updates.image ? { ...updates, image: await imageToDataUrl(updates.image) } : updates;
      if (await onSave(toSave)) onClose();
    } catch (error) {
      logger.error('Error saving the card:', error);
      alert(t('cardEditor.errors.generalAddError'));
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    if (!onGenerate || problem || isBusy || !hasTokens) return;
    setBusy('generating');
    try {
      // El nombre se guarda antes, para no perder lo escrito.
      const title = draft.title.trim();
      if (title !== card.title && !(await onSave({ title }))) return;

      // La versión en uso se sobrescribe al guardar la nueva: se conserva aquí para poder regresar a ella.
      const previousAi = draft.ai ? await imageToDataUrl(draft.ai).catch(() => undefined) : undefined;
      // La IA pinta la foto que se ve en la ventana, y esa foto se guarda junto con la versión nueva.
      const photo = draft.original ? await imageToDataUrl(draft.original).catch(() => undefined) : undefined;
      const source: Card =
        card.isAiGenerated === true
          ? { ...card, title, ...(photo ? { originalImage: photo } : {}) }
          : { ...card, title, ...(photo ? { image: photo } : {}), originalImage: undefined };

      const newAi = await onGenerate(source);
      if (newAi) {
        setDraft((current) => afterNewVersion({ ...current, ...(photo ? { original: photo } : {}) }, newAi, previousAi));
      }
    } catch (error) {
      logger.error('Error preparing the AI version:', error);
      alert(t('cardEditor.errors.generalAddError'));
    } finally {
      setBusy(null);
    }
  };

  const choiceLabel = (choice: CardImageChoice) => {
    if (choice === 'ai' && draft.aiPrevious) return t('cardEdit.choices.aiNew');
    return t(`cardEdit.choices.${choice}`);
  };

  const renderChoice = (choice: CardImageChoice) => {
    const image = draft[choice];
    if (!image) return null;
    const status = choiceStatus(draft, choice);
    const isSelected = choice === draft.selected;
    return (
      <button
        key={choice}
        type="button"
        role="radio"
        aria-checked={isSelected}
        disabled={isBusy}
        className={`card-edit__choice${choice === 'original' ? '' : ' card-edit__choice--ai'}`}
        onClick={() => setDraft((current) => selectChoice(current, choice))}
      >
        <img src={image} alt="" className="card-edit__choice-thumb" />
        <span className="card-edit__choice-text">
          <strong>{choiceLabel(choice)}</strong>
          <span className="card-edit__choice-status">{t(`cardEdit.status.${status}`)}</span>
        </span>
        {isSelected && (
          <span className="card-edit__choice-check">
            <FaCheck aria-hidden="true" />
          </span>
        )}
      </button>
    );
  };

  const modalContent = (
    <div
      className="card-modal__overlay card-edit__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-modal__content card-edit" role="dialog" aria-modal="true" aria-labelledby="card-edit-title">
        <div className="card-modal__header">
          <div className="card-edit__heading">
            <h2 id="card-edit-title" className="card-modal__title">{t('modals.cardEdit.title')}</h2>
            {card.number !== undefined && (
              <span className="card-edit__position">
                {t('cardEdit.position', { number: card.number, total: totalCards })}
              </span>
            )}
          </div>
          <button type="button" className="card-modal__close" onClick={onClose} aria-label={t('common.close')}>
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        {showEditor && shownImage ? (
          <div className="card-modal__body">
            <ImageEditor imageSrc={shownImage} onCrop={handleCrop} onCancel={() => setShowEditor(false)} />
          </div>
        ) : (
          <>
            <div className="card-modal__body card-edit__body">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {/* Vista previa: la carta final, con número y nombre */}
              <div className="card-edit__media">
                <div className="card-edit__card">
                  {(previewUrl ?? shownImage) && (
                    <img
                      src={previewUrl ?? shownImage ?? undefined}
                      alt={t('cardEdit.previewAlt', { name: draft.title })}
                      className={busy === 'generating' ? 'card-edit__card-image--busy' : undefined}
                    />
                  )}
                  {draft.selected !== 'original' && busy !== 'generating' && (
                    <span className="card-edit__ai-tag">
                      <FaMagic aria-hidden="true" />
                      {t('cardEditor.cardActions.aiTag')}
                    </span>
                  )}
                  {busy === 'generating' && (
                    <div className="card-edit__creating" role="status">
                      <span className="card-edit__spinner" aria-hidden="true" />
                      <strong>{t(draft.ai ? 'cardEdit.creatingAnother' : 'cardEdit.creatingFirst')}</strong>
                      <span>{t('cardEditor.cardActions.paintingTime')}</span>
                    </div>
                  )}
                </div>
                <div className="card-edit__media-side">
                  <span className="card-edit__note">{t('cardEdit.previewNote')}</span>
                  <div className="card-edit__media-actions">
                    <button
                      type="button"
                      className="card-edit__outline-button"
                      onClick={() => setShowEditor(true)}
                      disabled={isBusy || !shownImage}
                    >
                      <FaCropAlt aria-hidden="true" />
                      {t('cardEdit.crop')}
                    </button>
                    <button
                      type="button"
                      className="card-edit__outline-button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                    >
                      <FaImage aria-hidden="true" />
                      {t('cardEdit.otherPhoto')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-edit__controls">
                <div className="card-form__field">
                  <label htmlFor="card-edit-name" className="card-form__label">
                    {t('cardUpload.label')}
                  </label>
                  <input
                    id="card-edit-name"
                    type="text"
                    placeholder={t('cardUpload.inputPlaceholder')}
                    value={draft.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setDraft((current) => ({ ...current, title }));
                    }}
                    className="card-form__input"
                    maxLength={100}
                    disabled={isBusy}
                    aria-invalid={problem !== null}
                  />
                  {problem && (
                    <p className="card-form__error" role="alert">
                      {t(TITLE_ERROR_KEYS[problem])}
                    </p>
                  )}
                  <p className="card-form__help">{t('cardUpload.helpText')}</p>
                </div>

                {/* Sin sesión no hay IA: no hay entre qué elegir. */}
                {onGenerate && (
                  <div className="card-edit__image-section">
                    <span className="card-form__label" id="card-edit-image-label">
                      {t('cardEdit.imageSection')}
                    </span>
                    <div className="card-edit__choices" role="radiogroup" aria-labelledby="card-edit-image-label">
                      {renderChoice('original')}
                      {renderChoice('aiPrevious')}
                      {renderChoice('ai')}
                      {!draft.ai && (
                        <div className="card-edit__choice card-edit__choice--empty">
                          <span className="card-edit__choice-thumb card-edit__choice-thumb--empty">
                            <FaMagic aria-hidden="true" />
                          </span>
                          <span className="card-edit__choice-text">
                            <strong>{t('cardEdit.choices.ai')}</strong>
                            <span className="card-edit__choice-status">{t('cardEdit.status.notYet')}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {tokenBalance !== null && !hasTokens ? (
                      <div className="card-edit__no-tokens">
                        <span>{t('cardEdit.noTokens', { count: tokenBalance })}</span>
                        <Link to="/comprar-tokens" className="card-edit__buy">
                          {t('cardEdit.buy')}
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="card-edit__ai-button"
                        onClick={generate}
                        disabled={isBusy || !hasTokens || problem !== null || Boolean(aiBlockedNote) || !shownImage}
                      >
                        <FaMagic aria-hidden="true" />
                        {t(draft.ai ? 'cardEdit.makeAnother' : 'cardEdit.makeFirst')}
                      </button>
                    )}

                    <p className="card-form__help">
                      {aiBlockedNote ? `${aiBlockedNote} ` : ''}
                      {draft.aiPrevious ? `${t('cardEdit.keepOne')} ` : draft.ai ? `${t('cardEdit.switchFree')} ` : ''}
                      {hasTokens && tokenBalance !== null && t('cardEdit.balance', { count: tokenBalance })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="card-edit__footer">
              <button type="button" className="card-edit__cancel" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="card-form__button card-form__button--primary card-edit__save"
                onClick={() => save(false)}
                disabled={isBusy || problem !== null}
              >
                {busy === 'saving' ? t('cardUpload.status.processing') : t('cardUpload.actions.saveChanges')}
              </button>
            </div>
          </>
        )}
      </div>

      {confirmLosesAi && (
        <CardActionConfirm
          action="revert"
          isAiGenerated
          onConfirm={() => {
            setConfirmLosesAi(false);
            save(true);
          }}
          onCancel={() => setConfirmLosesAi(false)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
