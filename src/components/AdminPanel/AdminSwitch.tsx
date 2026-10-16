interface AdminSwitchProps {
  checked: boolean;
  /** Qué hace al tocarlo, para lectores de pantalla: «Activo: toca para ocultar». */
  label: string;
  disabled?: boolean;
  onChange: () => void;
}

/** Interruptor encendido/apagado del Admin (FEAT-46): packs y promociones. Estilos en AdminPricing.css. */
export const AdminSwitch = ({ checked, label, disabled = false, onChange }: AdminSwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    className={`admin-switch${checked ? ' admin-switch--on' : ''}`}
    disabled={disabled}
    onClick={onChange}
  >
    <span className="admin-switch__knob" aria-hidden="true" />
  </button>
);
