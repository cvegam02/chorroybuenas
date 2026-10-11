import { useTranslation } from 'react-i18next';
import { FaBookOpen, FaCheck, FaCheckCircle, FaCut, FaPrint, FaRegSave, FaTimes } from 'react-icons/fa';
import { AuthChoice } from '../Auth/AuthChoice';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useWelcomeTokens } from '../../hooks/useWelcomeTokens';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  boardCount: number;
  isLoggedIn?: boolean;
  /** Nombre de la lotería guardada en la cuenta, si se conoce. */
  setName?: string;
  /** Cerrar la ventana y quedarse en la vista previa. */
  onClose: () => void;
  /** «Seguir editando»: regresa a las cartas. */
  onModify: () => void;
  /** Sin sesión, «Terminar»: borra la lotería de este navegador y sale. */
  onComplete: () => void;
  /** Con sesión, «Ir a Mis loterías». */
  onGoToLoterias: () => void;
  /** Con sesión, «+ Crear otra lotería». */
  onCreateAnother: () => void;
}

/** «PDF descargado» (FEAT-34, US A6): qué hacer con el PDF y, sin sesión, la invitación a guardar la lotería. */
export const ConfirmationModal = ({
  boardCount,
  isLoggedIn = false,
  setName,
  onClose,
  onModify,
  onComplete,
  onGoToLoterias,
  onCreateAnother,
}: ConfirmationModalProps) => {
  const { t } = useTranslation();
  const welcomeTokens = useWelcomeTokens();
  useEscapeKey(onClose);

  return (
    <div className="pdf-done__overlay">
      <div className="pdf-done" role="dialog" aria-modal="true" aria-labelledby="pdf-done-heading">
        <div className="pdf-done__header">
          <h2 id="pdf-done-heading" className="pdf-done__heading">{t('modals.confirmation.heading')}</h2>
          <button type="button" className="pdf-done__close" onClick={onClose} aria-label={t('common.close')}>
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="pdf-done__body">
          <div className="pdf-done__hero">
            <span className="pdf-done__check">
              <FaCheck aria-hidden="true" />
            </span>
            <div>
              <h3 className="pdf-done__title">{t('modals.confirmation.title')}</h3>
              <span className="pdf-done__muted">{t('modals.confirmation.subtitle', { count: boardCount })}</span>
            </div>
          </div>

          <ul className="pdf-done__tips">
            <li className="pdf-done__tip">
              <span className="pdf-done__tip-icon">
                <FaPrint aria-hidden="true" />
              </span>
              <div>
                <strong>{t('modals.confirmation.tips.printTitle')}</strong>
                <p>{t('modals.confirmation.tips.printText')}</p>
              </div>
            </li>
            <li className="pdf-done__tip">
              <span className="pdf-done__tip-icon">
                <FaCut aria-hidden="true" />
              </span>
              <div>
                <strong>{t('modals.confirmation.tips.cutTitle')}</strong>
                <p>{t('modals.confirmation.tips.cutText')}</p>
              </div>
            </li>
            {!isLoggedIn && (
              <li className="pdf-done__tip">
                <span className="pdf-done__tip-icon">
                  <FaBookOpen aria-hidden="true" />
                </span>
                <div>
                  <strong>{t('modals.confirmation.tips.playTitle')}</strong>
                  <p>
                    {/* En otra pestaña, para no perder esta ventana ni la lotería a medio terminar. */}
                    <a href="/como-se-juega" target="_blank" rel="noopener noreferrer">
                      {t('modals.confirmation.tips.playLink')}
                    </a>
                  </p>
                </div>
              </li>
            )}
          </ul>

          {isLoggedIn ? (
            <p className="pdf-done__saved">
              <FaCheckCircle aria-hidden="true" />
              <span>
                {setName ? (
                  <>
                    <strong>«{setName}»</strong> {t('modals.confirmation.savedNamed')}
                  </>
                ) : (
                  t('modals.confirmation.savedNoName')
                )}
              </span>
            </p>
          ) : (
            <div className="pdf-done__save">
              <strong className="pdf-done__save-title">
                <FaRegSave aria-hidden="true" />
                {t('modals.confirmation.saveTitle')}
              </strong>
              <span className="pdf-done__muted">
                {welcomeTokens !== null
                  ? t('modals.confirmation.saveGift', { count: welcomeTokens })
                  : t('modals.confirmation.saveNoGift')}
              </span>
              <AuthChoice tone="onLight" compact />
            </div>
          )}

          <div className="pdf-done__actions">
            <button type="button" className="pdf-done__button pdf-done__button--secondary" onClick={onModify}>
              {t('modals.confirmation.keepEditing')}
            </button>
            {isLoggedIn ? (
              <button type="button" className="pdf-done__button pdf-done__button--primary" onClick={onGoToLoterias}>
                {t('modals.confirmation.goToLoterias')}
              </button>
            ) : (
              <button type="button" className="pdf-done__button pdf-done__button--primary" onClick={onComplete}>
                {t('modals.confirmation.finish')}
              </button>
            )}
          </div>

          {isLoggedIn ? (
            <button type="button" className="pdf-done__link" onClick={onCreateAnother}>
              {t('modals.confirmation.createAnother')}
            </button>
          ) : (
            <span className="pdf-done__warning">{t('modals.confirmation.guestWarning')}</span>
          )}
        </div>
      </div>
    </div>
  );
};
