import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { CREATE_STEPS, createStepOf, createStepStatus } from '../../utils/createSteps';
import './CreateSteps.css';

/**
 * Franja de pasos bajo la barra superior, solo en las tres pantallas de crear una lotería. A la
 * derecha dice dónde queda guardado el trabajo: en este navegador o en la cuenta.
 */
export const CreateSteps = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const currentStep = createStepOf(pathname);

  if (currentStep === null) return null;

  return (
    <div className="create-steps">
      <div className="create-steps__inner">
        <ol className="create-steps__list" aria-label={t('createSteps.label')}>
          {CREATE_STEPS.map((step) => {
            const status = createStepStatus(step.number, currentStep);
            return (
              <li
                key={step.id}
                className={`create-steps__step create-steps__step--${status}`}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <span className="create-steps__number" aria-hidden="true">
                  {status === 'done' ? <FaCheck /> : step.number}
                </span>
                <span className="create-steps__name">{t(`createSteps.${step.id}`)}</span>
              </li>
            );
          })}
        </ol>
        {/* Mientras no se sabe si hay sesión no se afirma dónde queda guardado. */}
        {!isLoading &&
          (user ? (
            <span className="create-steps__storage create-steps__storage--saved">
              <FaCheckCircle aria-hidden="true" />
              {t('createSteps.saved')}
            </span>
          ) : (
            <span className="create-steps__storage">
              <FaInfoCircle aria-hidden="true" />
              {t('createSteps.guest')}
            </span>
          ))}
      </div>
    </div>
  );
};
