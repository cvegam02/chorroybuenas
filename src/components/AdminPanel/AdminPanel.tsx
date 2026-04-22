import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCog, FaArrowLeft, FaTicketAlt, FaShoppingCart,
  FaBoxOpen, FaWallet, FaChartLine, FaCreditCard, FaBars, FaTimes
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { AdminPurchases } from './AdminPurchases';
import { AdminPromotions } from './AdminPromotions';
import { AdminTokenPacks } from './AdminTokenPacks';
import { AdminBalances } from './AdminBalances';
import { AdminTokenUsage } from './AdminTokenUsage';
import { AdminMPTransactions } from './AdminMPTransactions';
import './AdminPanel.css';

type AdminTab = 'compras' | 'promociones' | 'packs' | 'balances' | 'uso-ia' | 'mp';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'compras',     label: 'Compras',           icon: <FaShoppingCart /> },
  { id: 'promociones', label: 'Promociones',        icon: <FaTicketAlt /> },
  { id: 'packs',       label: 'Packs de tokens',    icon: <FaBoxOpen /> },
  { id: 'balances',    label: 'Balances',           icon: <FaWallet /> },
  { id: 'uso-ia',      label: 'Uso de IA',          icon: <FaChartLine /> },
  { id: 'mp',          label: 'Transacciones MP',   icon: <FaCreditCard /> },
];

export const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('compras');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin) navigate('/dashboard', { replace: true });
  }, [isLoading, user, isAdmin, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="admin-panel admin-panel--loading">
        <div className="admin-panel__spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const displayName = user.user_metadata?.full_name?.trim() || user.email || 'Admin';

  return (
    <div className={`admin-panel${sidebarOpen ? ' admin-panel--sidebar-open' : ''}`}>

      {/* Mobile topbar */}
      <div className="admin-panel__topbar">
        <button
          type="button"
          className="admin-panel__topbar-menu"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <FaBars />
        </button>
        <span className="admin-panel__topbar-title">
          <FaCog /> Panel Admin
        </span>
        <button
          type="button"
          className="admin-panel__topbar-back"
          onClick={() => navigate('/dashboard')}
          aria-label="Volver al dashboard"
        >
          <FaArrowLeft />
        </button>
      </div>

      {/* Sidebar overlay (mobile) */}
      <div
        className="admin-panel__overlay"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className="admin-panel__sidebar">
        <div className="admin-panel__sidebar-brand">
          <button
            type="button"
            className="admin-panel__sidebar-back"
            onClick={() => navigate('/dashboard')}
            aria-label="Volver al dashboard"
          >
            <FaArrowLeft />
          </button>
          <div className="admin-panel__sidebar-title">
            <FaCog />
            <span>Panel Admin</span>
          </div>
          <button
            type="button"
            className="admin-panel__sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="admin-panel__nav" role="navigation" aria-label="Navegación admin">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="menuitem"
              className={`admin-panel__nav-item${activeTab === tab.id ? ' admin-panel__nav-item--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="admin-panel__nav-icon">{tab.icon}</span>
              <span className="admin-panel__nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-panel__sidebar-footer">
          <div className="admin-panel__sidebar-user">
            <div className="admin-panel__sidebar-user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="admin-panel__sidebar-user-email">{user.email}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-panel__main">
        <div className="admin-panel__content" key={activeTab}>
          {activeTab === 'compras'     && <AdminPurchases />}
          {activeTab === 'promociones' && <AdminPromotions />}
          {activeTab === 'packs'       && <AdminTokenPacks />}
          {activeTab === 'balances'    && <AdminBalances />}
          {activeTab === 'uso-ia'      && <AdminTokenUsage />}
          {activeTab === 'mp'          && <AdminMPTransactions />}
        </div>
      </main>
    </div>
  );
};
