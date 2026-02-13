import { useEffect, useState } from 'react';
import { FaPlus, FaPencilAlt, FaCheck, FaTimes } from 'react-icons/fa';
import { AdminRepository, type AdminTokenPack } from '../../repositories/AdminRepository';
import './AdminTokenPacks.css';

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

export const AdminTokenPacks = () => {
  const [packs, setPacks] = useState<AdminTokenPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBase, setEditBase] = useState(10);
  const [editBonus, setEditBonus] = useState(0);
  const [editPrice, setEditPrice] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newBase, setNewBase] = useState(10);
  const [newBonus, setNewBonus] = useState(2);
  const [newPrice, setNewPrice] = useState('20');
  const [isCreating, setIsCreating] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const data = await AdminRepository.getTokenPacks();
    setPacks(data);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (p: AdminTokenPack) => {
    setEditingId(p.id);
    setEditBase(p.base_tokens);
    setEditBonus(p.bonus_tokens);
    setEditPrice((p.price_cents / 100).toFixed(2));
    setEditActive(p.is_active);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (editBase < 1 || editBonus < 0) {
      setError('Base debe ser ≥ 1 y bonus ≥ 0');
      return;
    }
    const pricePesos = parseFloat(editPrice.replace(',', '.'));
    if (isNaN(pricePesos) || pricePesos < 0) {
      setError('Precio inválido');
      return;
    }
    const priceCents = Math.round(pricePesos * 100);
    setIsSaving(true);
    setError(null);
    const updated = await AdminRepository.updateTokenPack(editingId, {
      base_tokens: editBase,
      bonus_tokens: editBonus,
      price_cents: priceCents,
      is_active: editActive,
    });
    setIsSaving(false);
    if (updated) {
      setPacks((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      setEditingId(null);
    } else {
      setError('Error al guardar');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const pricePesos = parseFloat(newPrice.replace(',', '.'));
    if (isNaN(pricePesos) || pricePesos < 0) {
      setError('Precio inválido');
      return;
    }
    const priceCents = Math.round(pricePesos * 100);
    if (newBase < 1 || newBonus < 0) {
      setError('Tokens inválidos');
      return;
    }
    setIsCreating(true);
    setError(null);
    const created = await AdminRepository.createTokenPack({
      base_tokens: newBase,
      bonus_tokens: newBonus,
      price_cents: priceCents,
      sort_order: packs.length,
    });
    setIsCreating(false);
    if (created) {
      setPacks((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setShowNewForm(false);
      setNewBase(10);
      setNewBonus(2);
      setNewPrice('20');
    } else {
      setError('Error al crear (¿ya existe un pack con ese base+bonus?)');
    }
  };

  return (
    <div className="admin-packs">
      <div className="admin-packs__header">
        <h2 className="admin-packs__title">Packs de tokens</h2>
        <p className="admin-packs__subtitle">
          Gestiona los packs: base + bonus tokens, precio. Los packs inactivos no aparecen en la tienda.
        </p>
      </div>

      {!showNewForm ? (
        <button
          type="button"
          className="admin-packs__add-btn"
          onClick={() => {
            setShowNewForm(true);
            setError(null);
          }}
        >
          <FaPlus /> Nuevo pack
        </button>
      ) : (
        <form className="admin-packs__new-form" onSubmit={handleCreate}>
          <div className="admin-packs__new-row">
            <div className="admin-packs__field">
              <label>Base tokens</label>
              <input
                type="number"
                min={1}
                value={newBase}
                onChange={(e) => setNewBase(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="admin-packs__field">
              <label>Bonus tokens</label>
              <input
                type="number"
                min={0}
                value={newBonus}
                onChange={(e) => setNewBonus(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="admin-packs__field">
              <label>Precio (MXN)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="20"
              />
            </div>
          </div>
          <div className="admin-packs__new-actions">
            <button type="button" className="admin-packs__btn admin-packs__btn--secondary" onClick={() => { setShowNewForm(false); setError(null); }}>
              <FaTimes /> Cancelar
            </button>
            <button type="submit" className="admin-packs__btn admin-packs__btn--primary" disabled={isCreating}>
              <FaPlus /> Crear
            </button>
          </div>
          {error && <p className="admin-packs__error">{error}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="admin-packs__loading">
          <div className="admin-packs__spinner" />
          <span>Cargando packs...</span>
        </div>
      ) : packs.length === 0 ? (
        <p className="admin-packs__empty">No hay packs. Crea uno con el botón "Nuevo pack".</p>
      ) : (
        <div className="admin-packs__list">
          {packs.map((p) => (
            <div key={p.id} className={`admin-packs__card ${!p.is_active ? 'admin-packs__card--inactive' : ''}`}>
              {editingId === p.id ? (
                <div className="admin-packs__edit">
                  <div className="admin-packs__edit-fields">
                    <div className="admin-packs__field">
                      <label>Base tokens</label>
                      <input
                        type="number"
                        min={1}
                        value={editBase}
                        onChange={(e) => setEditBase(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>
                    <div className="admin-packs__field">
                      <label>Bonus tokens</label>
                      <input
                        type="number"
                        min={0}
                        value={editBonus}
                        onChange={(e) => setEditBonus(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                    <div className="admin-packs__field">
                      <label>Precio (MXN)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                    </div>
                    <label className="admin-packs__checkbox">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      Activo (visible en tienda)
                    </label>
                  </div>
                  <div className="admin-packs__edit-actions">
                    <button type="button" className="admin-packs__btn admin-packs__btn--secondary" onClick={cancelEdit}>
                      <FaTimes /> Cancelar
                    </button>
                    <button type="button" className="admin-packs__btn admin-packs__btn--primary" onClick={saveEdit} disabled={isSaving}>
                      <FaCheck /> Guardar
                    </button>
                  </div>
                  {error && editingId === p.id && <p className="admin-packs__error">{error}</p>}
                </div>
              ) : (
                <>
                  <div className="admin-packs__card-body">
                    <div className="admin-packs__card-main">
                      <span className="admin-packs__card-tokens">
                        {p.base_tokens} + {p.bonus_tokens} bonus = {p.base_tokens + p.bonus_tokens} tokens
                      </span>
                      <span className="admin-packs__card-price">{formatPrice(p.price_cents)}</span>
                    </div>
                    <span className={`admin-packs__badge ${p.is_active ? 'admin-packs__badge--active' : 'admin-packs__badge--inactive'}`}>
                      {p.is_active ? 'Activo' : 'Oculto'}
                    </span>
                  </div>
                  <button type="button" className="admin-packs__action-btn" onClick={() => startEdit(p)} title="Editar">
                    <FaPencilAlt />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
