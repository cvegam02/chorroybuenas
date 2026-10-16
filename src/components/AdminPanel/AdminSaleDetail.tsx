import { useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { AdminRepository, type AdminSaleDetail as SaleDetail, type AdminSaleRow } from '../../repositories/AdminRepository';
import { saleDateTime, saleItemLabel, saleReceived, saleStatus } from '../../utils/adminSales';
import { paymentMethodLabel, paymentResultLabel } from '../../utils/mercadoPagoLabels';
import { CopyButton } from './CopyButton';

const moneyFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

const formatWhen = (iso: string | null) => {
  if (!iso) return '—';
  const when = saleDateTime(iso);
  return `${when.date}, ${when.time}`;
};

interface AdminSaleDetailProps {
  sale: AdminSaleRow;
  onClose: () => void;
  /** Abre la ficha del cliente en Usuarios (FEAT-45, US A5). */
  onOpenClient: (userId: string, email: string) => void;
}

/** Panel de detalle de una venta (FEAT-44, US A3); en celular es una hoja que sube desde abajo. */
export const AdminSaleDetail = ({ sale, onClose, onOpenClient }: AdminSaleDetailProps) => {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    AdminRepository.getSaleDetail(sale.kind, sale.id)
      .then((result) => {
        if (!current) return;
        setDetail(result);
        if (!result) setFailed(true);
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [sale.kind, sale.id, attempt]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sale.id, onClose]);

  const when = saleDateTime(sale.created_at);
  const status = saleStatus(sale.payment_status);
  const seasonal = sale.kind === 'seasonal';
  const method = detail && paymentMethodLabel(detail.method_type, detail.method_id);
  const result = detail && paymentResultLabel(detail.mp_status_detail);

  return (
    <>
      <div className="admin-sale-detail__backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="admin-sale-detail" aria-label="Detalle de la venta" role="dialog">
        <div className="admin-sale-detail__head">
          <div>
            <span className={`admin-sales__tag admin-sales__tag--${seasonal ? 'seasonal' : 'tokens'}`}>
              {seasonal ? 'Temática' : 'Tokens'}
            </span>
            <h3 className="admin-sale-detail__title">{saleItemLabel(sale)}</h3>
            <span className="admin-sales__muted">
              {when.date} · {when.time}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="admin-sale-detail__close"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="admin-sale-detail__amount">
          <span>{moneyFormat.format(sale.amount_cents / 100)}</span>
          <span className={`admin-sales__status admin-sales__status--${status.tone}`}>{status.label}</span>
        </div>

        <section className="admin-sale-detail__section">
          <h4 className="admin-sale-detail__section-title">Cliente</h4>
          {sale.user_id ? (
            <dl className="admin-sale-detail__list">
              <dt>Nombre</dt>
              <dd>{sale.full_name || '—'}</dd>
              <dt>Correo</dt>
              <dd>{sale.email || '—'}</dd>
              <dt>Recibió</dt>
              <dd>{saleReceived(sale)}</dd>
            </dl>
          ) : (
            <p className="admin-sales__muted">La cuenta que compró ya se borró.</p>
          )}
          {sale.user_id && (
            <button
              type="button"
              className="admin-sale-detail__link"
              onClick={() => onOpenClient(sale.user_id ?? '', sale.email ?? '')}
            >
              Ver ficha del cliente →
            </button>
          )}
        </section>

        <section className="admin-sale-detail__section">
          <h4 className="admin-sale-detail__section-title">Pago en Mercado Pago</h4>
          {loading ? (
            <p className="admin-sales__muted">Cargando el pago…</p>
          ) : failed || !detail ? (
            <div className="admin-sale-detail__error" role="alert">
              <p>No se pudo cargar el pago.</p>
              <button type="button" className="admin-sales__chip" onClick={() => setAttempt((n) => n + 1)}>
                Reintentar
              </button>
            </div>
          ) : (
            <dl className="admin-sale-detail__list">
              <dt>Método</dt>
              <dd>{method || '—'}</dd>
              <dt>Resultado</dt>
              <dd>{result || '—'}</dd>
              <dt>Creado</dt>
              <dd>{formatWhen(detail.mp_created_at)}</dd>
              <dt>Aprobado</dt>
              <dd>{formatWhen(detail.mp_approved_at)}</dd>
              <dt>Cobrado por MP</dt>
              <dd>{detail.mp_amount === null ? '—' : `${moneyFormat.format(detail.mp_amount)} MXN`}</dd>
            </dl>
          )}
        </section>

        <details className="admin-sale-detail__technical">
          <summary>Datos técnicos (para buscar en Mercado Pago)</summary>
          <dl className="admin-sale-detail__list">
            <dt>Payment ID</dt>
            <dd>
              {sale.payment_id} <CopyButton value={sale.payment_id} label="Copiar el Payment ID" />
            </dd>
            <dt>Payer ID</dt>
            <dd>
              {detail?.payer_id ? (
                <>
                  {detail.payer_id} <CopyButton value={detail.payer_id} label="Copiar el Payer ID" />
                </>
              ) : (
                '—'
              )}
            </dd>
            <dt>ID de la compra</dt>
            <dd>
              {sale.id} <CopyButton value={sale.id} label="Copiar el ID de la compra" />
            </dd>
          </dl>
        </details>
      </aside>
    </>
  );
};
