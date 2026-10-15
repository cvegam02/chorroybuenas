import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCog, FaArrowLeft, FaTicketAlt, FaShoppingCart,
  FaBoxOpen, FaWallet, FaChartLine, FaTags, FaBars, FaTimes, FaThLarge
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { AdminSummary } from './AdminSummary';
import { AdminSales, type SalesPreset } from './AdminSales';
import { AdminPromotions } from './AdminPromotions';
import { AdminTokenPacks } from './AdminTokenPacks';
import { AdminBalances } from './AdminBalances';
import { AdminTokenUsage } from './AdminTokenUsage';
import { AdminSeasonal } from './AdminSeasonal';
import './AdminPanel.css';

type AdminTab = 'resumen' | 'ventas' | 'promociones' | 'packs' | 'balances' | 'uso-ia' | 'temporada';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',     label: 'Resumen',            icon: <FaThLarge /> },
  { id: 'ventas',      label: 'Ventas',             icon: <FaShoppingCart /> },
  { id: 'promociones', label: 'Promociones',        icon: <FaTicketAlt /> },
  { id: 'packs',       label: 'Packs de tokens',    icon: <FaBoxOpen /> },
  { id: 'balances',    label: 'Balances',           icon: <FaWallet /> },
  { id: 'uso-ia',      label: 'Uso de IA',          icon: <FaChartLine /> },
  { id: 'temporada',   label: 'Temáticas',          icon: <FaTags /> },
];

export const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  // Quien vuelve de crear una lotería de temporada (A1.7a) regresa a su pestaña.
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    (location.state as { tab?: string } | null)?.tab === 'temporada' ? 'temporada' : 'resumen',
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Correo con el que se abre Balances desde «Ver ficha del cliente» en Ventas (FEAT-44, decisión 13).
  const [balancesSearch, setBalancesSearch] = useState('');
  // Filtros con los que se abre Ventas desde una tarjeta del Resumen (FEAT-44, US A5).
  const [salesPreset, setSalesPreset] = useState<SalesPreset | null>(null);

  const openTab = (tab: AdminTab, sales?: SalesPreset) => {
    setBalancesSearch('');
    setSalesPreset(sales ?? null);
    setActiveTab(tab);
  };

  const openClient = (email: string) => {
    setSalesPreset(null);
    setBalancesSearch(email);
    setActiveTab('balances');
  };

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
              onClick={() => openTab(tab.id)}
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
          {activeTab === 'resumen'     && <AdminSummary onOpenTab={openTab} />}
          {activeTab === 'ventas'      && <AdminSales preset={salesPreset} onOpenClient={openClient} />}
          {activeTab === 'promociones' && <AdminPromotions />}
          {activeTab === 'packs'       && <AdminTokenPacks />}
          {activeTab === 'balances'    && <AdminBalances initialSearch={balancesSearch} />}
          {activeTab === 'uso-ia'      && <AdminTokenUsage />}
          {activeTab === 'temporada'   && <AdminSeasonal />}
        </div>
      </main>
    </div>
  );
};
