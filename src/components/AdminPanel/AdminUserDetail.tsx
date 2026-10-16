import { useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
  AdminRepository,
  type AdminUserDetail as UserDetail,
  type AdminUserRow,
} from '../../repositories/AdminRepository';
import {
  paidLabel,
  providerLabel,
  purchasesLabel,
  seasonalLabel,
  signupDate,
  userDisplayName,
  userInitial,
} from '../../utils/adminUsers';
import { AdminGiftForm } from './AdminGiftForm';
import { AdminUserActivity } from './AdminUserActivity';

const countFormat = new Intl.NumberFormat('es-MX');

interface AdminUserDetailProps {
  userId: string;
  /** Su renglón de la lista, si está a la vista: llena el encabezado mientras carga la ficha. */
  preview: AdminUserRow | null;
  onClose: () => void;
  /** Avisa que se regalaron tokens, para recargar la lista. */
  onGifted: () => void;
  /** «Ver sus compras en Ventas»: Ventas con su correo, desde su alta hasta hoy (US A5). */
  onOpenSales: (email: string, createdAt: string) => void;
}

/** Ficha del usuario (FEAT-45, US A2), al lado de la lista; en celular es una hoja que sube desde abajo. */
export const AdminUserDetail = ({ userId, preview, onClose, onGifted, onOpenSales }: AdminUserDetailProps) => {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setGiftOpen(false);
  }, [userId]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    AdminRepository.getUserDetail(userId)
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
  }, [userId, attempt]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [userId, onClose]);

  const gift = async (amount: number, reason: string) => {
    const newBalance = await AdminRepository.giftTokens(userId, amount, reason);
    if (newBalance == null) return false;
    setGiftOpen(false);
    setAttempt((n) => n + 1);
    onGifted();
    return true;
  };

  const person = detail ?? preview;
  const via = detail && providerLabel(detail.provider);

  return (
    <>
      <div className="admin-sale-detail__backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="admin-sale-detail" aria-label="Ficha del usuario" role="dialog">
        <div className="admin-sale-detail__head">
          {person ? (
            <div className="admin-users__person">
              <span className="admin-users__avatar admin-users__avatar--large" aria-hidden="true">
                {userInitial(person)}
              </span>
              <div>
                <h3 className="admin-sale-detail__title">{userDisplayName(person)}</h3>
                {person.full_name && person.email && <span className="admin-sales__muted">{person.email}</span>}
                <span className="admin-sales__muted">
                  Cuenta desde el {signupDate(person.created_at)}
                  {via ? ` · ${via}` : ''}
                </span>
              </div>
            </div>
          ) : (
            <h3 className="admin-sale-detail__title">Ficha del usuario</h3>
          )}
          <button
            ref={closeRef}
            type="button"
            className="admin-sale-detail__close"
            onClick={onClose}
            aria-label="Cerrar ficha"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        {person && (
          <div className="admin-users__balance">
            <div>
              <span className="admin-sales__muted">Saldo actual</span>
              <span className="admin-users__balance-value">
                {countFormat.format(person.balance)} {person.balance === 1 ? 'token' : 'tokens'}
              </span>
            </div>
            {!giftOpen && (
              <button type="button" className="admin-gift-form__btn admin-gift-form__btn--primary" onClick={() => setGiftOpen(true)}>
                Regalar tokens
              </button>
            )}
          </div>
        )}

        {giftOpen && <AdminGiftForm onGift={gift} onCancel={() => setGiftOpen(false)} />}

        {failed ? (
          <div className="admin-sale-detail__error" role="alert">
            <p>No se pudo cargar la ficha.</p>
            <button type="button" className="admin-sales__chip" onClick={() => setAttempt((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        ) : loading && !detail ? (
          <p className="admin-sales__muted">Cargando ficha…</p>
        ) : (
          detail && (
            <div className="admin-users__stats" aria-busy={loading}>
              <div className="admin-users__stat">
                <span className="admin-sales__muted">Ha pagado</span>
                <b>{paidLabel(detail.paid_cents)}</b>
                <span className="admin-sales__muted">{purchasesLabel(detail.purchases_count)}</span>
              </div>
              <div className="admin-users__stat">
                <span className="admin-sales__muted">Imágenes con IA</span>
                <b>{countFormat.format(detail.ai_tokens)}</b>
                <span className="admin-sales__muted">tokens gastados</span>
              </div>
              <div className="admin-users__stat">
                <span className="admin-sales__muted">Loterías guardadas</span>
                <b>{countFormat.format(detail.loterias_count)}</b>
                <span className="admin-sales__muted">{seasonalLabel(detail.seasonal_count)}</span>
              </div>
              <div className="admin-users__stat">
                <span className="admin-sales__muted">Tokens regalados</span>
                <b>{countFormat.format(detail.gifted_tokens)}</b>
                <span className="admin-sales__muted">por administradores</span>
              </div>
            </div>
          )
        )}

        <AdminUserActivity userId={userId} version={attempt} />

        {detail?.email && (
          <button
            type="button"
            className="admin-sale-detail__link"
            onClick={() => onOpenSales(detail.email ?? '', detail.created_at)}
          >
            Ver sus compras en Ventas →
          </button>
        )}
      </aside>
    </>
  );
};
