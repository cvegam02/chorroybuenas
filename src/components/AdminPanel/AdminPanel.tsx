import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return isMobile;
};
import { FaCog, FaArrowLeft, FaTicketAlt, FaShoppingCart, FaBoxOpen, FaWallet, FaChartLine, FaCreditCard } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { AdminPurchases } from './AdminPurchases';
import { AdminPromotions } from './AdminPromotions';
import { AdminTokenPacks } from './AdminTokenPacks';
import { AdminBalances } from './AdminBalances';
import { AdminTokenUsage } from './AdminTokenUsage';
import { AdminMPTransactions } from './AdminMPTransactions';
import './AdminPanel.css';

type AdminTab = 'compras' | 'promociones' | 'packs' | 'balances' | 'uso-ia' | 'mp';

const TABS: { id: AdminTab; label: string; labelShort: string; icon: React.ReactNode }[] = [
  { id: 'compras', label: 'Compras', labelShort: 'Compras', icon: <FaShoppingCart /> },
  { id: 'promociones', label: 'Promociones', labelShort: 'Promos', icon: <FaTicketAlt /> },
  { id: 'packs', label: 'Packs de tokens', labelShort: 'Packs', icon: <FaBoxOpen /> },
  { id: 'balances', label: 'Balances', labelShort: 'Balances', icon: <FaWallet /> },
  { id: 'uso-ia', label: 'Uso de IA', labelShort: 'Uso IA', icon: <FaChartLine /> },
  { id: 'mp', label: 'Transacciones MP', labelShort: 'MP', icon: <FaCreditCard /> },
];

export const AdminPanel = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('compras');

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, user, isAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="admin-panel admin-panel--loading">
        <div className="admin-panel__spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel__header">
        <button
          type="button"
          className="admin-panel__back"
          onClick={() => navigate('/dashboard')}
          aria-label="Volver al dashboard"
        >
          <FaArrowLeft />
        </button>
        <h1 className="admin-panel__title">
          <FaCog />
          Panel de administración
        </h1>
        <p className="admin-panel__subtitle">
          Bienvenido, {user.user_metadata?.full_name?.trim() || user.email}
        </p>
      </header>

      <div className="admin-panel__body">
        <nav className="admin-panel__tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`admin-tab-${tab.id}`}
              id={`admin-tab-${tab.id}`}
              className={`admin-panel__tab ${activeTab === tab.id ? 'admin-panel__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{isMobile ? tab.labelShort : tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="admin-panel__content" role="tabpanel" id={`admin-tab-${activeTab}`} aria-labelledby={`admin-tab-${activeTab}`}>
          {activeTab === 'compras' ? (
            <AdminPurchases />
          ) : activeTab === 'promociones' ? (
            <AdminPromotions />
          ) : activeTab === 'packs' ? (
            <AdminTokenPacks />
          ) : activeTab === 'balances' ? (
            <AdminBalances />
          ) : activeTab === 'uso-ia' ? (
            <AdminTokenUsage />
          ) : (
            <AdminMPTransactions />
          )}
        </main>
      </div>
    </div>
  );
};
