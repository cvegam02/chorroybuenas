import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import type { AdminPromotion, PromotionUsage } from '../../repositories/AdminRepository';
import { PROMO_STATUS_LABELS, promoName, promoPercent, promoStatus, promoValidity } from '../../utils/adminPromotions';
import { AdminSwitch } from './AdminSwitch';

const countFormat = new Intl.NumberFormat('es-MX');

interface AdminPromotionsTableProps {
  promotions: AdminPromotion[];
  /** Nulo si no se pudieron cargar los usos. */
  usage: Record<string, PromotionUsage> | null;
  togglingId: string | null;
  onToggle: (p: AdminPromotion) => void;
  onEdit: (p: AdminPromotion) => void;
  onDelete: (p: AdminPromotion) => void;
}

/** Tabla de promociones (FEAT-46, US A4, decisiones 6 a 8). */
export const AdminPromotionsTable = ({ promotions, usage, togglingId, onToggle, onEdit, onDelete }: AdminPromotionsTableProps) => {
  const now = new Date();
  const count = (n: number | undefined) => (usage == null ? '—' : countFormat.format(n ?? 0));

  return (
    <div className="admin-pricing__card admin-pricing__table-card">
      <div className="admin-pricing__table-scroll">
        <table className="admin-pricing__table">
          <thead>
            <tr>
              <th scope="col">Promoción</th>
              <th scope="col">Extra</th>
              <th scope="col">Vigencia</th>
              <th scope="col">Estado</th>
              <th scope="col" className="admin-pricing__num">Usos</th>
              <th scope="col" className="admin-pricing__num">Tokens regalados</th>
              <th scope="col"><span className="admin-pricing__sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => {
              const status = promoStatus(p, now);
              const name = promoName(p);
              return (
                <tr key={p.id}>
                  <td>
                    <div className="admin-pricing__strong">{name}</div>
                    <div className="admin-pricing__muted">{p.type === 'code' ? 'Código' : 'Automática'}</div>
                  </td>
                  <td className="admin-pricing__strong">+{promoPercent(p)}%</td>
                  <td className="admin-pricing__nowrap">{promoValidity(p.valid_from, p.valid_until, now)}</td>
                  <td>
                    <span className={`admin-pricing__status admin-pricing__status--${status}`}>
                      {PROMO_STATUS_LABELS[status]}
                    </span>
                  </td>
                  <td className="admin-pricing__num admin-pricing__strong">{count(usage?.[p.id]?.uses)}</td>
                  <td className="admin-pricing__num admin-pricing__strong">{count(usage?.[p.id]?.tokens)}</td>
                  <td className="admin-pricing__num">
                    <span className="admin-pricing__actions">
                      <AdminSwitch
                        checked={p.is_active}
                        label={p.is_active ? `${name}: encendida, toca para apagar` : `${name}: apagada, toca para encender`}
                        disabled={togglingId === p.id}
                        onChange={() => onToggle(p)}
                      />
                      <button type="button" className="admin-pricing__icon-btn" aria-label={`Editar ${name}`} onClick={() => onEdit(p)}>
                        <FaPencilAlt aria-hidden="true" />
                      </button>
                      <button type="button" className="admin-pricing__icon-btn admin-pricing__icon-btn--danger"
                        aria-label={`Borrar ${name}`} onClick={() => onDelete(p)}>
                        <FaTrash aria-hidden="true" />
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
