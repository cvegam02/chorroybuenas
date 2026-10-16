import { FaCheckCircle, FaClock, FaGift } from 'react-icons/fa';
import { pendingSalesPeriod } from '../../utils/adminSales';
import { waitingSince, type DashboardPending } from '../../utils/adminSummary';
import type { OpenSummaryTab } from './AdminSummarySections';

interface SummaryPendingProps {
  /** null mientras carga. */
  pending: DashboardPending | null;
  onOpenTab: OpenSummaryTab;
}

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString('es-MX')} ${count === 1 ? one : many}`;

export const SummaryPending = ({ pending, onOpenTab }: SummaryPendingProps) => (
  <section aria-labelledby="admin-summary-pending">
    <h3 id="admin-summary-pending" className="admin-summary__section-title">Pendientes</h3>
    <div className="admin-summary__pending" aria-busy={pending === null}>
      {pending === null ? (
        <p className="admin-summary__detail">Cargando…</p>
      ) : pending.pendingPayments === 0 && pending.giftedTokens === 0 ? (
        <PendingRow icon={<FaCheckCircle />} title="Todo en orden" detail="No hay pagos pendientes ni tokens regalados en el periodo." />
      ) : (
        <>
          {pending.pendingPayments > 0 && (
            <PendingRow
              icon={<FaClock />}
              title={`${plural(pending.pendingPayments, 'pago pendiente', 'pagos pendientes')} en Mercado Pago`}
              detail={`${pending.oldestPendingAt ? `El más viejo es ${waitingSince(pending.oldestPendingAt)}. ` : ''}Solo de loterías temáticas: los de tokens no se ven hasta que se confirman.`}
              action="Ver ventas"
              onAction={() =>
                // El Resumen cuenta todos los pendientes: Ventas se abre desde el día del más viejo.
                onOpenTab('ventas', {
                  status: 'pending',
                  selection: { kind: 'range', period: pendingSalesPeriod(pending.oldestPendingAt) },
                })
              }
            />
          )}
          {pending.giftedTokens > 0 && (
            <PendingRow
              icon={<FaGift />}
              gift
              title={`${plural(pending.giftedTokens, 'token regalado', 'tokens regalados')}`}
              detail={`A ${plural(pending.giftRecipients, 'persona', 'personas')} en el periodo`}
              action="Ver regalos"
              onAction={() => onOpenTab('regalos')}
            />
          )}
        </>
      )}
    </div>
  </section>
);

interface PendingRowProps {
  icon: React.ReactNode;
  title: string;
  detail: string;
  gift?: boolean;
  action?: string;
  onAction?: () => void;
}

const PendingRow = ({ icon, title, detail, gift = false, action, onAction }: PendingRowProps) => (
  <div className="admin-summary__pending-row">
    <div className="admin-summary__pending-info">
      <span className={`admin-summary__pending-icon${gift ? ' admin-summary__pending-icon--gift' : ''}`} aria-hidden="true">
        {icon}
      </span>
      <div className="admin-summary__pending-text">
        <strong>{title}</strong>
        <span className="admin-summary__detail">{detail}</span>
      </div>
    </div>
    {action && onAction && (
      <button type="button" className="admin-summary__pending-link" onClick={onAction}>
        {action} →
      </button>
    )}
  </div>
);
