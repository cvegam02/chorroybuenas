import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaLock, FaPencilAlt } from 'react-icons/fa';
import { LANGUAGES, currentLanguageCode } from '../../utils/languages';
import type { useProfileEditing } from './useProfileEditing';
import './AccountDetails.css';

type NameEditing = Pick<
  ReturnType<typeof useProfileEditing>,
  'isEditingName' | 'setIsEditingName' | 'nameValue' | 'setNameValue' | 'isSavingName' | 'handleNameSave' | 'startNameEdit'
>;

interface AccountDetailsProps {
  /** El nombre que se muestra y con el que arranca la edición. */
  name: string;
  email: string;
  /** Falso en cuentas que entran con Google: ahí no hay contraseña que cambiar. */
  hasPassword: boolean;
  nameEditing: NameEditing;
  onChangePassword: () => void;
}

const NAME_INPUT_ID = 'account-details-name';
const NAME_MAX_LENGTH = 60;

/** «Mis datos» de Mi cuenta: nombre (se edita en su fila), correo, contraseña e idioma. */
export const AccountDetails = ({ name, email, hasPassword, nameEditing, onChangePassword }: AccountDetailsProps) => {
  const { t, i18n } = useTranslation();
  const { isEditingName, setIsEditingName, nameValue, setNameValue, isSavingName, handleNameSave, startNameEdit } =
    nameEditing;
  const changeNameRef = useRef<HTMLButtonElement>(null);
  const wasEditingName = useRef(false);
  const currentLanguage = currentLanguageCode(i18n.language);

  // Al cerrar la edición, el foco vuelve a «Cambiar» para no perder el lugar con el teclado
  useEffect(() => {
    if (wasEditingName.current && !isEditingName) changeNameRef.current?.focus();
    wasEditingName.current = isEditingName;
  }, [isEditingName]);

  const renderNameRow = () => {
    if (isEditingName) {
      return (
        <div className="account-details__row account-details__row--editing">
          <label className="account-details__label" htmlFor={NAME_INPUT_ID}>
            {t('dashboard.details.name')}
          </label>
          <input
            id={NAME_INPUT_ID}
            type="text"
            className="account-details__input"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleNameSave();
              if (event.key === 'Escape' && !isSavingName) setIsEditingName(false);
            }}
            placeholder={t('dashboard.editNamePlaceholder')}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="name"
            autoFocus
            disabled={isSavingName}
          />
          <div className="account-details__edit-actions">
            <button
              type="button"
              className="account-details__button account-details__button--primary"
              onClick={handleNameSave}
              disabled={isSavingName || !nameValue.trim()}
            >
              {isSavingName ? t('common.loading') : t('common.save')}
            </button>
            <button
              type="button"
              className="account-details__button"
              onClick={() => setIsEditingName(false)}
              disabled={isSavingName}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="account-details__row">
        <div className="account-details__field">
          <span className="account-details__label">{t('dashboard.details.name')}</span>
          <span className="account-details__value">{name}</span>
        </div>
        <button
          ref={changeNameRef}
          type="button"
          className="account-details__action"
          onClick={() => startNameEdit(name)}
          aria-label={t('dashboard.details.changeName')}
        >
          <FaPencilAlt aria-hidden="true" />
          {t('dashboard.details.change')}
        </button>
      </div>
    );
  };

  return (
    <section className="account-details" aria-labelledby="account-details-title">
      <h2 className="account-details__title" id="account-details-title">
        {t('dashboard.details.title')}
      </h2>
      <div className="account-details__card">
        {renderNameRow()}

        <div className="account-details__row">
          <div className="account-details__field">
            <span className="account-details__label">{t('dashboard.details.email')}</span>
            <span className="account-details__value">{email}</span>
          </div>
        </div>

        <div className="account-details__row">
          <div className="account-details__field">
            <span className="account-details__label">{t('dashboard.details.password')}</span>
            {hasPassword ? (
              <span className="account-details__value account-details__value--password" aria-hidden="true">
                ••••••••
              </span>
            ) : (
              <span className="account-details__note">{t('dashboard.details.googleNote')}</span>
            )}
          </div>
          {hasPassword && (
            <button
              type="button"
              className="account-details__action"
              onClick={onChangePassword}
              aria-label={t('dashboard.changePassword')}
            >
              <FaLock aria-hidden="true" />
              {t('dashboard.details.change')}
            </button>
          )}
        </div>

        <div className="account-details__row account-details__row--language">
          <span className="account-details__label">{t('navbar.language')}</span>
          <div className="account-details__languages" role="group" aria-label={t('navbar.language')}>
            {LANGUAGES.map(({ code, label, shortLabel }) => (
              <button
                key={code}
                type="button"
                lang={code}
                className={`account-details__language ${currentLanguage === code ? 'account-details__language--current' : ''}`}
                aria-pressed={currentLanguage === code}
                aria-label={label}
                onClick={() => i18n.changeLanguage(code)}
              >
                <span className="account-details__wide">{label}</span>
                <span className="account-details__narrow">{shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
