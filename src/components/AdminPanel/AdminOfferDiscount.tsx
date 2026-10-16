import type { AdminTokenPack } from '../../repositories/AdminRepository';
import { offerPriceRows, type OfferForm, type OfferFormErrors } from '../../utils/adminOffers';

interface AdminOfferDiscountProps {
  form: OfferForm;
  errors: OfferFormErrors;
  readOnly: boolean;
  priceCents: number | null;
  packs: AdminTokenPack[];
  /** Texto con el costo de cada imagen de IA, o nulo si no se pudo calcular. */
  aiCostNote: string | null;
  onChange: (field: keyof OfferForm, value: string) => void;
}

const FIELDS: { field: keyof OfferForm; label: string; type: string; inputMode?: 'numeric' }[] = [
  { field: 'name', label: 'Nombre interno', type: 'text' },
  { field: 'percent', label: 'Descuento (%)', type: 'text', inputMode: 'numeric' },
  { field: 'startsAt', label: 'Desde', type: 'datetime-local' },
  { field: 'endsAt', label: 'Hasta', type: 'datetime-local' },
];

/** Parte «1 · El descuento» de la oferta (FEAT-49, US A2): los datos y cómo queda cada precio. */
export const AdminOfferDiscount = ({ form, errors, readOnly, priceCents, packs, aiCostNote, onChange }: AdminOfferDiscountProps) => {
  const percent = /^\d+$/.test(form.percent.trim()) ? Number(form.percent) : NaN;
  const rows = offerPriceRows(priceCents, packs, percent >= 1 && percent <= 99 ? percent : null);

  return (
    <section className="admin-pricing__card admin-offer__part" aria-labelledby="admin-offer-discount">
      <h3 id="admin-offer-discount" className="admin-offer__part-title">1 · El descuento</h3>
      <div className="admin-offer__fields">
        {FIELDS.map(({ field, label, type, inputMode }) => (
          <label key={field} className="admin-offer__field">
            {label}
            <input
              className="admin-offer__input"
              type={type}
              inputMode={inputMode}
              value={form[field]}
              disabled={readOnly}
              aria-invalid={errors[field] ? true : undefined}
              aria-describedby={errors[field] ? `admin-offer-${field}-error` : undefined}
              onChange={(e) => onChange(field, e.target.value)}
            />
            {errors[field] && (
              <span id={`admin-offer-${field}-error`} className="admin-pricing__error">{errors[field]}</span>
            )}
          </label>
        ))}
      </div>

      <div className="admin-offer__table-box">
        <table className="admin-offer__table">
          <thead>
            <tr>
              <th scope="col">Qué</th>
              <th scope="col">Precio normal</th>
              <th scope="col">Con oferta</th>
              <th scope="col">Por token</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <strong>{row.label}</strong> {row.bonus}
                </td>
                <td className="admin-offer__normal">{row.normal}</td>
                <td className="admin-offer__discounted">{row.offer}</td>
                <td>{row.perToken}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="admin-pricing__muted">
        Aplica a tokens, no a loterías temáticas. Al terminar las fechas todo regresa solo a su precio.
        {aiCostNote && ` ${aiCostNote}`} Fechas y horas de Hermosillo.
      </p>
    </section>
  );
};
