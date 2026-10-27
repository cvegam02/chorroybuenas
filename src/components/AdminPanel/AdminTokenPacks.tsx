import { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { AdminRepository, type AdminTokenPack } from '../../repositories/AdminRepository';
import { OfferRepository } from '../../repositories/OfferRepository';
import { pendingOfferPercent } from '../../utils/adminOffers';
import { summaryPeriod } from '../../utils/adminSummary';
import { AdminPackCard } from './AdminPackCard';
import { AdminPackForm } from './AdminPackForm';
import './AdminTokenPacks.css';

interface AdminTokenPacksProps {
  /** Precio por token vigente, para el ahorro contra suelto; nulo si no se conoce. */
  priceCents: number | null;
  /** Id del título de la sección, para `aria-labelledby`. */
  titleId: string;
}

/** Sección «Packs de tokens» de Precios y promos (FEAT-46, US A3): tarjetas con precio efectivo, ahorro y ventas. */
export const AdminTokenPacks = ({ priceCents, titleId }: AdminTokenPacksProps) => {
  const [packs, setPacks] = useState<AdminTokenPack[]>([]);
  const [sales, setSales] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offerPercent, setOfferPercent] = useState<number | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([
      AdminRepository.getTokenPacks(),
      AdminRepository.getPackSales(summaryPeriod('month')),
      OfferRepository.getAdminOffers(),
    ]).then(
      ([data, monthSales, offers]) => {
        if (!current) return;
        setPacks(data);
        setSales(monthSales);
        setOfferPercent(pendingOfferPercent(offers ?? []));
        setIsLoading(false);
      },
    );
    return () => {
      current = false;
    };
  }, []);

  const replacePack = (updated: AdminTokenPack) => {
    setPacks((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingId(null);
  };

  const addPack = (created: AdminTokenPack) => {
    setPacks((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
    setSales((prev) => (prev ? { ...prev, [created.id]: 0 } : prev));
    setShowNewForm(false);
  };

  const toggleActive = async (p: AdminTokenPack) => {
    setTogglingId(p.id);
    setError(null);
    const updated = await AdminRepository.updateTokenPack(p.id, { is_active: !p.is_active });
    setTogglingId(null);
    if (updated) setPacks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    else setError(p.is_active ? 'No se pudo ocultar el pack.' : 'No se pudo activar el pack.');
  };

  return (
    <>
      <div className="admin-pricing__section-head">
        <h3 id={titleId} className="admin-pricing__section-title">Packs de tokens</h3>
        {!showNewForm && (
          <button
            type="button"
            className="admin-pricing__btn"
            onClick={() => {
              setShowNewForm(true);
              setEditingId(null);
            }}
          >
            <FaPlus aria-hidden="true" /> Nuevo pack
          </button>
        )}
      </div>

      {showNewForm && (
        <AdminPackForm offerPercent={offerPercent} sortOrder={packs.length} onSaved={addPack} onCancel={() => setShowNewForm(false)} />
      )}

      {error && <p className="admin-packs__error" role="alert">{error}</p>}

      {isLoading ? (
        <div className="admin-packs__loading">
          <div className="admin-packs__spinner" />
          <span>Cargando packs...</span>
        </div>
      ) : packs.length === 0 ? (
        <p className="admin-packs__empty">No hay packs. Crea uno con el botón «Nuevo pack».</p>
      ) : (
        <div className="admin-pricing__packs">
          {packs.map((p) =>
            editingId === p.id ? (
              <AdminPackForm
                key={p.id}
                pack={p}
                offerPercent={offerPercent}
                sortOrder={p.sort_order}
                onSaved={replacePack}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <AdminPackCard
                key={p.id}
                pack={p}
                priceCents={priceCents}
                sales={sales ? sales[p.id] ?? 0 : null}
                isToggling={togglingId === p.id}
                onToggle={() => toggleActive(p)}
                onEdit={() => {
                  setEditingId(p.id);
                  setShowNewForm(false);
                }}
              />
            ),
          )}
        </div>
      )}

      <p className="admin-pricing__muted">
        El interruptor muestra u oculta el pack en «Comprar tokens». Un pack oculto conserva sus ventas pasadas.
      </p>
    </>
  );
};
