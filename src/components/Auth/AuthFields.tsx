import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeOffIcon } from './AuthIcons';

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange' | 'value' | 'className'>;

interface AuthFieldProps extends NativeInputProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Texto de ayuda bajo el campo. */
  hint?: string;
  /** Enlace a la derecha de la etiqueta («¿La olvidaste?»). */
  labelAction?: ReactNode;
  /** Marca el campo como equivocado, para la vista y para lectores de pantalla. */
  invalid?: boolean;
}

interface FieldFrameProps {
  id: string;
  label: ReactNode;
  hint?: string;
  labelAction?: ReactNode;
  children: ReactNode;
}

const FieldFrame = ({ id, label, hint, labelAction, children }: FieldFrameProps) => (
  <div className="auth-field">
    <div className="auth-field__label-row">
      <label htmlFor={id}>{label}</label>
      {labelAction}
    </div>
    {children}
    {hint && (
      <span id={`${id}-hint`} className="auth-field__hint">
        {hint}
      </span>
    )}
  </div>
);

export const AuthTextField = ({ id, label, value, onChange, hint, labelAction, invalid, ...input }: AuthFieldProps) => (
  <FieldFrame id={id} label={label} hint={hint} labelAction={labelAction}>
    <input
      {...input}
      id={id}
      className="auth-field__input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={hint ? `${id}-hint` : undefined}
    />
  </FieldFrame>
);

/** Campo de contraseña con su botón para verla; el botón se alcanza con Tab. */
export const AuthPasswordField = ({ id, label, value, onChange, hint, labelAction, invalid, ...input }: AuthFieldProps) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FieldFrame id={id} label={label} hint={hint} labelAction={labelAction}>
      <div className="auth-field__password">
        <input
          {...input}
          id={id}
          className="auth-field__input"
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          className="auth-field__eye"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? t('common.auth.hidePassword') : t('common.auth.showPassword')}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </FieldFrame>
  );
};
