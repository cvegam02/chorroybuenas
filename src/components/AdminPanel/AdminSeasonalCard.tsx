import { useEffect, useRef, useState } from 'react';
import { FaDownload, FaEllipsisH, FaEye, FaEyeSlash, FaRegTrashAlt } from 'react-icons/fa';
import {
  SeasonalRepository,
  type AdminSeasonalLoteria,
  type AdminSeasonalSales,
} from '../../repositories/SeasonalRepository';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { paidLabel } from '../../utils/adminUsers';
import {
  LOTERIA_CARD_STATE_LABELS,
  loteriaCardState,
  loteriaDetailLine,
  loteriaNoteLine,
} from '../../utils/adminSeasonal';
import '../Dashboard/LoteriaMenu.css';

interface AdminSeasonalCardProps {
  loteria: AdminSeasonalLoteria;
  seasonName: string;
  sales: AdminSeasonalSales | undefined;
  now: Date;
  isBusy: boolean;
  onEdit: () => void;
  onTogglePublished: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

const HAS_SALES_HINT = 'Tiene ventas: solo se puede despublicar';

/** Tarjeta de una lotería en la pestaña Temáticas (FEAT-48, decisión 4). */
export const AdminSeasonalCard = ({
  loteria,
  seasonName,
  sales,
  now,
  isBusy,
  onEdit,
  onTogglePublished,
  onDownload,
  onDelete,
}: AdminSeasonalCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const state = loteriaCardState(loteria, now);
  const note = loteriaNoteLine(loteria, now);
  const hasPurchases = sales?.hasPurchases ?? false;
  const approvedSales = sales?.approvedSales ?? 0;
  const canPublish = loteria.is_published || state === 'ready';

  useEscapeKey(() => setMenuOpen(false), menuOpen);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('touchstart', closeOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('touchstart', closeOutside);
    };
  }, [menuOpen]);

  const choose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <article className="admin-themes__card">
      <div className="admin-themes__cover">
        {loteria.cover_path ? (
          <img src={SeasonalRepository.previewUrl(loteria.cover_path)} alt="" loading="lazy" />
        ) : (
          <span className="admin-themes__no-cover">Sin portada</span>
        )}
        <span className={`admin-themes__badge admin-themes__badge--${state}`}>{LOTERIA_CARD_STATE_LABELS[state]}</span>
      </div>

      <div className="admin-themes__card-body">
        <span className="admin-themes__tag">{seasonName}</span>
        <h3 className="admin-themes__card-title">{loteria.name_es}</h3>
        <span className="admin-pricing__muted">{loteriaDetailLine(loteria)}</span>
        {note && (
          <span className={note.danger ? 'admin-themes__note admin-themes__note--danger' : 'admin-themes__note'}>
            {note.text}
          </span>
        )}
        <div className="admin-themes__card-foot">
          <span className="admin-themes__price">
            {loteria.price_cents === null ? 'Sin precio' : paidLabel(loteria.price_cents)}
          </span>
          <span className="admin-pricing__muted">
            <b className="admin-pricing__strong">{approvedSales}</b> {approvedSales === 1 ? 'venta' : 'ventas'} ·{' '}
            <b className="admin-pricing__strong">{paidLabel(sales?.revenueCents ?? 0)}</b>
          </span>
        </div>
      </div>

      <div className="admin-themes__card-actions">
        <button type="button" className="admin-pricing__btn admin-themes__edit" onClick={onEdit} disabled={isBusy}>
          {state === 'incomplete' ? 'Seguir armándola' : 'Editar'}
        </button>
        <div className="admin-themes__menu" ref={menuRef}>
          <button
            type="button"
            className="admin-pricing__icon-btn"
            aria-label={`Más acciones de «${loteria.name_es}»`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            disabled={isBusy}
          >
            <FaEllipsisH aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="loteria-menu__dropdown admin-themes__dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                className="loteria-menu__item"
                onClick={choose(onTogglePublished)}
                disabled={!canPublish}
                title={canPublish ? undefined : 'Termínala antes de publicarla'}
              >
                {loteria.is_published ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                {loteria.is_published ? 'Despublicar' : 'Publicar'}
              </button>
              <button
                type="button"
                role="menuitem"
                className="loteria-menu__item"
                onClick={choose(onDownload)}
                disabled={loteria.pdf === null}
                title={loteria.pdf === null ? 'Aún no tiene PDF' : undefined}
              >
                <FaDownload aria-hidden="true" />
                Descargar PDF
              </button>
              <span className="loteria-menu__divider" aria-hidden="true" />
              <button
                type="button"
                role="menuitem"
                className="loteria-menu__item loteria-menu__item--danger"
                onClick={choose(onDelete)}
                disabled={hasPurchases}
                title={hasPurchases ? HAS_SALES_HINT : undefined}
              >
                <FaRegTrashAlt aria-hidden="true" />
                {hasPurchases ? HAS_SALES_HINT : 'Borrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
