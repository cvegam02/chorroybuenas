import { FaChevronRight } from 'react-icons/fa';
import type { AdminSaleRow } from '../../repositories/AdminRepository';
import { saleDateTime, saleItemLabel, saleStatus } from '../../utils/adminSales';

const moneyFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

/** Identifica una venta: los ids de tokens y de temáticas son de tablas distintas. */
export const saleKey = (sale: AdminSaleRow) => `${sale.kind}-${sale.id}`;

interface AdminSalesTableProps {
  rows: AdminSaleRow[];
  selectedKey: string | null;
  onSelect: (sale: AdminSaleRow) => void;
}

/** Tabla de la pestaña Ventas: fecha, cliente, qué compró, monto y estado (FEAT-44, decisión 6). */
export const AdminSalesTable = ({ rows, selectedKey, onSelect }: AdminSalesTableProps) => (
  <div className="admin-sales__table-box">
    <table className="admin-sales__table">
      <thead>
        <tr>
          <th scope="col">Fecha</th>
          <th scope="col">Cliente</th>
          <th scope="col">Qué compró</th>
          <th scope="col" className="admin-sales__amount">Monto</th>
          <th scope="col">Estado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((sale) => {
          const when = saleDateTime(sale.created_at);
          const status = saleStatus(sale.payment_status);
          const seasonal = sale.kind === 'seasonal';
          return (
            <tr
              key={saleKey(sale)}
              className={`admin-sales__row${selectedKey === saleKey(sale) ? ' admin-sales__row--selected' : ''}`}
              onClick={() => onSelect(sale)}
            >
              <td data-label="Fecha">
                <span className="admin-sales__main">{when.date}</span>
                <span className="admin-sales__muted">{when.time}</span>
              </td>
              <td data-label="Cliente">
                {sale.user_id ? (
                  <>
                    <span className="admin-sales__main">{sale.full_name || sale.email || '—'}</span>
                    {sale.full_name && sale.email && <span className="admin-sales__muted">{sale.email}</span>}
                  </>
                ) : (
                  <span className="admin-sales__muted">Cuenta borrada</span>
                )}
              </td>
              <td data-label="Qué compró">
                <span className="admin-sales__item">
                  <span className={`admin-sales__tag admin-sales__tag--${seasonal ? 'seasonal' : 'tokens'}`}>
                    {seasonal ? 'Temática' : 'Tokens'}
                  </span>
                  <span className="admin-sales__main">{saleItemLabel(sale)}</span>
                </span>
              </td>
              <td data-label="Monto" className="admin-sales__amount">
                {moneyFormat.format(sale.amount_cents / 100)}
              </td>
              <td data-label="Estado">
                <span className="admin-sales__state">
                  <span className={`admin-sales__status admin-sales__status--${status.tone}`}>{status.label}</span>
                  <button
                    type="button"
                    className="admin-sales__open"
                    aria-label={`Ver detalle de la venta del ${when.date} a las ${when.time}`}
                    aria-expanded={selectedKey === saleKey(sale)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(sale);
                    }}
                  >
                    <FaChevronRight aria-hidden="true" />
                  </button>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
