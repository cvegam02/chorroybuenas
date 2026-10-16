import type { SalesTotals } from '../../utils/adminSales';

const moneyFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
const countFormat = new Intl.NumberFormat('es-MX');

interface AdminSalesTotalsProps {
  /** Nulo mientras carga. */
  totals: SalesTotals | null;
}

/** Totales encima de la tabla de Ventas; respetan todos los filtros (FEAT-44, US A2). */
export const AdminSalesTotals = ({ totals }: AdminSalesTotalsProps) => {
  const items = [
    { label: 'Ventas', value: totals && countFormat.format(totals.sales) },
    { label: 'Cobrado (aprobadas)', value: totals && moneyFormat.format(totals.collectedCents / 100) },
    {
      label: 'Pendiente de pago',
      value: totals && `${countFormat.format(totals.pendingCount)} · ${moneyFormat.format(totals.pendingCents / 100)}`,
    },
    { label: 'Tokens vendidos', value: totals && countFormat.format(totals.tokensSold) },
  ];
  return (
    <dl className={`admin-sales__totals${totals ? '' : ' admin-sales__totals--loading'}`} aria-busy={!totals}>
      {items.map((item) => (
        <div key={item.label} className="admin-sales__total">
          <dt className="admin-sales__muted">{item.label}</dt>
          <dd className="admin-sales__total-value">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
};
