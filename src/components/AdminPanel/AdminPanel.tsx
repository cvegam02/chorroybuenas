import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FaCog, FaArrowLeft, FaTicketAlt, FaShoppingCart,
  FaUsers, FaTags, FaBars, FaTimes, FaThLarge
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { signupSalesPeriod } from '../../utils/adminUsers';
import { AdminSummary } from './AdminSummary';
import { AdminSales, type SalesPreset } from './AdminSales';
import { AdminOfferEditor } from './AdminOfferEditor';
import { AdminPricing } from './AdminPricing';
import { AdminUsers, type UsersPreset } from './AdminUsers';
import type { PeriodSelection } from './AdminPeriodPicker';
import { AdminSeasonal } from './AdminSeasonal';
import './AdminPanel.css';

type AdminTab = 'resumen' | 'ventas' | 'usuarios' | 'precios' | 'temporada';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',     label: 'Resumen',            icon: <FaThLarge /> },
  { id: 'ventas',      label: 'Ventas',             icon: <FaShoppingCart /> },
  { id: 'usuarios',    label: 'Usuarios',           icon: <FaUsers /> },
  { id: 'precios',     label: 'Precios y promos',   icon: <FaTicketAlt /> },
  { id: 'temporada',   label: 'Temáticas',          icon: <FaTags /> },
];

const isAdminTab = (value: unknown): value is AdminTab => TABS.some((tab) => tab.id === value);

export const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  // Una oferta (A1.2a, FEAT-49) se abre dentro de Precios y promos, con el menú a la vista.
  const { offerId } = useParams<{ offerId?: string }>();
  // Quien vuelve de una lotería de temporada (A1.7a) o de una oferta (A1.2a) regresa a su pestaña.
  const requestedTab = (location.state as { tab?: string } | null)?.tab;
  const [activeTab, setActiveTab] = useState<AdminTab>(() => (isAdminTab(requestedTab) ? requestedTab : 'resumen'));
  const shownTab: AdminTab = offerId ? 'precios' : activeTab;

  useEffect(() => {
    if (isAdminTab(requestedTab)) setActiveTab(requestedTab);
  }, [location.key, requestedTab]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Con qué se abre Usuarios desde otra pestaña: el correo de «Ver ficha del cliente» en Ventas
  // (FEAT-44, decisión 13) o el periodo de «Ver regalos» en el Resumen (FEAT-45, US A4).
  const [usersPreset, setUsersPreset] = useState<UsersPreset | null>(null);
  // Filtros con los que se abre Ventas desde una tarjeta del Resumen (FEAT-44, US A5).
  const [salesPreset, setSalesPreset] = useState<SalesPreset | null>(null);

  const openTab = (tab: AdminTab, sales?: SalesPreset) => {
    if (offerId) navigate('/admin', { state: { tab } });
    setUsersPreset(null);
    setSalesPreset(sales ?? null);
    setActiveTab(tab);
  };

  const openClient = (userId: string, email: string) => {
    setSalesPreset(null);
    setUsersPreset({ section: 'usuarios', search: email, openUserId: userId });
    setActiveTab('usuarios');
  };

  // Desde la ficha: sus compras desde su alta hasta hoy (FEAT-45, decisión 13).
  const openUserSales = (email: string, createdAt: string) => {
    setUsersPreset(null);
    setSalesPreset({
      selection: { kind: 'range', period: signupSalesPeriod(createdAt) },
      kind: '',
      status: '',
      search: email,
    });
    setActiveTab('ventas');
  };

  const openGifts = (selection: PeriodSelection) => {
    setSalesPreset(null);
    setUsersPreset({ section: 'regalos', giftsSelection: selection });
    setActiveTab('usuarios');
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin) navigate('/dashboard', { replace: true });
  }, [isLoading, user, isAdmin, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [shownTab, offerId]);

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
              className={`admin-panel__nav-item${shownTab === tab.id ? ' admin-panel__nav-item--active' : ''}`}
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
        <div className="admin-panel__content" key={offerId ? 'oferta' : activeTab}>
          {offerId && <AdminOfferEditor offerId={offerId} />}
          {!offerId && activeTab === 'resumen' && <AdminSummary onOpenTab={openTab} onOpenGifts={openGifts} />}
          {!offerId && activeTab === 'ventas' && <AdminSales preset={salesPreset} onOpenClient={openClient} />}
          {!offerId && activeTab === 'usuarios' && <AdminUsers preset={usersPreset} onOpenSales={openUserSales} />}
          {!offerId && activeTab === 'precios' && <AdminPricing />}
          {!offerId && activeTab === 'temporada' && <AdminSeasonal />}
        </div>
      </main>
    </div>
  );
};
