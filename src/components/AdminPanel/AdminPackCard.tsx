import { FaPencilAlt } from 'react-icons/fa';
import type { AdminTokenPack } from '../../repositories/AdminRepository';
import { packCard, packSalesLabel } from '../../utils/adminPricing';
import { AdminSwitch } from './AdminSwitch';

interface AdminPackCardProps {
  pack: AdminTokenPack;
  priceCents: number | null;
  /** Ventas aprobadas del mes; nulo si no se pudieron cargar. */
  sales: number | null;
  isToggling: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

/** Tarjeta de un pack en Precios y promos (FEAT-46, US A3, decisión 4). */
export const AdminPackCard = ({ pack, priceCents, sales, isToggling, onToggle, onEdit }: AdminPackCardProps) => {
  const text = packCard(pack, priceCents);

  return (
    <article className={`admin-pricing__card admin-pricing__pack${pack.is_active ? '' : ' admin-pricing__pack--hidden'}`}>
      <div className="admin-pricing__pack-head">
        <span className="admin-pricing__pack-total">{text.total}</span>
        <AdminSwitch
          checked={pack.is_active}
          label={pack.is_active ? `${text.total}: activo, toca para ocultar` : `${text.total}: oculto, toca para activar`}
          disabled={isToggling}
          onChange={onToggle}
        />
      </div>
      <span className="admin-pricing__muted">
        {text.breakdown}
        {!pack.is_active && ' · Oculto'}
      </span>
      <div className="admin-pricing__pack-price">
        <span className="admin-pricing__pack-amount">{text.price}</span>
        <span className="admin-pricing__muted">{text.perToken}</span>
      </div>
      {text.savings && <span className="admin-pricing__savings">{text.savings}</span>}
      <div className="admin-pricing__pack-foot">
        <span className="admin-pricing__muted">
          {sales == null ? 'Ventas del mes no disponibles' : packSalesLabel(sales)}
        </span>
        <button type="button" className="admin-pricing__icon-btn" aria-label={`Editar ${text.total}`} onClick={onEdit}>
          <FaPencilAlt aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};
