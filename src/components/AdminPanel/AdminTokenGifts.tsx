import { useEffect, useState } from 'react';
import { AdminRepository, type AdminGiftsTotals, type AdminTokenGift } from '../../repositories/AdminRepository';
import { pageRange, saleDateTime } from '../../utils/adminSales';
import { paidLabel, userDisplayName } from '../../utils/adminUsers';
import { AdminPeriodPicker, defaultPeriodSelection, type PeriodSelection } from './AdminPeriodPicker';
import './AdminSales.css';

const GIFTS_PAGE_SIZE = 20;
const countFormat = new Intl.NumberFormat('es-MX');

interface AdminTokenGiftsProps {
  /** Periodo con el que llega desde «Ver regalos» del Resumen; si no, «Este mes». */
  initialSelection?: PeriodSelection | null;
}

/** Sub-pestaña «Regalos de tokens» (FEAT-45, US A4): totales e historial de regalos de un periodo. */
export const AdminTokenGifts = ({ initialSelection = null }: AdminTokenGiftsProps) => {
  const [selection, setSelection] = useState<PeriodSelection>(() => initialSelection ?? defaultPeriodSelection());
  const [page, setPage] = useState(0);
  const [totals, setTotals] = useState<AdminGiftsTotals | null>(null);
  const [gifts, setGifts] = useState<AdminTokenGift[] | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(true);
  const [giftsLoading, setGiftsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Los totales no dependen de la página; su número de regalos también sirve para paginar.
  useEffect(() => {
    let current = true;
    setTotalsLoading(true);
    setFailed(false);
    AdminRepository.getGiftsTotals(selection.period)
      .then((result) => {
        if (!current) return;
        setTotals(result);
        if (!result) setFailed(true);
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setTotalsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [selection.period, attempt]);

  useEffect(() => {
    let current = true;
    setGiftsLoading(true);
    AdminRepository.getGifts(selection.period, GIFTS_PAGE_SIZE, page * GIFTS_PAGE_SIZE)
      .then((result) => {
        if (!current) return;
        setGifts(result);
        if (!result) setFailed(true);
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setGiftsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [selection.period, page, attempt]);

  const changePeriod = (next: PeriodSelection) => {
    setSelection(next);
    setPage(0);
  };

  const loading = totalsLoading || giftsLoading;
  const total = totals?.gifts ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / GIFTS_PAGE_SIZE) - 1);
  const ready = !totalsLoading && totals;
  const items = [
    { label: 'Tokens regalados', value: ready && countFormat.format(totals.tokens) },
    { label: 'A cuántos usuarios', value: ready && countFormat.format(totals.recipients) },
    {
      label: 'Valor a precio de lista',
      value: ready && (totals.valueCents == null ? 'Sin precio por token' : paidLabel(totals.valueCents)),
    },
  ];

  return (
    <>
      <div className="admin-users__gifts-head">
        <AdminPeriodPicker value={selection} onChange={changePeriod} />
      </div>

      {failed ? (
        <div className="admin-sales__error" role="alert">
          <p>No se pudieron cargar los regalos.</p>
          <button type="button" className="admin-sales__chip" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <dl className={`admin-sales__totals admin-users__totals${ready ? '' : ' admin-sales__totals--loading'}`} aria-busy={!ready}>
            {items.map((item) => (
              <div key={item.label} className="admin-sales__total">
                <dt className="admin-sales__muted">{item.label}</dt>
                <dd className="admin-sales__total-value">{item.value || '—'}</dd>
              </div>
            ))}
          </dl>

          {loading && (!totals || !gifts) ? (
            <p className="admin-sales__empty">Cargando regalos…</p>
          ) : total === 0 ? (
            <p className="admin-sales__empty">No se regalaron tokens en este periodo.</p>
          ) : (
            <section aria-label="Historial de regalos" aria-busy={loading} className={loading ? 'admin-sales__list--loading' : undefined}>
              <div className="admin-sales__table-box">
                <table className="admin-sales__table">
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Para</th>
                      <th scope="col">Tokens</th>
                      <th scope="col">Motivo</th>
                      <th scope="col">Regaló</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gifts ?? []).map((g) => {
                      const when = saleDateTime(g.created_at);
                      const recipient = { full_name: g.recipient_name || null, email: g.recipient_email };
                      return (
                        <tr key={g.id}>
                          <td data-label="Fecha">
                            <span className="admin-sales__main">{when.date}</span>
                            <span className="admin-sales__muted">{when.time}</span>
                          </td>
                          <td data-label="Para">
                            <span className="admin-sales__main">{userDisplayName(recipient)}</span>
                            {recipient.full_name && recipient.email && (
                              <span className="admin-sales__muted">{recipient.email}</span>
                            )}
                          </td>
                          <td data-label="Tokens">{g.amount}</td>
                          <td data-label="Motivo" className={g.reason ? undefined : 'admin-sales__muted'}>
                            {g.reason || '—'}
                          </td>
                          <td data-label="Regaló" className="admin-sales__muted">
                            {g.admin_name || g.admin_email || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="admin-sales__pagination">
                <span className="admin-sales__muted">{pageRange(page, GIFTS_PAGE_SIZE, total)}</span>
                <div className="admin-sales__pages">
                  <button type="button" className="admin-sales__chip" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    ← Anterior
                  </button>
                  <button type="button" className="admin-sales__chip" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                    Siguiente →
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
};
